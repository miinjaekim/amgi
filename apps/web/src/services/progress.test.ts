import { describe, it, expect } from 'vitest';
import {
  applyDelta,
  buildHeatmap,
  buildWeekGrid,
  cardsLearnedIn,
  clampThinkTime,
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
  THINK_TIME_CAP_SECONDS,
  shiftDate,
  summarizeProgress,
  weekdayIndex,
  type DailyProgress,
  type LanguageProgress,
} from '@amgi/core';

/** A day with only the fields a test cares about; the rest stay zero. */
function day(date: string, patch: Partial<DailyProgress> = {}): DailyProgress {
  return { ...emptyDailyProgress(date), ...patch };
}

/** A *stored* language slice — every counter, so a `toEqual` matches. */
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

describe('cardsLearnedIn', () => {
  const DETAILED = '2026-09-06';

  it('shortens the window to where the counter starts, and says it did', () => {
    // The case that made this exist: every range on offer is 30 days or more,
    // so withholding meant the tile never appeared at all.
    const learned = cardsLearnedIn(
      [day('2026-09-10', { cardsMatured: 3 }), day('2026-09-12', { cardsMatured: 2 })],
      '2026-09-12',
      30,
    );
    expect(learned).toEqual({ count: 5, from: DETAILED, partial: true });
  });

  it('counts nothing from before the counter existed, even with rows there', () => {
    // Days before 2026-09-06 read zero for this field whatever they contain,
    // so including them would be an undercount dressed as a total.
    const learned = cardsLearnedIn(
      [day('2026-08-20', { cardsMatured: 99 }), day('2026-09-10', { cardsMatured: 1 })],
      '2026-09-12',
      30,
    );
    expect(learned?.count).toBe(1);
  });

  it('stops being partial once the window fits inside the recorded span', () => {
    const learned = cardsLearnedIn([day('2026-10-10', { cardsMatured: 4 })], '2026-10-20', 30);
    expect(learned).toEqual({ count: 4, from: '2026-09-21', partial: false });
  });

  it('is null only when the window ends before there was anything to count', () => {
    expect(cardsLearnedIn([], '2026-09-05', 30)).toBeNull();
    expect(cardsLearnedIn([], DETAILED, 30)).toEqual({ count: 0, from: DETAILED, partial: true });
  });

  it('nets a lapse back out, like the window total does', () => {
    const learned = cardsLearnedIn(
      [day('2026-09-08', { cardsMatured: 2 }), day('2026-09-09', { cardsMatured: -1 })],
      '2026-09-12',
      30,
    );
    expect(learned?.count).toBe(1);
  });
});

