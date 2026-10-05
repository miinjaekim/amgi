import { describe, it, expect } from 'vitest';
import {
  cardReviewStatus,
  directionReviewStatus,
  directionsAgree,
  freshTracking,
  getNextReviewData,
  isDue,
  reviewStatusLabel,
} from '@amgi/core';
import type { Flashcard, ReviewTracking } from '@amgi/core';

const DAY = 24 * 60 * 60 * 1000;
// Local noon, so adding whole days never crosses a calendar day by accident.
const NOW = new Date(2026, 9, 5, 12, 0, 0);
const at = (days: number, interval = 6): ReviewTracking => ({
  nextReview: new Date(NOW.getTime() + days * DAY), interval, ease: 2.5, repetitions: 2,
});
const card = (fields: Partial<Flashcard>) => fields as Flashcard;

describe('directionReviewStatus', () => {
  it('calls a freshly saved direction new, not due', () => {
    const saved = card({ frontToBack: freshTracking(NOW), backToFront: freshTracking(NOW) });
    expect(directionReviewStatus(saved, 'frontToBack', NOW)).toEqual({ kind: 'new' });
  });

  it('calls a direction rated "again" due, because it has been seen', () => {
    const { nextReview, ...rest } = getNextReviewData(freshTracking(NOW), 'again');
    const missed = card({ frontToBack: { ...rest, nextReview } });
    expect(directionReviewStatus(missed, 'frontToBack', new Date(nextReview.getTime() + 1000))).toEqual({ kind: 'due' });
  });

  it('gives the date of a direction that is not due yet', () => {
    expect(directionReviewStatus(card({ frontToBack: at(3) }), 'frontToBack', NOW))
      .toEqual({ kind: 'scheduled', at: new Date(NOW.getTime() + 3 * DAY) });
  });

  it('reads a card from before the direction split from its top-level fields', () => {
    const legacy = card({ nextReview: new Date(NOW.getTime() + 2 * DAY), interval: 6 });
    expect(directionReviewStatus(legacy, 'backToFront', NOW).kind).toBe('scheduled');
    expect(directionReviewStatus(card({ nextReview: NOW, interval: 0 }), 'backToFront', NOW).kind).toBe('new');
  });

  it('does not let the top-level fields stand in once either direction is tracked', () => {
    const oneWay = card({ frontToBack: at(3), nextReview: new Date(NOW.getTime() + 3 * DAY), interval: 6 });
    expect(directionReviewStatus(oneWay, 'backToFront', NOW)).toEqual({ kind: 'new' });
  });
});

describe('cardReviewStatus', () => {
  it('is new only when neither direction has been rated', () => {
    expect(cardReviewStatus(card({}), NOW)).toEqual({ kind: 'new' });
    expect(cardReviewStatus(card({ frontToBack: freshTracking(NOW), backToFront: freshTracking(NOW) }), NOW))
      .toEqual({ kind: 'new' });
  });

  it('is due when one direction is, whatever the other says', () => {
    expect(cardReviewStatus(card({ frontToBack: at(-1), backToFront: at(5) }), NOW)).toEqual({ kind: 'due' });
  });

  it('is due when it has been studied one way and never the other', () => {
    expect(cardReviewStatus(card({ frontToBack: at(5) }), NOW)).toEqual({ kind: 'due' });
  });

  it('takes the sooner date when both directions are ahead', () => {
    expect(cardReviewStatus(card({ frontToBack: at(9), backToFront: at(2) }), NOW))
      .toEqual({ kind: 'scheduled', at: new Date(NOW.getTime() + 2 * DAY) });
  });

  it('never calls a card scheduled that Review would ask now, or the reverse', () => {
    const cases = [
      card({}),
      card({ frontToBack: freshTracking(NOW), backToFront: freshTracking(NOW) }),
      card({ frontToBack: at(-1), backToFront: at(5) }),
      card({ frontToBack: at(5) }),
      card({ frontToBack: at(9), backToFront: at(2) }),
      card({ nextReview: new Date(NOW.getTime() - DAY), interval: 6 }),
      card({ nextReview: new Date(NOW.getTime() + DAY), interval: 6 }),
    ];
    for (const c of cases) {
      expect(cardReviewStatus(c, NOW).kind === 'scheduled').toBe(isDue(c, NOW).length === 0);
    }
  });
});

describe('directionsAgree', () => {
  it('holds for two new directions and for two dates on the same day', () => {
    expect(directionsAgree(card({}), NOW)).toBe(true);
    const sameDay = card({ frontToBack: at(3), backToFront: { ...at(3), nextReview: new Date(NOW.getTime() + 3 * DAY + 60_000) } });
    expect(directionsAgree(sameDay, NOW)).toBe(true);
  });

  it('fails when the directions are on different days or in different states', () => {
    expect(directionsAgree(card({ frontToBack: at(3), backToFront: at(4) }), NOW)).toBe(false);
    expect(directionsAgree(card({ frontToBack: at(3) }), NOW)).toBe(false);
  });
});

describe('reviewStatusLabel', () => {
  const scheduled = (days: number, hours = 0) =>
    ({ kind: 'scheduled' as const, at: new Date(NOW.getTime() + days * DAY + hours * 60 * 60 * 1000) });

  it('names new and due', () => {
    expect(reviewStatusLabel('English', { kind: 'new' }, NOW)).toBe('New card');
    expect(reviewStatusLabel('English', { kind: 'new' }, NOW, 'direction')).toBe('Not reviewed yet');
    expect(reviewStatusLabel('English', { kind: 'due' }, NOW)).toBe('Due now');
    expect(reviewStatusLabel('Korean', { kind: 'new' }, NOW)).toBe('새 카드');
    expect(reviewStatusLabel('Korean', { kind: 'due' }, NOW)).toBe('지금 복습할 차례');
  });

  it('counts calendar days, not 24-hour periods', () => {
    expect(reviewStatusLabel('English', scheduled(0, 3), NOW)).toBe('Next review: today');
    // 13 hours on is tomorrow at 1am: under a day away, and still tomorrow.
    expect(reviewStatusLabel('English', scheduled(0, 13), NOW)).toBe('Next review: tomorrow');
    expect(reviewStatusLabel('English', scheduled(1), NOW)).toBe('Next review: tomorrow');
    expect(reviewStatusLabel('English', scheduled(6), NOW)).toBe('Next review: in 6 days');
    expect(reviewStatusLabel('Korean', scheduled(1), NOW)).toBe('다음 복습: 내일');
    expect(reviewStatusLabel('Korean', scheduled(6), NOW)).toBe('다음 복습: 6일 후');
  });

  it('switches to the date once a count of days stops being readable', () => {
    expect(reviewStatusLabel('English', scheduled(30), NOW)).toBe('Next review: in 30 days');
    expect(reviewStatusLabel('English', scheduled(31), NOW)).toBe('Next review: Nov 5, 2026');
  });
});
