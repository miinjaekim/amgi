import { describe, it, expect } from 'vitest';
import { getNextReviewData } from './sm2';
import {
  MATURE_INTERVAL_DAYS, freshTracking, isCardMature, isDue, isFlashcardMature,
  legacyNextReview, maturityChange, trackingFor,
} from '@amgi/core';
import { Flashcard } from './firestore';

describe('getNextReviewData (SM-2)', () => {
  const baseCard: Flashcard = {
    id: 'test',
    uid: 'user',
    createdAt: new Date(),
    term: 'test',
    termLanguage: 'English',
    korean: '테스트',
    english: 'test',
    translation: '테스트',
    definition: 'test',
    examples: [],
    notes: '',
    interval: 0,
    ease: 2.5,
    repetitions: 0,
  };

  it('should reset interval and repetitions for "again"', () => {
    const result = getNextReviewData(baseCard, 'again');
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.ease).toBeLessThanOrEqual(2.5);
  });

  it('leaves a missed card due now rather than scheduling it out', () => {
    // Answering wrong is what should *keep* a card in today's queue. The reset
    // interval of 1 describes the next successful pass, not this one.
    const before = Date.now();
    const result = getNextReviewData(baseCard, 'again');
    expect(result.nextReview.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.nextReview.getTime()).toBeLessThanOrEqual(Date.now());
    expect(isDue({ frontToBack: result })).toContain('frontToBack');
  });

  it('schedules a passed card out by its interval', () => {
    const result = getNextReviewData({ ...baseCard, interval: 1, repetitions: 1 }, 'good');
    expect(isDue({ frontToBack: result })).not.toContain('frontToBack');
  });
  it('should increment repetitions and interval for "good"', () => {
    const card = { ...baseCard, interval: 1, repetitions: 1, ease: 2.5 };
    const result = getNextReviewData(card, 'good');
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.ease).toBeGreaterThan(2.0);
  });

  it('should increment interval for "easy"', () => {
    const card = { ...baseCard, interval: 6, repetitions: 2, ease: 2.5 };
    const result = getNextReviewData(card, 'easy');
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.ease).toBeGreaterThan(2.0);
  });

  it('should set interval to 1 for first review', () => {
    const card = { ...baseCard, interval: 0, repetitions: 0, ease: 2.5 };
    const result = getNextReviewData(card, 'good');
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });
});

describe('trackingFor', () => {
  const card: Flashcard = {
    id: 'c', uid: 'u', createdAt: new Date(), term: 'x', termLanguage: 'English',
    korean: '엑스', english: 'x', translation: '엑스', definition: '', examples: [], notes: '',
  };

  it('prefers the direction’s own tracking', () => {
    const tracked = { interval: 6, ease: 2.4, repetitions: 2, nextReview: new Date('2026-09-01') };
    expect(trackingFor({ ...card, frontToBack: tracked }, 'frontToBack')).toEqual(tracked);
  });

  it('falls back to the pre-bidirectional fields', () => {
    const legacy = { ...card, interval: 10, ease: 2.1, repetitions: 3, nextReview: new Date('2026-09-02') };
    expect(trackingFor(legacy, 'backToFront')).toEqual({
      interval: 10, ease: 2.1, repetitions: 3, nextReview: new Date('2026-09-02'),
    });
  });

  it('reads the other direction’s tracking as absent, not as its own', () => {
    const other = { interval: 6, ease: 2.4, repetitions: 2, nextReview: new Date('2026-09-01') };
    const now = new Date('2026-08-25T09:00:00Z');
    expect(trackingFor({ ...card, frontToBack: other }, 'backToFront', now)).toEqual(freshTracking(now));
  });

  it('gives a never-studied card a fresh start', () => {
    const now = new Date('2026-08-25T09:00:00Z');
    expect(trackingFor(card, 'frontToBack', now)).toEqual({
      interval: 0, ease: 2.5, repetitions: 0, nextReview: now,
    });
  });
});

describe('legacyNextReview', () => {
  const soon = { interval: 1, ease: 2.5, repetitions: 1, nextReview: new Date('2026-08-26') };
  const later = { interval: 30, ease: 2.5, repetitions: 5, nextReview: new Date('2026-09-24') };

  it('takes the sooner of the two directions', () => {
    expect(legacyNextReview(later, soon)).toEqual(new Date('2026-08-26'));
    expect(legacyNextReview(soon, later)).toEqual(new Date('2026-08-26'));
  });

  it('is the rated direction when the other has never been studied', () => {
    expect(legacyNextReview(later)).toEqual(new Date('2026-09-24'));
  });

  it('accepts a stored ISO string as readily as a Date', () => {
    const stored = { ...soon, nextReview: '2026-08-26T00:00:00.000Z' };
    expect(legacyNextReview(later, stored)).toEqual(new Date('2026-08-26T00:00:00.000Z'));
  });
});