describe('buildWeekGrid', () => {
  it('knows which weekday a date falls on', () => {
    expect(weekdayIndex('2026-08-16')).toBe(0); // a Sunday
    expect(weekdayIndex('2026-08-19')).toBe(3);
  });

  it('pads the opening column so a row always means one weekday', () => {
    // The whole point. `buildHeatmap` starts the window wherever the window
    // starts, so without this, row 0 is a different weekday every day and a
    // weekday label would be wrong rather than merely absent.
    const cells = buildHeatmap([], '2026-08-19', 7); // opens Thu 2026-08-13
    const { columns } = buildWeekGrid(cells);
    expect(columns[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(columns[0][4]?.date).toBe('2026-08-13'); // Thursday, row 4
  });

  it('pads with null rather than a zeroed day', () => {
    // A slot before the window opened is not a day the user failed to study,
    // and a level-0 cell would draw exactly that claim.
    const { columns } = buildWeekGrid(buildHeatmap([], '2026-08-19', 7));
    expect(columns[0][0]).toBeNull();
    expect(columns.flat().filter(cell => cell !== null)).toHaveLength(7);
  });

  it('keeps every column seven tall, including the last', () => {
    for (const days of [1, 7, 30, 90, 364]) {
      const { columns } = buildWeekGrid(buildHeatmap([], '2026-08-19', days));
      expect(columns.every(column => column.length === 7)).toBe(true);
      expect(columns.flat().filter(cell => cell !== null)).toHaveLength(days);
    }
  });

  it('keeps the days in order across the padding', () => {
    const dates = buildWeekGrid(buildHeatmap([], '2026-08-19', 30))
      .columns.flat().filter((cell): cell is NonNullable<typeof cell> => cell !== null)
      .map(cell => cell.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('ticks a month at the column its first day lands in', () => {
    // 60 days back from 15 September opens on 18 July, so August and September
    // both begin inside the window and both earn a tick. July earns none: the
    // opening column starts mid-month.
    const { columns, months } = buildWeekGrid(buildHeatmap([], '2026-09-15', 60));
    expect(months.map(tick => tick.date)).toEqual(['2026-08-01', '2026-09-01']);
    // The tick has to sit on the column actually holding that day. Keying off
    // each column's *first* cell instead put August on the 2nd and September on
    // the 6th — a label up to a whole column right of the month it names,
    // because 1 September 2026 is a Tuesday and 1 August a Saturday.
    for (const tick of months) {
      expect(columns[tick.column].some(cell => cell?.date === tick.date)).toBe(true);
    }
  });

  it('labels the opening column when the window starts on the 1st', () => {
    const { months } = buildWeekGrid(buildHeatmap([], '2026-08-31', 31));
    expect(months[0]).toEqual({ column: 0, date: '2026-08-01' });
  });

  it('does not label the opening column when it starts mid-month', () => {
    // The label would name a month whose beginning is not on screen.
    const { months } = buildWeekGrid(buildHeatmap([], '2026-08-19', 7));
    expect(months).toEqual([]);
  });

  it('is empty for an empty window rather than throwing', () => {
    expect(buildWeekGrid([])).toEqual({ columns: [], months: [] });
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

describe('think time', () => {
  it('rounds to whole seconds and caps a card left on screen', () => {
    expect(clampThinkTime(4.4)).toBe(4);
    expect(clampThinkTime(4.6)).toBe(5);
    expect(clampThinkTime(THINK_TIME_CAP_SECONDS + 900)).toBe(THINK_TIME_CAP_SECONDS);
  });

  it('treats a missing or nonsensical duration as no time at all', () => {
    // A clock that ran backwards, or a caller that measured nothing. Recording
    // the review is worth more than refusing it over an unusable duration.
    expect(clampThinkTime(0)).toBe(0);
    expect(clampThinkTime(-3)).toBe(0);
    expect(clampThinkTime(NaN)).toBe(0);
    // Not the cap: an infinite duration is a broken clock, not a very long
    // look at a card, and guessing 60s for it would quietly inflate the total.
    expect(clampThinkTime(Infinity)).toBe(0);
  });
});

describe('rating context', () => {
  it('degrades to the old delta when a caller measures nothing', () => {
    // The contract that let both `recordReview` call sites be migrated one at a
    // time. A surface that cannot time a card still records the review.
    expect(reviewDelta('Korean', 'good')).toEqual({
      reviews: 1,
      good: 1,
      byLanguage: { Korean: { reviews: 1, good: 1 } },
    });
  });

  it('carries think time, a maturity crossing and the hour', () => {
    expect(reviewDelta('Korean', 'good', { seconds: 12.4, matured: 1, hour: '23' })).toEqual({
      reviews: 1,
      good: 1,
      studySeconds: 12,
      cardsMatured: 1,
      byLanguage: { Korean: { reviews: 1, good: 1, studySeconds: 12, cardsMatured: 1 } },
      byHour: { '23': 1 },
    });
  });

  it('omits a zeroed counter rather than writing a 0', () => {
    // Day documents carry only the counters that moved, so a rating with no
    // measurable think time must not start writing `studySeconds: 0` into every
    // one of them.
    const delta = reviewDelta('Korean', 'again', { seconds: 0.2, matured: 0, hour: '9' });
    expect(delta.studySeconds).toBeUndefined();
    expect(delta.cardsMatured).toBeUndefined();
    expect(delta.byLanguage?.Korean?.studySeconds).toBeUndefined();
  });

  it('lets a lapse subtract from cardsMatured', () => {
    const delta = reviewDelta('Korean', 'again', { matured: -1, hour: '9' });
    expect(delta.cardsMatured).toBe(-1);
    expect(delta.byLanguage?.Korean?.cardsMatured).toBe(-1);
  });

  it('leaves byHour off entirely when the hour is unknown', () => {
    expect(reviewDelta('Korean', 'good', { seconds: 5 }).byHour).toBeUndefined();
  });
});

describe('byHour', () => {
  const rated = (hour: string) => reviewDelta('Korean', 'good', { seconds: 10, hour });

  it('sums across ratings in the same hour and keeps other hours apart', () => {
    const merged = mergeDeltas(mergeDeltas(rated('23'), rated('23')), rated('7'));
    expect(merged.byHour).toEqual({ '23': 2, '7': 1 });
  });

  it('negates, so an undo takes the rating back off its hour', () => {
    expect(negateDelta(rated('23')).byHour).toEqual({ '23': -1 });
  });

  it('round-trips a rating and its undo back to an empty day', () => {
    // The property that matters most: undo has to be exact across every field
    // the delta grew, not just the ones it had when undo was written.
    const delta = reviewDelta('Korean', 'good', { seconds: 30, matured: 1, hour: '14' });
    const after = applyDelta(applyDelta(day('2026-09-06'), delta), negateDelta(delta));
    // The zeroed language slice is `applyDelta`'s existing behaviour, asserted
    // by the `negateDelta` suite above; what is new here is that every counter
    // inside it, and the hour, came back to zero.
    expect(after).toEqual(day('2026-09-06', { byLanguage: { Korean: lang() } }));
    // The hour drops its key rather than keeping a 0, matching what
    // `parseDailyProgress` does with the same document — so the local mirror
    // and a refetch agree.
    expect(after.byHour).toEqual({});
  });

  it('reads back sparse, dropping zeroes a negated write left in the document', () => {
    expect(parseDailyProgress('2026-09-06', { reviews: 2, byHour: { '9': 2, '10': 0 } }).byHour)
      .toEqual({ '9': 2 });
  });

  it('defaults to an empty map on a day written before it existed', () => {
    expect(parseDailyProgress('2026-08-21', { reviews: 5 }).byHour).toEqual({});
  });

  it('sums across the days of a window', () => {
    const summary = summarizeProgress([
      day('2026-09-05', { reviews: 3, byHour: { '22': 2, '23': 1 } }),
      day('2026-09-06', { reviews: 1, byHour: { '23': 1 } }),
    ]);
    expect(summary.byHour).toEqual({ '22': 2, '23': 2 });
  });
});

describe('the new totals', () => {
  it('sums cardsMatured and studySeconds over a window', () => {
    const summary = summarizeProgress([
      day('2026-09-05', { reviews: 10, cardsMatured: 3, studySeconds: 240 }),
      day('2026-09-06', { reviews: 4, cardsMatured: 1, studySeconds: 96 }),
    ]);
    expect(summary.totalCardsMatured).toBe(4);
    expect(summary.totalStudySeconds).toBe(336);
  });

  it('nets a card that matured and then lapsed back out of the total', () => {
    // Why `maturityChange` returns -1 rather than clamping at 0: a learner who
    // forgets a word and relearns it has not learned two cards.
    const summary = summarizeProgress([
      day('2026-09-05', { reviews: 1, cardsMatured: 1 }),
      day('2026-09-06', { reviews: 1, cardsMatured: -1 }),
    ]);
    expect(summary.totalCardsMatured).toBe(0);
  });

  it('reads zero for the days before either counter was written', () => {
    // 2026-08-20 through 2026-09-05 have reviews and no maturity data at all,
    // which is why a "cards learned" over a long window is not the same number
    // as the all-time count derived from the cards themselves.
    const summary = summarizeProgress([day('2026-08-21', { reviews: 40 })]);
    expect(summary.totalCardsMatured).toBe(0);
    expect(summary.totalStudySeconds).toBe(0);
    expect(summary.totalReviews).toBe(40);
  });
});
