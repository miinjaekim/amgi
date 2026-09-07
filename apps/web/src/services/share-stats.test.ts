import { describe, it, expect } from 'vitest';
import {
  DETAILED_HISTORY_START,
  PROGRESS_HISTORY_START,
  buildShareStats,
  emptyDailyProgress,
  fullyCoveredWindow,
  hasShareableHistory,
  shareImageFilename,
  shareImageQuery,
  shiftDate,
  type DailyProgress,
} from '@amgi/core';
import { readShareImageParams } from '@/app/api/stats-image/route';

/** A day with only the fields a test cares about; the rest stay zero. */
function day(date: string, patch: Partial<DailyProgress> = {}): DailyProgress {
  return { ...emptyDailyProgress(date), ...patch };
}

/** A window ending well clear of both boundaries, so coverage is not the subject. */
const LATER = '2026-12-01';

function statsFor(days: DailyProgress[], windowDays = 30, endDate = LATER) {
  return buildShareStats(days, { streak: 7, endDate, windowDays });
}

describe('buildShareStats window', () => {
  it('spans windowDays inclusive of the end date', () => {
    const stats = statsFor([], 30);
    expect(stats.windowEnd).toBe(LATER);
    expect(stats.windowStart).toBe(shiftDate(LATER, -29));
    expect(stats.heatmap).toHaveLength(30);
  });

  it('drops rows outside the window rather than trusting the caller to trim', () => {
    // The Progress tab fetches by range and can hand over more than the asset
    // asked for; a total that quietly included them would exceed its own label.
    const stats = statsFor([
      day(shiftDate(LATER, -40), { reviews: 500 }),
      day(LATER, { reviews: 3 }),
    ], 30);
    expect(stats.reviews).toBe(3);
  });

  it('keeps a row landing exactly on either edge', () => {
    const stats = statsFor([
      day(shiftDate(LATER, -29), { reviews: 1 }),
      day(LATER, { reviews: 1 }),
    ], 30);
    expect(stats.reviews).toBe(2);
    expect(stats.daysStudied).toBe(2);
  });

  it('fills gaps in the heatmap so an unstudied day is drawn, not missing', () => {
    const stats = statsFor([day(LATER, { reviews: 4 })], 7);
    expect(stats.heatmap).toHaveLength(7);
    expect(stats.heatmap.filter(c => c.reviews === 0)).toHaveLength(6);
  });
});

describe('buildShareStats numbers', () => {
  it('passes the stored streak through rather than deriving one', () => {
    // Deriving from these rows would show 1 to someone on a 200-day streak,
    // because the rollups start empty the day they shipped.
    expect(statsFor([]).streak).toBe(7);
  });

  it('counts days studied by ratings, not by cards added', () => {
    const stats = statsFor([
      day(LATER, { reviews: 2 }),
      day(shiftDate(LATER, -1), { newCards: 40, packCards: 474 }),
    ]);
    expect(stats.daysStudied).toBe(1);
  });

  it('computes retention over the whole window, not per language', () => {
    // 3 of 4 ratings were not a lapse. `hard` counts as a recall that hurt,
    // matching what SM-2 does with it.
    const stats = statsFor([
      day(LATER, { reviews: 4, again: 1, hard: 1, good: 1, easy: 1 }),
    ]);
    expect(stats.retention).toBeCloseTo(0.75);
  });

  it('reports retention as null rather than 100% when nothing was rated', () => {
    // The distinction the Progress tab already makes: an unrecorded slice must
    // read as "not recorded", never as a perfect one.
    expect(statsFor([day(LATER, { newCards: 5 })]).retention).toBeNull();
  });

  it('sums the detailed counters across the window', () => {
    const stats = statsFor([
      day(LATER, { reviews: 10, cardsMatured: 3, studySeconds: 240 }),
      day(shiftDate(LATER, -1), { reviews: 4, cardsMatured: 1, studySeconds: 96 }),
    ]);
    expect(stats.cardsLearned).toBe(4);
    expect(stats.studySeconds).toBe(336);
  });

  it('nets a card that matured and later lapsed back out', () => {
    const stats = statsFor([
      day(LATER, { reviews: 1, cardsMatured: -1 }),
      day(shiftDate(LATER, -1), { reviews: 1, cardsMatured: 1 }),
    ]);
    expect(stats.cardsLearned).toBe(0);
  });
});

