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
  DETAILED_HISTORY_START, buildCardsAddedSeries, buildHeatmap, buildReviewsSeries,
  chartBucketDays, detailedHistoryStartsMidWindow, historyStartsMidWindow, shiftDate,
  summarizeProgress,
  type DailyProgress, type HeatmapCell,
} from './progress';
import { t } from './i18n';
import type { StudyLanguage } from './types';

/**
 * Which picture to draw.
 *
 * **The numbers are the same builder either way** — `buildShareStats` over a
 * one-day window is a correct set of figures for today — so this selects a
 * *layout*, not a second pipeline. It travels in the query because the render
 * lives behind one route: mobile cannot rasterize a view of its own without a
 * native module that costs an EAS build and breaks Expo Go, so every variant
 * has to come back from the same endpoint.
 *
 * ⚠️ **A today card is not the window template at `w=1`.** That layout is
 * window-shaped — a hero, a wrapped calendar, a row of window figures — and one
 * day of it is a single square and a tile reading "1 day studied".
 *
 * ⚠️ **`chart` is the one variant whose hero is not `reviews`.** It draws cards
 * added over the window, so its big number has to be the number the bars add up
 * to — a hero counting one thing above a chart counting another is read as the
 * chart's own total by anyone who sees it. That is also why it drops the
 * language line: `languages` names the languages *reviewed*, which is the
 * honest caption for a review count and a wrong one for cards added.
 *
 * ⚠️ **Anything unrecognised parses as `window`**, which is also what a URL with
 * no `v` at all means, so every link an installed build ever produced keeps
 * rendering what it always rendered. No parameter may ever become a parse
 * failure — that rule is what makes a new variant safe to add at all.
 */
export type ShareVariant = 'window' | 'today' | 'chart';

/**
 * Which of the two things the dashboard's chart can plot.
 *
 * ⚠️ **They are counted in different units and may never share an axis or a
 * label.** `reviews` counts *directions* — a card due both ways contributes two
 * — where `cards` counts cards. The chart card names whichever one it drew as
 * its hero for exactly that reason.
 */
export type ShareChartMeasure = 'reviews' | 'cards';

/** Which mark it was drawn with — the dashboard's own toggle. */
export type ShareChartMark = 'bars' | 'line';

/**
 * How the chart was drawn when the reader pressed Share.
 *
 * **This is the whole point of the chart card.** It is reached from the weekly
 * chart's own title row, so the asset has to be *that chart*: the measure the
 * dropdown was set to and the mark the toggle was on. A card that always drew
 * one of the four is a different picture wearing the same button.
 */
export interface ShareChartOptions {
  measure: ShareChartMeasure;
  mark: ShareChartMark;
}

/** What an unspecified chart is: the dashboard's own defaults. */
export const DEFAULT_SHARE_CHART: ShareChartOptions = { measure: 'cards', mark: 'bars' };

/**
 * Both series the chart card can draw, and what one bar covers.
 *
 * **Built for every card, not only the chart one, and both measures at once.**
 * They are the same rows the rest of `ShareStats` is summed from, so carrying
 * them costs nothing and keeps `buildShareStats` a single pass over one window.
 * `shareImageQuery` is where they stop travelling: it sends the one series the
 * card actually draws, and only for `v=chart`.
 *
 * ⚠️ **The grain is carried rather than left to be worked out.** Past
 * `DAILY_CHART_MAX_DAYS` a bar is a week, so a 90-day window is 13 bars and not
 * 90 — the route has to be *told* that, because inferring it from the count
 * would mean an installed build's URL changing meaning the day that threshold
 * moves.
 */
