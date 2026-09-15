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
  buildLearnedSeries, chartBucketDays, languageAveragePerActiveDay, localDateString,
  niceCeiling, summarizeProgress, weekAxisTicks, weekdayIndex, t,
  type CardsAddedBucket, type DailyProgress, type LearnedPoint,
  type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { fetchRecentProgress } from '../../src/services/progress';
import { backfillMatureFlags, countMatureFlashcards } from '../../src/services/firestore';
import { getUserPreferences, saveUserPreferences } from '../../src/services/userPreferences';
import type { Palette } from '../../src/theme';

/**
 * The tab's windows plus a seven-day one, which only exists here.
 *
 * A detail view is opened to answer "how is this deck going lately", and a
 * month is already too coarse for that. It is also the one window where both
 * charts sit entirely inside recorded history, so the learned curve never has
 * to stop short.
 */
const RANGES = [
  { days: 7, key: 'progressRangeWeek' },
  { days: 30, key: 'progressRangeMonth' },
  { days: 90, key: 'progressRangeQuarter' },
  { days: 364, key: 'progressRangeYear' },
] as const;

/**
 * ⚠️ **The tab's selected range is deliberately *not* carried in.**
 *
 * It used to arrive as a `range` param, which cannot coexist with a default:
 * every arrival is from a row on the tab, so an inherited range would mean this
 * screen opened on 90 every time and seven days would never be the default it
 * is meant to be.
 */
const DEFAULT_RANGE_DAYS = 7;

/** Taller than the weekly plot: this one can carry 52 bars rather than seven. */
const PLOT_HEIGHT = 96;
/** Matches the weekly chart's gutter, so every plot on mobile insets alike. */
const AXIS_GUTTER = 26;
const TOOLTIP_LANE = 44;
/** Fixed so the bubble can be placed without measuring its text. */
const TOOLTIP_WIDTH = 190;

/**
 * The most marks a chart can decorate one by one — a number over every bar, a
 * dot on every point of the curve.
 *
 * Keyed on mark *count* rather than on the window, because the grain changes
 * underneath it: 7 days is 7 marks and 90 days is 13 weekly ones, so both fit,
 * while 30 daily marks and a year's 52 do not. Past this the axis comes back on
 * the bars, the curve keeps only its selected vertex, and the bubble carries
 * the exact figure instead.
 *
 * **One constant for both charts on purpose.** Two with the same value would
 * drift, and the two plots sit one above the other — switching decoration at
 * different windows would read as a bug in whichever one changed second.
 */
const DECORATED_MARK_MAX = 14;

/** How many dated ticks an axis carries when a label per mark is too many. */
const DATE_TICK_MAX = 4;

/** Fixed, so a tick can be centred on its mark without measuring its text. */
const DATE_TICK_WIDTH = 60;

/** Room reserved above the bars for those labels, so a full-height bar's number
 *  has somewhere to sit rather than overflowing into the bubble's lane. */
const VALUE_LABEL_HEIGHT = 14;

