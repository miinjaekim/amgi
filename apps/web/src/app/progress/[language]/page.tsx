'use client';

/**
 * One language's slice of the progress dashboard.
 *
 * **It costs no read the dashboard was not already paying for.** `byLanguage`
 * has carried every counter since rollups began, so the same window of rows
 * answers "how much Korean" as readily as "how much"; the one extra query is
 * this language's all-time learned count, which is a single aggregation.
 *
 * ⚠️ **Two scopes on one screen, and more of them than the row had.** Reviews
 * and cards added are the selected window; *learned* is every card over the
 * line right now, because that is the only thing the word can mean once it is
 * read off the card rather than off a rollup. `mergeLanguageRows` says that is
 * fine if the labels say so — a detail view puts more numbers in one place, so
 * it needs that more, not less.
 *
 * **Retention is deliberately not here.** The verdict counters are per-language
 * only from 2026-09-04 and the display came off every surface on 2026-09-12
 * (Decisions in status.md). `byHour` is deliberately not per-language at all,
 * so "when do you study Korean" is not a question these rows can answer either.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { fetchRecentProgress } from '@/services/progress';
import {
  DETAILED_HISTORY_START, SUPPORTED_STUDY_LANGUAGES, buildCardsAddedSeries,
  buildLearnedSeries, chartBucketDays, localDateString, niceCeiling, summarizeProgress,
  weekAxisTicks,
  type CardsAddedBucket, type DailyProgress, type LearnedPoint, type StudyLanguage,
} from '@amgi/core';
import { backfillMatureFlags, countMatureFlashcards } from '@/services/firestore';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/**
 * The dashboard's windows plus a seven-day one, which only exists here.
 *
 * A detail view is opened to answer "how is this deck going lately", and a
 * month is already too coarse for that — where the dashboard is read for the
 * shape of a season. It is also the one window where both charts are entirely
 * within recorded history, so the learned curve never has to stop short.
 */
const RANGES = [
  { days: 7, key: 'progressRangeWeek' },
  { days: 30, key: 'progressRangeMonth' },
  { days: 90, key: 'progressRangeQuarter' },
  { days: 364, key: 'progressRangeYear' },
] as const;

/**
 * ⚠️ **The dashboard's selected range is deliberately *not* carried in.**
 *
 * It used to arrive as `?range=`, which cannot coexist with a default: every
 * arrival is from a row on the dashboard, so an inherited range would mean this
 * screen opened on 90 every time and seven days would never be the default it
 * is meant to be. Landing on the same window every time is also the more
 * predictable read.
 */
const DEFAULT_RANGE_DAYS = 7;

/** Taller than the weekly plot: this one can carry 52 bars rather than seven. */
const PLOT_HEIGHT = 96;
const AXIS_GUTTER = 30;
/** Room above a plot for its hover bubble, so appearing never shifts the page. */
const TOOLTIP_LANE = 44;

