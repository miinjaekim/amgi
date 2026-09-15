/**
 * Firestore storage for daily progress rollups.
 *
 * The logic is in `@amgi/core`'s `progress.ts`; this is only the part that
 * talks to Firestore. Mobile has a mirror of this file with its own offline
 * queue on top.
 *
 * **Security rules are manual and there is no wildcard support**, so
 * `users/{uid}/progress/{day}` needs its own `match` block in the console
 * before any of this can write. Account deletion needs no change — the
 * *Delete User Data* extension is configured as `users/{UID}` in recursive
 * mode, which is exactly why this is a subcollection.
 */
import { db } from '@/config/firebase';
import {
  collection, doc, documentId, getDocs, increment, onSnapshot, query, setDoc, where,
} from 'firebase/firestore';
import {
  COUNTER_KEYS, localDateString, newCardsDelta, parseDailyProgress, shiftDate,
  type CardSource, type DailyProgress, type ProgressDelta, type StudyLanguage,
} from '@amgi/core';

function progressRef(uid: string, date: string) {
  return doc(db, 'users', uid, 'progress', date);
}

/**
 * Turn a plain-number delta into a Firestore update, every leaf an
 * `increment()`.
 *
 * Increments rather than read-modify-write because two devices reviewing the
 * same day must add up. A `merge: true` `setDoc` creates the document if it is
 * the day's first write, and `increment` on a missing field starts it at zero,
 * so there is no create-vs-update branch to get wrong.
 */
function toIncrements(delta: ProgressDelta): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const key of COUNTER_KEYS) {
    if (delta[key]) update[key] = increment(delta[key]);
  }

  const languages = Object.entries(delta.byLanguage ?? {});
  if (languages.length > 0) {
    // Nested objects, not dotted paths: `setDoc` with `merge: true` treats a
    // dotted key as a literal field name containing a dot, where `updateDoc`
    // would treat it as a path. Nested + merge is the shape that both creates
    // the document and leaves sibling languages untouched.
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

  // Nested and merged for the same reason as `byLanguage` above: an hour is a
  // sibling key that must survive a write touching a different hour.
  const hours = Object.entries(delta.byHour ?? {});
  if (hours.length > 0) {
    const byHour: Record<string, unknown> = {};
    for (const [hour, count] of hours) {
      if (count) byHour[hour] = increment(count);
    }
    if (Object.keys(byHour).length > 0) update.byHour = byHour;
  }
  return update;
}

/**
 * Add a delta to a day.
 *
 * Deliberately not awaited by its callers — a progress counter must never make
 * a review feel slow, and a lost increment costs one tally mark rather than a
 * card's scheduling. Note the write does not reject offline, it simply stays
 * pending until it can commit, so awaiting one would hang.
 */
export async function recordProgress(
  uid: string,
  delta: ProgressDelta,
  date: string = localDateString(),
): Promise<void> {
  const update = toIncrements(delta);
  if (Object.keys(update).length === 0) return;
  // `date` is stored as a field as well as being the document id, so a snapshot
  // read on its own carries the day it belongs to.
  await setDoc(progressRef(uid, date), { date, ...update }, { merge: true });
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
 * Read a window of days, inclusive.
 *
 * Ranged on `documentId()`, which works because the id *is* the `YYYY-MM-DD`
 * date and that sorts lexically. This is a single-field query on the document
 * key, so unlike the card queries it needs **no composite index** — worth
 * keeping that way, since a missing index is a runtime failure nothing in CI
 * catches.
 *
 * Days with no activity have no document; the caller fills the gaps
 * (`buildHeatmap` does it).
 */
export async function fetchProgressRange(
  uid: string,
  start: string,
  end: string,
): Promise<DailyProgress[]> {
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'progress'),
    where(documentId(), '>=', start),
    where(documentId(), '<=', end),
  ));
  return snapshot.docs.map(document => parseDailyProgress(document.id, document.data()));
}

/** The last `days` days ending today. */
export function fetchRecentProgress(uid: string, days: number): Promise<DailyProgress[]> {
  const today = localDateString();
  return fetchProgressRange(uid, shiftDate(today, -(days - 1)), today);
}

/**
 * Watch one day's rollup.
 *
 * ⚠️ **This exists so the streak chip can stop keeping its own copy of a number
 * this document already holds.** Until 2026-09-15 "reviews today" was written
 * twice on every rating — once here as an `increment()`, and once on
 * `users/{uid}` as `reviewedToday` inside a transaction — and the two drifted in
 * both directions. A transaction that exhausted its retries was swallowed by a
 * fire-and-forget `catch`, so the chip read *low*; an undo reversed this rollup
 * and deliberately never the streak fields, so it read *high*. A single source
 * cannot disagree with itself, and undo now moves the chip for free.
 *
 * A day with no document yet parses to zeroes rather than being an error — the
 * first review of the day is what creates it.
 */
export function subscribeToProgressDay(
  uid: string,
  date: string,
  onDay: (day: DailyProgress) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    progressRef(uid, date),
    snapshot => onDay(parseDailyProgress(date, snapshot.data())),
    error => onError?.(error),
  );
}