export default function LanguageProgressScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage } = useUser();
  const { language } = useLocalSearchParams<{ language?: string }>();

  /**
   * The route's language, resolved against the registry rather than trusted —
   * a param is a string and everything below takes a `StudyLanguage`.
   */
  const entry = SUPPORTED_STUDY_LANGUAGES.find(candidate => candidate.code === language);
  const code = entry?.code;

  /**
   * Held in state rather than read off the route, so switching chips does not
   * stack navigation entries the back gesture then has to undo one at a time.
   */
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);

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
  const averagePerDay = languageAveragePerActiveDay(days ?? [], code);
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
            {/* Three of these name the window and one names all time, which is
                why the learned tile keeps the label it wears everywhere. The
                grid wraps at `flexBasis: '45%'`, so four tiles land as 2×2 with
                no layout change. */}
            <View style={s.statGrid}>
              <Stat s={s} label={t(interfaceLanguage, 'progressStatReviews')} value={reviews} />
              <Stat s={s} label={t(interfaceLanguage, 'progressStatNewCards')} value={cardsAdded} />
              {learned !== null && (
                <Stat s={s} label={t(interfaceLanguage, 'shareStatLearned')} value={learned} />
              )}
              {/* Shares the tab's label because it is the same measure,
                  narrowed — the days counted are the ones *this* language was
                  studied on. See `languageAveragePerActiveDay`. */}
              <Stat s={s} label={t(interfaceLanguage, 'progressStatAverage')} value={averagePerDay} />
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
 * Cards added per bar, filtered by source rather than stacked.
 *
 * ⚠️ **This replaced a stacked bar on 2026-09-15, for legibility rather than
 * taste.** The two segments were genuinely hard to tell apart: at 52 bars each
 * band is a few pixels, and the two colours are steps of one ramp because the
 * ramp is what is theme-safe on both platforms. Filtering answers the same
 * question one number at a time, and answers it exactly.
 *
 * **Nothing selected means the total** — the figure the dashboard tile and the
 * shared image both show — so this chart's resting state still agrees with
 * every other surface, and picking a source narrows rather than switching to a
 * different measure.
 *
 * ⚠️ **No mark toggle.** The remembered mark is a single key
 * (`amgi_week_chart_mark`), so a second consumer of it would mean switching one
 * chart silently switched another.
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
  const [source, setSource] = useState<AddedSource>(null);

  /** The value being drawn: one source, or both together. */
  const valueOf = (bucket: CardsAddedBucket) => (
    source === null ? bucket.total : bucket[source]
  );

  const busiest = Math.max(0, ...series.map(valueOf));
  const ceiling = niceCeiling(busiest);
  const active = selected === null ? null : series[selected];

  /**
   * Whether each bar states its own value.
   *
   * ⚠️ **When it does, the gridlines go.** An axis exists to let a level be read
   * off a shape that cannot be labelled — which is the curve below, not this.
   * Labelling every bar states the same quantity exactly, so keeping both is two
   * encodings of one number and reads busier for no gain. Only the zero line
   * stays, which also keeps the gutter and so keeps this chart aligned with the
   * one under it.
   */
  const showValues = series.length <= DECORATED_MARK_MAX;
  /** A weekday under each bar only makes sense when a bar *is* a day. */
  const showWeekdays = showValues && !weekly;
  const ticks = showValues ? [0] : weekAxisTicks(ceiling);

  /** Bars give up the label's height so the tallest one still has room. */
  const barArea = showValues ? PLOT_HEIGHT - VALUE_LABEL_HEIGHT : PLOT_HEIGHT;
  // A day with nothing added keeps a 1px stub rather than vanishing: an absent
  // bar and a zero bar look identical, and only one of them is the truth.
  const heightOf = (value: number) => (ceiling > 0 && value > 0
    ? Math.max(2, Math.round((value / ceiling) * barArea))
    : 1);

  /**
   * The filter. Tapping the selected chip clears it, which is the only way back
   * to the total — so the control is its own reset and needs no third chip.
   */
  const header = (
    <View style={s.chartHeader}>
      <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressStatNewCards')}</Text>
      <View style={s.filterRow}>
        {(['lookup', 'pack'] as const).map(option => (
          <TouchableOpacity
            key={option}
            onPress={() => setSource(current => (current === option ? null : option))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: source === option }}
            style={[s.filterBtn, { borderColor: source === option ? C.highlight : C.border }]}
          >
            <Text style={[s.filterText, { color: source === option ? C.highlight : C.muted }]}>
              {t(interfaceLanguage, option === 'lookup' ? 'progressChartLookup' : 'progressChartPack')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (busiest === 0) {
    return (
      <>
        {header}
        <Text style={s.chartEmpty}>{t(interfaceLanguage, 'progressChartEmpty')}</Text>
      </>
    );
  }

  return (
    <>
      {header}

      <View style={s.plot}>
        <Gridlines s={s} ticks={ticks} ceiling={ceiling} />

        {/* The bars and the tap targets in one: the column behind a bar is full
            height, so a quiet day is as easy to hit as a busy one. */}
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
              accessibilityLabel={describeAdded(interfaceLanguage, bucket, source)}
            >
              {/* Only a bar with something in it gets a number. A row of zeroes
                  above empty days is noise, and cards added is a sparse series —
                  most days you add nothing. */}
              {showValues && (
                <Text style={s.barValue} numberOfLines={1}>
                  {valueOf(bucket) > 0 ? valueOf(bucket) : ''}
                </Text>
              )}
              <View style={[s.barSegment, {
                height: heightOf(valueOf(bucket)),
                backgroundColor: C.heat[4],
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }]} />
            </TouchableOpacity>
          ))}
        </View>

        {selected !== null && active && (
          <ChartTooltip
            C={C}
            s={s}
            range={bucketLabel(interfaceLanguage, active)}
            detail={describeAdded(interfaceLanguage, active, source)}
            left={tooltipLeft(selected, series.length, plotWidth)}
          />
        )}
      </View>

      {showWeekdays
        ? <WeekdayLabels s={s} interfaceLanguage={interfaceLanguage} series={series} />
        : <DateTicks s={s} interfaceLanguage={interfaceLanguage} series={series} plotWidth={plotWidth} />}

      {weekly && (
        <View style={s.legendRow}>
          <Text style={[s.legendText, s.legendNote]}>
            {t(interfaceLanguage, 'progressChartWeeklyNote')}
          </Text>
        </View>
      )}
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

  /**
   * Whether every point gets a dot, or only the one being tapped.
   *
   * The same threshold the bars above use for their numbers, so the two plots
   * change character at the same window rather than one of them looking broken.
   * At 52 weekly points a dot on each is a beaded string rather than a curve;
   * at seven they say "these are seven discrete readings", which is true and is
   * what a cumulative line otherwise hides.
   */
  const showDots = series.length <= DECORATED_MARK_MAX;
  /** A weekday under each point only makes sense when a point *is* a day. */
  const showWeekdays = showDots && !weekly;

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
              {/* A dot per known point when there are few enough to tell
                  apart, otherwise only the selected one. Drawn from `known`, so
                  a point the data cannot reach gets no vertex — the curve and
                  its dots stop at the same place. */}
              {known
                .filter(({ index }) => showDots || index === selected)
                .map(({ point, index }) => {
                  const size = selected === index ? 12 : 7;
                  return (
                    <View
                      key={point.start}
                      style={[s.dot, {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        left: centre(index) - size / 2,
                        bottom: heightOf(point.learned) - size / 2,
                        backgroundColor: C.heat[4],
                        borderColor: C.bg,
                        opacity: selected === null || selected === index ? 1 : 0.55,
                      }]}
                    />
                  );
                })}
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

      {showWeekdays
        ? <WeekdayLabels s={s} interfaceLanguage={interfaceLanguage} series={series} />
        : <DateTicks s={s} interfaceLanguage={interfaceLanguage} series={series} plotWidth={plotWidth} />}

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
 * Sunday-first weekday names in the reader's language.
 *
 * Built from a known Sunday through `Intl` rather than from translation keys:
 * seven more keys per locale to say what the platform already knows.
 */
function weekdayLabels(interfaceLanguage: string | null | undefined): string[] {
  const locale = interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-GB';
  // 1970-01-04 was a Sunday.
  return [0, 1, 2, 3, 4, 5, 6].map(offset => new Date(Date.UTC(1970, 0, 4 + offset, 12))
    .toLocaleDateString(locale, { weekday: 'short' }));
}

/**
 * A weekday under every bar, for a window drawn one bar per day.
 *
 * The same treatment the Progress tab's weekly chart already gives its seven
 * days, so the two read as one family. Taken from each bucket's own date rather
 * than from a fixed Sunday-to-Saturday run, because these days end on today.
 */
function WeekdayLabels({ s, interfaceLanguage, series }: {
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  series: { start: string }[];
}) {
  const weekdays = weekdayLabels(interfaceLanguage);
  return (
    <View style={s.weekdayRow}>
      {series.map(bucket => (
        <Text key={bucket.start} style={s.weekdayLabel} numberOfLines={1}>
          {weekdays[weekdayIndex(bucket.start)]}
        </Text>
      ))}
    </View>
  );
}

/**
 * Which marks earn a dated tick: evenly spread, always including both ends.
 *
 * Deduped, because rounding can land two of them on the same mark on a very
 * short series — four ticks over five marks would otherwise label one twice.
 */
function tickIndices(count: number): number[] {
  const wanted = Math.min(DATE_TICK_MAX, count);
  if (wanted <= 1) return count > 0 ? [0] : [];
  const step = (count - 1) / (wanted - 1);
  return [...new Set(
    Array.from({ length: wanted }, (_, i) => Math.round(i * step)),
  )];
}

/**
 * A handful of dates along the axis, positioned under the marks they name.
 *
 * ⚠️ **This replaced a pair of labels at the two outer edges.** Naming only the
 * ends says how long the window is and nothing about where anything in it sits
 * — on a 90-day chart every point between them was unplaceable without tapping
 * it. Spreading four ticks costs no more room and makes the middle readable.
 *
 * Positioned at the mark's own centre rather than spaced evenly across the
 * width, so a tick sits under the thing it names, then clamped so neither end
 * runs past the plot. Needs the measured width for the same reason the line
 * does — there is no percentage translate in React Native.
 */
function DateTicks({ s, interfaceLanguage, series, plotWidth }: {
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  series: { start: string }[];
  plotWidth: number;
}) {
  if (series.length === 0 || plotWidth <= 0) return null;
  const centre = (index: number) => ((index + 0.5) * plotWidth) / series.length;
  return (
    <View style={s.dateTickRow}>
      {tickIndices(series.length).map(index => (
        <Text
          key={series[index].start}
          numberOfLines={1}
          style={[s.dateTick, {
            left: Math.max(0, Math.min(
              centre(index) - DATE_TICK_WIDTH / 2,
              Math.max(0, plotWidth - DATE_TICK_WIDTH),
            )),
          }]}
        >
          {formatShortDay(interfaceLanguage, series[index].start)}
        </Text>
      ))}
    </View>
  );
}

/** `2026-09-09` → `9 Sep` / `9월 9일`. Short enough for four across an axis. */
function formatShortDay(interfaceLanguage: string | null | undefined, date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'short', day: 'numeric' },
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

/** Which half of "cards added" is being looked at, or both together. */
type AddedSource = 'lookup' | 'pack' | null;

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
    // Sits directly on top of its bar: the column is bottom-justified, so this
    // is pushed up by whatever height the bar takes.
    barValue: {
      height: VALUE_LABEL_HEIGHT, lineHeight: VALUE_LABEL_HEIGHT,
      textAlign: 'center', color: C.text, fontSize: 10, fontVariant: ['tabular-nums'],
    },
    // The gap matches the bars' own, which is always 2 on a labelled chart —
    // the 1px gap only applies past 26 bars, and a labelled chart is at most
    // `DECORATED_MARK_MAX`.
    weekdayRow: { flexDirection: 'row', gap: 2, marginLeft: AXIS_GUTTER, marginTop: 4 },
    weekdayLabel: { flex: 1, textAlign: 'center', color: C.muted, fontSize: 10 },
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
    // Absolutely positioned children, so the row needs its own height — it has
    // no flow content to derive one from.
    dateTickRow: { height: 14, marginLeft: AXIS_GUTTER, marginTop: 4, position: 'relative' },
    dateTick: {
      position: 'absolute', top: 0, width: DATE_TICK_WIDTH,
      textAlign: 'center', color: C.muted, fontSize: 10,
    },
    legendRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginTop: 8, marginBottom: 24, flexWrap: 'wrap',
    },
    legendText: { color: C.muted, fontSize: 11 },
    legendNote: { marginLeft: 'auto' },
    // The title and its source filter share a line, the way the weekly chart's
    // title shares one with its mark toggle.
    chartHeader: {
      flexDirection: 'row', alignItems: 'baseline',
      justifyContent: 'space-between', gap: 12,
    },
    filterRow: { flexDirection: 'row', gap: 4 },
    filterBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    filterText: { fontSize: 11 },
  });
}
