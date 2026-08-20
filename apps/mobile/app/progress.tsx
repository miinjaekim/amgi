import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  buildHeatmap, localDateString, summarizeProgress, t,
  type DailyProgress, type HeatmapCell, type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../src/context/UserContext';
import { useTheme } from '../src/context/ThemeContext';
import { fetchRecentProgress } from '../src/services/progress';
import type { Palette } from '../src/theme';

/** 364 rather than 365 so the calendar is a whole number of weeks. */
const RANGES = [
  { days: 30, key: 'progressRangeMonth' },
  { days: 90, key: 'progressRangeQuarter' },
  { days: 364, key: 'progressRangeYear' },
] as const;

/**
 * A day's shade, indexed by `HeatmapCell.level`. Level 0 is drawn as a faint
 * block rather than as nothing: an empty cell and a missing cell look the same
 * and one of them is a bug.
 */
function levelColor(C: Palette, level: HeatmapCell['level']): string {
  if (level === 0) return C.border;
  return C.highlight + ['', '40', '73', 'BF', 'FF'][level];
}

export default function ProgressScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage, streak } = useUser();
  const [days, setDays] = useState<DailyProgress[] | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(90);

  // Refetch on focus, matching every other mobile screen — the review tab is
  // where these numbers change, and it is one tap away.
  useFocusEffect(
    useCallback(() => {
      if (!user) { setDays(null); return; }
      let cancelled = false;
      fetchRecentProgress(user.uid, rangeDays)
        .then(result => { if (!cancelled) setDays(result); })
        // An empty list is the "nothing yet" state, which is also the honest
        // thing to show when the read failed: there is no number to report
        // either way, and a dashboard is not worth an error dialog.
        .catch(() => { if (!cancelled) setDays([]); });
      return () => { cancelled = true; };
    }, [user, rangeDays]),
  );

  const summary = useMemo(() => summarizeProgress(days ?? []), [days]);
  const cells = useMemo(
    () => buildHeatmap(days ?? [], localDateString(), rangeDays),
    [days, rangeDays],
  );
  const weeks = useMemo(() => {
    const columns: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
    return columns;
  }, [cells]);

  /**
   * The selected day, as its index into `cells`.
   *
   * Selection persists rather than lasting only while a finger is down: on a
   * phone the finger is on top of the cell, so "hold to read" would mean
   * reading around your own thumb. Tapping the same cell again clears it.
   */
  const [selected, setSelected] = useState<number | null>(null);
  /** The full day behind a cell; `HeatmapCell` only carries the review count. */
  const daysByDate = useMemo(
    () => new Map((days ?? []).map(day => [day.date, day])),
    [days],
  );

  // A selection is an index, so it stops meaning the same day if the window
  // changes underneath it.
  const selectRange = (next: number) => { setRangeDays(next); setSelected(null); };

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(nativeLanguage, 'progressTitle')}</Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <Text style={s.empty}>{t(nativeLanguage, 'progressSignedOut')}</Text>
      </SafeAreaView>
    );
  }

  const hasHistory = summary.totalReviews > 0 || summary.totalNewCards > 0 || summary.totalPackCards > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.description}>{t(nativeLanguage, 'progressDescription')}</Text>

        <View style={s.rangeRow}>
          {RANGES.map(range => {
            const selected = rangeDays === range.days;
            return (
              <TouchableOpacity
                key={range.days}
                onPress={() => selectRange(range.days)}
                style={[s.rangeBtn, selected && s.rangeBtnOn]}
              >
                <Text style={[s.rangeText, selected && s.rangeTextOn]}>
                  {t(nativeLanguage, range.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {days === null ? (
          <Text style={s.empty}>{t(nativeLanguage, 'progressLoading')}</Text>
        ) : !hasHistory ? (
          <View>
            <Text style={s.empty}>{t(nativeLanguage, 'progressEmpty')}</Text>
            <Text style={s.emptyBody}>{t(nativeLanguage, 'progressEmptyBody')}</Text>
          </View>
        ) : (
          <>
            {/* The streak is `UserContext`'s stored counter, not derived from
                these rows — they start empty the day this ships, so deriving
                would show `1` to someone on a 200-day streak. */}
            <View style={s.statGrid}>
              <Stat s={s} label={t(nativeLanguage, 'progressStreak')}
                value={streak === 1
                  ? t(nativeLanguage, 'progressStreakDay')
                  : t(nativeLanguage, 'progressStreakDays', { count: streak })} />
              <Stat s={s} label={t(nativeLanguage, 'progressStatReviews')} value={summary.totalReviews} />
              <Stat s={s} label={t(nativeLanguage, 'progressStatActiveDays')} value={summary.activeDays} />
              <Stat s={s} label={t(nativeLanguage, 'progressStatAverage')} value={summary.averagePerActiveDay} />
            </View>

            <Text style={s.sectionTitle}>{t(nativeLanguage, 'progressCalendar')}</Text>
            {/* Scrolls sideways on its own — a year is 52 columns and will not
                fit a phone. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // Vertical room for the bubble, which is absolutely positioned and
              // would otherwise be clipped by the scroller's own bounds.
              contentContainerStyle={s.heatmapScroll}
            >
              <View style={s.heatmap}>
                {weeks.map((week, weekIndex) => (
                  <View key={weekIndex} style={s.heatmapCol}>
                    {week.map((cell, dayIndex) => {
                      const index = weekIndex * 7 + dayIndex;
                      return (
                        <TouchableOpacity
                          key={cell.date}
                          activeOpacity={0.6}
                          onPress={() => setSelected(current => current === index ? null : index)}
                          onLongPress={() => setSelected(index)}
                          accessibilityRole="button"
                          accessibilityLabel={describeDay(nativeLanguage, cell.date, daysByDate.get(cell.date))}
                          style={[
                            s.cell,
                            { backgroundColor: levelColor(C, cell.level) },
                            selected === index && { borderWidth: 1, borderColor: C.text },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}

                {selected !== null && cells[selected] && (
                  <DayTooltip
                    C={C}
                    s={s}
                    nativeLanguage={nativeLanguage}
                    cell={cells[selected]}
                    day={daysByDate.get(cells[selected].date)}
                    index={selected}
                    columnCount={weeks.length}
                  />
                )}
              </View>
            </ScrollView>
            <View style={s.legend}>
              <Text style={s.legendText}>{t(nativeLanguage, 'progressLessMore')}</Text>
              {([0, 1, 2, 3, 4] as const).map(level => (
                <View key={level} style={[s.cell, { backgroundColor: levelColor(C, level) }]} />
              ))}
              <Text style={s.legendText}>{t(nativeLanguage, 'progressMore')}</Text>
            </View>

            {summary.byLanguage.length > 0 && (
              <>
                <Text style={s.sectionTitle}>{t(nativeLanguage, 'progressByLanguage')}</Text>
                {summary.byLanguage.map(({ studyLanguage, progress }) => (
                  <View key={studyLanguage} style={s.langRow}>
                    <Text style={s.langName}>
                      {t(nativeLanguage, languageLabelKey(studyLanguage))}
                    </Text>
                    <Text style={s.langStat}>
                      {t(nativeLanguage, 'progressLanguageReviews', { count: progress.reviews })}
                      {progress.newCards + progress.packCards > 0
                        ? ` · ${t(nativeLanguage, 'progressStatNewCards')} ${progress.newCards + progress.packCards}`
                        : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Heatmap geometry, shared by the cells and the bubble that points at them.
 * Kept as constants rather than measured: the grid is fixed-size by
 * construction, and a layout pass per selection buys nothing.
 */
const CELL = 12;
const GAP = 3;
const PITCH = CELL + GAP;
/** Fixed so the bubble can be centred exactly without measuring its text. */
const TOOLTIP_WIDTH = 150;
const TOOLTIP_HEIGHT = 42;

function DayTooltip({ C, s, nativeLanguage, cell, day, index, columnCount }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  nativeLanguage: string | null | undefined;
  cell: HeatmapCell;
  day: DailyProgress | undefined;
  index: number;
  columnCount: number;
}) {
  const column = Math.floor(index / 7);
  const row = index % 7;
  const cardsAdded = (day?.newCards ?? 0) + (day?.packCards ?? 0);

  // Centred on the cell, then clamped so neither end runs past the grid.
  const gridWidth = columnCount * PITCH - GAP;
  const left = Math.max(0, Math.min(
    column * PITCH + CELL / 2 - TOOLTIP_WIDTH / 2,
    gridWidth - TOOLTIP_WIDTH,
  ));

  // Above the cell, except for the top two rows where there is no room. Above
  // is preferred because the finger that selected the cell is sitting on it.
  const top = row <= 1
    ? row * PITCH + CELL + 6
    : row * PITCH - TOOLTIP_HEIGHT - 6;

  return (
    <View style={[s.tooltip, { left, top, width: TOOLTIP_WIDTH, borderColor: C.muted, backgroundColor: C.surface }]}>
      <Text style={s.tooltipDate}>{formatDay(nativeLanguage, cell.date)}</Text>
      <Text style={s.tooltipDetail} numberOfLines={1}>
        {cell.reviews === 0
          ? t(nativeLanguage, 'progressTooltipNoReviews')
          : cell.reviews === 1
            ? t(nativeLanguage, 'progressTooltipOneReview')
            : t(nativeLanguage, 'progressTooltipReviews', { count: cell.reviews })}
        {cardsAdded > 0
          ? ` · ${cardsAdded === 1
            ? t(nativeLanguage, 'progressTooltipOneCard')
            : t(nativeLanguage, 'progressTooltipCards', { count: cardsAdded })}`
          : ''}
      </Text>
    </View>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    back: { color: C.highlight, fontSize: 22 },
    headerLabel: { color: C.text, fontSize: 17, fontWeight: '700' },
    content: { padding: 16, paddingTop: 0, paddingBottom: 40 },
    description: { color: C.muted, fontSize: 13, marginBottom: 16 },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    rangeBtnOn: { borderColor: C.highlight },
    rangeText: { color: C.muted, fontSize: 13 },
    rangeTextOn: { color: C.highlight, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 14, paddingHorizontal: 16 },
    emptyBody: { color: C.muted, fontSize: 13, opacity: 0.7, marginTop: 8, paddingHorizontal: 16 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    stat: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    statValue: { color: C.highlight, fontSize: 20, fontWeight: '700' },
    statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
    sectionTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
    // The bubble sits above or below a cell and is absolutely positioned, so
    // the scroller needs room for it or it gets clipped at the grid's edge.
    heatmapScroll: { paddingTop: 48, paddingBottom: 24 },
    heatmap: { flexDirection: 'row', gap: GAP, position: 'relative' },
    heatmapCol: { flexDirection: 'column', gap: GAP },
    cell: { width: CELL, height: CELL, borderRadius: 2 },
    tooltip: {
      position: 'absolute', zIndex: 10, paddingHorizontal: 8, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1,
    },
    tooltipDate: { fontSize: 11, fontWeight: '700', color: C.text },
    tooltipDetail: { fontSize: 11, color: C.muted, marginTop: 1 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginBottom: 24 },
    legendText: { color: C.muted, fontSize: 11 },
    langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    langName: { color: C.text, fontSize: 14, fontWeight: '700' },
    langStat: { color: C.muted, fontSize: 12 },
  });
}
