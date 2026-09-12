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
 */
export type ShareVariant = 'window' | 'today';

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
  /** How many days the card covers; 1 for the today card. */
  windowDays: number;
  /**
   * The label the card wears under the preview.
   *
   * `shareWindowDays` takes a `{count}`, which is `windowDays`; the today key
   * ignores it. Kept here rather than at the call site so the chooser and the
   * image itself cannot describe the same picture differently — the render
   * route reaches for the very same two keys.
   */
  labelKey: 'shareWindowDays' | 'shareVariantToday';
  stats: ShareStats;
}

/**
 * Every picture worth offering, in the order they should be swiped through.
 *
 * Windows first, shortest to longest, then today — matching the range chips on
 * the Progress screen, which is where the reader just came from. A window with
 * nothing in it is dropped rather than offered blank, per `hasShareableHistory`,
 * and an account with no history at all yields an empty list, which is the
 * caller's cue to say so instead of drawing an empty carousel.
 *
 * ⚠️ **The gate is asked per card.** A today card on a day with nothing rated is
 * exactly the zeroed image that check exists to prevent, however full the year
 * beside it happens to be.
 */
export function buildShareCards(
  days: DailyProgress[],
  input: Omit<ShareStatsInput, 'windowDays'> & { windows: readonly number[] },
): ShareCard[] {
  const { windows, ...rest } = input;
  const cards: ShareCard[] = [
    ...[...windows].sort((a, b) => a - b).map((windowDays): ShareCard => ({
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
  ];
  return cards.filter(card => hasShareableHistory(card.stats));
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
): string {
  return `/api/stats-image?${shareImageQuery(stats, nativeLanguage, variant)}`;
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
): string {
  return variant === 'today'
    ? `amgi-${stats.windowEnd}-today.png`
    : `amgi-${stats.windowEnd}-${stats.windowDays}d.png`;
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
