import type { Flashcard } from './types';
import { isDue } from './sm2';
import type { ReviewDirection } from './sm2';

/**
 * A review session is chosen along two axes: *which* cards (the collection)
 * and *which way round* (the direction). They are kept apart rather than
 * collapsed into one list of options, which would multiply out — five packs
 * times three directions is fifteen rows to read before studying anything.
 *
 * Everything here is pure, because the queue is the same on web and mobile and
 * the queue is the part worth testing.
 */

/** Both ways round, or one of them. */
export type DirectionFilter = 'both' | ReviewDirection;

/** The choices offered, in the order they are shown. */
export const DIRECTION_FILTERS: readonly DirectionFilter[] = ['both', 'frontToBack', 'backToFront'];

/**
 * One entry per due *direction*, not per card — the same card appears twice
 * when it is due both ways, and is asked as two separate questions.
 */
export interface ReviewQueueItem {
  card: Flashcard;
  direction: ReviewDirection;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Everything due in these cards right now, both ways round, in card order.
 *
 * This is what the due counts on the start screen are built from, so the
 * number on the button and the length of the queue behind it cannot disagree.
 */
export function dueReviewItems(cards: readonly Flashcard[], now: Date = new Date()): ReviewQueueItem[] {
  const items: ReviewQueueItem[] = [];
  for (const card of cards) {
    for (const direction of isDue(card, now)) {
      items.push({ card, direction });
    }
  }
  return items;
}

/** The subset a direction would actually serve. */
export function filterByDirection(
  items: readonly ReviewQueueItem[],
  filter: DirectionFilter
): ReviewQueueItem[] {
  return filter === 'both' ? [...items] : items.filter(item => item.direction === filter);
}

/**
 * A session queue: what is due in this direction, shuffled.
 *
 * Shuffled rather than left in card order, or a deck saved in one sitting is
 * reviewed in the order it was written every time — which turns recall of the
 * card into recall of the sequence.
 */
export function buildReviewQueue(
  cards: readonly Flashcard[],
  filter: DirectionFilter,
  now: Date = new Date()
): ReviewQueueItem[] {
  return shuffle(filterByDirection(dueReviewItems(cards, now), filter));
}

/**
 * Drop a card from a session queue after archiving or deleting it — every
 * entry for it, not the one on screen.
 *
 * The queue holds one entry per due *direction*, so removing by index leaves
 * the card queued the other way round: archive it in a `both` session and it
 * comes back a few cards later, delete it and what comes back points at a
 * document that no longer exists.
 *
 * Returns where the session should now sit as well as the queue, because the
 * two only agree if the entries removed *before* the current one are counted:
 * the index has to slide back by that many to still point at the card that
 * followed. An empty queue means the session is over.
 */
export function removeCardFromQueue(
  queue: readonly ReviewQueueItem[],
  cardId: string,
  currentIndex: number
): { queue: ReviewQueueItem[]; index: number } {
  const remaining = queue.filter(item => item.card.id !== cardId);
  const removedBefore = queue
    .slice(0, Math.max(currentIndex, 0))
    .filter(item => item.card.id === cardId).length;
  const index = Math.min(
    Math.max(currentIndex - removedBefore, 0),
    Math.max(remaining.length - 1, 0)
  );
  return { queue: remaining, index };
}
