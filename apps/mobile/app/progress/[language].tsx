/**
 * One language's slice of the progress tab — the web route's twin.
 *
 * **A pushed screen, matching `share.tsx`.** Mobile already learned that a
 * modal is the wrong container for anything that has to stay put while
 * something else presents, and a detail view that can be swiped back from is
 * what the platform expects here.
 *
 * ⚠️ **Two scopes on one screen, and more of them than the row had.** Reviews
 * and cards added are the selected window; *learned* is every card over the
 * line right now, read off the cards rather than off a rollup. The labels are
 * what keep that honest — see `mergeLanguageRows`.
 *
 * **Retention is deliberately absent**, as it is everywhere since 2026-09-12,
 * and `byHour` is deliberately not per-language at all — so "when do you study
 * Korean" is not a question these rows can answer.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import {
  DETAILED_HISTORY_START, SUPPORTED_STUDY_LANGUAGES, buildCardsAddedSeries,
  buildLearnedSeries, chartBucketDays, localDateString, niceCeiling, summarizeProgress,
  weekAxisTicks, t,
  type CardsAddedBucket, type DailyProgress, type LearnedPoint,
  type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { fetchRecentProgress } from '../../src/services/progress';
import { backfillMatureFlags, countMatureFlashcards } from '../../src/services/firestore';
import { getUserPreferences, saveUserPreferences } from '../../src/services/userPreferences';
import type { Palette } from '../../src/theme';

/** The same three windows the tab offers, so the chips cannot disagree. */
const RANGES = [
  { days: 30, key: 'progressRangeMonth' },
  { days: 90, key: 'progressRangeQuarter' },
  { days: 364, key: 'progressRangeYear' },
] as const;

/** Taller than the weekly plot: this one can carry 52 bars rather than seven. */
const PLOT_HEIGHT = 96;
/** Matches the weekly chart's gutter, so every plot on mobile insets alike. */
const AXIS_GUTTER = 26;
const TOOLTIP_LANE = 44;
/** Fixed so the bubble can be placed without measuring its text. */
const TOOLTIP_WIDTH = 190;

