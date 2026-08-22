/**
 * The Firestore half of offline review: filling the local snapshot, and
 * draining the queue of ratings back to the server.
 *
 * Split from `offlineReview.ts` so that module stays free of Firebase.
 */
import type { Flashcard, PendingReview, StudyLanguage } from '@amgi/core';
import { applyPendingReviews, collapsePendingReviews } from '@amgi/core';
import { fetchUserFlashcardsFromServer, updateFlashcardReview } from './firestore';
import { withTimeout } from './withTimeout';
import {
  readCachedCards, readKnownLanguages, readPendingReviews, removePendingReviews,
  writeCachedCards,
} from './offlineReview';

/**
 * Cards from the local snapshot, with unsent ratings replayed over them.
 * `null` means this device has never loaded the language — which is a different
 * thing from "you have no cards" and the review screen says so.
 */
export async function readCachedReviewCards(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<Flashcard[] | null> {
  const cached = await readCachedCards(uid, studyLanguage);
  if (!cached) return null;
  const pending = await readPendingReviews(uid);
  return applyPendingReviews(cached, pending, studyLanguage);
}

/**
 * A freshly-read set of cards with anything still unsent replayed over it.
 *
 * The replay matters even on cards straight from the server: a rating that
 * hasn't flushed yet isn't on the server, so without it the server's copy would
 * drag already-answered cards back into the queue.
 *
 * Deliberately does *not* touch the stored snapshot. Under a listener this runs
 * on every change, and refreshing storage is on a much slower clock than
 * refreshing the screen — see `persistReviewSnapshot`.
 */
export async function replayPendingOver(
  uid: string,
  studyLanguage: StudyLanguage,
  cards: Flashcard[],
): Promise<Flashcard[]> {
  const pending = await readPendingReviews(uid);
  return applyPendingReviews(cards, pending, studyLanguage);
}

/**
 * How long to sit on a snapshot before writing it to the device.
 *
 * A listener reports every change, and each of a session's ratings comes back
 * as one — so writing on each would re-serialise the whole collection thirty
 * times during thirty reviews, where the fetch-per-focus it replaced wrote once
 * a visit. Coalescing is safe in a way it would not be for a rating, because
 * this snapshot is a *cache*: unsent ratings live in their own queue and are
 * replayed over whatever is stored, so the worst a dropped write costs is a
 * slightly older starting point on the next cold, offline launch.
 */
export const SNAPSHOT_WRITE_DEBOUNCE_MS = 5_000;

/**
 * Store a snapshot as this device's offline copy of a language.
 *
 * **Only ever call this with cards that came from the server.** A cache-backed
 * snapshot is data Firestore already held this session — fine to display, but
 * writing it back lets the memory cache overwrite the durable copy with a
 * subset of itself, which is the trap `fetchUserFlashcardsFromServer` was
 * written to dodge and the same rule the streak listener follows.
 */
export async function persistReviewSnapshot(
  uid: string,
  studyLanguage: StudyLanguage,
  cards: Flashcard[],
): Promise<void> {
  await writeCachedCards(uid, studyLanguage, cards);
}

// Re-exported because `review.tsx` imports it from here, and because moving it
// out is what breaks the firestore → progress → reviewSync → firestore cycle.
export { withTimeout } from './withTimeout';

/**
 * Refresh the snapshots for every language this device has loaded before,
 * except the one already on screen.
 *
 * This is what makes switching study language underground work. Each language
 * is its own Firestore collection, so a snapshot only covers the language it
 * was fetched for; warming the set the user actually uses costs one query per
 * language on a good connection and nothing thereafter. Languages never opened
 * on this device stay uncached — pre-fetching all six would download
 * collections that are empty for almost everyone.
 *
 * Best-effort by construction: a failure here is invisible and simply leaves
 * that language's snapshot as stale as it already was.
 */
let warming = false;

export async function warmKnownLanguages(
  uid: string,
  currentLanguage: StudyLanguage,
): Promise<void> {
  // Triggered by connectivity, which can flap; a second pass while the first
  // is still running would only duplicate its queries.
  if (warming) return;
  warming = true;
  try {
    const known = await readKnownLanguages(uid);
    for (const language of known) {
      if (language === currentLanguage) continue;
      try {
        const cards = await withTimeout(fetchUserFlashcardsFromServer(uid, language));
        await writeCachedCards(uid, language, cards);
      } catch {
        // Offline, or one collection is unhappy; the others still get their turn.
      }
    }
  } finally {
    warming = false;
  }
}

/**
 * Firestore error codes that will never succeed on retry — the card is gone, or
 * was never ours. Anything else (`unavailable`, `deadline-exceeded`, a bare
 * network failure) is transient and the rating stays queued.
 *
 * Without this split, a rating for a card deleted on another device would fail
 * forever and wedge the queue: the pending badge would never clear and every
 * flush would retry a write that cannot land.
 */
const PERMANENT_ERROR_CODES = new Set([
  'not-found',
  'permission-denied',
  'invalid-argument',
  'unauthenticated',
]);

function isPermanentFailure(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && PERMANENT_ERROR_CODES.has(code);
}

export interface FlushResult {
  /** Ratings Firestore accepted. */
  flushed: number;
  /** Ratings still queued — transient failures, to be retried. */
  remaining: number;
  /** Ratings dropped as unsendable. */
  discarded: number;
}

/**
 * Flushes run one at a time, but every call still gets its own.
 *
 * Two overlapping drains would read the same queue and send every write twice,
 * so they have to be serialised. Handing a concurrent caller the *in-flight*
 * promise instead would be worse in a subtler way: a rating made while a flush
 * was running would be invisible to it, and the caller would be told the sync
 * had happened. The last rating of a session would then sit in the queue,
 * banner showing, until some unrelated trigger fired. Chaining costs one cheap
 * read when the queue is already empty.
 */
let flushChain: Promise<unknown> = Promise.resolve();

/**
 * Send every queued rating. Safe to call often — on reconnect, on foreground,
 * on entering review, after each rating — because an empty queue is a no-op.
 */
export function flushPendingReviews(uid: string): Promise<FlushResult> {
  const next = flushChain.then(() => drain(uid), () => drain(uid));
  flushChain = next.catch(() => undefined);
  return next;
}

async function drain(uid: string): Promise<FlushResult> {
  const queued = await readPendingReviews(uid);
  const collapsed = collapsePendingReviews(queued);
  if (collapsed.length === 0) return { flushed: 0, remaining: 0, discarded: 0 };

  const settled: PendingReview[] = [];
  let flushed = 0;
  let discarded = 0;

  for (const entry of collapsed) {
    try {
      await withTimeout(updateFlashcardReview(
        entry.cardId,
        entry.direction,
        entry.tracking,
        entry.otherTracking,
        entry.studyLanguage,
      ));
      settled.push(entry);
      flushed += 1;
    } catch (error) {
      if (!isPermanentFailure(error)) {
        // Transient means the network is down, and every remaining entry would
        // fail the same way — at a full timeout each. Stop and keep them
        // queued; the next trigger retries the whole queue anyway.
        break;
      }
      settled.push(entry);
      discarded += 1;
    }
  }

  // Collapsing dropped superseded entries from the list we sent, but they are
  // still in storage; removing by card+direction clears those too.
  await removePendingReviews(uid, settled);
  const remaining = (await readPendingReviews(uid)).length;
  return { flushed, remaining, discarded };
}
