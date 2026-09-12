'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchRecentProgress } from '@/services/progress';
import {
  CARD_COLLECTIONS, buildHeatmap, buildShareStats, buildTodayStats, buildWeekGrid,
  hasShareableHistory, localDateString, mergeLanguageRows, summarizeProgress, weekdayIndex,
  type DailyProgress, type HeatmapCell, type StudyLanguage,
} from '@amgi/core';
import { backfillMatureFlags, countMatureFlashcards } from '@/services/firestore';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';
import { t } from '@/lib/i18n';
import ShareStatsButton from '@/components/ShareStatsButton';

/**
 * The windows on offer. 364 rather than 365 so the calendar is a whole number
 * of weeks and the columns line up.
 */
const RANGES = [
  { days: 30, key: 'progressRangeMonth' },
  { days: 90, key: 'progressRangeQuarter' },
  { days: 364, key: 'progressRangeYear' },
] as const;

/**
 * A day's shade. Index is `HeatmapCell.level`, so 0 is a rest day — drawn as a
 * faint block rather than as nothing, because an empty grid cell and a missing
 * grid cell look identical and one of them is a bug.
 *
 * Each step is a theme variable rather than an opacity on `--color-highlight`.
 * The old alpha ramp measured wrong — on forest it made a rest day *lighter*
 * than a studied one, and put empty and level 1 ΔE 1.4 apart under
 * deuteranopia. See the comment on `--heat-0` in globals.css, and the identical
 * values in mobile's `theme.ts`.
 */
const LEVEL_STYLES = [
  'bg-[var(--heat-0)]',
  'bg-[var(--heat-1)]',
  'bg-[var(--heat-2)]',
  'bg-[var(--heat-3)]',
  'bg-[var(--heat-4)]',
];

/**
 * Which weekday rows get a label. Seven at 12px collide; three is what GitHub's
 * calendar labels, and it is enough to key the other four.
 */
const LABELLED_WEEKDAYS = [1, 3, 5];

/**
 * Sunday-first weekday names in the reader's language.
 *
 * Built from a known Sunday through `Intl` rather than from translation keys:
 * seven more keys per locale to say what the platform already knows.
 */
function weekdayLabels(nativeLanguage: string | null | undefined): string[] {
  const locale = nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB';
  // 1970-01-04 was a Sunday.
  return [0, 1, 2, 3, 4, 5, 6].map(offset => new Date(Date.UTC(1970, 0, 4 + offset, 12))
    .toLocaleDateString(locale, { weekday: 'short' }));
}

