/**
 * Pure data logic for reviewing offline.
 *
 * Only mobile needs this today — web gets offline review from Firestore's
 * IndexedDB persistent cache, which React Native has no equivalent of, so
 * mobile keeps its own card snapshot and its own queue of unsent ratings. None
 * of the reasoning below is platform-specific though, and it is the part where
 * a bug loses a user's work silently, so it lives here where it is tested.
 *
 * The storage that backs it is in `@amgi/mobile`'s `offlineReview.ts`.
 */
import type { Flashcard, ReviewTracking, StudyLanguage } from './types';
import type { ReviewDirection } from './sm2';

/** A rating made locally that Firestore hasn't accepted yet. */
export interface PendingReview {
  cardId: string;
  studyLanguage: StudyLanguage;
  direction: ReviewDirection;
  /** SM-2 output, computed on-device — the scheduler is a pure function. */
  tracking: ReviewTracking;
  /** The other direction's tracking, which the legacy `nextReview` derives from. */
  otherTracking?: ReviewTracking;
  /**
   * When the rating was made. Deliberately unused: conflicts resolve
   * last-flush-wins. Stamped anyway because it is free here, and a future
   * "newer wins" would otherwise have nothing to compare — though note that
   * rule also needs a matching timestamp *on the card*, written by web too, or
   * every web review looks infinitely old and always loses.
   */
  reviewedAt: string;
}

/** Identity of a rating: one card, in one direction, in one language. */
function pendingKeyOf(entry: PendingReview): string {
  return `${entry.studyLanguage}:${entry.cardId}:${entry.direction}`;
}

/**
 * Reduce a queue to one entry per card and direction, keeping the last.
 *
 * Each rating's tracking is computed from the state the previous rating left
 * behind, so the newest entry for a card already carries the whole session's
 * history. Three ratings on one card underground become one write on
 * reconnect, and the intermediate states were never meaningful alone.
 */
export function collapsePendingReviews(pending: PendingReview[]): PendingReview[] {
  const latest = new Map<string, PendingReview>();
  for (const entry of pending) latest.set(pendingKeyOf(entry), entry);
  return [...latest.values()];
}

/**
 * Replay unsent ratings over a card snapshot.
 *
 * Without this, an offline session that outlives the process restarts: the
 * snapshot predates the ratings, so every card already answered comes back due.
 * Applied on load, the cards read as they will once the queue lands.
 *
 * Only the rated direction is touched, which is exactly what the Firestore
 * write does — so a replayed card and a synced one are the same card.
 */
export function applyPendingReviews(
  cards: Flashcard[],
  pending: PendingReview[],
  studyLanguage: StudyLanguage,
): Flashcard[] {
  const forLanguage = collapsePendingReviews(pending).filter(
    entry => entry.studyLanguage === studyLanguage,
  );
  if (forLanguage.length === 0) return cards;

  const byCard = new Map<string, PendingReview[]>();
  for (const entry of forLanguage) {
    const existing = byCard.get(entry.cardId);
    if (existing) existing.push(entry);
    else byCard.set(entry.cardId, [entry]);
  }

  return cards.map(card => {
    const entries = card.id ? byCard.get(card.id) : undefined;
    if (!entries) return card;
    const updated = { ...card };
    for (const entry of entries) {
      updated[entry.direction] = {
        ...entry.tracking,
        nextReview: new Date(entry.tracking.nextReview),
      };
    }
    return updated;
  });
}

/**
 * Review progress, mirrored on the device.
 *
 * The streak lived only in React state plus a fire-and-forget write, so a
 * session reviewed offline and then killed lost it — and for an app whose
 * promise is "remind you before you forget", silently breaking a streak the
 * user earned is the worst kind of bug.
 */
export interface StreakState {
  streak: number;
  longestStreak: number;
  lastReviewDate: string | null;
  reviewedToday: number;
  /** These numbers have not reached Firestore yet. */
  dirty: boolean;
}

/**
 * Reconcile the device's copy with the server's.
 *
 * The server wins *unless* this device holds reviews it never managed to send,
 * which is what `dirty` marks. Dates are `YYYY-MM-DD`, so they compare
 * lexically. On the same day both sides are taken at their highest: a review on
 * another device and a review here should add up rather than one erasing the
 * other.
 */
export function mergeStreakState(
  local: StreakState | null,
  remote: StreakState | null,
): StreakState {
  const empty: StreakState = {
    streak: 0, longestStreak: 0, lastReviewDate: null, reviewedToday: 0, dirty: false,
  };
  if (!local) return remote ?? empty;
  if (!remote) return local;
  if (!local.dirty) return remote;

  const localDate = local.lastReviewDate ?? '';
  const remoteDate = remote.lastReviewDate ?? '';
  if (localDate > remoteDate) return local;
  if (remoteDate > localDate) return remote;

  return {
    streak: Math.max(local.streak, remote.streak),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    lastReviewDate: local.lastReviewDate,
    reviewedToday: Math.max(local.reviewedToday, remote.reviewedToday),
    dirty: true,
  };
}