export interface ShareChart {
  /** How many days one bar covers: 1, or 7 past `DAILY_CHART_MAX_DAYS`. */
  bucketDays: number;
  /**
   * Cards added per bar, oldest first — always `lookup + pack`.
   *
   * ⚠️ **Never one source on its own.** The detail screen's chart can be
   * filtered to looked-up or pack cards, and that filter deliberately does not
   * travel: the total is the figure the dashboard tile and every other share
   * card already show, so a shared chart cannot quietly mean something narrower
   * than the label it wears.
   */
  cards: number[];
  /** Reviews per bar, oldest first — directions, as `reviews` always is. */
  reviews: number[];
}

/** The series one measure draws. */
export function chartValues(stats: ShareStats, measure: ShareChartMeasure): number[] {
  return measure === 'reviews' ? stats.chart.reviews : stats.chart.cards;
}

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
  /** The stored streak, passed straight through. */
  streak: number;

  /**
   * Cards that crossed into maturity **inside the window**, or `null` before
   * the counter existed.
   *
   * ⚠️ **This is not the dashboard's "Cards learned"**, and the two must never
   * wear the same label. That tile is a *state* — every card whose interval has
   * reached `MATURE_INTERVAL_DAYS`, counted from the cards themselves — and so
   * it is an all-time figure that cannot sit on a canvas where every other
   * number names one window. This is the *change* over the window, which can,
   * and it is rendered as "Newly learned" for exactly that reason.
   *
   * An all-time figure was considered and rejected here on 2026-09-12; the
   * windowed one arrived 2026-09-12 under its own label, which is the condition
   * the rejection named.
   */
  cardsMatured: number | null;

  /** Seconds with a card on screen, or `null` before the counter existed. */
  studySeconds: number | null;

  /**
   * Cards saved plus cards taken from packs, over the window.
   *
   * Unlike the two above this has been written since rollups began, so it is
   * never withheld — it is subject only to `partialHistory`, the same as
   * `reviews`. Zero is a truthful answer rather than a gap, and the render
   * drops the tile at zero as a layout choice, not as a claim.
   */
  cardsAdded: number;

  /**
   * Which languages the window's reviews were in, busiest first.
   *
   * The image reported a review count without ever saying what was being
   * studied. This is the answer, and it costs nothing: `byLanguage` has been
   * written since rollups began and `summarizeProgress` already sorts it.
   *
   * **Only languages actually reviewed in the window.** A language that had
   * cards added but nothing rated does not belong beside a review count.
   *
   * Every language is sent; the *render* decides how many fit, because how many
   * names fit on a canvas is a layout question rather than a data one.
   *
   * ⚠️ **Names only — never a per-language split of the numbers here.**
   * `byLanguage.reviews` goes back to the start, but the verdicts inside it
   * only from 2026-09-04 and `cardsMatured` from 2026-09-06, so a per-language
   * figure would break the one-window rule over any window worth posting.
   */
  languages: StudyLanguage[];

  /**
   * The window's calendar, for the hero. Always present and always dense —
   * `buildHeatmap` fills gaps with zeroes, so an unstudied day is a drawn empty
   * cell rather than a missing one.
   */
  heatmap: HeatmapCell[];

  /**
   * The window's cards-added bars, for the chart card. Always built; see
   * `ShareChart`.
   */
  chart: ShareChart;

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
    streak,
    // Both share one boundary because both counters began the same day; a
    // window reaching past it undercounts in a way that reads as a quiet
    // fortnight rather than as missing data, which is why it is withheld.
    cardsMatured: detailed ? summary.totalCardsMatured : null,
    studySeconds: detailed ? summary.totalStudySeconds : null,
    cardsAdded: summary.totalNewCards + summary.totalPackCards,
    languages: summary.byLanguage
      .filter(entry => entry.progress.reviews > 0)
      .map(entry => entry.studyLanguage),
    heatmap: buildHeatmap(inWindow, endDate, windowDays),
    // The same builder both detail screens draw, over the whole account rather
    // than one language — so a shared chart and the one on screen cannot
    // disagree about a bar they share.
    chart: {
      bucketDays: chartBucketDays(windowDays),
      cards: buildCardsAddedSeries(inWindow, endDate, windowDays).map(bucket => bucket.total),
      reviews: buildReviewsSeries(inWindow, endDate, windowDays).map(bucket => bucket.reviews),
    },
    partialHistory: historyStartsMidWindow(windowStart),
  };
}