export default function LanguageProgressPage() {
  const { language } = useParams<{ language: string }>();
  const { user, authLoading, interfaceLanguage } = useUser();

  /**
   * The route's language, resolved against the registry rather than trusted.
   * A hand-typed URL is a string; everything below takes a `StudyLanguage`.
   */
  const entry = SUPPORTED_STUDY_LANGUAGES.find(candidate => candidate.code === language);
  const code = entry?.code;

  /**
   * Held in state rather than driven by the URL, so switching chips does not
   * push history entries the back button then has to be tapped through.
   */
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);

  /**
   * The result carries the range it was fetched for, so switching range reads
   * as loading without an effect having to reset state first — which is both a
   * cascading render and a lint error. Same shape as the dashboard.
   */
  const [loaded, setLoaded] = useState<{ rangeDays: number; days: DailyProgress[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchRecentProgress(user.uid, rangeDays)
      .then(result => { if (!cancelled) setLoaded({ rangeDays, days: result }); })
      // An empty list renders as the "nothing yet" state, which is also the
      // honest thing to show when the read failed — there is no number to
      // report either way.
      .catch(() => { if (!cancelled) setLoaded({ rangeDays, days: [] }); });
    return () => { cancelled = true; };
  }, [user, rangeDays]);

  const days = loaded?.rangeDays === rangeDays ? loaded.days : null;

  /**
   * This language's all-time learned count — the anchor the curve is walked
   * back from, so it has to be the same figure the dashboard row shows.
   *
   * The backfill is repeated from the dashboard rather than assumed to have
   * run: this route is linkable, so it can be the first progress surface an
   * account opens. `matureBackfillAt` makes it one-shot, so repeating the guard
   * costs one preferences read and never a second walk.
   */
  const [learned, setLearned] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !code) return;
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getUserPreferences(user.uid);
        if (!prefs?.matureBackfillAt) {
          await backfillMatureFlags(user.uid);
          await saveUserPreferences(user.uid, { matureBackfillAt: localDateString() });
        }
        const count = await countMatureFlashcards(user.uid, code);
        if (!cancelled) setLearned(count);
      } catch {
        // Null rather than zero: an absent figure says less than a wrong one,
        // and zero would anchor the curve at the floor.
        if (!cancelled) setLearned(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user, code]);

  const summary = useMemo(() => summarizeProgress(days ?? []), [days]);
  const progress = useMemo(
    () => summary.byLanguage.find(row => row.studyLanguage === code)?.progress,
    [summary, code],
  );

  const addedSeries = useMemo(
    () => buildCardsAddedSeries(days ?? [], localDateString(), rangeDays, code),
    [days, rangeDays, code],
  );
  const learnedSeries = useMemo(
    () => buildLearnedSeries(days ?? [], localDateString(), rangeDays, learned ?? 0, code),
    [days, rangeDays, learned, code],
  );

  if (authLoading) return null;

  const backLink = (
    <Link
      href="/progress"
      className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
    >
      ← {t(interfaceLanguage, 'progressBackToAll')}
    </Link>
  );

  // A code that is not in the registry — a hand-typed or stale URL. The way
  // back is the only useful thing on the page, so it is the whole page.
  if (!code || !entry) {
    return (
      <div className="max-w-2xl mx-auto">
        {backLink}
        <p className="text-[var(--color-muted)] mt-6">{t(interfaceLanguage, 'progressEmpty')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        {backLink}
        <h1 className="text-2xl font-bold text-[var(--color-highlight)] mt-3 mb-6">
          {t(interfaceLanguage, languageLabelKey(code))}
        </h1>
        <p className="text-[var(--color-muted)]">{t(interfaceLanguage, 'progressSignedOut')}</p>
      </div>
    );
  }

  const cardsAdded = (progress?.newCards ?? 0) + (progress?.packCards ?? 0);
  const reviews = progress?.reviews ?? 0;
  const weekly = chartBucketDays(rangeDays) > 1;

  return (
    <div className="max-w-2xl mx-auto">
      {backLink}
      <h1 className="text-2xl font-bold text-[var(--color-highlight)] mt-3 mb-6">
        {t(interfaceLanguage, languageLabelKey(code))}
      </h1>

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
            {t(interfaceLanguage, range.key)}
          </button>
        ))}
      </div>

      {days === null ? (
        <p className="text-[var(--color-muted)]">{t(interfaceLanguage, 'progressLoading')}</p>
      ) : (
        <>
          {/* Two of these name the window and one names all time, which is why
              the learned tile keeps the label it wears everywhere else. */}
          <div className={`grid grid-cols-2 gap-3 mb-8 ${learned === null ? '' : 'sm:grid-cols-3'}`}>
            <Stat label={t(interfaceLanguage, 'progressStatReviews')} value={reviews} />
            <Stat label={t(interfaceLanguage, 'progressStatNewCards')} value={cardsAdded} />
            {learned !== null && (
              <Stat label={t(interfaceLanguage, 'shareStatLearned')} value={learned} />
            )}
          </div>

          <AddedChart
            interfaceLanguage={interfaceLanguage}
            series={addedSeries}
            weekly={weekly}
          />

          {/* Withheld entirely rather than drawn from a guessed anchor: without
              the count there is nothing to walk back from. */}
          {learned !== null && (
            <LearnedChart
              interfaceLanguage={interfaceLanguage}
              series={learnedSeries}
              weekly={weekly}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Which half of "cards added" is being looked at, or both together. */
type AddedSource = 'lookup' | 'pack' | null;

/**
 * Cards added per bar, filtered by source rather than stacked.
 *
 * ⚠️ **This replaced a stacked bar on 2026-09-15, and the reason is legibility
 * rather than taste.** The two segments were genuinely hard to tell apart at a
 * glance — at 52 bars each band is a few pixels, and the colours are two steps
 * of one ramp because the ramp is what is theme-safe. Filtering answers the
 * same question one number at a time, and answers it exactly.
 *
 * **Nothing selected means the total**, which is the figure the dashboard tile
 * and the shared image both show — so the default state of this chart still
 * agrees with every other surface, and selecting a source is a narrowing rather
 * than a different measure.
 *
 * ⚠️ **No mark toggle.** The remembered mark is a single key
 * (`amgi_week_chart_mark`), so a second consumer of it would mean switching one
 * chart silently switched another.
 */
function AddedChart({ interfaceLanguage, series, weekly }: {
  interfaceLanguage: string | null | undefined;
  series: CardsAddedBucket[];
  weekly: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [source, setSource] = useState<AddedSource>(null);

  /** The value being drawn: one source, or both together. */
  const valueOf = (bucket: CardsAddedBucket) => (
    source === null ? bucket.total : bucket[source]
  );

  const busiest = Math.max(0, ...series.map(valueOf));
  const ceiling = niceCeiling(busiest);
  const ticks = weekAxisTicks(ceiling);
  const active = hovered === null ? null : series[hovered];

  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.max(1, Math.round((value / ceiling) * PLOT_HEIGHT))
    : 0);

  /**
   * The filter. Pressing the selected one clears it, which is the only way back
   * to the total — so the control is its own reset and needs no third chip.
   */
  const filter = (
    <div className="flex gap-1">
      {(['lookup', 'pack'] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => setSource(current => (current === option ? null : option))}
          aria-pressed={source === option}
          className="px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors"
          style={source === option
            ? { borderColor: 'var(--color-highlight)', color: 'var(--color-highlight)' }
            : { borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
        >
          {t(interfaceLanguage, option === 'lookup' ? 'progressChartLookup' : 'progressChartPack')}
        </button>
      ))}
    </div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-bold text-[var(--color-text)]">
          {t(interfaceLanguage, 'progressStatNewCards')}
        </h2>
        {filter}
      </div>

      {busiest === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          {t(interfaceLanguage, 'progressChartEmpty')}
        </p>
      ) : (
        <>
          <div
            className="relative"
            style={{ height: PLOT_HEIGHT + TOOLTIP_LANE }}
            onMouseLeave={() => setHovered(null)}
          >
            <Gridlines ticks={ticks} ceiling={ceiling} />

            {/* The bars and the hover targets in one: the column behind a bar
                is full height, so a quiet day is as easy to point at as a busy
                one. */}
            <div
              className="absolute bottom-0 flex items-end"
              style={{ left: AXIS_GUTTER, right: 0, height: PLOT_HEIGHT, gap: series.length > 26 ? 1 : 2 }}
            >
              {series.map((bucket, index) => (
                <button
                  key={bucket.start}
                  type="button"
                  className="flex-1 h-full flex flex-col justify-end cursor-default"
                  aria-label={describeAdded(interfaceLanguage, bucket, source)}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  style={{ opacity: hovered === null || hovered === index ? 1 : 0.55 }}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{ height: heightOf(valueOf(bucket)), background: 'var(--heat-4)' }}
                  />
                </button>
              ))}
            </div>

            {hovered !== null && active && (
              <ChartTooltip
                index={hovered}
                count={series.length}
                range={bucketLabel(interfaceLanguage, active)}
                detail={describeAdded(interfaceLanguage, active, source)}
              />
            )}
          </div>

          <AxisLabels interfaceLanguage={interfaceLanguage} series={series} />

          {weekly && (
            <div className="mt-2 text-xs text-[var(--color-muted)] text-right">
              {t(interfaceLanguage, 'progressChartWeeklyNote')}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Cards learned over time, as a cumulative curve.
 *
 * ⚠️ **A line and never bars.** The series is a running total, so a bar chart
 * of it would draw each bar as though it were that bar's own contribution —
 * the same number read as a rate rather than as a level.
 *
 * ⚠️ **The curve stops where the data stops.** Crossings were first recorded on
 * 2026-09-06, so a window reaching further back has points that are genuinely
 * unknowable, and they are `null` rather than zero. The line is drawn only
 * across the known run and a note says where it begins — a curve continuing
 * into a flat line at the left edge would claim nothing had been learned then.
 */
function LearnedChart({ interfaceLanguage, series, weekly }: {
  interfaceLanguage: string | null | undefined;
  series: LearnedPoint[];
  weekly: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const peak = Math.max(0, ...series.map(point => point.learned ?? 0));
  const ceiling = niceCeiling(peak);
  const ticks = weekAxisTicks(ceiling);
  const active = hovered === null ? null : series[hovered];
  /** True once any point had to be withheld, which is what earns the note. */
  const partial = series.some(point => point.learned === null);

  const centre = (index: number) => ((index + 0.5) * 100) / series.length;
  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.max(1, Math.round((value / ceiling) * PLOT_HEIGHT))
    : 0);

  /**
   * The drawable run: the points that are actually known.
   *
   * Filtered rather than sliced at the boundary, so a null appearing anywhere
   * else would drop out of the line instead of being drawn through. Their
   * original index is kept, so the curve still sits under the window it belongs
   * to rather than being stretched across the whole axis.
   */
  const known = series
    .map((point, index) => ({ point, index }))
    .filter((entry): entry is { point: LearnedPoint & { learned: number }; index: number } => (
      entry.point.learned !== null
    ));

  if (known.length === 0) return null;

  return (
    <section className="mb-8">
      <ChartHeading interfaceLanguage={interfaceLanguage} titleKey="shareStatLearned" />

      <div
        className="relative"
        style={{ height: PLOT_HEIGHT + TOOLTIP_LANE }}
        onMouseLeave={() => setHovered(null)}
      >
        <Gridlines ticks={ticks} ceiling={ceiling} />

        <div
          className="absolute bottom-0"
          style={{ left: AXIS_GUTTER, right: 0, height: PLOT_HEIGHT }}
        >
          {/* The insets live on this wrapper and the svg fills it at 100%: an
              `<svg>` is a replaced element, so given `width: auto` it would
              take its size from the viewBox and drop the `right` inset — the
              same trap the weekly chart's line mark carries a note about. */}
          <svg
            className="overflow-visible"
            width="100%"
            height="100%"
            viewBox={`0 0 100 ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={known
                .map(({ point, index }) => `${centre(index)},${PLOT_HEIGHT - heightOf(point.learned)}`)
                .join(' ')}
              fill="none"
              stroke="var(--heat-4)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              // Without this the stroke is scaled by the same non-uniform
              // transform as the geometry, so it thickens with the container.
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Only the hovered vertex is drawn. At 52 weekly points a dot on
              every one is a beaded string rather than a curve, and the line
              already carries the shape. */}
          {hovered !== null && active?.learned != null && (
            <span
              aria-hidden
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${centre(hovered)}%`,
                bottom: heightOf(active.learned),
                width: 10,
                height: 10,
                transform: 'translate(-50%, 50%)',
                background: 'var(--heat-4)',
                boxShadow: '0 0 0 2px var(--color-bg)',
              }}
            />
          )}
        </div>

        {/* One full-height target per point, over the line — a curve has no
            width to hover. */}
        <div
          className="absolute bottom-0 flex"
          style={{ left: AXIS_GUTTER, right: 0, height: PLOT_HEIGHT }}
        >
          {series.map((point, index) => (
            <button
              key={point.start}
              type="button"
              className="flex-1 h-full cursor-default"
              aria-label={describeLearned(interfaceLanguage, point)}
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </div>

        {hovered !== null && active && (
          <ChartTooltip
            index={hovered}
            count={series.length}
            range={bucketLabel(interfaceLanguage, active)}
            detail={describeLearned(interfaceLanguage, active)}
          />
        )}
      </div>

      <AxisLabels interfaceLanguage={interfaceLanguage} series={series} />

      <div className="flex gap-3 mt-2 text-xs text-[var(--color-muted)]">
        {/* Where the line begins, and why it begins there rather than at the
            left edge. Without this the curve looks truncated by a bug. */}
        {partial && (
          <span>
            {t(interfaceLanguage, 'progressChartLearnedCutoff', {
              date: formatDay(interfaceLanguage, DETAILED_HISTORY_START, true),
            })}
          </span>
        )}
        {weekly && <span className="ml-auto">{t(interfaceLanguage, 'progressChartWeeklyNote')}</span>}
      </div>
    </section>
  );
}

function ChartHeading({ interfaceLanguage, titleKey }: {
  interfaceLanguage: string | null | undefined;
  titleKey: Parameters<typeof t>[1];
}) {
  return (
    <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">
      {t(interfaceLanguage, titleKey)}
    </h2>
  );
}

/**
 * Gridlines and their labels. Solid hairlines a shade off the surface, never
 * dashed — a dashed rule reads as a threshold or a projection when it is only
 * a scale. Shared by both plots so the two cannot drift apart.
 */
function Gridlines({ ticks, ceiling }: { ticks: number[]; ceiling: number }) {
  return (
    <>
      {ticks.map(value => (
        <div
          key={value}
          className="absolute flex items-center"
          style={{ left: 0, right: 0, bottom: ceiling > 0 ? (value / ceiling) * PLOT_HEIGHT : 0 }}
        >
          <span
            className="text-[10px] leading-none text-[var(--color-muted)] text-right shrink-0 pr-1"
            style={{ width: AXIS_GUTTER }}
          >
            {value}
          </span>
          <span className="flex-1 border-t border-[var(--color-muted)] opacity-30" />
        </div>
      ))}
    </>
  );
}

/**
 * The ends of the window, named.
 *
 * Only two labels: at 52 bars a label per bar is unreadable and a label every
 * nth bar lands on an arbitrary date. The tooltip carries the rest, and the
 * bars are in order, so the two ends are enough to place everything between.
 */
function AxisLabels({ interfaceLanguage, series }: {
  interfaceLanguage: string | null | undefined;
  series: { start: string; end: string }[];
}) {
  if (series.length === 0) return null;
  return (
    <div
      className="flex justify-between mt-1 text-[10px] text-[var(--color-muted)]"
      style={{ marginLeft: AXIS_GUTTER }}
    >
      <span>{formatDay(interfaceLanguage, series[0].start)}</span>
      <span>{formatDay(interfaceLanguage, series[series.length - 1].end)}</span>
    </div>
  );
}

/**
 * The hover bubble, positioned from the slot it points at.
 *
 * Flipped at the ends rather than measured: the alternative is a ref, a layout
 * read and a second render on every bar you pass over.
 */
function ChartTooltip({ index, count, range, detail }: {
  index: number;
  count: number;
  range: string;
  detail: string;
}) {
  const alignment = index <= 1
    ? 'translate-x-0'
    : index >= count - 2
      ? '-translate-x-full'
      : '-translate-x-1/2';

  return (
    <div
      className={`absolute top-0 z-10 ${alignment} pointer-events-none px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg`}
      style={{
        left: `calc(${AXIS_GUTTER}px + ${((index + 0.5) * 100) / count}%)`,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-muted)',
      }}
    >
      <div className="font-bold text-[var(--color-text)]">{range}</div>
      <div className="text-[var(--color-muted)]">{detail}</div>
    </div>
  );
}

/** A bar's span: one date when the grain is a day, a range when it is a week. */
function bucketLabel(interfaceLanguage: string | null | undefined, bucket: { start: string; end: string }): string {
  if (bucket.start === bucket.end) return formatDay(interfaceLanguage, bucket.start);
  return t(interfaceLanguage, 'progressChartRange', {
    start: formatDay(interfaceLanguage, bucket.start),
    end: formatDay(interfaceLanguage, bucket.end),
  });
}

/** The bar's value, flattened — also what a screen reader is given. */
function describeAdded(
  interfaceLanguage: string | null | undefined,
  bucket: CardsAddedBucket,
  source: AddedSource,
): string {
  if (source === 'lookup') return `${t(interfaceLanguage, 'progressChartLookup')} ${bucket.lookup}`;
  if (source === 'pack') return `${t(interfaceLanguage, 'progressChartPack')} ${bucket.pack}`;

  const parts = [`${t(interfaceLanguage, 'progressStatNewCards')} ${bucket.total}`];
  // Unfiltered, the split still earns its words when both halves are present —
  // which is what tells a reader the filter is worth reaching for.
  if (bucket.pack > 0 && bucket.lookup > 0) {
    parts.push(`${t(interfaceLanguage, 'progressChartLookup')} ${bucket.lookup}`);
    parts.push(`${t(interfaceLanguage, 'progressChartPack')} ${bucket.pack}`);
  }
  return parts.join(' · ');
}

function describeLearned(interfaceLanguage: string | null | undefined, point: LearnedPoint): string {
  if (point.learned === null) {
    return t(interfaceLanguage, 'progressChartLearnedCutoff', {
      date: formatDay(interfaceLanguage, DETAILED_HISTORY_START, true),
    });
  }
  return t(interfaceLanguage, 'progressLanguageLearned', { count: point.learned });
}

/** `2026-08-19` → `19 August` / `8월 19일`, in the reader's language. */
function formatDay(
  interfaceLanguage: string | null | undefined,
  date: string,
  withYear = false,
): string {
  // Parsed at UTC noon so the date can't slip a day either side of the line.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'long', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) },
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
