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

/** One language's slice of a day. */
export interface LanguageProgress {
  /** Ratings submitted. Counts *directions*, matching `reviewedToday`. */
  reviews: number;
  /** Cards added one at a time — a lookup, an import, an enrichment. */
  newCards: number;
  /** Cards added by enrolling in a pack. */
  packCards: number;
}

/**
 * One user-day.
 *
 * The top-level counters are the sum across languages, stored rather than
 * derived so the common read (a heatmap of 365 days) doesn't have to walk every
 * language map on every document.
 */
export interface DailyProgress extends LanguageProgress {
  /** `YYYY-MM-DD` in the device's local timezone. Also the document id. */
  date: string;
  /**
   * Verdict counts, whole-day and not per language. Accuracy isn't on the
   * dashboard yet; these are here because four integers are cheap and a day
   * that goes by uncounted is gone for good.
   */
  again: number;
  hard: number;
  good: number;
  easy: number;
  byLanguage: Partial<Record<StudyLanguage, LanguageProgress>>;
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
export interface ProgressDelta {
  reviews?: number;
  newCards?: number;
  packCards?: number;
  again?: number;
  hard?: number;
  good?: number;
  easy?: number;
  byLanguage?: Partial<Record<StudyLanguage, Partial<LanguageProgress>>>;
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
  return {
    date,
    reviews: 0, newCards: 0, packCards: 0,
    again: 0, hard: 0, good: 0, easy: 0,
    byLanguage: {},
  };
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

  const byLanguage: Partial<Record<StudyLanguage, LanguageProgress>> = {};
  const storedLanguages = (data.byLanguage ?? {}) as Record<string, Record<string, unknown>>;
  for (const [language, slice] of Object.entries(storedLanguages)) {
    byLanguage[language as StudyLanguage] = {
      reviews: count(slice?.reviews),
      newCards: count(slice?.newCards),
      packCards: count(slice?.packCards),
    };
  }

  return {
    date,
    reviews: count(data.reviews),
    newCards: count(data.newCards),
    packCards: count(data.packCards),
    again: count(data.again),
    hard: count(data.hard),
    good: count(data.good),
    easy: count(data.easy),
    byLanguage,
  };
}

/**
 * The delta for one submitted rating.
 *
 * `reviews` counts directions, not cards — a card due both ways contributes
 * two. That is deliberate and matches what `reviewedToday` has always counted,
 * so the dashboard and the streak chip cannot disagree about what "47 reviews"
 * means. It does read roughly double what a learner pictures; changing it is a
 * separate, user-visible call.
 */
export function reviewDelta(studyLanguage: StudyLanguage, verdict: ReviewVerdict): ProgressDelta {
  return {
    reviews: 1,
    [verdict]: 1,
    byLanguage: { [studyLanguage]: { reviews: 1 } },
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
 * Add two deltas. Used to collapse a queue of offline deltas into one write —
 * counters commute, so a day's worth of unsent reviews is a single document
 * update on reconnect rather than one per rating.
 */
export function mergeDeltas(a: ProgressDelta, b: ProgressDelta): ProgressDelta {
  const merged: ProgressDelta = {};
  const scalars = ['reviews', 'newCards', 'packCards', 'again', 'hard', 'good', 'easy'] as const;
  for (const key of scalars) {
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
      for (const key of ['reviews', 'newCards', 'packCards'] as const) {
        const sum = (left[key] ?? 0) + (right[key] ?? 0);
        if (sum !== 0) slice[key] = sum;
      }
      merged.byLanguage[language] = slice;
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
  const next: DailyProgress = { ...day, byLanguage: { ...day.byLanguage } };
  for (const key of ['reviews', 'newCards', 'packCards', 'again', 'hard', 'good', 'easy'] as const) {
    next[key] = day[key] + (delta[key] ?? 0);
  }
  for (const [language, slice] of Object.entries(delta.byLanguage ?? {})) {
    const existing = day.byLanguage[language as StudyLanguage] ?? { reviews: 0, newCards: 0, packCards: 0 };
    next.byLanguage[language as StudyLanguage] = {
      reviews: existing.reviews + (slice.reviews ?? 0),
      newCards: existing.newCards + (slice.newCards ?? 0),
      packCards: existing.packCards + (slice.packCards ?? 0),
    };
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
  /** Days with at least one rating. */
  activeDays: number;
  /** Mean reviews across *active* days — averaging in rest days flatters nothing. */
  averagePerActiveDay: number;
  /** Descending by reviews, so the dashboard can render it in order. */
  byLanguage: { studyLanguage: StudyLanguage; progress: LanguageProgress }[];
}

/** Totals over a window of days. */
export function summarizeProgress(days: DailyProgress[]): ProgressSummary {
  const totals = { totalReviews: 0, totalNewCards: 0, totalPackCards: 0, activeDays: 0 };
  const languages = new Map<StudyLanguage, LanguageProgress>();

  for (const day of days) {
    totals.totalReviews += day.reviews;
    totals.totalNewCards += day.newCards;
    totals.totalPackCards += day.packCards;
    if (isStudyDay(day)) totals.activeDays += 1;
    for (const [language, slice] of Object.entries(day.byLanguage)) {
      const existing = languages.get(language as StudyLanguage) ?? { reviews: 0, newCards: 0, packCards: 0 };
      languages.set(language as StudyLanguage, {
        reviews: existing.reviews + (slice?.reviews ?? 0),
        newCards: existing.newCards + (slice?.newCards ?? 0),
        packCards: existing.packCards + (slice?.packCards ?? 0),
      });
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
  };
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