export default function LanguageProgressScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage } = useUser();
  const { language, range } = useLocalSearchParams<{ language?: string; range?: string }>();

  /**
   * The route's language, resolved against the registry rather than trusted —
   * a param is a string and everything below takes a `StudyLanguage`.
   */
  const entry = SUPPORTED_STUDY_LANGUAGES.find(candidate => candidate.code === language);
  const code = entry?.code;

  /** Opens on the window the tab had selected, rather than asking again. */
  const [rangeDays, setRangeDays] = useState<number>(() => {
    const wanted = Number(range);
    return RANGES.some(option => option.days === wanted) ? wanted : 90;
  });

  const [days, setDays] = useState<DailyProgress[] | null>(null);
  const [learned, setLearned] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setDays([]); return; }
      let cancelled = false;
      fetchRecentProgress(user.uid, rangeDays)
        .then(result => { if (!cancelled) setDays(result); })
        // An empty list is the "nothing yet" state, which is also the honest
        // thing to show when the read failed — there is no number either way.
        .catch(() => { if (!cancelled) setDays([]); });
      return () => { cancelled = true; };
    }, [user, rangeDays]),
  );

  /**
   * This language's all-time learned count — the anchor the curve is walked
   * back from, so it has to be the figure the row on the tab shows.
   *
   * The backfill guard is repeated from the tab rather than assumed: this
   * screen is a route, so it can be opened first. `matureBackfillAt` makes it
   * one-shot, so repeating the guard costs one preferences read.
   */
  useFocusEffect(
    useCallback(() => {
      if (!user || !code) { setLearned(null); return; }
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
    }, [user, code]),
  );

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

  const header = (
    <View style={s.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t(interfaceLanguage, 'progressBackToAll')}
      >
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </TouchableOpacity>
      <Text style={s.headerTitle} numberOfLines={1}>
        {code ? t(interfaceLanguage, languageLabelKey(code)) : t(interfaceLanguage, 'progressTitle')}
      </Text>
      {/* Balances the back arrow so the title sits centred. */}
      <View style={s.headerSpacer} />
    </View>
  );

  // A code that is not in the registry — a stale link. The way back is the only
  // useful thing here, so it is the whole screen.
  if (!code) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>{t(interfaceLanguage, 'progressEmpty')}</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>{t(interfaceLanguage, 'progressSignedOut')}</Text>
      </SafeAreaView>
    );
  }

  const reviews = progress?.reviews ?? 0;
  const cardsAdded = (progress?.newCards ?? 0) + (progress?.packCards ?? 0);
  const weekly = chartBucketDays(rangeDays) > 1;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.rangeRow}>
          {RANGES.map(option => {
            const on = rangeDays === option.days;
            return (
              <TouchableOpacity
                key={option.days}
                onPress={() => setRangeDays(option.days)}
                style={[s.rangeBtn, on && s.rangeBtnOn]}
              >
                <Text style={[s.rangeText, on && s.rangeTextOn]}>
                  {t(interfaceLanguage, option.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {days === null ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'progressLoading')}</Text>
        ) : (
          <>
            {/* Two of these name the window and one names all time, which is
                why the learned tile keeps the label it wears everywhere. */}
            <View style={s.statGrid}>
              <Stat s={s} label={t(interfaceLanguage, 'progressStatReviews')} value={reviews} />
              <Stat s={s} label={t(interfaceLanguage, 'progressStatNewCards')} value={cardsAdded} />
              {learned !== null && (
                <Stat s={s} label={t(interfaceLanguage, 'shareStatLearned')} value={learned} />
              )}
            </View>

            <AddedChart
              C={C}
              s={s}
              interfaceLanguage={interfaceLanguage}
              series={addedSeries}
              weekly={weekly}
            />

            {/* Withheld rather than drawn from a guessed anchor: without the
                count there is nothing to walk back from. */}
            {learned !== null && (
              <LearnedChart
                C={C}
                s={s}
                interfaceLanguage={interfaceLanguage}
                series={learnedSeries}
                weekly={weekly}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Cards added per bar, lookups and pack cards stacked.
 *
 * ⚠️ **No mark toggle, unlike the weekly reviews chart, and deliberately so
 * twice over.** A stacked pair has no sensible line form — two series drawn as
 * one polyline is a different chart, not the same one restyled. And the
 * remembered mark is a single key (`amgi_week_chart_mark`), so a second
 * consumer would mean switching one chart silently switched the other.
 */
function AddedChart({ C, s, interfaceLanguage, series, weekly }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  series: CardsAddedBucket[];
  weekly: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const busiest = Math.max(0, ...series.map(bucket => bucket.total));
  const ceiling = niceCeiling(busiest);
  const ticks = weekAxisTicks(ceiling);
  const active = selected === null ? null : series[selected];

  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.max(1, Math.round((value / ceiling) * PLOT_HEIGHT))
    : 0);

  if (busiest === 0) {
    return (
      <>
        <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressStatNewCards')}</Text>
        <Text style={s.chartEmpty}>{t(interfaceLanguage, 'progressChartEmpty')}</Text>
      </>
    );
  }

  return (
    <>
      <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressStatNewCards')}</Text>

      <View style={s.plot}>
        <Gridlines s={s} ticks={ticks} ceiling={ceiling} />

        {/* The bars and the tap targets in one. A stacked bar is never so short
            that it cannot be hit, because the full-height column behind it
            takes the tap. */}
        <View
          style={[s.marksLayer, { gap: series.length > 26 ? 1 : 2 }]}
          onLayout={(event: LayoutChangeEvent) => {
            const { width } = event.nativeEvent.layout;
            setPlotWidth(current => (current === width ? current : width));
          }}
        >
          {series.map((bucket, index) => (
            <TouchableOpacity
              key={bucket.start}
              activeOpacity={0.6}
              style={[s.barColumn, {
                opacity: selected === null || selected === index ? 1 : 0.55,
              }]}
              onPress={() => setSelected(current => (current === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={describeAdded(interfaceLanguage, bucket)}
            >
              {/* Packs sit on top of lookups: the everyday activity is the
                  baseline, and the occasional import is the thing rising out of
                  it rather than the thing the rest stands on. */}
              <View style={[s.barSegment, {
                height: heightOf(bucket.pack),
                backgroundColor: C.heat[2],
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }]} />
              <View style={[s.barSegment, {
                height: heightOf(bucket.lookup),
                backgroundColor: C.heat[4],
                borderTopLeftRadius: bucket.pack === 0 ? 2 : 0,
                borderTopRightRadius: bucket.pack === 0 ? 2 : 0,
              }]} />
            </TouchableOpacity>
          ))}
        </View>

        {selected !== null && active && (
          <ChartTooltip
            C={C}
            s={s}
            range={bucketLabel(interfaceLanguage, active)}
            detail={describeAdded(interfaceLanguage, active)}
            left={tooltipLeft(selected, series.length, plotWidth)}
          />
        )}
      </View>

      <AxisLabels s={s} interfaceLanguage={interfaceLanguage} series={series} />

      {/* A legend, because this is the one chart here carrying two series. */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendSwatch, { backgroundColor: C.heat[4] }]} />
          <Text style={s.legendText}>{t(interfaceLanguage, 'progressChartLookup')}</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendSwatch, { backgroundColor: C.heat[2] }]} />
          <Text style={s.legendText}>{t(interfaceLanguage, 'progressChartPack')}</Text>
        </View>
        {weekly && (
          <Text style={[s.legendText, s.legendNote]}>
            {t(interfaceLanguage, 'progressChartWeeklyNote')}
          </Text>
        )}
      </View>
    </>
  );
}

/**
 * Cards learned over time, as a cumulative curve.
 *
 * ⚠️ **A line and never bars.** The series is a running total, so bars would
 * draw each one as though it were that bar's own contribution — the same
 * number read as a rate rather than as a level.
 *
 * ⚠️ **The curve stops where the data stops.** Crossings were first recorded
 * 2026-09-06, so a window reaching further back has points that are genuinely
 * unknowable; they are `null` rather than zero, the line is drawn only across
 * the known run, and a note says where it begins. A curve continuing into a
 * flat line at the left edge would claim nothing had been learned then.
 */
function LearnedChart({ C, s, interfaceLanguage, series, weekly }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  series: LearnedPoint[];
  weekly: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const peak = Math.max(0, ...series.map(point => point.learned ?? 0));
  const ceiling = niceCeiling(peak);
  const ticks = weekAxisTicks(ceiling);
  const active = selected === null ? null : series[selected];
  const partial = series.some(point => point.learned === null);

  const centre = (index: number) => ((index + 0.5) * plotWidth) / Math.max(1, series.length);
  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.max(1, Math.round((value / ceiling) * PLOT_HEIGHT))
    : 0);

  /**
   * The drawable run: the points that are actually known.
   *
   * Filtered rather than sliced at the boundary, so a null anywhere else would
   * drop out of the line instead of being drawn through. The original index is
   * kept, so the curve sits under the window it belongs to rather than being
   * stretched across the whole axis.
   */
  const known = series
    .map((point, index) => ({ point, index }))
    .filter((held): held is { point: LearnedPoint & { learned: number }; index: number } => (
      held.point.learned !== null
    ));

  if (known.length === 0) return null;

  return (
    <>
      <Text style={s.sectionTitle}>{t(interfaceLanguage, 'shareStatLearned')}</Text>

      <View style={s.plot}>
        <Gridlines s={s} ticks={ticks} ceiling={ceiling} />

        <View
          style={s.marksLayer}
          onLayout={(event: LayoutChangeEvent) => {
            const { width } = event.nativeEvent.layout;
            setPlotWidth(current => (current === width ? current : width));
          }}
        >
          {plotWidth > 0 && (
            <>
              {/* Drawn in real pixels rather than a stretched viewBox, which is
                  what keeps the stroke uniform and the dot round — the reason
                  the weekly chart measures its plot too. */}
              <Svg width={plotWidth} height={PLOT_HEIGHT}>
                <Polyline
                  points={known
                    .map(({ point, index }) => `${centre(index)},${PLOT_HEIGHT - heightOf(point.learned)}`)
                    .join(' ')}
                  fill="none"
                  stroke={C.heat[4]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </Svg>
              {/* Only the selected vertex is drawn. At 52 weekly points a dot
                  on every one is a beaded string rather than a curve, and the
                  line already carries the shape. */}
              {selected !== null && active?.learned != null && (
                <View style={[s.dot, {
                  left: centre(selected) - 5,
                  bottom: heightOf(active.learned) - 5,
                  backgroundColor: C.heat[4],
                  borderColor: C.bg,
                }]} />
              )}
            </>
          )}
        </View>

        {/* One full-height target per point, over the line — a curve has no
            width to tap. */}
        <View style={s.targets}>
          {series.map((point, index) => (
            <TouchableOpacity
              key={point.start}
              activeOpacity={0.6}
              style={s.target}
              onPress={() => setSelected(current => (current === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={describeLearned(interfaceLanguage, point)}
            />
          ))}
        </View>

        {selected !== null && active && (
          <ChartTooltip
            C={C}
            s={s}
            range={bucketLabel(interfaceLanguage, active)}
            detail={describeLearned(interfaceLanguage, active)}
            left={tooltipLeft(selected, series.length, plotWidth)}
          />
        )}
      </View>

      <AxisLabels s={s} interfaceLanguage={interfaceLanguage} series={series} />

      <View style={s.legendRow}>
        {/* Where the line begins, and why it begins there rather than at the
            left edge. Without this the curve looks truncated by a bug. */}
        {partial && (
          <Text style={s.legendText}>
            {t(interfaceLanguage, 'progressChartLearnedCutoff', {
              date: formatDay(interfaceLanguage, DETAILED_HISTORY_START, true),
            })}
          </Text>
        )}
        {weekly && (
          <Text style={[s.legendText, s.legendNote]}>
            {t(interfaceLanguage, 'progressChartWeeklyNote')}
          </Text>
        )}
      </View>
    </>
  );
}

/**
 * Gridlines and their labels. Hairlines a shade off the surface, never dashed —
 * a dashed rule reads as a threshold when it is only a scale. Shared by both
 * plots so the two cannot drift apart.
 */
function Gridlines({ s, ticks, ceiling }: {
  s: ReturnType<typeof makeStyles>;
  ticks: number[];
  ceiling: number;
}) {
  return (
    <>
      {ticks.map(value => (
        <View
          key={value}
          style={[s.gridRow, { bottom: ceiling > 0 ? (value / ceiling) * PLOT_HEIGHT : 0 }]}
        >
          <Text style={s.gridLabel}>{value}</Text>
          <View style={s.gridLine} />
        </View>
      ))}
    </>
  );
}

/**
 * The ends of the window, named.
 *
 * Only two labels: at 52 bars a label per bar is unreadable and a label every
 * nth bar lands on an arbitrary date. The bubble carries the rest, and the bars
 * are in order, so the two ends place everything between them.
 */
function AxisLabels({ s, interfaceLanguage, series }: {
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  series: { start: string; end: string }[];
}) {
  if (series.length === 0) return null;
  return (
    <View style={s.axisRow}>
      <Text style={s.axisLabel}>{formatDay(interfaceLanguage, series[0].start)}</Text>
      <Text style={s.axisLabel}>
        {formatDay(interfaceLanguage, series[series.length - 1].end)}
      </Text>
    </View>
  );
}

/** Centred on the bar, then clamped so neither end runs past the plot. */
function tooltipLeft(index: number, count: number, plotWidth: number): number {
  const centre = ((index + 0.5) * plotWidth) / Math.max(1, count);
  return AXIS_GUTTER + Math.max(0, Math.min(
    centre - TOOLTIP_WIDTH / 2,
    Math.max(0, plotWidth - TOOLTIP_WIDTH),
  ));
}

function ChartTooltip({ C, s, range, detail, left }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  range: string;
  detail: string;
  left: number;
}) {
  return (
    <View style={[s.tooltip, {
      left, width: TOOLTIP_WIDTH, borderColor: C.muted, backgroundColor: C.surface,
    }]}>
      <Text style={s.tooltipTitle} numberOfLines={1}>{range}</Text>
      <Text style={s.tooltipDetail} numberOfLines={1}>{detail}</Text>
    </View>
  );
}

/** A bar's span: one date when the grain is a day, a range when it is a week. */
function bucketLabel(
  interfaceLanguage: string | null | undefined,
  bucket: { start: string; end: string },
): string {
  if (bucket.start === bucket.end) return formatDay(interfaceLanguage, bucket.start);
  return t(interfaceLanguage, 'progressChartRange', {
    start: formatDay(interfaceLanguage, bucket.start),
    end: formatDay(interfaceLanguage, bucket.end),
  });
}

/** The stacked pair, flattened — also what a screen reader is given. */
function describeAdded(
  interfaceLanguage: string | null | undefined,
  bucket: CardsAddedBucket,
): string {
  const parts = [`${t(interfaceLanguage, 'progressStatNewCards')} ${bucket.total}`];
  // The split only earns its words when both halves are actually present.
  if (bucket.pack > 0 && bucket.lookup > 0) {
    parts.push(`${t(interfaceLanguage, 'progressChartLookup')} ${bucket.lookup}`);
    parts.push(`${t(interfaceLanguage, 'progressChartPack')} ${bucket.pack}`);
  }
  return parts.join(' · ');
}

function describeLearned(
  interfaceLanguage: string | null | undefined,
  point: LearnedPoint,
): string {
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

function Stat({ s, label, value }: {
  s: ReturnType<typeof makeStyles>;
  label: string;
  value: string | number;
}) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Reuses the per-language labels that already exist in both locales. The codes
 * carry no spaces (`TraditionalChinese`), so they concatenate directly.
 */
function languageLabelKey(studyLanguage: StudyLanguage): TranslationKey {
  return `label${studyLanguage}` as TranslationKey;
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, flex: 1, textAlign: 'center' },
    headerSpacer: { width: 24 },
    content: { padding: 16, paddingTop: 0, paddingBottom: 40 },
    empty: { color: C.muted, fontSize: 14, paddingHorizontal: 16, marginTop: 8 },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    rangeBtn: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
      borderWidth: 1, borderColor: C.border,
    },
    rangeBtnOn: { borderColor: C.highlight },
    rangeText: { color: C.muted, fontSize: 13 },
    rangeTextOn: { color: C.highlight, fontWeight: '700' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    stat: {
      flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
    },
    statValue: { color: C.highlight, fontSize: 20, fontWeight: '700' },
    statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
    sectionTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
    chartEmpty: { color: C.muted, fontSize: 13, marginBottom: 24 },
    // The lane above the plot belongs to the bubble; the marks sit on the
    // bottom of it, so a tooltip can never overlap what it describes.
    plot: { height: PLOT_HEIGHT + TOOLTIP_LANE },
    gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
    gridLabel: {
      width: AXIS_GUTTER, paddingRight: 4, textAlign: 'right',
      color: C.muted, fontSize: 10, lineHeight: 10,
    },
    gridLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.muted, opacity: 0.3 },
    marksLayer: {
      position: 'absolute', left: AXIS_GUTTER, right: 0, bottom: 0,
      height: PLOT_HEIGHT, flexDirection: 'row', alignItems: 'flex-end',
    },
    barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end' },
    barSegment: { width: '100%' },
    targets: {
      position: 'absolute', left: AXIS_GUTTER, right: 0, bottom: 0,
      height: PLOT_HEIGHT, flexDirection: 'row',
    },
    target: { flex: 1, height: '100%' },
    dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
    tooltip: {
      position: 'absolute', top: 0, zIndex: 10, paddingHorizontal: 8, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1,
    },
    tooltipTitle: { fontSize: 11, fontWeight: '700', color: C.text },
    tooltipDetail: { fontSize: 11, color: C.muted, marginTop: 1 },
    axisRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      marginLeft: AXIS_GUTTER, marginTop: 4,
    },
    axisLabel: { color: C.muted, fontSize: 10 },
    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 8, marginBottom: 24, flexWrap: 'wrap',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendSwatch: { width: 10, height: 10, borderRadius: 2 },
    legendText: { color: C.muted, fontSize: 11 },
    legendNote: { marginLeft: 'auto' },
  });
}
