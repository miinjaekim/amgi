import { describe, it, expect } from 'vitest';
import {
  applyDelta,
  buildHeatmap,
  dateRange,
  deriveStreak,
  emptyDailyProgress,
  emptyLanguageProgress,
  historyStartsMidWindow,
  localDateString,
  mergeDeltas,
  negateDelta,
  newCardsDelta,
  parseDailyProgress,
  ratedTotal,
  retentionRate,
  reviewDelta,
  PROGRESS_HISTORY_START,
  shiftDate,
  summarizeProgress,
  type DailyProgress,
  type LanguageProgress,
} from '@amgi/core';

/** A day with only the fields a test cares about; the rest stay zero. */
function day(date: string, patch: Partial<DailyProgress> = {}): DailyProgress {
  return { ...emptyDailyProgress(date), ...patch };
}

/** A *stored* language slice — all seven counters, so a `toEqual` matches. */
function lang(patch: Partial<LanguageProgress> = {}): LanguageProgress {
  return { ...emptyLanguageProgress(), ...patch };
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
      byLanguage: { Korean: { reviews: 1, good: 1 } },
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
      byLanguage: { Korean: { reviews: 2, good: 1, again: 1 } },
    });
  });

  it('keeps languages apart when merging', () => {
    const merged = mergeDeltas(reviewDelta('Korean', 'good'), reviewDelta('French', 'good'));
    expect(merged.reviews).toBe(2);
    expect(merged.byLanguage).toEqual({
      Korean: { reviews: 1, good: 1 },
      French: { reviews: 1, good: 1 },
    });
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
      byLanguage: { Korean: { reviews: 3, newCards: 2, good: 2, hard: 1 } },
    });
  });

  it('applies a delta onto a day without mutating it', () => {
    const before = day('2026-08-19', { reviews: 5, good: 5, byLanguage: { Korean: lang({ reviews: 5, good: 5 }) } });
    const after = applyDelta(before, reviewDelta('Korean', 'again'));

    expect(after.reviews).toBe(6);
    expect(after.again).toBe(1);
    expect(after.byLanguage.Korean).toEqual(lang({ reviews: 6, good: 5, again: 1 }));
    expect(before.reviews).toBe(5);
    expect(before.byLanguage.Korean?.reviews).toBe(5);
  });

  it('applies a delta for a language the day has never seen', () => {
    const after = applyDelta(day('2026-08-19'), newCardsDelta('Swedish', 3, 'lookup'));
    expect(after.byLanguage.Swedish).toEqual(lang({ newCards: 3 }));
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
      day('2026-08-17', { reviews: 10, newCards: 2, byLanguage: { Korean: lang({ reviews: 10, newCards: 2 }) } }),
      day('2026-08-18', { newCards: 5, byLanguage: { Korean: lang({ newCards: 5 }) } }),
      day('2026-08-19', { reviews: 30, packCards: 100, byLanguage: { Japanese: lang({ reviews: 30, packCards: 100 }) } }),
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
      day('2026-08-18', { reviews: 5, byLanguage: { Korean: lang({ reviews: 2 }), Japanese: lang({ reviews: 3 }) } }),
      day('2026-08-19', { reviews: 4, byLanguage: { Japanese: lang({ reviews: 4 }) } }),
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

describe('negateDelta', () => {
  it('cancels a rating out exactly', () => {
    const delta = reviewDelta('Japanese', 'easy');
    expect(applyDelta(applyDelta(day('2026-08-25'), delta), negateDelta(delta)))
      .toEqual(day('2026-08-25', { byLanguage: { Japanese: lang() } }));
  });

  it('negates every counter that is present and invents none', () => {
    expect(negateDelta(reviewDelta('Korean', 'again'))).toEqual({
      reviews: -1,
      again: -1,
      byLanguage: { Korean: { reviews: -1, again: -1 } },
    });
  });

  it('leaves an empty delta empty', () => {
    expect(negateDelta({})).toEqual({});
  });
});

describe('per-language verdicts', () => {
  // Added 2026-09-04. Before that the four verdict counters were whole-day
  // only, which made retention-per-language underivable — and a rollup keeps
  // only what it counted in advance, so there was nothing to backfill from.
  it('reads a document written before the split without inventing counts', () => {
    const parsed = parseDailyProgress('2026-08-25', {
      reviews: 9, again: 2, good: 7,
      byLanguage: { Korean: { reviews: 9 } },
    });

    expect(parsed.again).toBe(2);
    // The day knows it had two lapses; the language slice genuinely does not.
    expect(parsed.byLanguage.Korean).toEqual(lang({ reviews: 9 }));
    expect(retentionRate(parsed.byLanguage.Korean!)).toBeNull();
  });

  it('sums verdicts per language across a window', () => {
    const days = [
      day('2026-09-04', {
        reviews: 3, again: 1, good: 2,
        byLanguage: { Korean: lang({ reviews: 2, again: 1, good: 1 }), French: lang({ reviews: 1, good: 1 }) },
      }),
      day('2026-09-05', {
        reviews: 2, hard: 1, good: 1,
        byLanguage: { Korean: lang({ reviews: 2, hard: 1, good: 1 }) },
      }),
    ];
    const summary = summarizeProgress(days);
    const korean = summary.byLanguage.find(entry => entry.studyLanguage === 'Korean')!;

    expect(korean.progress).toEqual(lang({ reviews: 4, again: 1, hard: 1, good: 2 }));
    // `hard` is a recall that hurt, not a miss — three of four buttons count.
    expect(retentionRate(korean.progress)).toBe(0.75);
    expect(ratedTotal(korean.progress)).toBe(4);
  });

  it('reports no retention rather than 100% when nothing has been rated', () => {
    expect(retentionRate(emptyLanguageProgress())).toBeNull();
    expect(retentionRate(lang({ newCards: 12 }))).toBeNull();
  });

  it('survives an undo, which negates the verdict on both levels', () => {
    const delta = reviewDelta('Korean', 'again');
    const after = applyDelta(applyDelta(day('2026-09-04'), delta), negateDelta(delta));

    expect(after.again).toBe(0);
    expect(after.byLanguage.Korean).toEqual(lang());
  });
});

describe('history window', () => {
  it('flags a window that starts before anything was recorded', () => {
    expect(historyStartsMidWindow(shiftDate(PROGRESS_HISTORY_START, -1))).toBe(true);
    expect(historyStartsMidWindow(PROGRESS_HISTORY_START)).toBe(false);
    expect(historyStartsMidWindow(shiftDate(PROGRESS_HISTORY_START, 1))).toBe(false);
  });
});
