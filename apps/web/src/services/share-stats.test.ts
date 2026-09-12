import { describe, it, expect } from 'vitest';
import {
  DETAILED_HISTORY_START,
  PROGRESS_HISTORY_START,
  buildShareCards,
  buildShareStats,
  buildTodayStats,
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

  it('gives each card a distinct filename, today included', () => {
    // Mobile deletes by filename before downloading, so a collision is a stale
    // picture going out — and a one-day window would otherwise collide.
    const names = cardsFor(busyThroughout)
      .map(card => shareImageFilename(card.stats, card.variant));
    expect(new Set(names).size).toBe(names.length);
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