export default function ProgressPage() {
  const { user, authLoading, nativeLanguage, streak } = useUser();
  const [rangeDays, setRangeDays] = useState<number>(90);
  /**
   * The result carries the range it was fetched for, so switching range reads
   * as loading without an effect having to reset state first — which is both a
   * cascading render and a lint error.
   */
  const [loaded, setLoaded] = useState<{ rangeDays: number; days: DailyProgress[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchRecentProgress(user.uid, rangeDays)
      .then(result => { if (!cancelled) setLoaded({ rangeDays, days: result }); })
      // An empty list renders as the "nothing yet" state, which is also the
      // honest thing to show when the read failed — there is no number to
      // report either way, and a dashboard is not worth an error dialog.
      .catch(() => { if (!cancelled) setLoaded({ rangeDays, days: [] }); });
    return () => { cancelled = true; };
  }, [user, rangeDays]);

  const days = loaded?.rangeDays === rangeDays ? loaded.days : null;

  const summary = useMemo(() => summarizeProgress(days ?? []), [days]);
  /** The last seven days, dense — the same builder the calendar uses. */
  const weekCells = useMemo(
    () => buildHeatmap(days ?? [], localDateString(), 7),
    [days],
  );
  const heatmap = useMemo(
    () => buildHeatmap(days ?? [], localDateString(), rangeDays),
    [days, rangeDays],
  );

  /**
   * Columns of seven, week-aligned, so a *row* is always the same weekday —
   * which is what lets the rows carry labels at all. Chunking the window by
   * seven put a different weekday in row 0 every day. See `buildWeekGrid`.
   */
  const grid = useMemo(() => buildWeekGrid(heatmap), [heatmap]);
  const weekdays = useMemo(() => weekdayLabels(nativeLanguage), [nativeLanguage]);

  /**
   * The hovered day, as its place in the grid.
   *
   * One tooltip node positioned from that, rather than a hidden one inside
   * every cell — a year is 364 cells, and 364 permanently-mounted tooltips is a
   * lot of DOM for something at most one of which is ever visible. Carries the
   * column and row rather than an index into `heatmap`, because the grid is
   * padded at both ends and an index into the flat window no longer says where
   * a cell was drawn.
   */
  const [hovered, setHovered] = useState<
    { date: string; column: number; row: number } | null
  >(null);
  /** The full day behind a cell; `HeatmapCell` only carries the review count. */
  const daysByDate = useMemo(
    () => new Map((days ?? []).map(day => [day.date, day])),
    [days],
  );

  /**
   * The numbers the shareable image is built from — the same window the page is
   * showing, so what someone posts matches what they were looking at.
   *
   * Derived rather than fetched: `buildShareStats` reads the rollups already in
   * hand, so opening the share sheet costs no reads.
   */
  const shareStats = useMemo(
    () => buildShareStats(days ?? [], {
      streak,
      endDate: localDateString(),
      windowDays: rangeDays,
    }),
    [days, streak, rangeDays],
  );

  /** Today's numbers, from the same rows — a one-day window, nothing more. */
  const todayStats = useMemo(
    () => buildTodayStats(days ?? [], { streak, endDate: localDateString() }),
    [days, streak],
  );

  /**
   * What there is to share, and nothing that would go out blank.
   *
   * ⚠️ **The gate is asked per variant.** A today card on a day with nothing
   * rated is exactly the zeroed image `hasShareableHistory` exists to prevent,
   * however full the 90-day window beside it happens to be.
   */
  const shareOptions = useMemo(() => ([
    { variant: 'window' as const, stats: shareStats },
    { variant: 'today' as const, stats: todayStats },
  ].filter(option => hasShareableHistory(option.stats))), [shareStats, todayStats]);

  /**
   * Cards learned — all of them, not a window's worth.
   *
   * "Learned" is a *state*: a card whose interval has reached 21 days. That is
   * readable from the card itself and always has been, for every card, with no
   * date boundary — which is why this no longer asks the rollups. They only
   * ever knew the *day a card crossed*, and that began on 2026-09-06, so a
   * windowed version of this figure could not appear on any range the tab
   * offers until October.
   *
   * Null while it is still being counted, and null if the count fails: an
   * absent tile says less than a tile showing a wrong number.
   *
   * ⚠️ **Above the early returns, with the other hooks.** This was briefly
   * written where the old windowed helper was called — a plain function call
   * sitting after `if (authLoading) return null`, which is fine for a function
   * and a rules-of-hooks violation for these two.
   */
  const [learned, setLearned] = useState<
    { total: number; byLanguage: Partial<Record<StudyLanguage, number>> } | null
  >(null);

  useEffect(() => {
    // No `setLearned(null)` here: the tile only renders inside the signed-in
    // branch, so a stale count cannot be shown, and clearing it synchronously
    // in an effect body is the cascading-render pattern this file avoids.
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // The flag is written by every rating from 2026-09-12, but a card not
        // rated since carries none — and long-interval cards are exactly the
        // ones nobody has rated lately. So the backfill runs first, once per
        // account, or the very first count would miss most of its subject.
        const prefs = await getUserPreferences(user.uid);
        if (!prefs?.matureBackfillAt) {
          await backfillMatureFlags(user.uid);
          await saveUserPreferences(user.uid, { matureBackfillAt: localDateString() });
        }
        // Cards shard per language, so the whole deck means every collection.
        // Aggregation counts, so this is ten cheap queries rather than a read
        // of every card.
        // Kept per language rather than summed on the spot: the breakdown is
        // already in hand here, and throwing it away would mean asking for it
        // again the moment the by-language list wanted it.
        const counts = await Promise.all(CARD_COLLECTIONS.map(
          async ({ code }) => [code, await countMatureFlashcards(user.uid, code)] as const,
        ));
        if (cancelled) return;
        const byLanguage: Partial<Record<StudyLanguage, number>> = {};
        let total = 0;
        for (const [code, count] of counts) {
          if (count > 0) byLanguage[code] = count;
          total += count;
        }
        setLearned({ total, byLanguage });
      } catch {
        if (!cancelled) setLearned(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-highlight)] mb-6">
          {t(nativeLanguage, 'progressTitle')}
        </h1>
        <p className="text-[var(--color-muted)]">{t(nativeLanguage, 'progressSignedOut')}</p>
      </div>
    );
  }

  const hasHistory = summary.totalReviews > 0 || summary.totalNewCards > 0 || summary.totalPackCards > 0;

  /**
   * The window's languages and the all-time learned counts, as one list.
   *
   * The union is what keeps a language you have not reviewed lately from
   * disappearing along with its learned count — see `mergeLanguageRows`.
   */
  const languageRows = mergeLanguageRows(summary.byLanguage, learned?.byLanguage ?? {});

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-highlight)] mb-1">
        {t(nativeLanguage, 'progressTitle')}
      </h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        {t(nativeLanguage, 'progressDescription')}
      </p>

      {/* Share sits in the range row rather than by the title, so the window
          being shared is the one selected right next to it. */}
      <div className="flex gap-2 mb-6 items-start">
        {RANGES.map(range => (
          <button
            key={range.days}
            onClick={() => setRangeDays(range.days)}
            className="px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors"
            style={rangeDays === range.days
              ? { borderColor: 'var(--color-highlight)', color: 'var(--color-highlight)', fontWeight: 700 }
              : { borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
          >
            {t(nativeLanguage, range.key)}
          </button>
        ))}
        {/* Offered only once there is something on the image. A zeroed story
            asset is not a modest result, it is a broken-looking one. */}
        {shareOptions.length > 0 && (
          <div className="ml-auto">
            <ShareStatsButton options={shareOptions} nativeLanguage={nativeLanguage} />
          </div>
        )}
      </div>

      {days === null ? (
        <p className="text-[var(--color-muted)]">{t(nativeLanguage, 'progressLoading')}</p>
      ) : !hasHistory ? (
        <div>
          <p className="text-[var(--color-muted)]">{t(nativeLanguage, 'progressEmpty')}</p>
          <p className="text-sm text-[var(--color-muted)] opacity-70 mt-2">
            {t(nativeLanguage, 'progressEmptyBody')}
          </p>
        </div>
      ) : (
        <>
          {/* The streak comes from `UserContext`, not from these rows. The rows
              start empty the day this ships, so deriving it would show `1` to
              someone on a 200-day streak — and two surfaces disagreeing about
              a streak is exactly the failure this dashboard should not add. */}
          <div className={`grid grid-cols-2 gap-3 mb-8 ${
            learned === null ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
          }`}>
            <Stat label={t(nativeLanguage, 'progressStreak')}
              value={streak === 1
                ? t(nativeLanguage, 'progressStreakDay')
                : t(nativeLanguage, 'progressStreakDays', { count: streak })} />
            <Stat label={t(nativeLanguage, 'progressStatReviews')} value={summary.totalReviews} />
            <Stat label={t(nativeLanguage, 'progressStatAverage')} value={summary.averagePerActiveDay} />
            {/* Shares its label with the tile on the shared image, so the two
                surfaces cannot describe one number differently. It counts
                *cards* where Reviews counts directions — the reason they carry
                different nouns and never one shared one. */}
            {learned !== null && (
              <Stat label={t(nativeLanguage, 'shareStatLearned')} value={learned.total} />
            )}
          </div>

          <section className="mb-8">
            <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
              {t(nativeLanguage, 'progressCalendar')}
            </h2>
            {/* The weekday gutter sits outside the scroller so it stays put
                while a year of columns slides past it. */}
            <div className="flex">
              <div
                className="flex flex-col gap-1 mr-1.5 shrink-0"
                style={{ paddingTop: TOOLTIP_LANE + MONTH_ROW_HEIGHT }}
              >
                {weekdays.map((name, row) => (
                  <div
                    key={name}
                    className="h-3 w-7 text-right text-[9px] leading-3 text-[var(--color-muted)]"
                  >
                    {LABELLED_WEEKDAYS.includes(row) ? name : ''}
                  </div>
                ))}
              </div>
              {/* Scrolls on its own rather than letting the page scroll
                  sideways: a year is 52 columns and will not fit a phone.
                  `relative` is the tooltip's positioning context, and it sits
                  inside the scroller so the bubble travels with the grid
                  instead of detaching from its cell. */}
              <div className="overflow-x-auto pb-2">
                <div
                  className="relative w-max"
                  style={{ paddingTop: TOOLTIP_LANE }}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className="relative"
                    style={{ height: MONTH_ROW_HEIGHT, width: grid.columns.length * COLUMN_PITCH }}
                  >
                    {grid.months.map(tick => (
                      <span
                        key={tick.date}
                        className="absolute top-0 text-[9px] text-[var(--color-muted)]"
                        style={{ left: tick.column * COLUMN_PITCH }}
                      >
                        {formatMonth(nativeLanguage, tick.date)}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {grid.columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="flex flex-col gap-1">
                        {column.map((cell, row) => (cell === null
                          // Outside the window: drawn as nothing, since an empty
                          // square would claim it was a day nobody studied.
                          ? <div key={`pad-${row}`} className="w-3 h-3" />
                          : (
                            <button
                              key={cell.date}
                              type="button"
                              aria-label={describeDay(nativeLanguage, cell.date, daysByDate.get(cell.date))}
                              onMouseEnter={() => setHovered({ date: cell.date, column: columnIndex, row })}
                              onFocus={() => setHovered({ date: cell.date, column: columnIndex, row })}
                              onBlur={() => setHovered(null)}
                              className={`w-3 h-3 rounded-sm ${LEVEL_STYLES[cell.level]} ${
                                hovered?.date === cell.date ? 'ring-1 ring-[var(--color-text)]' : ''
                              }`}
                            />
                          )))}
                      </div>
                    ))}
                  </div>

                  {hovered && (
                    <DayTooltip
                      nativeLanguage={nativeLanguage}
                      date={hovered.date}
                      day={daysByDate.get(hovered.date)}
                      column={hovered.column}
                      columnCount={grid.columns.length}
                    />
                  )}
                </div>
              </div>
            </div>
            {/* Named, not just graded: "Less → More" alone never says more of
                what. */}
            <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-muted)]">
              <span>{t(nativeLanguage, 'progressStatReviews')}</span>
              <span>{t(nativeLanguage, 'progressLessMore')}</span>
              {LEVEL_STYLES.map((style, level) => (
                <div key={level} className={`w-3 h-3 rounded-sm ${style}`} />
              ))}
              <span>{t(nativeLanguage, 'progressMore')}</span>
            </div>
          </section>

          <WeekBars nativeLanguage={nativeLanguage} cells={weekCells} />

          {languageRows.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
                {t(nativeLanguage, 'progressByLanguage')}
              </h2>
              <ul className="flex flex-col gap-2">
                {languageRows.map(({ studyLanguage, progress, learned: learnedHere }) => (
                  <li
                    key={studyLanguage}
                    className="flex items-baseline justify-between gap-3 p-3 rounded-xl border border-[var(--color-muted)]"
                  >
                    <span className="font-bold text-[var(--color-text)]">
                      {t(nativeLanguage, languageLabelKey(studyLanguage))}
                    </span>
                    <span className="text-xs text-[var(--color-muted)] text-right">
                      {/* A row can be here for its learned count alone, with
                          nothing in the window — saying "0 reviews" would read
                          as a slump rather than as a language left alone. */}
                      {progress.reviews === 0
                        ? t(nativeLanguage, 'progressTooltipNoReviews')
                        : t(nativeLanguage, 'progressLanguageReviews', { count: progress.reviews })}
                      {learnedHere > 0 && (
                        <>
                          {' · '}
                          {t(nativeLanguage, 'progressLanguageLearned', { count: learnedHere })}
                        </>
                      )}
                      {progress.newCards + progress.packCards > 0 && (
                        <>
                          {' · '}
                          {t(nativeLanguage, 'progressStatNewCards')} {progress.newCards + progress.packCards}
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Reserved height above the grid so the bubble has somewhere to go without
 * shifting the calendar when it appears. Cheaper than measuring, and a grid
 * that jumps on hover is worse than a little whitespace.
 */
const TOOLTIP_LANE = 44;
/** Cell (12px) plus the `gap-1` between columns (4px). */
const COLUMN_PITCH = 16;
/** Room above the grid for the month ticks. */
const MONTH_ROW_HEIGHT = 14;

function DayTooltip({ nativeLanguage, date, day, column, columnCount }: {
  nativeLanguage: string | null | undefined;
  date: string;
  day: DailyProgress | undefined;
  column: number;
  columnCount: number;
}) {
  // A day with no document is a day with no reviews, which is what the cell
  // behind this bubble is already drawing.
  const reviews = day?.reviews ?? 0;
  const cardsAdded = (day?.newCards ?? 0) + (day?.packCards ?? 0);

  /**
   * Centred, except near the ends where a centred bubble would be clipped by
   * the scroller. Flipping the alignment costs three cases and no measuring —
   * the alternative is a ref, a layout read, and a second render on every
   * cell you pass over.
   */
  const alignment = column <= 2
    ? 'translate-x-0'
    : column >= columnCount - 3
      ? '-translate-x-full'
      : '-translate-x-1/2';

  return (
    <div
      className={`absolute top-0 ${alignment} pointer-events-none z-10 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg`}
      style={{
        left: column * COLUMN_PITCH + 6,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-muted)',
      }}
    >
      <div className="font-bold text-[var(--color-text)]">{formatDay(nativeLanguage, date)}</div>
      <div className="text-[var(--color-muted)]">
        {reviews === 0
          ? t(nativeLanguage, 'progressTooltipNoReviews')
          : reviews === 1
            ? t(nativeLanguage, 'progressTooltipOneReview')
            : t(nativeLanguage, 'progressTooltipReviews', { count: reviews })}
        {cardsAdded > 0 && (
          <> · {cardsAdded === 1
            ? t(nativeLanguage, 'progressTooltipOneCard')
            : t(nativeLanguage, 'progressTooltipCards', { count: cardsAdded })}</>
        )}
      </div>
    </div>
  );
}

/** The plot's height in pixels; the tallest bar fills it. */
const WEEK_PLOT_HEIGHT = 64;

/**
 * Reviews per day for the last week.
 *
 * Bars rather than a line: seven days is seven discrete counts, which is what
 * bars are for — and it keeps both platforms on the same picture without a
 * native drawing library on the phone.
 *
 * One series, so there is no legend and the title names the measure instead.
 * Only the busiest day is labelled: a number over every bar is noise, and the
 * height already carries the comparison.
 */
function WeekBars({ nativeLanguage, cells }: {
  nativeLanguage: string | null | undefined;
  cells: HeatmapCell[];
}) {
  const weekdays = weekdayLabels(nativeLanguage);
  const busiest = Math.max(0, ...cells.map(cell => cell.reviews));

  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
        {t(nativeLanguage, 'progressWeekTitle')}
      </h2>
      <div
        className="flex items-end gap-2 border-b border-[var(--color-muted)]"
        style={{ height: WEEK_PLOT_HEIGHT + 14 }}
      >
        {cells.map(cell => (
          <div key={cell.date} className="flex-1 flex flex-col items-center justify-end">
            {busiest > 0 && cell.reviews === busiest && (
              <span className="text-[10px] leading-3 text-[var(--color-muted)]">{cell.reviews}</span>
            )}
            {/* A day with reviews keeps a visible sliver, for the same reason
                the calendar gives a one-review day a level of 1. */}
            <div
              className="w-full rounded-t-sm bg-[var(--heat-4)]"
              style={{
                height: busiest > 0 && cell.reviews > 0
                  ? Math.max(2, Math.round((cell.reviews / busiest) * WEEK_PLOT_HEIGHT))
                  : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {cells.map(cell => (
          <div
            key={cell.date}
            className="flex-1 text-center text-[10px] text-[var(--color-muted)]"
          >
            {/* From the cell's own date: these seven days end on today, so they
                are not a fixed Sunday-to-Saturday run. */}
            {weekdays[weekdayIndex(cell.date)]}
          </div>
        ))}
      </div>
    </section>
  );
}

/** `2026-09-01` → `Sep` / `9월`, for the calendar's month ticks. */
function formatMonth(nativeLanguage: string | null | undefined, date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'short' },
  );
}

/** `2026-08-19` → `19 August` / `8월 19일`, in the reader's language. */
function formatDay(nativeLanguage: string | null | undefined, date: string): string {
  // Parsed at UTC noon so the date can't slip a day either side of the line.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'long', day: 'numeric' },
  );
}

/** The same content as the tooltip, flattened for screen readers. */
function describeDay(
  nativeLanguage: string | null | undefined,
  date: string,
  day: DailyProgress | undefined,
): string {
  const reviews = day?.reviews ?? 0;
  const cardsAdded = (day?.newCards ?? 0) + (day?.packCards ?? 0);
  const parts = [
    formatDay(nativeLanguage, date),
    reviews === 0
      ? t(nativeLanguage, 'progressTooltipNoReviews')
      : t(nativeLanguage, 'progressTooltipReviews', { count: reviews }),
  ];
  if (cardsAdded > 0) parts.push(t(nativeLanguage, 'progressTooltipCards', { count: cardsAdded }));
  return parts.join(' · ');
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl border border-[var(--color-muted)]">
      <div className="text-xl font-bold text-[var(--color-highlight)]">{value}</div>
      <div className="text-xs text-[var(--color-muted)] mt-0.5">{label}</div>
    </div>
  );
}

/**
 * Reuses the per-language labels that already exist in both locales. The codes
 * carry no spaces (`TraditionalChinese`), so they concatenate directly.
 */
function languageLabelKey(studyLanguage: StudyLanguage) {
  return `label${studyLanguage}` as Parameters<typeof t>[1];
}