describe('rating then undoing it', () => {
  const card: Flashcard = {
    id: 'c', uid: 'u', createdAt: new Date(), term: 'x', termLanguage: 'English',
    korean: '엑스', english: 'x', translation: '엑스', definition: '', examples: [], notes: '',
  };

  it('leaves a studied direction exactly where it started', () => {
    const studied = {
      ...card,
      frontToBack: { interval: 6, ease: 2.4, repetitions: 2, nextReview: new Date('2026-09-01') },
    };
    // What the rating reads is what undo writes back.
    const before = trackingFor(studied, 'frontToBack');
    const rated = { ...studied, frontToBack: getNextReviewData(before, 'easy') };
    const undone = { ...rated, frontToBack: before };

    expect(undone.frontToBack).toEqual(studied.frontToBack);
    expect(isDue(undone, new Date('2026-08-25'))).toEqual(isDue(studied, new Date('2026-08-25')));
  });

  it('puts a never-studied direction back in the queue', () => {
    const before = trackingFor(card, 'backToFront');
    const rated = { ...card, backToFront: getNextReviewData(before, 'easy') };
    expect(isDue(rated, new Date())).not.toContain('backToFront');

    const undone = { ...rated, backToFront: before };
    expect(isDue(undone, new Date())).toContain('backToFront');
  });
});

describe('maturity', () => {
  const tracking = (interval: number) => ({ ...freshTracking(), interval });

  it('counts a card mature when either direction is over the line', () => {
    // Either rather than both, because the review screen has a direction
    // filter: a recognition-only learner would score a permanent zero under
    // the stricter rule, which reads as a broken counter rather than a strict
    // one.
    expect(isCardMature([MATURE_INTERVAL_DAYS, 0])).toBe(true);
    expect(isCardMature([0, MATURE_INTERVAL_DAYS])).toBe(true);
    expect(isCardMature([MATURE_INTERVAL_DAYS - 1, MATURE_INTERVAL_DAYS - 1])).toBe(false);
  });

  it('treats an untracked direction as zero rather than as missing', () => {
    expect(isCardMature([undefined, undefined])).toBe(false);
    expect(isCardMature([undefined, MATURE_INTERVAL_DAYS])).toBe(true);
  });

  it('reads maturity off a whole card, legacy field included', () => {
    // What the stored `mature` flag is computed from, in all three places that
    // write it — the rating, the undo, and the one-off backfill. They agree
    // because they call this rather than each picking their own field set.
    expect(isFlashcardMature({ frontToBack: { interval: MATURE_INTERVAL_DAYS } })).toBe(true);
    expect(isFlashcardMature({ backToFront: { interval: 40 } })).toBe(true);
    expect(isFlashcardMature({
      frontToBack: { interval: 6 },
      backToFront: { interval: 6 },
    })).toBe(false);
    expect(isFlashcardMature({})).toBe(false);
  });

  it('counts a card last rated before the direction split', () => {
    // Its interval lives in the deprecated top-level field and nowhere else, so
    // a backfill reading only the two directions would silently score every one
    // of these as unlearned.
    expect(isFlashcardMature({ interval: 60 })).toBe(true);
    expect(isFlashcardMature({ interval: 6 })).toBe(false);
  });

  it('reports the crossing, not the state', () => {
    expect(maturityChange(tracking(6), tracking(MATURE_INTERVAL_DAYS))).toBe(1);
    expect(maturityChange(tracking(6), tracking(15))).toBe(0);
  });

  it('does not count a card twice when its second direction catches up', () => {
    // The reason `maturityChange` needs the other direction at all. Without it
    // this rating would look exactly like a card being learned, and the counter
    // would read roughly double for any two-direction learner — the same defect
    // `reviews` already has and the asset cannot afford twice.
    const other = tracking(40);
    expect(maturityChange(tracking(6), tracking(MATURE_INTERVAL_DAYS), other)).toBe(0);
  });

  it('subtracts when a mature card lapses', () => {
    // `again` resets the interval to 1, so a learned card genuinely can come
    // back under the line.
    const lapsed = getNextReviewData(tracking(60), 'again');
    expect(maturityChange(tracking(60), lapsed)).toBe(-1);
  });

  it('holds steady when a mature card lapses in one direction but not the other', () => {
    const lapsed = getNextReviewData(tracking(60), 'again');
    expect(maturityChange(tracking(60), lapsed, tracking(90))).toBe(0);
  });

  it('is zero for a rating that changes nothing about maturity', () => {
    expect(maturityChange(tracking(1), getNextReviewData(tracking(1), 'again'))).toBe(0);
  });

  it('matches what SM-2 actually schedules, not a hand-picked interval', () => {
    // Walks a card up through real ratings rather than asserting against a
    // number typed into the test: 1, 6, then ease-multiplied. The crossing has
    // to fall on the rating that genuinely takes the interval past 21.
    let current = freshTracking();
    const crossings: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const next = getNextReviewData(current, 'good');
      crossings.push(maturityChange(current, next));
      current = { ...next, nextReview: next.nextReview };
    }
    expect(crossings.filter(c => c === 1)).toHaveLength(1);
    expect(current.interval).toBeGreaterThanOrEqual(MATURE_INTERVAL_DAYS);
  });
});
