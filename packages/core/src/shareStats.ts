/**
 * The numbers on the shareable stats image, and nothing else.
 *
 * Split from `progress.ts` for the reason the render route exists at all: this
 * has to be testable without rendering anything. Satori's PNG output is not
 * pixel-stable enough to snapshot, so the route can only ever assert "a PNG of
 * plausible size" — which means every claim the image makes has to be settled
 * here, where it can be asserted properly.
 *
 * **It reads the daily rollups only.** An earlier plan had "cards learned"
 * derived from the card documents, which would have meant nine `where uid ==`
 * queries across nine per-language collections every time someone opened the
 * share sheet. Counting maturity *crossings* at the rating instead
 * (`cardsMatured`) made the whole asset a function of rows the Progress tab
 * has already fetched. That is the main thing this module is: a promise that
 * sharing costs no reads.
 *
 * **Every number shares one window, or is withheld.** An image is read all at
 * once and out of context — "412 cards learned" beside "1,204 reviews in 30
 * days" is taken as two 30-day figures by anyone who sees it, which is a lie
 * told by juxtaposition rather than by either number. So a figure the window
 * cannot honestly cover comes back `null` and the image drops it, rather than
 * appearing with a caveat nobody reads at thumbnail size.
 *
 * **Retention is deliberately not here** (removed 2026-09-12). Review is about
 * how much you reviewed and how many cards you learned, not how accurately you
 * recalled them, so the percentage stopped being shown anywhere. Only the
 * *display* went: the four verdict counters are still written on every rating
 * and `retentionRate` is still exported from `progress.ts`, because a rollup
 * cannot be backfilled — stopping the write would throw the history away for
 * good, where stopping the render costs nothing to undo.
 */
import {
  DETAILED_HISTORY_START, buildHeatmap, detailedHistoryStartsMidWindow,
  historyStartsMidWindow, shiftDate, summarizeProgress,
  type DailyProgress, type HeatmapCell,
} from './progress';

/** What the caller knows that the rows do not. */
export interface ShareStatsInput {
  /**
   * The stored streak from `users/{uid}`, not one derived from these rows.
   *
   * Same reason the Progress tab reads it from context: the rollups start
   * empty the day they shipped, so deriving would show `1` to someone on a
   * 200-day streak. `deriveStreak` exists for the day the rows are old enough
   * to take over and this is not that day.
   */
  streak: number;
  /** The last day in the window, `YYYY-MM-DD`, normally today. */
  endDate: string;
  /** How many days the window spans, inclusive of `endDate`. */
  windowDays: number;
}

export interface ShareStats {
  /** `YYYY-MM-DD`, inclusive. */
  windowStart: string;
  windowEnd: string;
  windowDays: number;

  /**
   * Ratings submitted, counting **directions** — a card due both ways
   * contributes two.
   *
   * The name is the guard. `reviews` is what this has always counted, matching
   * `reviewedToday`, and it reads roughly double what a learner pictures. On a
   * dashboard tile that is read in context; on an image posted publicly it is
   * only safe while nothing calls it "cards". Any label the render puts on this
   * has to say *reviews*.
   */
  reviews: number;
  /** Days in the window with at least one rating. */
  daysStudied: number;
  /** The stored streak, passed straight through. */
  streak: number;

  /**
   * Net cards that crossed the maturity line inside the window — cards, not
   * directions — or `null` when the window reaches back before the counter
   * existed.
   *
   * `null` rather than an undercount, following what `retentionRate` already
   * does with a slice that has no verdicts: a figure that cannot be trusted
   * reads as *not recorded*, never as a real number that happens to be low.
   * Until `DETAILED_HISTORY_START` is a full window behind us this is `null`
   * for any window long enough to be worth posting, and the image shows four
   * numbers instead of five. It starts answering on its own, with no code
   * change, once the window clears the boundary.
   */
  cardsLearned: number | null;

  /** Seconds with a card on screen, or `null` before the counter existed. */
  studySeconds: number | null;

  /**
   * The window's calendar, for the hero. Always present and always dense —
   * `buildHeatmap` fills gaps with zeroes, so an unstudied day is a drawn empty
   * cell rather than a missing one.
   */
  heatmap: HeatmapCell[];

