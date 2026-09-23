import { describe, it, expect } from 'vitest';
import {
  DETAILED_HISTORY_START,
  PROGRESS_HISTORY_START,
  buildShareCards,
  buildShareStats,
  buildTodayStats,
  chartValues,
  hasShareableChart,
  emptyDailyProgress,
  emptyLanguageProgress,
  formatStudyTime,
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

/** A day whose reviews are attributed to one language, for the `g` parameter. */
function dayIn(date: string, language: string, reviews: number): DailyProgress {
  return {
    ...emptyDailyProgress(date),
    reviews,
    byLanguage: { [language]: { ...emptyLanguageProgress(), reviews } },
  };
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

  it('no longer carries days studied, which the streak already answered', () => {
    const stats = statsFor([
      day(LATER, { reviews: 2 }),
      day(shiftDate(LATER, -1), { newCards: 40, packCards: 474 }),
    ]);
    expect(stats).not.toHaveProperty('daysStudied');
    expect(new URLSearchParams(shareImageQuery(stats)).has('d')).toBe(false);
  });

  it('keeps counting verdicts even though nothing renders them', () => {
    // Retention came off both surfaces on 2026-09-12, display only: the four
    // verdicts are still written on every rating, because a rollup cannot be
    // backfilled and stopping the write would lose the history for good.
    const stats = statsFor([
      day(LATER, { reviews: 4, again: 1, hard: 1, good: 1, easy: 1 }),
    ]);
    expect(stats.reviews).toBe(4);
    expect(stats).not.toHaveProperty('retention');
  });

  it('sums the detailed counters across the window', () => {
    const stats = statsFor([
      day(LATER, { reviews: 10, cardsMatured: 3, studySeconds: 240 }),
      day(shiftDate(LATER, -1), { reviews: 4, cardsMatured: 1, studySeconds: 96 }),
    ]);
    expect(stats.studySeconds).toBe(336);
  });

  it('carries no cards-learned figure at all', () => {
    // It became an all-time number on 2026-09-12, and an all-time number cannot
    // sit on a canvas where every other figure names one window. The window's
    // crossings are still summed by summarizeProgress for whoever wants them.
    const stats = statsFor([day(LATER, { reviews: 10, cardsMatured: 3 })]);
    expect(stats).not.toHaveProperty('cardsLearned');
    expect(new URLSearchParams(shareImageQuery(stats)).has('l')).toBe(false);
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
    expect(stats.studySeconds).toBeNull();
    // The numbers that were always written are unaffected by that boundary.
    expect(stats.reviews).toBe(20);
  });

  it('starts answering on its own once the window clears the boundary', () => {
    // No code change between this and the case above — only the calendar.
    const endDate = shiftDate(DETAILED_HISTORY_START, 29);
    const stats = buildShareStats(
      [day(endDate, { reviews: 20, cardsMatured: 2, studySeconds: 120 })],
      { streak: 3, endDate, windowDays: 30 },
    );
    expect(stats.studySeconds).toBe(120);
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
    expect(stats.studySeconds).toBeNull();
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
        [day(endDate, { reviews: 1, studySeconds: 30 })],
        { streak: 1, endDate, windowDays },
      );
      expect(stats.studySeconds).not.toBeNull();
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
    expect(q.get('lang')).toBe('Korean');
  });

  it('no longer sends retention, however many verdicts the window holds', () => {
    const q = query([day(LATER, { reviews: 4, again: 1, hard: 1, good: 1, easy: 1 })]);
    expect(q.has('ret')).toBe(false);
  });

  it('names the languages reviewed in the window, busiest first', () => {
    const q = query([
      dayIn(LATER, 'Korean', 3),
      dayIn(shiftDate(LATER, -1), 'Japanese', 9),
    ]);
    expect(q.get('g')).toBe('Japanese,Korean');
  });

  it('leaves out a language that was never reviewed', () => {
    // Cards added is not studying, and a name beside a review count that
    // contributed none of it is a claim the window does not support.
    const q = query([
      dayIn(LATER, 'Korean', 4),
      { ...emptyDailyProgress(shiftDate(LATER, -1)), newCards: 60,
        byLanguage: { Japanese: { ...emptyLanguageProgress(), newCards: 60 } } },
    ]);
    expect(q.get('g')).toBe('Korean');
  });

  it('omits the parameter rather than sending an empty one', () => {
    expect(query([day(LATER, { reviews: 2 })]).has('g')).toBe(false);
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

  it('sends the marks and the grain only for the chart card', () => {
    // A window card's URL is byte-for-byte what it was before the chart card
    // existed, which is the whole of "backward compatible by construction".
    const stats = buildShareStats([day(LATER, { newCards: 4 })], {
      streak: 7, endDate: LATER, windowDays: 30,
    });
    const asWindow = new URLSearchParams(shareImageQuery(stats, null, 'window'));
    expect(asWindow.has('c')).toBe(false);
    expect(asWindow.has('bd')).toBe(false);

    const asChart = new URLSearchParams(shareImageQuery(stats, null, 'chart'));
    expect(asChart.get('v')).toBe('chart');
    expect(asChart.get('bd')).toBe('1');
    expect(asChart.get('c')?.split(',')).toHaveLength(30);
  });

  it('sends one series — the measure the card draws, never both', () => {
    const stats = buildShareStats([day(LATER, { reviews: 12, newCards: 4 })], {
      streak: 7, endDate: LATER, windowDays: 7,
    });
    const cards = new URLSearchParams(
      shareImageQuery(stats, null, 'chart', { measure: 'cards', mark: 'bars' }),
    );
    expect(cards.get('c')?.split(',').at(-1)).toBe('4');

    const reviews = new URLSearchParams(
      shareImageQuery(stats, null, 'chart', { measure: 'reviews', mark: 'bars' }),
    );
    expect(reviews.get('c')?.split(',').at(-1)).toBe('12');
  });

  it('omits the measure and the mark at their defaults', () => {
    // The shortest URL and the absent parameter have to mean the same thing,
    // or an older build's links would start rendering something else.
    const stats = buildShareStats([day(LATER, { newCards: 4 })], {
      streak: 7, endDate: LATER, windowDays: 7,
    });
    const plain = new URLSearchParams(
      shareImageQuery(stats, null, 'chart', { measure: 'cards', mark: 'bars' }),
    );
    expect(plain.has('cm')).toBe(false);
    expect(plain.has('mk')).toBe(false);

    const drawn = new URLSearchParams(
      shareImageQuery(stats, null, 'chart', { measure: 'reviews', mark: 'line' }),
    );
    expect(drawn.get('cm')).toBe('r');
    expect(drawn.get('mk')).toBe('l');
  });

  it('round-trips the chart through the route parser unchanged', () => {
    const stats = buildShareStats(
      [day(LATER, { reviews: 30, newCards: 4, packCards: 20 }), day(shiftDate(LATER, -40), { newCards: 7 })],
      { streak: 7, endDate: LATER, windowDays: 90 },
    );
    for (const chart of [
      { measure: 'cards', mark: 'bars' },
      { measure: 'reviews', mark: 'line' },
    ] as const) {
      const parsed = readShareImageParams(
        new URLSearchParams(shareImageQuery(stats, null, 'chart', chart)),
      );
      expect(parsed.variant).toBe('chart');
      expect(parsed.chart.values).toEqual(chartValues(stats, chart.measure));
      expect(parsed.chart.bucketDays).toBe(stats.chart.bucketDays);
      expect(parsed.chart.measure).toBe(chart.measure);
      expect(parsed.chart.mark).toBe(chart.mark);
    }
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
    expect(parsed.cells).toEqual(stats.heatmap.map(c => c.level));
  });
});

describe('the today card', () => {
  const todayStats = (days: DailyProgress[]) =>
    buildTodayStats(days, { streak: 4, endDate: LATER });

  it('spans exactly the one day', () => {
    const stats = todayStats([day(LATER, { reviews: 6 }), day(shiftDate(LATER, -1), { reviews: 99 })]);
    expect(stats.windowDays).toBe(1);
    expect(stats.windowStart).toBe(LATER);
    expect(stats.reviews).toBe(6);
  });

  it('is offered or withheld on its own history, not the window behind it', () => {
    // The gate has to be asked per variant: a today card on a day with nothing
    // on it is the zeroed image the check exists to prevent, however full the
    // 90-day window beside it is.
    const busyWindowQuietToday = [day(shiftDate(LATER, -1), { reviews: 120 })];
    expect(hasShareableHistory(statsFor(busyWindowQuietToday, 30))).toBe(true);
    expect(hasShareableHistory(todayStats(busyWindowQuietToday))).toBe(false);
  });

  it('asks the route for a different picture, and only when it is today', () => {
    const stats = todayStats([day(LATER, { reviews: 6 })]);
    expect(new URLSearchParams(shareImageQuery(stats, null, 'today')).get('v')).toBe('today');
    expect(new URLSearchParams(shareImageQuery(stats, null, 'window')).has('v')).toBe(false);
    expect(new URLSearchParams(shareImageQuery(stats)).has('v')).toBe(false);
  });

  it('names its file apart from a one-day window, which would collide', () => {
    // Mobile deletes by filename before downloading, so a collision there is a
    // stale picture going out rather than a merely confusing name.
    const stats = todayStats([day(LATER, { reviews: 6 })]);
    expect(shareImageFilename(stats, 'today')).toMatch(/-today\.png$/);
    expect(shareImageFilename(stats, 'today')).not.toBe(shareImageFilename(stats));
  });
});

describe('shareImageFilename', () => {
  it('names the window it covers, so two exports do not collide', () => {
    const a = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 30 });
    const b = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 364 });
    expect(shareImageFilename(a)).not.toBe(shareImageFilename(b));
    expect(shareImageFilename(a)).toMatch(/^amgi-\d{4}-\d{2}-\d{2}-30d\.png$/);
  });

  it('tells a chart apart from the window card covering the same days', () => {
    const stats = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 30 });
    expect(shareImageFilename(stats, 'chart'))
      .toMatch(/^amgi-\d{4}-\d{2}-\d{2}-30d-cards\.png$/);
    expect(shareImageFilename(stats, 'chart')).not.toBe(shareImageFilename(stats, 'window'));
  });

  it('tells the two measures apart, since mobile deletes by name first', () => {
    const stats = buildShareStats([], { streak: 0, endDate: LATER, windowDays: 7 });
    const reviews = shareImageFilename(stats, 'chart', { measure: 'reviews', mark: 'bars' });
    const cards = shareImageFilename(stats, 'chart', { measure: 'cards', mark: 'bars' });
    expect(reviews).not.toBe(cards);
  });
});

