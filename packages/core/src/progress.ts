/**
 * Daily progress rollups — the write path behind the progress dashboard.
 *
 * Before this, everything the app remembered about study history was four
 * fields on `users/{uid}`: `streak`, `longestStreak`, `lastReviewDate` and
 * `reviewedToday`. That answers "am I on a streak" and nothing else. "Which
 * days did I review", "how much", and "how many new cards did I add" were not
 * unsurfaced — they were never written down.
 *
 * **The grain is one document per day**, not one per rating. Every question
 * actually being asked (a heatmap, a habit, a weekly recap) is a per-day
 * question, and a year of study is 365 documents instead of ~20,000. The cost
 * of a rollup is that it throws away anything it didn't count in advance: once
 * a day is summed there is no recovering time-of-day, or which card was which.
 * That is why the field list below is slightly wider than what the first screen
 * renders — a field added later only starts collecting from the day it ships,
 * and this history cannot be reconstructed.
 *
 * **The day is per user, not per language**, because the habit being tracked is
 * "studied today" rather than "studied Korean today" — someone who reviews
 * Japanese keeps their streak. The per-language detail lives *inside* the day
 * as `byLanguage`, so the dashboard can still break a day down without
 * splitting the streak six ways.
 *
 * Storage is `users/{uid}/progress/{YYYY-MM-DD}`. A subcollection rather than a
 * top-level collection specifically because the *Delete User Data* extension is
 * configured as `users/{UID}` with recursive mode — so account deletion sweeps
 * these with no config change. A top-level `progress_daily` would silently
 * survive a deletion until someone remembered to add the path.
 */
import type { StudyLanguage } from './types';

/** The four buttons a review can end on. Mirrors `getNextReviewData`'s input. */
export type ReviewVerdict = 'again' | 'hard' | 'good' | 'easy';

/**
 * Where a card came from. Enrolling in a 474-card pack and looking up one word
 * are both "new cards" and are not remotely the same event, so they are counted
 * apart — a heatmap where one pack import dwarfs every real study day is worse
 * than no heatmap.
 */
export type CardSource = 'lookup' | 'pack';

/**
 * The first day a rollup was ever written.
 *
 * Nothing before this exists and nothing before it can be reconstructed —
 * review history was not recorded in any form until the day the write path
 * shipped. So every "total" is a total *since then*, not since the account was
 * created, and a window reaching further back is shorter than it looks. Any
 * surface showing a total over a range that starts before this has to say so;
 * `historyStartsMidWindow` is the check.
 */
export const PROGRESS_HISTORY_START = '2026-08-20';

/** Whether a window reaches back past the day history begins. */
export function historyStartsMidWindow(windowStart: string): boolean {
  return windowStart < PROGRESS_HISTORY_START;
}

/**
 * The first day the *detailed* counters were written: `cardsMatured`,
 * `studySeconds` and `byHour`.
 *
 * A second boundary, sixteen days after `PROGRESS_HISTORY_START`, and the
 * reason there has to be one is that the two fail differently. A window
 * reaching past the first has no rows at all, which is visible. A window
 * reaching past *this* one has rows that simply read zero for these three
 * fields — an undercount that looks exactly like a quiet fortnight.
 *
 * `reviews`, `newCards`, `packCards` and the four verdicts are **not** subject
 * to it; they have been written since rollups began. Only the three added on
 * this date are.
 */
export const DETAILED_HISTORY_START = '2026-09-06';

/** Whether a window reaches back past the day the detailed counters begin. */
export function detailedHistoryStartsMidWindow(windowStart: string): boolean {
  return windowStart < DETAILED_HISTORY_START;
}

/**
 * The most one card can contribute to `studySeconds`.
 *
 * A card left revealed while its reader answers the door is not thirty minutes
 * of study. Anki caps the same measurement at 60s for the same reason; a cap
 * biases the total low on genuinely hard cards, which is the right direction to
 * be wrong on a number a user is going to post publicly.
 */
export const THINK_TIME_CAP_SECONDS = 60;

/** A think time clamped into what a day's total will accept: 0…the cap. */
export function clampThinkTime(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(Math.round(seconds), THINK_TIME_CAP_SECONDS);
}

