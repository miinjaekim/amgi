/**
 * Daily progress rollups on mobile — storage, sync, and the offline queue.
 *
 * The web mirror of this is `apps/web/src/services/progress.ts`, and the logic
 * both share is in `@amgi/core`'s `progress.ts`, where it is tested. Unlike
 * review, storage and Firestore live in one file here: the only pure logic
 * involved (`mergeDeltas`) is already in core, so there is nothing left to keep
 * Firebase-free.
 *
 * **Why there is a queue at all.** A Firestore write does not reject when
 * offline — it stays pending until it can commit, which on React Native means
 * until the process dies, because the SDK's cache there is memory-only. A
 * review done underground would otherwise increment nothing, and unlike a card
 * rating there is no server state to recompute it from later: an uncounted day
 * is uncounted forever. So every delta is written to AsyncStorage first and
 * only cleared once Firestore has actually taken it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, documentId, getDocs, increment, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  COUNTER_KEYS, applyDelta, emptyDailyProgress, localDateString, mergeDeltas,
  newCardsDelta, parseDailyProgress, shiftDate,
  type CardSource, type DailyProgress, type ProgressDelta, type StudyLanguage,
} from '@amgi/core';
import { withTimeout } from './withTimeout';

const pendingKey = (uid: string) => `amgi_pending_progress_${uid}`;

/** A delta waiting to be sent, tagged with the day it belongs to. */
interface PendingProgress {
  /** Unique within the queue, so a flush can remove exactly what it sent. */
  id: string;
  date: string;
  delta: ProgressDelta;
}

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `${Date.now()}-${sequence}`;
}

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

/**
 * Same reasoning as the review queue's lock: AsyncStorage has no atomic update,
 * and a flush that read the list before a rating was added would write back a
 * version without it — silently losing the count.
 */
let queueLock: Promise<unknown> = Promise.resolve();

function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = queueLock.then(operation, operation);
  queueLock = run.catch(() => undefined);
  return run;
}

async function readQueue(uid: string): Promise<PendingProgress[]> {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(uid: string, queue: PendingProgress[]): Promise<void> {
  if (queue.length === 0) await AsyncStorage.removeItem(pendingKey(uid));
  else await AsyncStorage.setItem(pendingKey(uid), JSON.stringify(queue));
}

function enqueue(uid: string, entry: PendingProgress): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue(uid);
    await writeQueue(uid, [...queue, entry]);
  });
}

function removeSent(uid: string, sent: PendingProgress[]): Promise<void> {
  if (sent.length === 0) return Promise.resolve();
  const sentIds = new Set(sent.map(entry => entry.id));
  return withQueueLock(async () => {
    const queue = await readQueue(uid);
    await writeQueue(uid, queue.filter(entry => !sentIds.has(entry.id)));
  });
}

/** How many increments are still waiting. Cheap; used for diagnostics only. */
export async function countPendingProgress(uid: string): Promise<number> {
  return (await readQueue(uid)).length;
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

function progressRef(uid: string, date: string) {
  return doc(db, 'users', uid, 'progress', date);
}

/** Every leaf becomes an `increment()`, so two devices on one day add up. */
function toIncrements(delta: ProgressDelta): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const key of COUNTER_KEYS) {
    if (delta[key]) update[key] = increment(delta[key]!);
  }

  const languages = Object.entries(delta.byLanguage ?? {});
  if (languages.length > 0) {
    // Nested objects, not dotted paths — `setDoc` with `merge: true` reads a
    // dotted key as a literal field name, where `updateDoc` reads it as a path.
    const byLanguage: Record<string, Record<string, unknown>> = {};
    for (const [language, slice] of languages) {
      const fields: Record<string, unknown> = {};
      for (const key of COUNTER_KEYS) {
        if (slice?.[key]) fields[key] = increment(slice[key]!);
      }
      if (Object.keys(fields).length > 0) byLanguage[language] = fields;
    }
    if (Object.keys(byLanguage).length > 0) update.byLanguage = byLanguage;
  }
  return update;
}

async function sendDelta(uid: string, date: string, delta: ProgressDelta): Promise<void> {
  const update = toIncrements(delta);
  if (Object.keys(update).length === 0) return;
  await withTimeout(setDoc(progressRef(uid, date), { date, ...update }, { merge: true }));
}

