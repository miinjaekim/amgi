import { describe, it, expect } from 'vitest';
import {
  applyPendingReviews,
  collapsePendingReviews,
  mergeStreakState,
  isDue,
} from '@amgi/core';
import type { Flashcard, PendingReview, ReviewTracking, StreakState } from '@amgi/core';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-26T09:00:00Z');

function tracking(daysFromNow: number, overrides: Partial<ReviewTracking> = {}): ReviewTracking {
  return {
    nextReview: new Date(NOW.getTime() + daysFromNow * DAY),
    interval: 1,
    ease: 2.5,
    repetitions: 1,
    ...overrides,
  };
}

function card(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    uid: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    korean: '단어',
    english: 'word',
    ...overrides,
  } as Flashcard;
}

function pending(
  cardId: string,
  direction: 'frontToBack' | 'backToFront',
  overrides: Partial<PendingReview> = {},
): PendingReview {
  return {
    cardId,
    studyLanguage: 'Korean',
    direction,
    tracking: tracking(3),
    reviewedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('collapsePendingReviews', () => {
  it('keeps only the last rating for a card and direction', () => {
    const first = pending('a', 'frontToBack', { tracking: tracking(1) });
    const second = pending('a', 'frontToBack', { tracking: tracking(6) });

    const collapsed = collapsePendingReviews([first, second]);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].tracking.nextReview).toEqual(tracking(6).nextReview);
  });

  it('treats the two directions of one card as separate ratings', () => {
    const collapsed = collapsePendingReviews([
      pending('a', 'frontToBack'),
      pending('a', 'backToFront'),
    ]);

    expect(collapsed).toHaveLength(2);
  });

  it('does not merge the same card id across study languages', () => {
    // Each language is its own Firestore collection, so equal ids are
    // different cards entirely.
    const collapsed = collapsePendingReviews([
      pending('a', 'frontToBack', { studyLanguage: 'Korean' }),
      pending('a', 'frontToBack', { studyLanguage: 'Japanese' }),
    ]);

    expect(collapsed).toHaveLength(2);
  });

  it('returns nothing for an empty queue', () => {
    expect(collapsePendingReviews([])).toEqual([]);
  });
});

describe('applyPendingReviews', () => {
  it('replays a rating so the card is no longer due', () => {
    const due = card('a', { frontToBack: tracking(-1), backToFront: tracking(5) });
    expect(isDue(due, NOW)).toContain('frontToBack');

    const [replayed] = applyPendingReviews(
      [due],
      [pending('a', 'frontToBack', { tracking: tracking(4) })],
      'Korean',
    );

    expect(isDue(replayed, NOW)).not.toContain('frontToBack');
  });

  it('leaves the untouched direction alone', () => {
    const original = tracking(5);
    const [replayed] = applyPendingReviews(
      [card('a', { frontToBack: tracking(-1), backToFront: original })],
      [pending('a', 'frontToBack', { tracking: tracking(4) })],
      'Korean',
    );

    expect(replayed.backToFront).toEqual(original);
  });

  it('ignores ratings belonging to another study language', () => {
    const cards = [card('a', { frontToBack: tracking(-1) })];

    const [replayed] = applyPendingReviews(
      cards,
      [pending('a', 'frontToBack', { studyLanguage: 'Japanese', tracking: tracking(9) })],
      'Korean',
    );

    expect(replayed.frontToBack).toEqual(tracking(-1));
  });

  it('applies only the last of several ratings for one card', () => {
    const [replayed] = applyPendingReviews(
      [card('a', { frontToBack: tracking(-1) })],
      [
        pending('a', 'frontToBack', { tracking: tracking(1) }),
        pending('a', 'frontToBack', { tracking: tracking(8) }),
      ],
      'Korean',
    );

    expect(replayed.frontToBack?.nextReview).toEqual(tracking(8).nextReview);
  });

  it('revives a tracking date that a storage round-trip turned into a string', () => {
    const [replayed] = applyPendingReviews(
      [card('a', { frontToBack: tracking(-1) })],
      [pending('a', 'frontToBack', {
        tracking: { ...tracking(4), nextReview: new Date(NOW.getTime() + 4 * DAY).toISOString() },
      })],
      'Korean',
    );

    expect(replayed.frontToBack?.nextReview).toBeInstanceOf(Date);
    expect(isDue(replayed, NOW)).not.toContain('frontToBack');
  });

  it('returns the cards untouched when nothing is queued', () => {
    const cards = [card('a'), card('b')];
    expect(applyPendingReviews(cards, [], 'Korean')).toBe(cards);
  });

  it('skips queued ratings for cards not in the snapshot', () => {
    const cards = [card('a')];
    expect(applyPendingReviews(cards, [pending('missing', 'frontToBack')], 'Korean')).toEqual(cards);
  });
});

describe('mergeStreakState', () => {
  const remote: StreakState = {
    streak: 5, longestStreak: 9, lastReviewDate: '2026-07-25', reviewedToday: 3, dirty: false,
  };

  it('takes the server copy when the device has nothing unsent', () => {
    const local: StreakState = { ...remote, streak: 99, dirty: false };
    expect(mergeStreakState(local, remote)).toEqual(remote);
  });

  it('keeps unsent local progress made on a later day', () => {
    const local: StreakState = {
      streak: 6, longestStreak: 9, lastReviewDate: '2026-07-26', reviewedToday: 2, dirty: true,
    };
    expect(mergeStreakState(local, remote)).toEqual(local);
  });

  it('prefers the server when it has moved on past the unsent local copy', () => {
    // Reviewed on another device since; that day's work is the newer truth.
    const local: StreakState = {
      streak: 4, longestStreak: 9, lastReviewDate: '2026-07-24', reviewedToday: 1, dirty: true,
    };
    expect(mergeStreakState(local, remote)).toEqual(remote);
  });

  it('adds up rather than overwrites when both reviewed the same day', () => {
    const local: StreakState = {
      streak: 5, longestStreak: 11, lastReviewDate: '2026-07-25', reviewedToday: 7, dirty: true,
    };

    const merged = mergeStreakState(local, remote);

    expect(merged.reviewedToday).toBe(7);
    expect(merged.longestStreak).toBe(11);
    expect(merged.dirty).toBe(true);
  });

  it('uses the server copy on a device that has never cached one', () => {
    expect(mergeStreakState(null, remote)).toEqual(remote);
  });

  it('uses the local copy when the server could not be reached', () => {
    const local: StreakState = { ...remote, dirty: true };
    expect(mergeStreakState(local, null)).toEqual(local);
  });

  it('starts from zero when neither side has anything', () => {
    expect(mergeStreakState(null, null)).toEqual({
      streak: 0, longestStreak: 0, lastReviewDate: null, reviewedToday: 0, dirty: false,
    });
  });

  it('treats a never-reviewed local copy as older than any server date', () => {
    const local: StreakState = {
      streak: 0, longestStreak: 0, lastReviewDate: null, reviewedToday: 0, dirty: true,
    };
    expect(mergeStreakState(local, remote)).toEqual(remote);
  });
});