/** Ratings with a verdict recorded. Zero for every day before 2026-09-04. */
export function ratedTotal(progress: LanguageProgress): number {
  return progress.again + progress.hard + progress.good + progress.easy;
}

/**
 * The share of ratings that were *not* a lapse, 0–1, or `null` when nothing
 * has been rated.
 *
 * `again` is the only verdict that means the card was missed — `hard` is a
 * recall that hurt, not a failure — so this counts three of the four buttons,
 * matching what SM-2 itself does with them (`getNextReviewData` resets the
 * interval on `again` alone). Naming it retention rather than accuracy is
 * deliberate: nothing here was marked right or wrong, the learner graded
 * themselves.
 */
export function retentionRate(progress: LanguageProgress): number | null {
  const total = ratedTotal(progress);
  return total === 0 ? null : (total - progress.again) / total;
}

/** One language's slice of a day. */
export interface LanguageProgress {
  /** Ratings submitted. Counts *directions*, matching `reviewedToday`. */
  reviews: number;
  /** Cards added one at a time — a lookup, an import, an enrichment. */
  newCards: number;
  /** Cards added by enrolling in a pack. */
  packCards: number;
  /**
   * Which button each of those ratings landed on.
   *
   * Per language rather than whole-day since 2026-09-04. They were whole-day
   * before that, which made accuracy-per-language underivable — and a rollup
   * discards what it didn't count in advance, so the fix could only ever start
   * collecting from the day it shipped, never backfill. Days before then carry
   * the whole-day counts and zeroes in every language slice; a per-language
   * accuracy is therefore honest only over a window that starts after.
   */
  again: number;
  hard: number;
  good: number;
  easy: number;
  /**
   * Cards that crossed into maturity on this day — see `MATURE_INTERVAL_DAYS`.
   *
   * Counts **cards, not directions**, unlike `reviews`: the rating path knows
   * both directions of the card it is rating, so it can tell a card crossing
   * the line from a second direction catching up to one already over it. That
   * is the whole reason this is written rather than derived — a card's maturity
   * is readable from the card document at any time, but *the day it happened*
   * is not, and a rollup cannot be backfilled.
   *
   * Written from 2026-09-06. Zero on every day before that, which is why a
   * "cards learned" over a window starting earlier is not the same number as
   * the all-time count derived from the cards themselves.
   */
  cardsMatured: number;
  /**
   * Seconds spent with a card on screen, summed over the day's ratings.
   *
   * Measured per card — revealed to rated, clamped by `THINK_TIME_CAP_SECONDS`
   * — rather than as a session wall-clock. A session timer would have to
   * survive backgrounding, a force-kill and a phone left face-up on a table,
   * and would still be wrong in all three; a per-card duration attaches to the
   * rating that already exists, needs no lifecycle, and negates cleanly on undo
   * because the delta carries the number it added.
   */
  studySeconds: number;
}

/** Every counter on a `LanguageProgress`, in one place — the day totals and the
 *  per-language slices carry the same set, so a field added here reaches the
 *  merge, negate, apply, parse and `increment()` paths on both platforms
 *  without any of them being edited. */
export const COUNTER_KEYS = [
  'reviews', 'newCards', 'packCards', 'again', 'hard', 'good', 'easy',
  'cardsMatured', 'studySeconds',
] as const;

export function emptyLanguageProgress(): LanguageProgress {
  return {
    reviews: 0, newCards: 0, packCards: 0, again: 0, hard: 0, good: 0, easy: 0,
    cardsMatured: 0, studySeconds: 0,
  };
}

/**
 * One user-day.
 *
 * The top-level counters are the sum across languages, stored rather than
 * derived so the common read (a heatmap of 365 days) doesn't have to walk every
 * language map on every document. They are inherited rather than redeclared:
 * a day and a language slice count exactly the same things.
 */
export interface DailyProgress extends LanguageProgress {
  /** `YYYY-MM-DD` in the device's local timezone. Also the document id. */
  date: string;
  byLanguage: Partial<Record<StudyLanguage, LanguageProgress>>;
  /**
   * Ratings by local hour of day, `'0'`–`'23'`, sparse — only hours with a
   * rating in them appear.
   *
   * Deliberately **not** part of `COUNTER_KEYS` and deliberately **not** inside
   * the language slices. It is a map rather than a counter, so it needs its own
   * line in merge, negate, apply and parse; and putting it per-language would
   * multiply 24 keys by nine languages on every document to answer a question
   * ("when do you study") that was never per-language.
   *
   * Sparse rather than a fixed 24 because these documents are written with
   * `increment()` on a `merge: true` write — an hour nobody studied in has no
   * key, exactly like a day nobody added a card on has no `newCards`.
   */
  byHour: Record<string, number>;
}

