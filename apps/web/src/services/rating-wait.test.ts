import { describe, it, expect } from 'vitest';
import {
  formatReviewWait,
  freshTracking,
  getNextReviewData,
  ratingWaitLabels,
  trackingFor,
} from '@amgi/core';
import type { Flashcard, ReviewTracking } from '@amgi/core';

const DAY = 24 * 60 * 60 * 1000;
const days = (count: number) => count * DAY;

describe('formatReviewWait', () => {
  it('counts days up to a month', () => {
    expect(formatReviewWait('English', days(1))).toBe('1d');
    expect(formatReviewWait('English', days(6))).toBe('6d');
    expect(formatReviewWait('English', days(29))).toBe('29d');
  });

  it('counts whole months from thirty days to a year', () => {
    expect(formatReviewWait('English', days(30))).toBe('1mo');
    expect(formatReviewWait('English', days(38))).toBe('1mo');
    expect(formatReviewWait('English', days(95))).toBe('3mo');
    expect(formatReviewWait('English', days(334))).toBe('11mo');
  });

  it('never says twelve months: that is a year', () => {
    expect(formatReviewWait('English', days(351))).toBe('1y');
    expect(formatReviewWait('English', days(365))).toBe('1y');
  });

  it('gives years one decimal, and drops it when it is zero', () => {
    expect(formatReviewWait('English', days(400))).toBe('1.1y');
    expect(formatReviewWait('English', days(540))).toBe('1.5y');
    expect(formatReviewWait('English', days(730))).toBe('2y');
  });

  it('says "now" for anything short of half a day, and for a time already past', () => {
    expect(formatReviewWait('English', 0)).toBe('now');
    expect(formatReviewWait('English', 5 * 60 * 1000)).toBe('now');
    expect(formatReviewWait('English', -days(3))).toBe('now');
  });

  it('reads in Korean', () => {
    expect(formatReviewWait('Korean', 0)).toBe('지금');
    expect(formatReviewWait('Korean', days(1))).toBe('1일');
    expect(formatReviewWait('Korean', days(6))).toBe('6일');
    expect(formatReviewWait('Korean', days(95))).toBe('3개월');
    expect(formatReviewWait('Korean', days(365))).toBe('1년');
  });

  it('falls back to English for a language with no translation', () => {
    expect(formatReviewWait(null, days(6))).toBe('6d');
    expect(formatReviewWait('French', days(6))).toBe('6d');
  });
});

describe('ratingWaitLabels', () => {
  const tracked: ReviewTracking = {
    interval: 6, ease: 2.5, repetitions: 2, nextReview: new Date(),
  };

  it('says "now" under Again, because a missed card stays due', () => {
    expect(ratingWaitLabels('English', tracked).again).toBe('now');
    expect(ratingWaitLabels('Korean', freshTracking()).again).toBe('지금');
  });

  // Asserted against the scheduler rather than against fixed numbers, so this
  // keeps holding when the intervals themselves change.
  it('shows under each button the wait that rating would write', () => {
    const now = new Date();
    const labels = ratingWaitLabels('English', tracked, now);
    for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
      const { nextReview } = getNextReviewData(tracked, rating);
      expect(labels[rating]).toBe(formatReviewWait('English', nextReview.getTime() - now.getTime()));
    }
    expect(labels.good).not.toBe('now');
  });

  // The scheduler's own numbers, pinned once here so a change to them shows up
  // as a change to what the learner reads.
  it('gives a new card now, 1d, 2d and 4d', () => {
    expect(ratingWaitLabels('English', freshTracking())).toEqual({
      again: 'now', hard: '1d', good: '2d', easy: '4d',
    });
    expect(ratingWaitLabels('Korean', freshTracking())).toEqual({
      again: '지금', hard: '1일', good: '2일', easy: '4일',
    });
  });

  it('tells Hard, Good and Easy apart on a card already under way', () => {
    const { hard, good, easy } = ratingWaitLabels('English', tracked);
    expect(new Set([hard, good, easy]).size).toBe(3);
  });

  it('reads a card with no tracking in that direction the way the rating does', () => {
    const now = new Date();
    const legacy = { interval: 40, ease: 2.5, repetitions: 4 } as Flashcard;
    const labels = ratingWaitLabels('English', trackingFor(legacy, 'frontToBack', now), now);
    const { nextReview } = getNextReviewData(legacy, 'good');
    expect(labels.good).toBe(formatReviewWait('English', nextReview.getTime() - now.getTime()));
    expect(labels.good).not.toBe(ratingWaitLabels('English', freshTracking(now), now).good);
  });
});
