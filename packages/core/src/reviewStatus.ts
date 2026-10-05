import type { Flashcard } from './types';
import type { ReviewDirection } from './sm2';
import { directionLabel, t } from './i18n';

/**
 * Where a card stands with the schedule, for showing rather than for queueing.
 *
 * `isDue` answers "is this in today's queue" and that is all Review needs. A
 * card list wants one more distinction — a card nobody has rated yet is due
 * too, but "due" reads as overdue, and what the learner wants to know is that
 * it is new.
 */
export type ReviewStatus =
  | { kind: 'new' }
  | { kind: 'due' }
  | { kind: 'scheduled'; at: Date };

type CardForStatus = Pick<Flashcard, 'frontToBack' | 'backToFront' | 'nextReview' | 'interval'>;

/** Both directions, in the order they are shown. */
export const REVIEW_DIRECTIONS: readonly ReviewDirection[] = ['frontToBack', 'backToFront'];

/**
 * One direction's status.
 *
 * "New" is an interval of zero: saving writes both directions with one, and
 * every rating — `again` included — leaves it at one or more, so it is the
 * only field that separates "never rated" from "rated and due now".
 *
 * A direction with no tracking is read the way `isDue` reads it, so this can
 * never disagree with the queue: the legacy top-level fields stand in only on
 * a card with *neither* direction tracked.
 */
export function directionReviewStatus(
  card: CardForStatus,
  direction: ReviewDirection,
  now: Date = new Date(),
): ReviewStatus {
  const legacyOnly = !card.frontToBack && !card.backToFront && !!card.nextReview;
  const tracking = card[direction]
    ?? (legacyOnly ? { nextReview: card.nextReview!, interval: card.interval ?? 0 } : undefined);
  if (!tracking || !tracking.interval) return { kind: 'new' };
  const at = new Date(tracking.nextReview);
  return at <= now ? { kind: 'due' } : { kind: 'scheduled', at };
}

/**
 * The card as a whole: new until it has been rated either way, due if Review
 * would ask it now in either direction, otherwise its sooner date.
 *
 * A card studied one way and never the other is **due**, not new and not
 * scheduled, because that is what Review does with it — the unstudied
 * direction is in the queue today.
 */
export function cardReviewStatus(card: CardForStatus, now: Date = new Date()): ReviewStatus {
  const statuses = REVIEW_DIRECTIONS.map(direction => directionReviewStatus(card, direction, now));
  if (statuses.every(status => status.kind === 'new')) return { kind: 'new' };
  if (statuses.some(status => status.kind !== 'scheduled')) return { kind: 'due' };
  const dates = statuses.map(status => (status as { at: Date }).at.getTime());
  return { kind: 'scheduled', at: new Date(Math.min(...dates)) };
}

/** Whole local days from `now` to `date` — 1 for any time tomorrow. */
function daysUntil(date: Date, now: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(date) - start(now)) / 86_400_000);
}

/** Past this, a count of days stops meaning anything and the date says it better. */
const DAYS_BEFORE_DATE = 30;

/**
 * Whether the two directions would read the same, so a surface can say it once
 * instead of twice. Two dates match when they fall on the same day.
 */
export function directionsAgree(card: CardForStatus, now: Date = new Date()): boolean {
  const [a, b] = REVIEW_DIRECTIONS.map(direction => directionReviewStatus(card, direction, now));
  if (a.kind !== b.kind) return false;
  return a.kind !== 'scheduled' || daysUntil(a.at, now) === daysUntil((b as { at: Date }).at, now);
}

/**
 * The status as a phrase: "New card", "Due now", "Next review: in 3 days".
 *
 * `scope` only changes the wording of new. A *card* nobody has rated is a new
 * card; one *direction* nobody has rated, on a card studied the other way, is
 * not a new anything — it just has not been reviewed that way yet.
 */
export function reviewStatusLabel(
  interfaceLanguage: string | null | undefined,
  status: ReviewStatus,
  now: Date = new Date(),
  scope: 'card' | 'direction' = 'card',
): string {
  if (status.kind === 'new') {
    return t(interfaceLanguage, scope === 'card' ? 'cardStatusNew' : 'cardStatusNotReviewed');
  }
  if (status.kind === 'due') return t(interfaceLanguage, 'cardStatusDue');
  const days = daysUntil(status.at, now);
  const when = days <= 0
    ? t(interfaceLanguage, 'cardStatusToday')
    : days === 1
      ? t(interfaceLanguage, 'cardStatusTomorrow')
      : days <= DAYS_BEFORE_DATE
        ? t(interfaceLanguage, 'cardStatusInDays', { days })
        : status.at.toLocaleDateString(interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          });
  return `${t(interfaceLanguage, 'nextReviewOn')} ${when}`;
}

/**
 * What card detail says about the schedule: one line when both directions
 * would say the same thing, otherwise one per direction, each named the way
 * Review's direction chips name it.
 *
 * My Cards shows `cardReviewStatus` alone, because a row has room for one
 * answer. This is where the other half of it is.
 */
export function cardReviewLines(
  interfaceLanguage: string | null | undefined,
  studyLanguage: Parameters<typeof directionLabel>[1],
  deckNativeLanguage: string | null | undefined,
  card: CardForStatus,
  now: Date = new Date(),
  partition?: Parameters<typeof directionLabel>[4],
): string[] {
  if (directionsAgree(card, now)) {
    return [reviewStatusLabel(interfaceLanguage, cardReviewStatus(card, now), now)];
  }
  return REVIEW_DIRECTIONS.map(direction => {
    const label = directionLabel(interfaceLanguage, studyLanguage, deckNativeLanguage, direction, partition);
    const status = reviewStatusLabel(interfaceLanguage, directionReviewStatus(card, direction, now), now, 'direction');
    return `${label} · ${status}`;
  });
}
