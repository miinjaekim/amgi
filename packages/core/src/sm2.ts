import type { Flashcard, ReviewTracking } from './types';

type CardForReview = Flashcard | ReviewTracking | {
  interval?: number;
  ease?: number;
  repetitions?: number;
};

/** The two ways a card can be asked: study side first, or translation first. */
export type ReviewDirection = 'frontToBack' | 'backToFront';

/** A card carries scheduling per direction, plus the pre-split legacy fields. */
type CardForDueCheck = Pick<Flashcard, 'frontToBack' | 'backToFront' | 'nextReview'>;

/**
 * The directions a card is due in — empty when it is not due at all.
 *
 * A direction with no tracking has never been studied that way, so it is due:
 * that is what puts a freshly saved card at the front of the queue. Only a card
 * with *neither* direction tracked falls back to the legacy top-level
 * `nextReview`, which is all a pre-bidirectional card has.
 */
export function isDue(card: CardForDueCheck, now: Date = new Date()): ReviewDirection[] {
  const legacy = !card.frontToBack && !card.backToFront && card.nextReview
    ? new Date(card.nextReview)
    : null;
  const dueIn = (tracking?: ReviewTracking) => {
    if (tracking) return new Date(tracking.nextReview) <= now;
    return legacy ? legacy <= now : true;
  };
  const directions: ReviewDirection[] = [];
  if (dueIn(card.frontToBack)) directions.push('frontToBack');
  if (dueIn(card.backToFront)) directions.push('backToFront');
  return directions;
}

/**
 * The soonest review still ahead of `now`, or null when nothing is scheduled —
 * what "all caught up, come back on…" is built from.
 */
export function getNextReviewDate(cards: CardForDueCheck[], now: Date = new Date()): Date | null {
  let earliest: number | null = null;
  for (const card of cards) {
    const scheduled = [card.frontToBack?.nextReview, card.backToFront?.nextReview];
    if (!card.frontToBack && !card.backToFront) scheduled.push(card.nextReview);
    for (const value of scheduled) {
      if (!value) continue;
      const time = new Date(value).getTime();
      if (time > now.getTime() && (earliest === null || time < earliest)) earliest = time;
    }
  }
  return earliest === null ? null : new Date(earliest);
}

export function getNextReviewData(card: CardForReview, response: 'again' | 'hard' | 'good' | 'easy') {
  let interval = card.interval ?? 0;
  let ease = card.ease ?? 2.5;
  let repetitions = card.repetitions ?? 0;
  const now = new Date();

  let quality = 0;
  if (response === 'again') quality = 0;
  else if (response === 'hard') quality = 3;
  else if (response === 'good') quality = 4;
  else if (response === 'easy') quality = 5;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = (repetitions || 0) + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // "Again" means the card is not learned, so it stays due now rather than
  // being pushed out by the reset interval — answering it wrong should not be
  // what makes it disappear from today's queue. `interval` still resets to 1,
  // which is what the *next* successful pass schedules from.
  //
  // Web used to patch this at its call site and mobile did not, so the same
  // card lapsed differently on each platform. It belongs here.
  const nextReview = quality < 3
    ? now
    : new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { interval, ease, repetitions, nextReview };
}

/**
 * How many cards later a missed card comes back inside the same session.
 * Mirrors `DRILL_REQUEUE_GAP` — far enough that it isn't answered from
 * short-term memory, near enough to still be the same sitting.
 */
export const REVIEW_REQUEUE_GAP = 4;

/**
 * Put a missed card back into the queue, a few positions ahead.
 *
 * Marking a card "again" and watching it vanish until tomorrow is the opposite
 * of what the rating says. Scheduling alone can't fix that — the session's
 * queue is built once, so a card that is due again is still not *asked* again
 * — which is why the card has to be reinserted explicitly.
 */
export function requeueMissedCard<T>(
  queue: T[],
  index: number,
  item: T,
  gap: number = REVIEW_REQUEUE_GAP,
): T[] {
  const rest = queue.slice(index + 1);
  const at = Math.min(gap, rest.length);
  return [...queue.slice(0, index + 1), ...rest.slice(0, at), item, ...rest.slice(at)];
}