/** The local hour of a rating, as the key `byHour` stores it under. */
export function hourKey(date: Date = new Date()): string {
  return String(date.getHours());
}

/**
 * A set of counters to add to a day. Same shape as `DailyProgress` minus the
 * date, with every field optional: only what changed is present.
 *
 * Kept as plain numbers rather than Firestore `increment()` sentinels so the
 * logic here stays pure and testable, and so mobile can stack deltas in
 * AsyncStorage while offline. The platform layer maps each leaf to an
 * `increment()` on the way out.
 */
export interface ProgressDelta extends Partial<LanguageProgress> {
  byLanguage?: Partial<Record<StudyLanguage, Partial<LanguageProgress>>>;
  byHour?: Record<string, number>;
}

/** `YYYY-MM-DD` in local time. `en-CA` is the shortest way to get ISO order. */
export function localDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

/** The day `n` days before `date`, as `YYYY-MM-DD`. */
export function shiftDate(date: string, days: number): string {
  // Parsed as UTC noon so a `days` shift can't be eaten by a DST boundary.
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Every date from `start` to `end` inclusive, ascending. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let day = start; day <= end; day = shiftDate(day, 1)) out.push(day);
  return out;
}

export function emptyDailyProgress(date: string): DailyProgress {
  return { date, ...emptyLanguageProgress(), byLanguage: {}, byHour: {} };
}

/**
 * Read a stored day back into a `DailyProgress`.
 *
 * Every field is treated as optional and defaulted to zero. This is not
 * defensive habit: these documents are written by `increment()` on a
 * `merge: true` write, so a day only ever contains the counters that actually
 * moved — a day where nobody added a card genuinely has no `newCards` key. Any
 * field added to this module in future lands the same way, missing on every
 * document written before it existed.
 */
export function parseDailyProgress(date: string, raw: unknown): DailyProgress {
  const data = (raw ?? {}) as Record<string, unknown>;
  const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

  const readCounters = (source: Record<string, unknown> | undefined): LanguageProgress => {
    const counters = emptyLanguageProgress();
    for (const key of COUNTER_KEYS) counters[key] = count(source?.[key]);
    return counters;
  };

  const byLanguage: Partial<Record<StudyLanguage, LanguageProgress>> = {};
  const storedLanguages = (data.byLanguage ?? {}) as Record<string, Record<string, unknown>>;
  for (const [language, slice] of Object.entries(storedLanguages)) {
    byLanguage[language as StudyLanguage] = readCounters(slice);
  }

  // Hours are kept sparse on the way back in as well as on the way out: an
  // absent hour and a zeroed one mean the same thing, and filling 24 keys per
  // day would make every heatmap read carry them.
  const byHour: Record<string, number> = {};
  const storedHours = (data.byHour ?? {}) as Record<string, unknown>;
  for (const [hour, value] of Object.entries(storedHours)) {
    const counted = count(value);
    if (counted !== 0) byHour[hour] = counted;
  }

  return { date, ...readCounters(data), byLanguage, byHour };
}

/**
 * What a rating knew about itself beyond which button was pressed.
 *
 * Every field is optional and omitting one costs only that counter — a caller
 * that cannot measure think time still records the review. That matters
 * because these are read at the two `recordReview` call sites, and a surface
 * added later should degrade to the old behaviour rather than to a wrong
 * number.
 */
export interface RatingContext {
  /** Seconds the card was on screen. Clamped by `clampThinkTime`. */
  seconds?: number;
  /** `maturityChange`'s verdict for this rating: 1, 0 or -1. */
  matured?: number;
  /** Local hour of the rating, from `hourKey`. */
  hour?: string;
}