describe('the two history boundaries', () => {
  it('withholds the detailed numbers when the window predates them', () => {
    // Null rather than an undercount: over a window reaching back before the
    // counter existed, a low number and a quiet fortnight look identical.
    const endDate = shiftDate(DETAILED_HISTORY_START, 5);
    const stats = buildShareStats(
      [day(endDate, { reviews: 20, cardsMatured: 2, studySeconds: 300 })],
      { streak: 3, endDate, windowDays: 30 },
    );
    expect(stats.cardsLearned).toBeNull();
    expect(stats.studySeconds).toBeNull();
    // The numbers that were always written are unaffected by that boundary.
    expect(stats.reviews).toBe(20);
  });

  it('starts answering on its own once the window clears the boundary', () => {
    // No code change between this and the case above — only the calendar.
    const endDate = shiftDate(DETAILED_HISTORY_START, 29);
    const stats = buildShareStats(
      [day(endDate, { reviews: 20, cardsMatured: 2 })],
      { streak: 3, endDate, windowDays: 30 },
    );
    expect(stats.cardsLearned).toBe(2);
  });

  it('flags a window reaching back before any rollup exists', () => {
    const endDate = shiftDate(PROGRESS_HISTORY_START, 5);
    const stats = buildShareStats([], { streak: 0, endDate, windowDays: 30 });
    expect(stats.partialHistory).toBe(true);
  });

  it('does not flag a window that starts on the first recorded day', () => {
    const endDate = shiftDate(PROGRESS_HISTORY_START, 29);
    const stats = buildShareStats([], { streak: 0, endDate, windowDays: 30 });
    expect(stats.partialHistory).toBe(false);
  });

  it('separates the two boundaries — the older one can be clear while the newer is not', () => {
    // The window this whole design has to survive: rows exist for every day in
    // it, so nothing looks wrong, but three of their fields are absent.
    const endDate = shiftDate(DETAILED_HISTORY_START, 1);
    const stats = buildShareStats([], { streak: 0, endDate, windowDays: 14 });
    expect(stats.partialHistory).toBe(false);
    expect(stats.cardsLearned).toBeNull();
  });
});

describe('fullyCoveredWindow', () => {
  it('returns the preferred window once the counters are old enough', () => {
    expect(fullyCoveredWindow(shiftDate(DETAILED_HISTORY_START, 29), 30)).toBe(30);
    expect(fullyCoveredWindow(shiftDate(DETAILED_HISTORY_START, 400), 30)).toBe(30);
  });

  it('shortens to what is covered while the boundary is still inside it', () => {
    expect(fullyCoveredWindow(DETAILED_HISTORY_START, 30)).toBe(1);
    expect(fullyCoveredWindow(shiftDate(DETAILED_HISTORY_START, 4), 30)).toBe(5);
  });

  it('returns zero before the counters existed at all', () => {
    expect(fullyCoveredWindow(shiftDate(DETAILED_HISTORY_START, -1), 30)).toBe(0);
  });

  it('agrees with buildShareStats about what counts as covered', () => {
    // The property that keeps the two from drifting: a window this says is
    // covered must be one that yields a non-null number.
    for (const offset of [0, 3, 10, 29, 30, 60]) {
      const endDate = shiftDate(DETAILED_HISTORY_START, offset);
      const windowDays = fullyCoveredWindow(endDate, 30);
      const stats = buildShareStats(
        [day(endDate, { reviews: 1, cardsMatured: 1 })],
        { streak: 1, endDate, windowDays },
      );
      expect(stats.cardsLearned).not.toBeNull();
    }
  });
});

describe('hasShareableHistory', () => {
  it('is false for a window with nothing in it', () => {
    expect(hasShareableHistory(statsFor([]))).toBe(false);
  });

  it('is false when cards were added but nothing was reviewed', () => {
    // A zeroed image is not a modest result, it is a broken-looking one.
    expect(hasShareableHistory(statsFor([day(LATER, { newCards: 60 })]))).toBe(false);
  });

  it('is true once a day in the window has a rating on it', () => {
    expect(hasShareableHistory(statsFor([day(LATER, { reviews: 1 })]))).toBe(true);
  });

  it('is false when the only reviews fall outside the window', () => {
    expect(hasShareableHistory(statsFor([day(shiftDate(LATER, -40), { reviews: 90 })])))
      .toBe(false);
  });
});