  /**
   * True when the window reaches back before any rollup exists at all, so
   * every total in it is a total over less time than the label claims.
   *
   * Distinct from the `null` fields above, which are about the *later*
   * boundary. This one the render has to say out loud, because the numbers
   * still look complete.
   */
  partialHistory: boolean;
}

/**
 * The numbers for one shareable image.
 *
 * `days` may contain rows outside the window and may be sparse; both are
 * filtered and filled here, so a caller can hand over whatever the Progress tab
 * already fetched without trimming it first.
 */
export function buildShareStats(days: DailyProgress[], input: ShareStatsInput): ShareStats {
  const { streak, endDate, windowDays } = input;
  const windowStart = shiftDate(endDate, -(windowDays - 1));

  const inWindow = days.filter(day => day.date >= windowStart && day.date <= endDate);
  const summary = summarizeProgress(inWindow);

  // The two boundaries are asked separately because they mean different
  // things: the first is "there are no rows", the second is "the rows are
  // there but three of their fields are not".
  const detailed = !detailedHistoryStartsMidWindow(windowStart);

  return {
    windowStart,
    windowEnd: endDate,
    windowDays,
    reviews: summary.totalReviews,
    daysStudied: summary.activeDays,
    streak,
    cardsLearned: detailed ? summary.totalCardsMatured : null,
    studySeconds: detailed ? summary.totalStudySeconds : null,
    heatmap: buildHeatmap(inWindow, endDate, windowDays),
    partialHistory: historyStartsMidWindow(windowStart),
  };
}

/**
 * The longest window, up to `preferred`, that every number can honestly fill.
 *
 * Offered so a caller can choose a shorter window over a withheld number,
 * rather than having that traded away for it. Returns `preferred` unchanged
 * once the detailed counters are old enough, which is the steady state — this
 * only does anything during the weeks after `DETAILED_HISTORY_START`, and
 * returns 0 on a day before it, meaning "there is no honest window yet".
 */
export function fullyCoveredWindow(endDate: string, preferred: number): number {
  if (endDate < DETAILED_HISTORY_START) return 0;
  const preferredStart = shiftDate(endDate, -(preferred - 1));
  if (preferredStart >= DETAILED_HISTORY_START) return preferred;
  // Inclusive of both ends, which is the same convention `windowDays` uses.
  let covered = 1;
  for (let day = endDate; day > DETAILED_HISTORY_START; day = shiftDate(day, -1)) covered += 1;
  return covered;
}

/**
 * Whether there is enough in the window to be worth posting.
 *
 * A zeroed image is not a modest result, it is a broken-looking one — the
 * share affordance should not be offered before there is something to show.
 * `isStudyDay` is the same bar the streak and the heatmap use, so "worth
 * sharing" cannot disagree with "you studied".
 */
export function hasShareableHistory(stats: ShareStats): boolean {
  return stats.reviews > 0 && stats.heatmap.some(cell => cell.reviews > 0);
}

/**
 * The query string the image route is called with.
 *
 * Shared because both platforms build the same URL and a drifting parameter
 * name would fail as a *wrong picture* rather than as an error — a missing `l`
 * silently drops the tile, a missing `s` silently draws a zero streak.
 *
 * **A withheld figure is omitted, never sent as 0.** That is the whole contract
 * between this and the route: `null` means the window cannot honestly cover it,
 * and a 0 on a shared image is a claim rather than a gap.
 */
export function shareImageQuery(stats: ShareStats, nativeLanguage?: string | null): string {
  const q = new URLSearchParams();
  q.set('w', String(stats.windowDays));
  q.set('r', String(stats.reviews));
  q.set('s', String(stats.streak));
  q.set('d', String(stats.daysStudied));
  if (stats.cardsLearned !== null) q.set('l', String(stats.cardsLearned));
  // One character per day, oldest first. A year is 364 characters, which is
  // well inside any URL limit and far shorter than sending counts.
  q.set('h', stats.heatmap.map(cell => cell.level).join(''));
  if (nativeLanguage) q.set('lang', nativeLanguage);
  return q.toString();
}

/** The full path to the rendered image, relative to whatever host serves it. */
export function shareImagePath(stats: ShareStats, nativeLanguage?: string | null): string {
  return `/api/stats-image?${shareImageQuery(stats, nativeLanguage)}`;
}

/** The filename a share sheet or download offers it under. */
export function shareImageFilename(stats: ShareStats): string {
  return `amgi-${stats.windowEnd}-${stats.windowDays}d.png`;
}