/**
 * The delta for one submitted rating.
 *
 * `reviews` counts directions, not cards — a card due both ways contributes
 * two. That is deliberate and matches what `reviewedToday` has always counted,
 * so the dashboard and the streak chip cannot disagree about what "47 reviews"
 * means. It does read roughly double what a learner pictures; changing it is a
 * separate, user-visible call. **`cardsMatured` is the opposite** and counts
 * cards, which is why the two cannot share a label on any surface.
 *
 * The returned delta is the *only* record of what this rating added. Undo
 * negates this object rather than rebuilding one from the verdict, because
 * `seconds` and `matured` are not recoverable from the verdict alone — a
 * rebuild would subtract a different number than the rating added.
 */
export function reviewDelta(
  studyLanguage: StudyLanguage,
  verdict: ReviewVerdict,
  context: RatingContext = {},
): ProgressDelta {
  const seconds = clampThinkTime(context.seconds ?? 0);
  const matured = context.matured ?? 0;

  // Zeroes are left out rather than written as 0, so a day document keeps
  // carrying only the counters that actually moved.
  const counters: Partial<LanguageProgress> = { reviews: 1, [verdict]: 1 };
  if (seconds > 0) counters.studySeconds = seconds;
  if (matured !== 0) counters.cardsMatured = matured;

  return {
    ...counters,
    byLanguage: { [studyLanguage]: { ...counters } },
    ...(context.hour === undefined ? {} : { byHour: { [context.hour]: 1 } }),
  };
}

/** The delta for `count` cards created at once. */
export function newCardsDelta(
  studyLanguage: StudyLanguage,
  count: number,
  source: CardSource,
): ProgressDelta {
  const field = source === 'pack' ? 'packCards' : 'newCards';
  return {
    [field]: count,
    byLanguage: { [studyLanguage]: { [field]: count } },
  };
}

/**
 * What one rating actually wrote — the receipt undo hands back.
 *
 * Undo used to take a verdict and a date and rebuild the delta from them, which
 * worked only while the verdict was the delta's entire content. Think time and
 * a maturity crossing are not recoverable from the verdict, so a rebuild would
 * subtract numbers the rating never added. Carrying the delta makes undo exact
 * by construction rather than by two call sites continuing to agree.
 *
 * A signed-out rating writes nothing and reports an empty delta, which negates
 * to nothing — so undo needs no separate signed-out branch.
 */
export interface RecordedReview {
  /** The day the rating was counted on, which a session across midnight needs. */
  date: string;
  delta: ProgressDelta;
}

/**
 * The delta that cancels another one out.
 *
 * Undoing a rating has to walk the day's counters back, and every counter here
 * commutes, so the inverse is simply the negation — `increment()` takes a
 * negative as happily as a positive. Only the tally is reversed: the streak
 * fields are not, because a review genuinely happened and correcting which
 * button it landed on is no reason to put a streak at risk.
 */
export function negateDelta(delta: ProgressDelta): ProgressDelta {
  const negated: ProgressDelta = {};
  for (const key of COUNTER_KEYS) {
    if (delta[key]) negated[key] = -delta[key]!;
  }
  const languages = Object.entries(delta.byLanguage ?? {});
  if (languages.length > 0) {
    negated.byLanguage = {};
    for (const [language, slice] of languages) {
      const inverse: Partial<LanguageProgress> = {};
      for (const key of COUNTER_KEYS) {
        if (slice?.[key]) inverse[key] = -slice[key]!;
      }
      negated.byLanguage[language as StudyLanguage] = inverse;
    }
  }
  const hours = Object.entries(delta.byHour ?? {});
  if (hours.length > 0) {
    negated.byHour = {};
    for (const [hour, count] of hours) {
      if (count) negated.byHour[hour] = -count;
    }
  }
  return negated;
}

/**
 * Add two deltas. Used to collapse a queue of offline deltas into one write —
 * counters commute, so a day's worth of unsent reviews is a single document
 * update on reconnect rather than one per rating.
 */