/**
 * Today's numbers, from the rows the dashboard already has.
 *
 * A one-day window, which is all "today" is — so it inherits the filtering, the
 * gap-filling and both history boundaries rather than restating them. Note that
 * `studySeconds` is never withheld here in practice: a window starting today
 * cannot reach back past `DETAILED_HISTORY_START`.
 */
export function buildTodayStats(
  days: DailyProgress[],
  input: Omit<ShareStatsInput, 'windowDays'>,
): ShareStats {
  return buildShareStats(days, { ...input, windowDays: 1 });
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
 * Whether the chart card has a chart to draw, for the measure it would draw.
 *
 * ⚠️ **A different question from `hasShareableHistory`, and it has to be asked
 * of the right series.** That one asks whether anything was *reviewed*; a chart
 * of cards added over a month of empty bars is the broken-looking image,
 * however much was reviewed in it. The converse holds too — a fortnight spent
 * importing packs and rating nothing is a real chart. Asking it of the wrong
 * measure is how the Share button on the chart came to open on a calendar: the
 * reader was looking at a full reviews chart while every card on offer was
 * gated on cards added.
 */
export function hasShareableChart(stats: ShareStats, measure: ShareChartMeasure): boolean {
  return chartValues(stats, measure).some(value => value > 0);
}

/**
 * One picture on offer, and the numbers behind it.
 *
 * Built here rather than on each screen because "what may be shared" is a rule,
 * not a layout: the per-variant `hasShareableHistory` gate, the order the cards
 * come in, and the label each one wears all have to agree across platforms, and
 * two copies of that list would drift the moment one of them gained a window.
 */
export interface ShareCard {
  /** Stable across renders and unique within a list — a React key, and a param. */
  id: string;
  variant: ShareVariant;
  /**
   * How this card's chart is drawn, on the chart cards and absent on the rest.
   *
   * Carried on the card rather than read from the screen at the call site, so
   * the picture in the preview, the file that gets shared and the label under
   * it cannot describe three different charts.
   */
  chart?: ShareChartOptions;
  /** How many days the card covers; 1 for the today card. */
  windowDays: number;
  /**
   * The label the card wears under the preview.
   *
   * `shareWindowDays` and both `shareVariantChart*` keys take a `{count}`, which
   * is `windowDays`; the today key ignores it. The chart keys are two rather
   * than one because a chart card has to say *what* it plots — the two measures
   * are counted in different units. Kept here rather than at the call site so the chooser and the
   * image itself cannot describe the same picture differently — the render
   * route reaches for the very same two keys.
   */
  labelKey: 'shareWindowDays' | 'shareVariantToday'
    | 'shareVariantChartCards' | 'shareVariantChartReviews';
  stats: ShareStats;
}

/**
 * Every picture worth offering, in the order they should be swiped through.
 *
 * Windows first, shortest to longest, then today — matching the range chips on
 * the Progress screen, which is where the reader just came from — and the chart
 * cards last, because they arrived last and a reader who opened the sheet from
 * the range row should still land on the card they used to get. Whoever opens
 * it from the chart says so, and the caller scrolls to that id.
 *
 * A window with nothing in it is dropped rather than offered blank, and an
 * account with no history at all yields an empty list, which is the caller's
 * cue to say so instead of drawing an empty carousel.
 *
 * ⚠️ **The gate is asked per card, and it is not the same gate for every
 * card.** A today card on a day with nothing rated is exactly the zeroed image
 * `hasShareableHistory` exists to prevent, however full the year beside it
 * happens to be; a chart card is asked `hasShareableChart` instead, because the
 * two ask about different numbers.
 *
 * `chartWindows` defaults to `windows`, so a caller that wants the same ranges
 * charted says nothing. The dashboards pass the chart's own seven-day window in
 * as well, since that is the chart the Share button sits on — and `chart`, so
 * that every chart card is the picture that button was pressed on, at three
 * lengths.
 */
export function buildShareCards(
  days: DailyProgress[],
  input: Omit<ShareStatsInput, 'windowDays'> & {
    windows: readonly number[];
    chartWindows?: readonly number[];
    chart?: ShareChartOptions;
  },
): ShareCard[] {
  const { windows, chartWindows = windows, chart = DEFAULT_SHARE_CHART, ...rest } = input;
  const ascending = (values: readonly number[]) => [...values].sort((a, b) => a - b);
  const cards: ShareCard[] = [
    ...ascending(windows).map((windowDays): ShareCard => ({
      id: `w${windowDays}`,
      variant: 'window',
      windowDays,
      labelKey: 'shareWindowDays',
      stats: buildShareStats(days, { ...rest, windowDays }),
    })),
    {
      id: 'today',
      variant: 'today',
      windowDays: 1,
      labelKey: 'shareVariantToday',
      stats: buildTodayStats(days, rest),
    },
    ...ascending(chartWindows).map((windowDays): ShareCard => ({
      id: `c${windowDays}`,
      variant: 'chart',
      windowDays,
      chart,
      labelKey: chart.measure === 'reviews'
        ? 'shareVariantChartReviews'
        : 'shareVariantChartCards',
      stats: buildShareStats(days, { ...rest, windowDays }),
    })),
  ];
  return cards.filter(card => (card.variant === 'chart'
    ? hasShareableChart(card.stats, chart.measure)
    : hasShareableHistory(card.stats)));
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
export function shareImageQuery(
  stats: ShareStats,
  nativeLanguage?: string | null,
  variant: ShareVariant = 'window',
  chart: ShareChartOptions = DEFAULT_SHARE_CHART,
): string {
  const q = new URLSearchParams();
  // Omitted for the window card, so every URL an older build ever built still
  // means exactly what it meant.
  if (variant !== 'window') q.set('v', variant);
  q.set('w', String(stats.windowDays));
  q.set('r', String(stats.reviews));
  q.set('s', String(stats.streak));
  // Withheld figures are omitted entirely; a 0 here would be a claim. `a` is
  // omitted at zero too, but only to keep the URL short — the route reads an
  // absent `a` as zero and draws no tile either way.
  if (stats.cardsMatured !== null) q.set('m', String(stats.cardsMatured));
  if (stats.studySeconds !== null) q.set('t', String(stats.studySeconds));
  if (stats.cardsAdded > 0) q.set('a', String(stats.cardsAdded));
  // Only the chart card carries its marks, and it carries the grain beside them
  // rather than leaving the route to work it out — see `ShareChart`. A window
  // card's URL is unchanged by the chart existing, which is the whole of what
  // "backward compatible by construction" means here.
  //
  // One series, not both: the card draws one measure, and sending the other
  // would be a second set of numbers on a URL that has no way to label them.
  // `cm` and `mk` are omitted at the default, so the shortest URL is also the
  // one an absent parameter already means.
  if (variant === 'chart') {
    q.set('bd', String(stats.chart.bucketDays));
    q.set('c', chartValues(stats, chart.measure).join(','));
    if (chart.measure !== 'cards') q.set('cm', 'r');
    if (chart.mark !== 'bars') q.set('mk', 'l');
  }
  // Codes rather than display names: shorter, stable, and it leaves the label
  // in the reader's own language rather than the sharer's.
  if (stats.languages.length > 0) q.set('g', stats.languages.join(','));
  // One character per day, oldest first. A year is 364 characters, which is
  // well inside any URL limit and far shorter than sending counts.
  q.set('h', stats.heatmap.map(cell => cell.level).join(''));
  if (nativeLanguage) q.set('lang', nativeLanguage);
  return q.toString();
}

/** The full path to the rendered image, relative to whatever host serves it. */
export function shareImagePath(
  stats: ShareStats,
  nativeLanguage?: string | null,
  variant: ShareVariant = 'window',
  chart: ShareChartOptions = DEFAULT_SHARE_CHART,
): string {
  return `/api/stats-image?${shareImageQuery(stats, nativeLanguage, variant, chart)}`;
}

/**
 * The filename a share sheet or download offers it under.
 *
 * The variant is in the name as well as the window: today's card and a 1-day
 * window would otherwise collide, and mobile deletes by filename before
 * downloading, so a collision there means sharing a stale picture.
 */
export function shareImageFilename(
  stats: ShareStats,
  variant: ShareVariant = 'window',
  chart: ShareChartOptions = DEFAULT_SHARE_CHART,
): string {
  if (variant === 'today') return `amgi-${stats.windowEnd}-today.png`;
  // A chart and a window card can cover the very same days, and so can two
  // charts of different measures — so both go in the name, for the reason the
  // today card needed the variant there.
  if (variant === 'chart') {
    return `amgi-${stats.windowEnd}-${stats.windowDays}d-${chart.measure}.png`;
  }
  return `amgi-${stats.windowEnd}-${stats.windowDays}d.png`;
}

/**
 * Study time as a tile reads it: `2h 40m`, `40m`, `2h`.
 *
 * Rounded to the minute, because the tile is a boast rather than a stopwatch
 * and a seconds figure invites arithmetic nobody wants to do. The wording lives
 * in `i18n` rather than here so Korean gets 시간/분 rather than an h/m that
 * would look machine-translated, and the hour-only case is its own key because
 * "2시간 0분" is not something anyone writes.
 *
 * Anything under a minute rounds to `0m` — the render drops the tile before it
 * gets here, so that string should never reach a canvas.
 */
export function formatStudyTime(seconds: number, lang?: string | null): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t(lang, 'shareTimeMinutes', { m: rest });
  if (rest === 0) return t(lang, 'shareTimeHours', { h: hours });
  return t(lang, 'shareTimeHoursMinutes', { h: hours, m: rest });
}

/** What the study-time tile says: a label, and the seconds to format under it. */
export interface StudyTimeTile {
  labelKey: 'shareStatTime' | 'shareStatTimePerDay';
  seconds: number;
}

/**
 * The study-time tile for a window, or `null` when there is none to draw.
 *
 * **An average per day, not the window's total** (2026-09-23). "41h" over 90
 * days says how long the window was more than how much anyone studied; "27m a
 * day" reads the same at any length, so a 7-day card and a 90-day one can be
 * compared at a glance.
 *
 * ⚠️ **The divisor is every day in the window, days off included** — the
 * user's call, over dividing by days studied. That is the honest reading of
 * "a day" on a canvas whose heatmap already shows which days were off, and a
 * per-study-day figure would need its own label to not overclaim. It is also
 * why this needs nothing new from the URL: `t` stays the total and `w` is the
 * window, so every link an installed build ever made renders the new tile.
 *
 * Dividing by the window is only honest because `studySeconds` is already
 * withheld for a window reaching back past `DETAILED_HISTORY_START` — every
 * day it divides by was measured, so no unmeasured day drags it down.
 *
 * A one-day window keeps the total under its old label: an average of one day
 * *is* the total, and "per day" on the today card would be a strange thing to
 * say. And an average that rounds to no minutes draws no tile, for the reason
 * zero never does — `0m` beside a streak reads as a rebuke.
 */
export function studyTimeTile(studySeconds: number | null, windowDays: number): StudyTimeTile | null {
  if (studySeconds === null) return null;
  const days = Math.max(1, Math.round(windowDays));
  const seconds = studySeconds / days;
  if (Math.round(seconds / 60) < 1) return null;
  return { labelKey: days === 1 ? 'shareStatTime' : 'shareStatTimePerDay', seconds };
}
