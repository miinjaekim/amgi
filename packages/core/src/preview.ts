import type { Flashcard } from './types';
import { trackingFor } from './sm2';
import { advanceDrillQueue, startDrillQueue } from './drill';

/**
 * Preview is a pass through a deck's new cards to get familiar with them before
 * they are asked for. It is not a gate in front of Review: a new card is due
 * the moment it is saved, whether or not it has been previewed. And like a
 * Packs drill it writes nothing, no SM-2 state, no rollups and no card, so the
 * queue next time is the deck's new cards again.
 *
 * The loop is the drill's: a card you have got leaves the queue, and one you
 * want to see again goes back in a few cards later. Only the vocabulary of
 * the two answers differs, and that lives in the UI.
 */

/**
 * Never rated in either direction. A card is saved at interval 0 with 0
 * repetitions both ways, and the first rating of any kind moves one of them
 * (Again sets the interval to 1), so 0/0 on both sides is "new" without a
 * field of its own. A card missed once in Review is therefore not new.
 *
 * Read through `trackingFor`, so a card from before directions were tracked
 * apart is judged by its legacy top-level fields, as Review would rate it.
 */
export function isNewCard(card: Flashcard): boolean {
  return (['frontToBack', 'backToFront'] as const).every(direction => {
    const { interval, repetitions } = trackingFor(card, direction);
    return interval === 0 && repetitions === 0;
  });
}

/** The new cards in a set, in the order given. */
export function newCards(cards: readonly Flashcard[]): Flashcard[] {
  return cards.filter(isNewCard);
}

/** The starting queue: every new card, shuffled. */
export function startPreviewQueue(cards: readonly Flashcard[]): Flashcard[] {
  return startDrillQueue(newCards(cards), null);
}

/**
 * Answers the card at the front. `gotIt` takes it out for the rest of the
 * session; otherwise it comes round again after `DRILL_REQUEUE_GAP` cards.
 * An empty queue means the session is over.
 */
export function advancePreviewQueue(queue: readonly Flashcard[], gotIt: boolean): Flashcard[] {
  return advanceDrillQueue(queue, gotIt);
}