export function mergeDeltas(a: ProgressDelta, b: ProgressDelta): ProgressDelta {
  const merged: ProgressDelta = {};
  for (const key of COUNTER_KEYS) {
    const sum = (a[key] ?? 0) + (b[key] ?? 0);
    if (sum !== 0) merged[key] = sum;
  }

  const languages = new Set([
    ...Object.keys(a.byLanguage ?? {}),
    ...Object.keys(b.byLanguage ?? {}),
  ] as StudyLanguage[]);
  if (languages.size > 0) {
    merged.byLanguage = {};
    for (const language of languages) {
      const left = a.byLanguage?.[language] ?? {};
      const right = b.byLanguage?.[language] ?? {};
      const slice: Partial<LanguageProgress> = {};
      for (const key of COUNTER_KEYS) {
        const sum = (left[key] ?? 0) + (right[key] ?? 0);
        if (sum !== 0) slice[key] = sum;
      }
      merged.byLanguage[language] = slice;
    }
  }

  const hours = new Set([...Object.keys(a.byHour ?? {}), ...Object.keys(b.byHour ?? {})]);
  if (hours.size > 0) {
    merged.byHour = {};
    for (const hour of hours) {
      const sum = (a.byHour?.[hour] ?? 0) + (b.byHour?.[hour] ?? 0);
      if (sum !== 0) merged.byHour[hour] = sum;
    }
  }
  return merged;
}

/**
 * Apply a delta to a day, returning a new day.
 *
 * The server increments atomically; this is the local mirror, so a review just
 * submitted shows on the dashboard without a refetch.
 */
export function applyDelta(day: DailyProgress, delta: ProgressDelta): DailyProgress {
  const next: DailyProgress = {
    ...day,
    byLanguage: { ...day.byLanguage },
    byHour: { ...day.byHour },
  };
  for (const key of COUNTER_KEYS) {
    next[key] = day[key] + (delta[key] ?? 0);
  }
  for (const [language, slice] of Object.entries(delta.byLanguage ?? {})) {
    const existing = day.byLanguage[language as StudyLanguage] ?? emptyLanguageProgress();
    const updated = emptyLanguageProgress();
    for (const key of COUNTER_KEYS) updated[key] = existing[key] + (slice[key] ?? 0);
    next.byLanguage[language as StudyLanguage] = updated;
  }
  for (const [hour, count] of Object.entries(delta.byHour ?? {})) {
    const sum = (day.byHour[hour] ?? 0) + count;
    // An hour undone back to nothing loses its key rather than keeping a 0, so
    // the local mirror matches what a fresh parse of the document would give.
    if (sum === 0) delete next.byHour[hour];
    else next.byHour[hour] = sum;
  }
  return next;
}

/** A day counts as studied if a rating landed on it. Adding cards isn't study. */
export function isStudyDay(day: DailyProgress | undefined): boolean {
  return !!day && day.reviews > 0;
}

/**
 * Consecutive studied days ending at `today`, derived from the rows themselves.
 *
 * Today not being studied yet does not break a streak — the day isn't over. So
 * the count starts at yesterday when today is empty, which is the same
 * concession the stored counter makes by only advancing on the first review of
 * a day.
 *
 * **Not what the streak chip displays.** The chip reads the stored counter on
 * `users/{uid}`, which has years of history behind it where these rows start
 * empty the day they ship. Deriving it here would show `1` to someone on a
 * 200-day streak. This exists for the day the rows are old enough to take over.
 */