describe('buildShareCards', () => {
  const WINDOWS = [30, 90, 364];

  function cardsFor(days: DailyProgress[], windows: number[] = WINDOWS) {
    return buildShareCards(days, { streak: 7, endDate: LATER, windows });
  }

  /** Busy on every day the widest window covers, so nothing is gated out. */
  const busyThroughout = [
    day(LATER, { reviews: 5 }),
    day(shiftDate(LATER, -60), { reviews: 5 }),
    day(shiftDate(LATER, -300), { reviews: 5 }),
  ];

  it('offers a card per window, shortest first, with today last', () => {
    // The order is the Progress tab's range chips, which is where the reader
    // just came from — a carousel that disagreed with them would read as a
    // different set of choices rather than the same ones enlarged.
    const cards = cardsFor(busyThroughout);
    expect(cards.map(card => card.id)).toEqual(['w30', 'w90', 'w364', 'today']);
    expect(cards.map(card => card.windowDays)).toEqual([30, 90, 364, 1]);
  });

  it('sorts the windows it is given rather than trusting the caller', () => {
    expect(cardsFor(busyThroughout, [364, 30, 90]).map(card => card.id))
      .toEqual(['w30', 'w90', 'w364', 'today']);
  });

  it('labels a window by its length and today by name', () => {
    const cards = cardsFor(busyThroughout);
    expect(cards[0].labelKey).toBe('shareWindowDays');
    expect(cards.at(-1)!.labelKey).toBe('shareVariantToday');
  });

  it('marks only the today card as the today variant', () => {
    const cards = cardsFor(busyThroughout);
    expect(cards.filter(card => card.variant === 'today')).toHaveLength(1);
    expect(cards.at(-1)!.variant).toBe('today');
  });

  it('drops a window with nothing in it and keeps the ones that have something', () => {
    // A day 300 back is inside the year and outside the other two, so the two
    // shorter cards would be the zeroed image the gate exists to prevent.
    const cards = cardsFor([day(shiftDate(LATER, -300), { reviews: 5 })]);
    expect(cards.map(card => card.id)).toEqual(['w364']);
  });

  it('drops the today card on a quiet day however full the year is', () => {
    // The gate is asked per card, not once for the account.
    const cards = cardsFor([day(shiftDate(LATER, -1), { reviews: 120 })]);
    expect(cards.map(card => card.id)).toEqual(['w30', 'w90', 'w364']);
  });

  it('offers nothing at all to an account with no history', () => {
    // The caller's cue to say so, rather than to draw an empty carousel.
    expect(cardsFor([])).toEqual([]);
  });

  it('builds every card from the same rows, so two cannot disagree', () => {
    const cards = cardsFor([dayIn(LATER, 'Korean', 8)]);
    for (const card of cards) {
      expect(card.stats.streak).toBe(7);
      expect(card.stats.windowEnd).toBe(LATER);
      expect(card.stats.languages).toEqual(['Korean']);
    }
  });

  it('offers a chart card per chart window, after the cards that were there first', () => {
    // Existing cards keep their order and their indices: a reader opening the
    // sheet from the range row must still land where they always did, and the
    // chart's own button says which card it wants by name.
    const cards = buildShareCards(
      [day(LATER, { reviews: 5, newCards: 3 }), day(shiftDate(LATER, -60), { reviews: 5, packCards: 9 })],
      { streak: 7, endDate: LATER, windows: [30, 90], chartWindows: [7, 30, 90] },
    );
    expect(cards.map(card => card.id)).toEqual(['w30', 'w90', 'today', 'c7', 'c30', 'c90']);
    expect(cards.filter(card => card.variant === 'chart').map(card => card.windowDays))
      .toEqual([7, 30, 90]);
  });

  it('charts the same windows it offers when it is not told otherwise', () => {
    const cards = buildShareCards([day(LATER, { reviews: 5, newCards: 3 })], {
      streak: 7, endDate: LATER, windows: [30],
    });
    expect(cards.map(card => card.id)).toEqual(['w30', 'today', 'c30']);
  });

  it('labels a chart card by what it plots and how long for', () => {
    const cardsChart = buildShareCards([day(LATER, { reviews: 5, newCards: 3 })], {
      streak: 7, endDate: LATER, windows: [30], chartWindows: [7],
    });
    expect(cardsChart.at(-1)).toMatchObject({
      id: 'c7', labelKey: 'shareVariantChartCards', windowDays: 7,
    });

    const reviewsChart = buildShareCards([day(LATER, { reviews: 5, newCards: 3 })], {
      streak: 7, endDate: LATER, windows: [30], chartWindows: [7],
      chart: { measure: 'reviews', mark: 'line' },
    });
    expect(reviewsChart.at(-1)).toMatchObject({
      id: 'c7', labelKey: 'shareVariantChartReviews',
    });
  });

  it('carries how the chart was drawn onto every chart card', () => {
    // The mark and the measure are read off the screen once, at the button, and
    // then belong to the card — three call sites build a URL from it.
    const chart = { measure: 'reviews', mark: 'line' } as const;
    const cards = buildShareCards([day(LATER, { reviews: 9 })], {
      streak: 7, endDate: LATER, windows: [30], chartWindows: [7, 30], chart,
    });
    for (const card of cards.filter(entry => entry.variant === 'chart')) {
      expect(card.chart).toEqual(chart);
    }
    expect(cards.find(card => card.variant === 'window')?.chart).toBeUndefined();
  });

  it('drops a chart card whose own measure had nothing in it', () => {
    // Reviews without adds, charting cards: every window card stands and no
    // chart card does.
    const cards = buildShareCards([day(LATER, { reviews: 12 })], {
      streak: 7, endDate: LATER, windows: [30], chartWindows: [7, 30],
    });
    expect(cards.map(card => card.id)).toEqual(['w30', 'today']);
  });

  it('keeps that same window once the chart is the reviews one', () => {
    // ⚠️ The bug the user caught, at the level it was introduced: the reader is
    // looking at a full reviews chart, so pressing Share must not leave the
    // carousel with nothing but calendars to open on.
    const cards = buildShareCards([day(LATER, { reviews: 12 })], {
      streak: 7, endDate: LATER, windows: [30], chartWindows: [7, 30],
      chart: { measure: 'reviews', mark: 'bars' },
    });
    expect(cards.map(card => card.id)).toEqual(['w30', 'today', 'c7', 'c30']);
  });

  it('keeps a chart card for a window that had adds but no reviews', () => {
    // Nothing was rated, so neither the window card nor the today card
    // survives — and the chart still has bars, which is the point of asking
    // the two gates separately.
    const cards = buildShareCards([day(LATER, { packCards: 40 })], {
      streak: 0, endDate: LATER, windows: [30], chartWindows: [30],
    });
    expect(cards.map(card => card.id)).toEqual(['c30']);
  });

  it('gives each card a distinct filename, today and the charts included', () => {
    // Mobile deletes by filename before downloading, so a collision is a stale
    // picture going out — and a one-day window, or a chart over the very same
    // days as a window card, would otherwise collide.
    const names = buildShareCards(
      [day(LATER, { reviews: 5, newCards: 3 }), day(shiftDate(LATER, -60), { reviews: 5, packCards: 9 })],
      { streak: 7, endDate: LATER, windows: [30, 90], chartWindows: [7, 30, 90] },
    ).map(card => shareImageFilename(card.stats, card.variant, card.chart));
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('the chart series', () => {
  /** A day whose cards came from both sources, since the series sums the two. */
  const added = (date: string, lookup: number, pack = 0) =>
    day(date, { newCards: lookup, packCards: pack });

  it('draws one bar per day up to thirty, then one per week', () => {
    // The grain is `chartBucketDays`, which is the same rule both detail
    // screens draw by — a shared chart and the one on screen must not disagree
    // about what a bar is.
    expect(statsFor([], 30).chart).toMatchObject({ bucketDays: 1 });
    expect(statsFor([], 30).chart.cards).toHaveLength(30);
    expect(statsFor([], 90).chart).toMatchObject({ bucketDays: 7 });
    // 90 days at seven to a bar is twelve whole weeks and a short one.
    expect(statsFor([], 90).chart.cards).toHaveLength(13);
  });

  it('carries both measures over the same buckets', () => {
    // The card picks one at share time, so the two have to be built together
    // and line up bar for bar — one of them plotted against the other's grain
    // would put a week of reviews under a day's label.
    const stats = statsFor([day(LATER, { reviews: 12, newCards: 3 })], 90);
    expect(stats.chart.reviews).toHaveLength(stats.chart.cards.length);
    expect(stats.chart.reviews.at(-1)).toBe(12);
    expect(stats.chart.cards.at(-1)).toBe(3);
  });

  it('adds up to the figure every other surface shows', () => {
    // The bars are `lookup + pack`, which is what `cardsAdded` counts and what
    // the dashboard tile says. A chart that summed to something else would put
    // two numbers for one window on one canvas.
    const stats = statsFor([added(LATER, 4, 20), added(shiftDate(LATER, -3), 6)], 30);
    expect(stats.chart.cards.reduce((sum, value) => sum + value, 0)).toBe(stats.cardsAdded);
    expect(stats.cardsAdded).toBe(30);
  });

  it('sums reviews to the figure the window card heroes', () => {
    const stats = statsFor([day(LATER, { reviews: 40 }), day(shiftDate(LATER, -20), { reviews: 9 })], 90);
    expect(stats.chart.reviews.reduce((sum, value) => sum + value, 0)).toBe(stats.reviews);
  });

  it('puts the newest bar last, where the reader expects today', () => {
    const stats = statsFor([added(LATER, 5)], 30);
    expect(stats.chart.cards.at(-1)).toBe(5);
    expect(stats.chart.cards.slice(0, -1).every(value => value === 0)).toBe(true);
  });

  it('counts nothing from outside the window it names', () => {
    expect(statsFor([added(shiftDate(LATER, -40), 99)], 30).chart.cards
      .every(value => value === 0)).toBe(true);
  });

  it('hands out the series the measure names', () => {
    const stats = statsFor([day(LATER, { reviews: 12, newCards: 3 })], 30);
    expect(chartValues(stats, 'reviews')).toBe(stats.chart.reviews);
    expect(chartValues(stats, 'cards')).toBe(stats.chart.cards);
  });
});

describe('hasShareableChart', () => {
  it('asks about the measure being drawn, not about the other one', () => {
    // ⚠️ The bug the user caught: a full reviews chart with nothing added was
    // gated out, so the Share button on that chart opened on a calendar.
    const reviewedOnly = statsFor([day(LATER, { reviews: 200 })], 30);
    expect(hasShareableChart(reviewedOnly, 'reviews')).toBe(true);
    expect(hasShareableChart(reviewedOnly, 'cards')).toBe(false);
    expect(hasShareableHistory(reviewedOnly)).toBe(true);
  });

  it('holds for a window spent adding and not rating', () => {
    // The converse: nothing was reviewed, so there is no window card here, but
    // the cards chart is a real chart and the two gates disagree on purpose.
    const addedOnly = statsFor([day(LATER, { packCards: 40 })], 30);
    expect(hasShareableChart(addedOnly, 'cards')).toBe(true);
    expect(hasShareableChart(addedOnly, 'reviews')).toBe(false);
    expect(hasShareableHistory(addedOnly)).toBe(false);
  });
});

describe('the tile figures', () => {
  it('sums maturity crossings and seconds over a covered window', () => {
    const stats = statsFor([
      day(LATER, { reviews: 10, cardsMatured: 3, studySeconds: 240 }),
      day(shiftDate(LATER, -1), { reviews: 4, cardsMatured: 1, studySeconds: 96 }),
    ]);
    expect(stats.cardsMatured).toBe(4);
    expect(stats.studySeconds).toBe(336);
  });

  it('withholds both when the window predates the counters', () => {
    // Null rather than an undercount: these were first written on 2026-09-06,
    // so a window reaching further back reads as a quiet fortnight instead of
    // as missing data — which is the whole reason the boundary exists.
    const stats = buildShareStats(
      [day(DETAILED_HISTORY_START, { reviews: 10, cardsMatured: 3, studySeconds: 240 })],
      { streak: 7, endDate: DETAILED_HISTORY_START, windowDays: 30 },
    );
    expect(stats.cardsMatured).toBeNull();
    expect(stats.studySeconds).toBeNull();
  });

  it('is a windowed count, never the dashboard all-time one', () => {
    // The dashboard's "Cards learned" is every card whose interval reached 21
    // days, all-time. This counts crossings inside the window, which is why the
    // two carry different labels and must never be reconciled.
    const stats = statsFor([
      day(LATER, { cardsMatured: 2, reviews: 1 }),
      day(shiftDate(LATER, -40), { cardsMatured: 500, reviews: 1 }),
    ], 30);
    expect(stats.cardsMatured).toBe(2);
  });

  it('counts cards added from both sources and never withholds them', () => {
    // Written since rollups began, so unlike the two above this survives a
    // window reaching back past the detailed boundary.
    const stats = buildShareStats(
      [day(PROGRESS_HISTORY_START, { newCards: 6, packCards: 90 })],
      { streak: 0, endDate: PROGRESS_HISTORY_START, windowDays: 30 },
    );
    expect(stats.cardsAdded).toBe(96);
  });

  it('reports no cards added as zero rather than as withheld', () => {
    expect(statsFor([day(LATER, { reviews: 4 })]).cardsAdded).toBe(0);
  });
});

describe('shareImageQuery for the tile figures', () => {
  it('sends each figure under its own key', () => {
    const stats = statsFor([
      day(LATER, { reviews: 10, cardsMatured: 3, studySeconds: 240, newCards: 5 }),
    ]);
    const q = new URLSearchParams(shareImageQuery(stats));
    expect([q.get('m'), q.get('t'), q.get('a')]).toEqual(['3', '240', '5']);
  });

  it('omits a withheld figure rather than sending it as zero', () => {
    // The contract between this and the route: absent means "the window cannot
    // honestly cover this", and a 0 on a shared image is a claim.
    const withheld = buildShareStats([], {
      streak: 0, endDate: DETAILED_HISTORY_START, windowDays: 30,
    });
    const q = new URLSearchParams(shareImageQuery(withheld));
    expect(q.has('m')).toBe(false);
    expect(q.has('t')).toBe(false);
  });

  it('still sends a real zero, which means the window covered it and found none', () => {
    const covered = statsFor([day(LATER, { reviews: 10 })]);
    const q = new URLSearchParams(shareImageQuery(covered));
    expect(q.get('m')).toBe('0');
    expect(q.get('t')).toBe('0');
  });

  it('omits cards added at zero, which draws no tile either way', () => {
    expect(new URLSearchParams(shareImageQuery(statsFor([day(LATER, { reviews: 4 })])))
      .has('a')).toBe(false);
  });
});

describe('formatStudyTime', () => {
  it('writes minutes alone under an hour', () => {
    expect(formatStudyTime(40 * 60)).toBe('40m');
  });

  it('writes hours and minutes together', () => {
    expect(formatStudyTime(2 * 3600 + 40 * 60)).toBe('2h 40m');
  });

  it('drops the minutes on a whole hour, which nobody writes as 2h 0m', () => {
    expect(formatStudyTime(2 * 3600)).toBe('2h');
  });

  it('rounds to the nearest minute rather than showing seconds', () => {
    expect(formatStudyTime(100)).toBe('2m');
    expect(formatStudyTime(89)).toBe('1m');
  });

  it('reads in Korean units when the reader is Korean', () => {
    expect(formatStudyTime(2 * 3600 + 40 * 60, 'Korean')).toBe('2시간 40분');
    expect(formatStudyTime(40 * 60, 'Korean')).toBe('40분');
    expect(formatStudyTime(2 * 3600, 'Korean')).toBe('2시간');
  });
});
