import { describe, it, expect } from 'vitest';
import {
  applyDelta,
  buildHeatmap,
  dateRange,
  deriveStreak,
  emptyDailyProgress,
  localDateString,
  mergeDeltas,
  newCardsDelta,
  reviewDelta,
  shiftDate,
  summarizeProgress,
  type DailyProgress,
} from '@amgi/core';

/** A day with only the fields a test cares about; the rest stay zero. */
function day(date: string, patch: Partial<DailyProgress> = {}): DailyProgress {
  return { ...emptyDailyProgress(date), ...patch };
}

describe('date helpers', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 7, 19, 23, 30))).toBe('2026-08-19');
  });

  it('shifts forwards and backwards', () => {
    expect(shiftDate('2026-08-19', 1)).toBe('2026-08-20');
    expect(shiftDate('2026-08-19', -1)).toBe('2026-08-18');
  });

  it('crosses month and year boundaries', () => {
    expect(shiftDate('2026-08-31', 1)).toBe('2026-09-01');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('survives a DST transition, which a naive local-time shift does not', () => {
    // US DST ends 2026-11-01; a local-midnight + 24h shift lands back on the
    // same date. Every day in the range must still be distinct.
    const range = dateRange('2026-10-30', '2026-11-03');
    expect(range).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('returns a single day for a zero-width range', () => {
    expect(dateRange('2026-08-19', '2026-08-19')).toEqual(['2026-08-19']);
  });
});

describe('deltas', () => {
  it('counts a rating once, against its verdict and its language', () => {
    expect(reviewDelta('Korean', 'good')).toEqual({
      reviews: 1,
      good: 1,
      byLanguage: { Korean: { reviews: 1 } },
    });
  });

  it('separates pack enrolment from cards added one at a time', () => {
    expect(newCardsDelta('Japanese', 1, 'lookup')).toEqual({
      newCards: 1,
      byLanguage: { Japanese: { newCards: 1 } },
    });
    expect(newCardsDelta('Japanese', 474, 'pack')).toEqual({
      packCards: 474,
      byLanguage: { Japanese: { packCards: 474 } },
    });
  });

  it('merges two deltas by summing every counter', () => {
    const merged = mergeDeltas(reviewDelta('Korean', 'good'), reviewDelta('Korean', 'again'));
    expect(merged).toEqual({
      reviews: 2,
      good: 1,
      again: 1,
      byLanguage: { Korean: { reviews: 2 } },
    });
  });

  it('keeps languages apart when merging', () => {
    const merged = mergeDeltas(reviewDelta('Korean', 'good'), reviewDelta('French', 'good'));
    expect(merged.reviews).toBe(2);
    expect(merged.byLanguage).toEqual({ Korean: { reviews: 1 }, French: { reviews: 1 } });
  });

  it('collapses a whole offline session into one delta', () => {
    // The reason this exists: a queue of unsent ratings should reconnect as a
    // single document update, not one write per tap.
    const session = [
      reviewDelta('Korean', 'good'),
      reviewDelta('Korean', 'good'),
      reviewDelta('Korean', 'hard'),
      newCardsDelta('Korean', 2, 'lookup'),
    ];
    const collapsed = session.reduce(mergeDeltas);
    expect(collapsed).toEqual({
      reviews: 3,
      newCards: 2,
      good: 2,
      hard: 1,
      byLanguage: { Korean: { reviews: 3, newCards: 2 } },
    });
  });

  it('applies a delta onto a day without mutating it', () => {
    const before = day('2026-08-19', { reviews: 5, good: 5, byLanguage: { Korean: { reviews: 5, newCards: 0, packCards: 0 } } });
    const after = applyDelta(before, reviewDelta('Korean', 'again'));

    expect(after.reviews).toBe(6);
    expect(after.again).toBe(1);
    expect(after.byLanguage.Korean).toEqual({ reviews: 6, newCards: 0, packCards: 0 });
    expect(before.reviews).toBe(5);
    expect(before.byLanguage.Korean?.reviews).toBe(5);
  });

  it('applies a delta for a language the day has never seen', () => {
    const after = applyDelta(day('2026-08-19'), newCardsDelta('Swedish', 3, 'lookup'));
    expect(after.byLanguage.Swedish).toEqual({ reviews: 0, newCards: 3, packCards: 0 });
  });
});

describe('deriveStreak', () => {
  const today = '2026-08-19';

  it('counts consecutive days ending today', () => {
    const days = ['2026-08-17', '2026-08-18', '2026-08-19'].map(d => day(d, { reviews: 4 }));
    expect(deriveStreak(days, today)).toBe(3);
  });

  it('does not break the streak when today has not happened yet', () => {
    // The day is not over. This mirrors the stored counter, which only advances
    // on the first review of a day rather than resetting at midnight.
    const days = ['2026-08-17', '2026-08-18'].map(d => day(d, { reviews: 4 }));
    expect(deriveStreak(days, today)).toBe(2);
  });

  it('stops at a gap', () => {
    const days = ['2026-08-15', '2026-08-18', '2026-08-19'].map(d => day(d, { reviews: 4 }));
    expect(deriveStreak(days, today)).toBe(2);
  });

  it('ignores a day that only added cards', () => {
    // Adding a card is not studying, so it cannot hold a streak up.
    const days = [day('2026-08-18', { reviews: 4 }), day('2026-08-19', { newCards: 10 })];
    expect(deriveStreak(days, today)).toBe(1);
  });

  it('is zero with no history', () => {
    expect(deriveStreak([], today)).toBe(0);
  });
});

describe('summarizeProgress', () => {
  it('totals reviews, cards and active days', () => {
    const days = [
      day('2026-08-17', { reviews: 10, newCards: 2, byLanguage: { Korean: { reviews: 10, newCards: 2, packCards: 0 } } }),
      day('2026-08-18', { newCards: 5, byLanguage: { Korean: { reviews: 0, newCards: 5, packCards: 0 } } }),
      day('2026-08-19', { reviews: 30, packCards: 100, byLanguage: { Japanese: { reviews: 30, newCards: 0, packCards: 100 } } }),
    ];
    const summary = summarizeProgress(days);

    expect(summary.totalReviews).toBe(40);
    expect(summary.totalNewCards).toBe(7);
    expect(summary.totalPackCards).toBe(100);
    // 08-18 added cards but reviewed nothing, so it is not an active day.
    expect(summary.activeDays).toBe(2);
    expect(summary.averagePerActiveDay).toBe(20);
  });

  it('ranks languages by reviews', () => {
    const days = [
      day('2026-08-18', { reviews: 5, byLanguage: { Korean: { reviews: 2, newCards: 0, packCards: 0 }, Japanese: { reviews: 3, newCards: 0, packCards: 0 } } }),
      day('2026-08-19', { reviews: 4, byLanguage: { Japanese: { reviews: 4, newCards: 0, packCards: 0 } } }),
    ];
    const summary = summarizeProgress(days);

    expect(summary.byLanguage.map(entry => entry.studyLanguage)).toEqual(['Japanese', 'Korean']);
    expect(summary.byLanguage[0].progress.reviews).toBe(7);
  });

  it('does not divide by zero on an empty window', () => {
    const summary = summarizeProgress([]);
    expect(summary.averagePerActiveDay).toBe(0);
    expect(summary.byLanguage).toEqual([]);
  });
});

describe('buildHeatmap', () => {
  it('fills gaps with zeroes and returns one cell per day', () => {
    const cells = buildHeatmap([day('2026-08-19', { reviews: 4 })], '2026-08-19', 7);
    expect(cells).toHaveLength(7);
    expect(cells[0].date).toBe('2026-08-13');
    expect(cells[0]).toMatchObject({ reviews: 0, level: 0 });
    expect(cells[6]).toMatchObject({ date: '2026-08-19', reviews: 4, level: 4 });
  });

  it('scales levels against the busiest day in the window', () => {
    // A light user and a heavy user should both get a legible gradient, so the
    // bands are relative rather than fixed thresholds.
    const days = [
      day('2026-08-16', { reviews: 100 }),
      day('2026-08-17', { reviews: 60 }),
      day('2026-08-18', { reviews: 30 }),
      day('2026-08-19', { reviews: 10 }),
    ];
    const levels = buildHeatmap(days, '2026-08-19', 4).map(cell => cell.level);
    expect(levels).toEqual([4, 3, 2, 1]);
  });

  it('gives any reviewed day a non-zero level', () => {
    // One review against a 500-review day still has to be visibly different
    // from a rest day, or the calendar lies about the habit.
    const days = [day('2026-08-18', { reviews: 500 }), day('2026-08-19', { reviews: 1 })];
    const cells = buildHeatmap(days, '2026-08-19', 2);
    expect(cells[1].level).toBe(1);
  });

  it('is all zeroes when nothing was reviewed', () => {
    const cells = buildHeatmap([], '2026-08-19', 3);
    expect(cells.every(cell => cell.level === 0 && cell.reviews === 0)).toBe(true);
  });
});