export function deriveStreak(days: DailyProgress[], today: string): number {
  const studied = new Set(days.filter(isStudyDay).map(day => day.date));
  let cursor = studied.has(today) ? today : shiftDate(today, -1);
  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

export interface ProgressSummary {
  totalReviews: number;
  totalNewCards: number;
  totalPackCards: number;
  /**
   * Net cards that crossed into maturity in the window — see `maturityChange`.
   *
   * Written only from 2026-09-06, so a window reaching back further undercounts
   * rather than being wrong in an interesting way. `historyStartsMidWindow` is
   * the existing check for the *older* boundary and does not cover this one;
   * any surface that shows this over a long window has to say which it means.
   */
  totalCardsMatured: number;
  /** Seconds with a card on screen, summed. Also only written from 2026-09-06. */
  totalStudySeconds: number;
  /** Days with at least one rating. */
  activeDays: number;
  /** Mean reviews across *active* days — averaging in rest days flatters nothing. */
  averagePerActiveDay: number;
  /** Descending by reviews, so the dashboard can render it in order. */
  byLanguage: { studyLanguage: StudyLanguage; progress: LanguageProgress }[];
  /**
   * Ratings by local hour across the window, sparse — the same shape a single
   * day carries, summed. Empty for any window before 2026-09-06.
   */
  byHour: Record<string, number>;
}

/** Totals over a window of days. */
export function summarizeProgress(days: DailyProgress[]): ProgressSummary {
  const totals = {
    totalReviews: 0, totalNewCards: 0, totalPackCards: 0,
    totalCardsMatured: 0, totalStudySeconds: 0, activeDays: 0,
  };
  const languages = new Map<StudyLanguage, LanguageProgress>();
  const byHour: Record<string, number> = {};

  for (const day of days) {
    totals.totalReviews += day.reviews;
    totals.totalNewCards += day.newCards;
    totals.totalPackCards += day.packCards;
    totals.totalCardsMatured += day.cardsMatured;
    totals.totalStudySeconds += day.studySeconds;
    if (isStudyDay(day)) totals.activeDays += 1;
    for (const [language, slice] of Object.entries(day.byLanguage)) {
      const existing = languages.get(language as StudyLanguage) ?? emptyLanguageProgress();
      const summed = emptyLanguageProgress();
      for (const key of COUNTER_KEYS) summed[key] = existing[key] + (slice?.[key] ?? 0);
      languages.set(language as StudyLanguage, summed);
    }
    for (const [hour, count] of Object.entries(day.byHour)) {
      byHour[hour] = (byHour[hour] ?? 0) + count;
    }
  }

  return {
    ...totals,
    averagePerActiveDay: totals.activeDays === 0
      ? 0
      : Math.round(totals.totalReviews / totals.activeDays),
    byLanguage: [...languages.entries()]
      .map(([studyLanguage, progress]) => ({ studyLanguage, progress }))
      .sort((a, b) => b.progress.reviews - a.progress.reviews),
    byHour,
  };
}

/** One row of the by-language list: the window's activity, plus the all-time count. */
export interface LanguageRow {
  studyLanguage: StudyLanguage;
  /** The window's counters. All zero for a language with no activity in it. */
  progress: LanguageProgress;
  /** Cards past the maturity line right now — all time, not this window. */
  learned: number;
}

/**
 * The by-language list: what happened in the window, beside what has been
 * learned overall.
 *
 * ⚠️ **Two scopes on one row, deliberately.** `progress` is the selected
 * window; `learned` is every card over the line right now, because that is the
 * only thing "learned" can mean once it is read off the card rather than off a
 * rollup. On a screen being read that is fine if the labels say so — it is a
 * shared *image*, read at thumbnail size, where mixed scopes lie.
 *
 * **The union is the point.** Taking only the window's languages would hide a
 * language with learned cards that has not been reviewed lately — and the
 * dormant deck is exactly the one whose total you have forgotten and would most
 * want to see. Taking only the languages with learned cards would drop a
 * language being studied right now that has not matured anything yet.
 *
 * Ordered by the window's reviews so the list still reads as "what I have been
 * doing", with learned breaking ties and the code last, so the order is stable
 * rather than dependent on map insertion.
 */
export function mergeLanguageRows(
  byLanguage: { studyLanguage: StudyLanguage; progress: LanguageProgress }[],
  learned: Partial<Record<StudyLanguage, number>>,
): LanguageRow[] {
  const rows = new Map<StudyLanguage, LanguageRow>();
  for (const entry of byLanguage) {
    rows.set(entry.studyLanguage, {
      ...entry,
      learned: learned[entry.studyLanguage] ?? 0,
    });
  }
  for (const [language, count] of Object.entries(learned) as [StudyLanguage, number][]) {
    // A zero here is a language with nothing learned *and* nothing in the
    // window — a row that would say nothing at all.
    if (count <= 0 || rows.has(language)) continue;
    rows.set(language, {
      studyLanguage: language,
      progress: emptyLanguageProgress(),
      learned: count,
    });
  }
  return [...rows.values()].sort((a, b) => (
    b.progress.reviews - a.progress.reviews
    || b.learned - a.learned
    || a.studyLanguage.localeCompare(b.studyLanguage)
  ));
}

export interface HeatmapCell {
  date: string;
  reviews: number;
  /** 0 = untouched, 1–4 = quartile-ish bands for colouring. */
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * A dense day-by-day series for the calendar, gaps filled with zeroes.
 *
 * Levels are scaled against the window's own busiest day rather than fixed
 * thresholds: someone doing 8 reviews a day and someone doing 300 should both
 * see a legible gradient, not a flat wash at one end of the scale.
 */
export function buildHeatmap(days: DailyProgress[], endDate: string, dayCount: number): HeatmapCell[] {
  const byDate = new Map(days.map(day => [day.date, day]));
  const start = shiftDate(endDate, -(dayCount - 1));
  const busiest = Math.max(0, ...days.map(day => day.reviews));

  return dateRange(start, endDate).map(date => {
    const reviews = byDate.get(date)?.reviews ?? 0;
    let level: HeatmapCell['level'] = 0;
    if (reviews > 0 && busiest > 0) {
      const share = reviews / busiest;
      level = share > 0.75 ? 4 : share > 0.5 ? 3 : share > 0.25 ? 2 : 1;
    }
    return { date, reviews, level };
  });
}

/**
 * The day of the week a `YYYY-MM-DD` falls on, 0 = Sunday.
 *
 * Parsed at UTC noon like every other date helper here, so the answer cannot be
 * moved by a timezone or a DST boundary.
 */
export function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Sunday, matching the calendars both locales print. */
export const WEEK_STARTS_ON = 0;

/** Where a month label goes: the column its first drawn day lands in. */
export interface MonthTick {
  column: number;
  /** The first date of that month *inside the window*, not the 1st. */
  date: string;
}

export interface WeekGrid {
  /**
   * Columns of seven, oldest first, each running Sunday→Saturday.
   *
   * `null` is a slot outside the window — before it opened or after it ends —
   * and is **not** a day nobody studied. A zeroed cell would claim it was.
   */
  columns: (HeatmapCell | null)[][];
  months: MonthTick[];
}

/**
 * A heatmap laid out in week columns, so a *row* means a weekday.
 *
 * **Why this is not `buildHeatmap`'s job.** That returns exactly `dayCount`
 * cells starting `dayCount - 1` days before the end, and both dashboards chunk
 * them by seven — so row 0 is whatever weekday the window happens to open on,
 * and it shifts by one every day. Labelling those rows would label them
 * *wrong*, which is worse than leaving them bare.
 *
 * Aligning inside `buildHeatmap` was the alternative and is worse still: the
 * shared image consumes the same cells and deliberately does **not** align to
 * weeks — it wraps at roughly `sqrt(days × 2.2)` to keep its block square — and
 * its `h` parameter is one character per day, asserted on both sides of the
 * URL. So alignment lives here, over the top, for the two surfaces that draw a
 * calendar and label it.
 */
export function buildWeekGrid(cells: HeatmapCell[]): WeekGrid {
  if (cells.length === 0) return { columns: [], months: [] };

  const lead = (weekdayIndex(cells[0].date) - WEEK_STARTS_ON + 7) % 7;
  const slots: (HeatmapCell | null)[] = [...Array<null>(lead).fill(null), ...cells];
  // The final week is padded out too, so every column is seven tall and the
  // renderer never has to special-case a short one.
  while (slots.length % 7 !== 0) slots.push(null);

  const columns: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) columns.push(slots.slice(i, i + 7));

  // Walked day by day rather than column by column. A month almost never begins
  // on the day a column opens — 1 September 2026 is a Tuesday, 1 August a
  // Saturday — so keying off each column's first cell pushed the label into the
  // *next* column, up to six days to the right of the month it names.
  const months: MonthTick[] = [];
  let seen = cells[0].date.slice(0, 7);
  // The window almost always opens mid-month, and a label there names a month
  // whose beginning is not on screen. It earns one only when the window starts
  // on the 1st itself.
  if (cells[0].date.endsWith('-01')) months.push({ column: 0, date: cells[0].date });
  cells.forEach((cell, offset) => {
    const month = cell.date.slice(0, 7);
    if (month === seen) return;
    seen = month;
    // No minimum spacing between ticks: a month is at least 28 days, so two
    // consecutive ones can never land closer than four columns apart.
    months.push({ column: Math.floor((lead + offset) / 7), date: cell.date });
  });

  return { columns, months };
}
