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

/** The above plus the legacy scheduling fields, which `trackingFor` falls back to. */
type CardForTracking = CardForDueCheck & Pick<Flashcard, 'interval' | 'ease' | 'repetitions'>;

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
  // Staying due is what lets a finished session be restarted to pick up
  // exactly the cards that were missed. It deliberately does not put the card
  // back into the session in progress: a session ends when it said it would.
  //
  // Web used to patch this at its call site and mobile did not, so the same
  // card lapsed differently on each platform. It belongs here.
  const nextReview = quality < 3
    ? now
    : new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { interval, ease, repetitions, nextReview };
}

/**
 * The tracking a direction restores to when it had never been studied.
 *
 * Undoing the *first* rating of a direction has nothing to put back — the
 * field did not exist before. Deleting it again would be the literal restore,
 * but this is the same thing said positively: zero repetitions, the starting
 * ease, and a `nextReview` of now — which `isDue` reads as due, exactly as it
 * reads a direction with no tracking. Writing a value rather than deleting one
 * keeps undo a single ordinary field write on both platforms, and keeps
 * mobile's pending queue able to carry it like any other rating.
 */
export function freshTracking(now: Date = new Date()): ReviewTracking {
  return { interval: 0, ease: 2.5, repetitions: 0, nextReview: now };
}

/**
 * The tracking a rating in one direction reads from, and the tracking undoing
 * that rating puts back.
 *
 * Three cases in priority order: the direction's own tracking; the
 * pre-bidirectional top-level fields, for a card last rated before the split;
 * and a fresh card's. Shared because web read the legacy fields here and
 * mobile did not, so the same untouched legacy card started from a different
 * ease on each platform — and because undo has to restore precisely what the
 * rating consumed.
 */
export function trackingFor(
  card: CardForTracking,
  direction: ReviewDirection,
  now: Date = new Date(),
): ReviewTracking {
  const tracked = card[direction];
  if (tracked) return tracked;
  const fresh = freshTracking(now);
  return {
    interval: card.interval ?? fresh.interval,
    ease: card.ease ?? fresh.ease,
    repetitions: card.repetitions ?? fresh.repetitions,
    nextReview: card.nextReview ?? fresh.nextReview,
  };
}

/**
 * The value for the deprecated top-level `nextReview`: the sooner of the two
 * directions, so a card that is due either way still reads as due to anything
 * old enough to only know this field.
 *
 * Shared because the rating path and the undo path have to agree about it, and
 * because mobile's Firestore writer was already deriving it this way.
 */
export function legacyNextReview(tracking: ReviewTracking, other?: ReviewTracking): Date {
  const thisDate = new Date(tracking.nextReview);
  const otherDate = other ? new Date(other.nextReview) : null;
  return otherDate && otherDate < thisDate ? otherDate : thisDate;
}
