'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchRecentProgress } from '@/services/progress';
import {
  buildHeatmap, localDateString, summarizeProgress,
  type DailyProgress, type StudyLanguage,
} from '@amgi/core';
import { t } from '@/lib/i18n';

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
 * faint outline rather than as nothing, because an empty grid cell and a
 * missing grid cell look identical and one of them is a bug.
 */
const LEVEL_STYLES = [
  'bg-[var(--color-muted)]/15',
  'bg-[var(--color-highlight)]/25',
  'bg-[var(--color-highlight)]/50',
  'bg-[var(--color-highlight)]/75',
  'bg-[var(--color-highlight)]',
];

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
  const heatmap = useMemo(
    () => buildHeatmap(days ?? [], localDateString(), rangeDays),
    [days, rangeDays],
  );

  // Columns of seven, oldest first, so the grid reads left to right like a
  // calendar rather than wrapping mid-week.
  const weeks = useMemo(() => {
    const columns: (typeof heatmap)[] = [];
    for (let i = 0; i < heatmap.length; i += 7) columns.push(heatmap.slice(i, i + 7));
    return columns;
  }, [heatmap]);

  /**
   * The hovered day, as its index into `heatmap`.
   *
   * One tooltip node positioned from the index, rather than a hidden one inside
   * every cell — a year is 364 cells, and 364 permanently-mounted tooltips is a
   * lot of DOM for something at most one of which is ever visible.
   */
  const [hovered, setHovered] = useState<number | null>(null);
  /** The full day behind a cell; `HeatmapCell` only carries the review count. */
  const daysByDate = useMemo(
    () => new Map((days ?? []).map(day => [day.date, day])),
    [days],
  );

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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-highlight)] mb-1">
        {t(nativeLanguage, 'progressTitle')}
      </h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        {t(nativeLanguage, 'progressDescription')}
      </p>

      <div className="flex gap-2 mb-6">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <Stat label={t(nativeLanguage, 'progressStreak')}
              value={streak === 1
                ? t(nativeLanguage, 'progressStreakDay')
                : t(nativeLanguage, 'progressStreakDays', { count: streak })} />
            <Stat label={t(nativeLanguage, 'progressStatReviews')} value={summary.totalReviews} />
            <Stat label={t(nativeLanguage, 'progressStatActiveDays')} value={summary.activeDays} />
            <Stat label={t(nativeLanguage, 'progressStatAverage')} value={summary.averagePerActiveDay} />
          </div>

          <section className="mb-8">
            <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
              {t(nativeLanguage, 'progressCalendar')}
            </h2>
            {/* Scrolls on its own rather than letting the page scroll sideways:
                a year is 52 columns and will not fit a phone. `relative` is the
                tooltip's positioning context, and it sits inside the scroller so
                the bubble travels with the grid instead of detaching from its
                cell. */}
            <div className="overflow-x-auto pb-2">
              <div
                className="relative flex gap-1 w-max"
                style={{ paddingTop: TOOLTIP_LANE }}
                onMouseLeave={() => setHovered(null)}
              >
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((cell, dayIndex) => {
                      const index = weekIndex * 7 + dayIndex;
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          aria-label={describeDay(nativeLanguage, cell.date, daysByDate.get(cell.date))}
                          onMouseEnter={() => setHovered(index)}
                          onFocus={() => setHovered(index)}
                          onBlur={() => setHovered(null)}
                          className={`w-3 h-3 rounded-sm ${LEVEL_STYLES[cell.level]} ${
                            hovered === index ? 'ring-1 ring-[var(--color-text)]' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}

                {hovered !== null && heatmap[hovered] && (
                  <DayTooltip
                    nativeLanguage={nativeLanguage}
                    cell={heatmap[hovered]}
                    day={daysByDate.get(heatmap[hovered].date)}
                    index={hovered}
                    columnCount={weeks.length}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-muted)]">
              <span>{t(nativeLanguage, 'progressLessMore')}</span>
              {LEVEL_STYLES.map((style, level) => (
                <div key={level} className={`w-3 h-3 rounded-sm ${style}`} />
              ))}
              <span>{t(nativeLanguage, 'progressMore')}</span>
            </div>
          </section>

          {summary.byLanguage.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
                {t(nativeLanguage, 'progressByLanguage')}
              </h2>
              <ul className="flex flex-col gap-2">
                {summary.byLanguage.map(({ studyLanguage, progress }) => (
                  <li
                    key={studyLanguage}
                    className="flex items-baseline justify-between gap-3 p-3 rounded-xl border border-[var(--color-muted)]"
                  >
                    <span className="font-bold text-[var(--color-text)]">
                      {t(nativeLanguage, languageLabelKey(studyLanguage))}
                    </span>
                    <span className="text-xs text-[var(--color-muted)] text-right">
                      {t(nativeLanguage, 'progressLanguageReviews', { count: progress.reviews })}
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

function DayTooltip({ nativeLanguage, cell, day, index, columnCount }: {
  nativeLanguage: string | null | undefined;
  cell: { date: string; reviews: number };
  day: DailyProgress | undefined;
  index: number;
  columnCount: number;
}) {
  const column = Math.floor(index / 7);
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
      <div className="font-bold text-[var(--color-text)]">{formatDay(nativeLanguage, cell.date)}</div>
      <div className="text-[var(--color-muted)]">
        {cell.reviews === 0
          ? t(nativeLanguage, 'progressTooltipNoReviews')
          : cell.reviews === 1
            ? t(nativeLanguage, 'progressTooltipOneReview')
            : t(nativeLanguage, 'progressTooltipReviews', { count: cell.reviews })}
        {cardsAdded > 0 && (
          <> · {cardsAdded === 1
            ? t(nativeLanguage, 'progressTooltipOneCard')
            : t(nativeLanguage, 'progressTooltipCards', { count: cardsAdded })}</>
        )}
      </div>
    </div>
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