// ---------------------------------------------------------------------------
// Recording and flushing
// ---------------------------------------------------------------------------

/**
 * Queue a delta and try to send it.
 *
 * Awaiting the enqueue but not the flush is the same bargain the review queue
 * makes: once this resolves the count survives the app being killed, and the
 * network attempt happens on its own time so a counter never makes a review
 * feel slow.
 */
export async function recordProgress(
  uid: string,
  delta: ProgressDelta,
  date: string = localDateString(),
): Promise<void> {
  await enqueue(uid, { id: nextId(), date, delta });
  void flushPendingProgress(uid);
}

/** Convenience wrapper: the cards just created, counted against their source. */
export async function recordNewCards(
  uid: string | undefined,
  studyLanguage: StudyLanguage | undefined,
  count: number,
  source: CardSource,
): Promise<void> {
  if (!uid || count <= 0) return;
  await recordProgress(uid, newCardsDelta(studyLanguage ?? 'Korean', count, source));
}

/**
 * Flushes are chained rather than deduplicated, for the reason spelled out on
 * `flushPendingReviews`: handing a caller the in-flight promise would tell it
 * the sync had happened when a delta added mid-flush was still queued.
 */
let flushChain: Promise<unknown> = Promise.resolve();

export function flushPendingProgress(uid: string): Promise<number> {
  const next = flushChain.then(() => drain(uid), () => drain(uid));
  flushChain = next.catch(() => 0);
  return next;
}

/**
 * Send the queue, one write per day rather than one per entry.
 *
 * Collapsing is what makes an offline session cheap: fifty ratings underground
 * become one increment per day on reconnect. Safe because counters commute —
 * summing then incrementing lands on the same number as incrementing fifty
 * times, and the intermediate values were never meaningful.
 *
 * Returns the number of entries the server accepted.
 */
async function drain(uid: string): Promise<number> {
  const queued = await readQueue(uid);
  if (queued.length === 0) return 0;

  const byDate = new Map<string, PendingProgress[]>();
  for (const entry of queued) {
    const existing = byDate.get(entry.date);
    if (existing) existing.push(entry);
    else byDate.set(entry.date, [entry]);
  }

  const sent: PendingProgress[] = [];
  for (const [date, entries] of byDate) {
    const combined = entries.map(entry => entry.delta).reduce(mergeDeltas);
    try {
      await sendDelta(uid, date, combined);
      sent.push(...entries);
    } catch {
      // Offline, or the write timed out. Every remaining day would fail the
      // same way at a full timeout each, so stop and leave the queue intact —
      // the next trigger retries all of it. Nothing is discarded: unlike a card
      // rating, a dropped increment cannot be recomputed from server state.
      break;
    }
  }

  await removeSent(uid, sent);
  return sent.length;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Read a window of days, inclusive.
 *
 * Ranged on `documentId()` — the id *is* the date and dates sort lexically —
 * which keeps this a single-field query on the document key and therefore
 * **needs no composite index**. Worth preserving: a missing index is a runtime
 * failure and nothing in CI catches it.
 *
 * Unsent local deltas are replayed over the result, the same way
 * `applyPendingReviews` does for cards. Without it a session reviewed offline
 * would show a flat day on the dashboard it just filled.
 */
export async function fetchProgressRange(
  uid: string,
  start: string,
  end: string,
): Promise<DailyProgress[]> {
  const snapshot = await withTimeout(getDocs(query(
    collection(db, 'users', uid, 'progress'),
    where(documentId(), '>=', start),
    where(documentId(), '<=', end),
  )));

  const days = new Map<string, DailyProgress>();
  for (const document of snapshot.docs) {
    days.set(document.id, parseDailyProgress(document.id, document.data()));
  }

  for (const entry of await readQueue(uid)) {
    if (entry.date < start || entry.date > end) continue;
    const base = days.get(entry.date) ?? emptyDailyProgress(entry.date);
    days.set(entry.date, applyDelta(base, entry.delta));
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** The last `days` days ending today. */
export function fetchRecentProgress(uid: string, days: number): Promise<DailyProgress[]> {
  const today = localDateString();
  return fetchProgressRange(uid, shiftDate(today, -(days - 1)), today);
}
