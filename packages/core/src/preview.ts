import type { Flashcard } from './types';
import { isDue, trackingFor } from './sm2';
import { advanceDrillQueue, startDrillQueue } from './drill';

/**
 * Preview is a pass through a deck's cards to get familiar with them, or
 * refresh them, before they are asked for: its new cards, its due ones, or
 * both (`PreviewScope`). It is not a gate in front of Review: a card is as due
 * after a preview as it was before. And like a Packs drill it writes nothing,
 * no SM-2 state, no rollups and no card, so the queue next time is the same
 * cards again.
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

/**
 * Rated before and due again, in either direction. Not just `isDue`: a new
 * card is always due (an untracked direction counts as due), so "due" alone
 * would take in every new card and "both" would add nothing to it.
 */
export function isDueRatedCard(card: Flashcard, now: Date = new Date()): boolean {
  return !isNewCard(card) && isDue(card, now).length > 0;
}

/** Which cards a preview takes. New and due never overlap, so both is their sum. */
export type PreviewScope = 'new' | 'due' | 'both';

/** In the order the chooser offers them. */
export const PREVIEW_SCOPES: readonly PreviewScope[] = ['new', 'due', 'both'];

/** The cards in a set that `scope` takes, in the order given. */
export function previewCards(
  cards: readonly Flashcard[],
  scope: PreviewScope,
  now: Date = new Date(),
): Flashcard[] {
  return cards.filter(card =>
    (scope !== 'due' && isNewCard(card)) || (scope !== 'new' && isDueRatedCard(card, now)));
}

/** How many cards each scope would take, for the chooser's counts. */
export function previewCounts(
  cards: readonly Flashcard[],
  now: Date = new Date(),
): Record<PreviewScope, number> {
  let fresh = 0;
  let due = 0;
  for (const card of cards) {
    if (isNewCard(card)) fresh++;
    else if (isDue(card, now).length > 0) due++;
  }
  return { new: fresh, due, both: fresh + due };
}

/** The starting queue: every card the scope takes, shuffled. */
export function startPreviewQueue(
  cards: readonly Flashcard[],
  scope: PreviewScope = 'new',
  now: Date = new Date(),
): Flashcard[] {
  return startDrillQueue(previewCards(cards, scope, now), null);
}

/**
 * Answers the card at the front. `gotIt` takes it out for the rest of the
 * session; otherwise it comes round again after `DRILL_REQUEUE_GAP` cards.
 * An empty queue means the session is over.
 */
export function advancePreviewQueue(queue: readonly Flashcard[], gotIt: boolean): Flashcard[] {
  return advanceDrillQueue(queue, gotIt);
}
