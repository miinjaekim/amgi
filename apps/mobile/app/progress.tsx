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
  const weeks = useMemo(() => {
    const cells = buildHeatmap(days ?? [], localDateString(), rangeDays);
    const columns: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
    return columns;
  }, [days, rangeDays]);

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
                onPress={() => setRangeDays(range.days)}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.heatmap}>
                {weeks.map((week, index) => (
                  <View key={index} style={s.heatmapCol}>
                    {week.map(cell => (
                      <View
                        key={cell.date}
                        style={[s.cell, { backgroundColor: levelColor(C, cell.level) }]}
                      />
                    ))}
                  </View>
                ))}
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
    heatmap: { flexDirection: 'row', gap: 3 },
    heatmapCol: { flexDirection: 'column', gap: 3 },
    cell: { width: 12, height: 12, borderRadius: 2 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginBottom: 24 },
    legendText: { color: C.muted, fontSize: 11 },
    langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    langName: { color: C.text, fontSize: 14, fontWeight: '700' },
    langStat: { color: C.muted, fontSize: 12 },
  });
}