describe('shareImageQuery', () => {
  const query = (days: DailyProgress[], windowDays = 30, lang?: string) =>
    new URLSearchParams(
      shareImageQuery(buildShareStats(days, { streak: 7, endDate: LATER, windowDays }), lang),
    );

  it('carries every figure the image draws', () => {
    const q = query([day(LATER, { reviews: 40, again: 1, good: 9, cardsMatured: 3 })], 30, 'Korean');
    expect(q.get('w')).toBe('30');
    expect(q.get('r')).toBe('40');
    expect(q.get('s')).toBe('7');
    expect(q.get('l')).toBe('3');
    expect(q.get('lang')).toBe('Korean');
  });

  it('omits a withheld figure rather than sending zero', () => {
    // The contract between `buildShareStats` and the route. Sending `l=0` would
    // draw a "0 cards learned" tile, which is a claim the data cannot support.
    const endDate = shiftDate(DETAILED_HISTORY_START, 2);
    const stats = buildShareStats([day(endDate, { reviews: 5 })], {
      streak: 1, endDate, windowDays: 30,
    });
    expect(stats.cardsLearned).toBeNull();
    const q = new URLSearchParams(shareImageQuery(stats));
    expect(q.has('l')).toBe(false);
    expect(q.has('r')).toBe(true);
  });

  it('sends retention as a whole percent', () => {
    const q = query([day(LATER, { reviews: 4, again: 1, hard: 1, good: 1, easy: 1 })]);
    expect(q.get('ret')).toBe('75');
  });

  it('omits retention when nothing was rated', () => {
    expect(query([day(LATER, { newCards: 3 })]).has('ret')).toBe(false);
  });

  it('sends one heat character per day in the window', () => {
    for (const windowDays of [7, 30, 364]) {
      expect(query([day(LATER, { reviews: 5 })], windowDays).get('h')).toHaveLength(windowDays);
    }
  });

  it('sends only level digits, which is what the route parses', () => {
    expect(query([day(LATER, { reviews: 9 })], 30).get('h')).toMatch(/^[0-4]{30}$/);
  });

  it('omits the language rather than sending an empty one', () => {
    // `t` falls back to English on anything unrecognised, but an empty `lang=`
    // in the URL is noise on a link a user may well look at.
    expect(query([day(LATER, { reviews: 1 })], 30, undefined).has('lang')).toBe(false);
  });

  it('round-trips through the route parser to the same numbers', () => {
    // The property that keeps the two halves from drifting: whatever the
    // builder puts in, the route must read back out.
    const stats = buildShareStats(
      [day(LATER, { reviews: 40, again: 1, good: 9, cardsMatured: 3 })],
      { streak: 7, endDate: LATER, windowDays: 30 },
    );
    const parsed = readShareImageParams(new URLSearchParams(shareImageQuery(stats, 'Korean')));
    expect(parsed.reviews).toBe(stats.reviews);
    expect(parsed.streak).toBe(stats.streak);
    expect(parsed.daysStudied).toBe(stats.daysStudied);
    expect(parsed.learned).toBe(stats.cardsLearned);
    expect(parsed.retention).toBe(Math.round((stats.retention ?? 0) * 100));
    expect(parsed.cells).toEqual(stats.heatmap.map(c => c.level));
  });

  it('round-trips a withheld figure as withheld', () => {
    const endDate = shiftDate(DETAILED_HISTORY_START, 2);
    const stats = buildShareStats([day(endDate, { reviews: 5 })], {
      streak: 1, endDate, windowDays: 30,
    });
    const parsed = readShareImageParams(new URLSearchParams(shareImageQuery(stats)));
    expect(parsed.learned).toBeNull();
  });
});

describe('shareImageFilename', () => {
  it('names the window it covers, so two exports do not collide', () => {
    const a = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 30 });
    const b = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 364 });
    expect(shareImageFilename(a)).not.toBe(shareImageFilename(b));
    expect(shareImageFilename(a)).toMatch(/^amgi-\d{4}-\d{2}-\d{2}-30d\.png$/);
  });
});
