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
                a year is 52 columns and will not fit a phone. */}
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-1 w-max">
                {weeks.map((week, index) => (
                  <div key={index} className="flex flex-col gap-1">
                    {week.map(cell => (
                      <div
                        key={cell.date}
                        title={cell.reviews > 0
                          ? t(nativeLanguage, 'progressDayCell', { date: cell.date, count: cell.reviews })
                          : t(nativeLanguage, 'progressDayCellNone', { date: cell.date })}
                        className={`w-3 h-3 rounded-sm ${LEVEL_STYLES[cell.level]}`}
                      />
                    ))}
                  </div>
                ))}
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
