import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polyline } from 'react-native-svg';
import {
  PROGRESS_HISTORY_START, SUPPORTED_STUDY_LANGUAGES, buildHeatmap,
  CARD_COLLECTIONS, buildWeekGrid,
  historyStartsMidWindow, localDateString, mergeLanguageRows, niceCeiling, weekdayIndex,
  shiftDate, weekAxisTicks,
  summarizeProgress, t,
  type DailyProgress, type HeatmapCell, type LanguageProgress,
  type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import BottomSheet from '../../src/components/BottomSheet';
import StudyLanguageList from '../../src/components/StudyLanguageList';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { fetchRecentProgress } from '../../src/services/progress';
import { backfillMatureFlags, countMatureFlashcards } from '../../src/services/firestore';
import { getUserPreferences, saveUserPreferences } from '../../src/services/userPreferences';
import type { Palette } from '../../src/theme';

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
 *
 * Straight from the palette rather than alpha-blended, since the blend measured
 * wrong — see the `heat` field in `theme.ts` for what and by how much.
 */
function levelColor(C: Palette, level: HeatmapCell['level']): string {
  return C.heat[level];
}

/**
 * Sunday-first weekday names in the reader's language.
 *
 * Built from a known Sunday through `Intl` rather than from translation keys:
 * seven more keys per locale to say what the platform already knows, and any
 * locale added later gets them for free.
 */
function weekdayLabels(interfaceLanguage: string | null | undefined): string[] {
  const locale = interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-GB';
  // 1970-01-04 was a Sunday.
  return [0, 1, 2, 3, 4, 5, 6].map(offset => new Date(Date.UTC(1970, 0, 4 + offset, 12))
    .toLocaleDateString(locale, { weekday: 'short' }));
}

/**
 * Which weekday rows get a label. Seven at 12px would collide; three is what
 * GitHub's calendar labels, and it is enough to key the other four.
 */
const LABELLED_WEEKDAYS = [1, 3, 5];

export default function ProgressScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, interfaceLanguage, studyLanguage, streak, handleSignIn } = useUser();
  const [days, setDays] = useState<DailyProgress[] | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  /**
   * Cards learned — all of them, not a window's worth.
   *
   * "Learned" is a *state*: a card whose interval has reached 21 days. That is
   * readable from the card itself and always has been, for every card, with no
   * date boundary — which is why this no longer asks the rollups. They only
   * ever knew the *day a card crossed*, and that began on 2026-09-06, so a
   * windowed version could not appear on any range this tab offers until
   * October.
   *
   * Null while counting, and null if the count fails: an absent tile says less
   * than a tile showing a wrong number.
   */
  const [matureCount, setMatureCount] = useState<
    { total: number; byLanguage: Partial<Record<StudyLanguage, number>> } | null
  >(null);

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

  // Counted on focus like the rollups beside it: the review tab is one tap away
  // and is exactly where this number changes.
  useFocusEffect(
    useCallback(() => {
      if (!user) { setMatureCount(null); return; }
      let cancelled = false;
      (async () => {
        try {
          // The flag is written by every rating from 2026-09-12, but a card not
          // rated since carries none — and long-interval cards are exactly the
          // ones nobody has rated lately. The backfill runs first, once per
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
          setMatureCount({ total, byLanguage });
        } catch {
          if (!cancelled) setMatureCount(null);
        }
      })();
      return () => { cancelled = true; };
    }, [user]),
  );

  const summary = useMemo(() => summarizeProgress(days ?? []), [days]);
  const cells = useMemo(
    () => buildHeatmap(days ?? [], localDateString(), rangeDays),
    [days, rangeDays],
  );
  /**
   * The calendar in week columns, so a row is always the same weekday — which
   * is what lets the rows carry labels at all. See `buildWeekGrid`.
   */
  const grid = useMemo(() => buildWeekGrid(cells), [cells]);
  const weekdays = useMemo(() => weekdayLabels(interfaceLanguage), [interfaceLanguage]);

  /**
   * The selected day, as its place in the grid.
   *
   * Kept as a date plus its column and row rather than an index into `cells`:
   * the grid is padded at both ends, so an index into the flat window no longer
   * says where a cell was drawn, and the bubble is positioned from where it was
   * drawn.
   *
   * Selection persists rather than lasting only while a finger is down: on a
   * phone the finger is on top of the cell, so "hold to read" would mean
   * reading around your own thumb. Tapping the same cell again clears it.
   */
  const [selected, setSelected] = useState<
    { date: string; column: number; row: number } | null
  >(null);
  /** The full day behind a cell; `HeatmapCell` only carries the review count. */
  const daysByDate = useMemo(
    () => new Map((days ?? []).map(day => [day.date, day])),
    [days],
  );

  // A selection is an index, so it stops meaning the same day if the window
  // changes underneath it.
  const selectRange = (next: number) => { setRangeDays(next); setSelected(null); };

  const currentStudy = SUPPORTED_STUDY_LANGUAGES.find(lang => lang.code === studyLanguage);

  /**
   * Who you are, what you are studying, and the way out to settings — the
   * three things that used to live on a Settings tab, at the weight they
   * actually earn. The language chip is the quick switcher: study language
   * changes often and native language rarely, so they no longer sit at the
   * same depth.
   */
  const header = (
    <View style={s.header}>
      {user?.photoURL
        ? <Image source={{ uri: user.photoURL }} style={s.avatar} />
        : <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>
              {(user?.displayName ?? user?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
      }
      <View style={s.headerText}>
        <Text style={s.headerName} numberOfLines={1}>
          {user?.displayName ?? user?.email ?? t(interfaceLanguage, 'settingsNotSignedIn')}
        </Text>
        <TouchableOpacity
          onPress={() => setSwitcherOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(interfaceLanguage, 'settingsStudyLanguage')}
        >
          <Text style={s.headerLang} numberOfLines={1}>
            {currentStudy?.label ?? studyLanguage}
            <Text style={s.headerLangChevron}>{'  ▾'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={() => router.push('/settings')}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t(interfaceLanguage, 'settingsTitle')}
      >
        <Ionicons name="settings-outline" size={22} color={C.muted} />
      </TouchableOpacity>
    </View>
  );

  const switcher = (
    <BottomSheet
      visible={switcherOpen}
      title={t(interfaceLanguage, 'settingsStudyLanguage')}
      onClose={() => setSwitcherOpen(false)}
    >
      <StudyLanguageList onSelect={() => setSwitcherOpen(false)} />
    </BottomSheet>
  );

  // Signed out still gets the header, because the gear on it is now the only
  // route to settings — theme, privacy policy and the rest of it stopped being
  // a tab, and hiding the way in whenever nobody is signed in would strand
  // anyone who signs out.
  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>{t(interfaceLanguage, 'progressSignedOut')}</Text>
        <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
          <Text style={s.signInBtnText}>{t(interfaceLanguage, 'settingsSignInWithGoogle')}</Text>
        </TouchableOpacity>
        {switcher}
      </SafeAreaView>
    );
  }

  const hasHistory = summary.totalReviews > 0 || summary.totalNewCards > 0 || summary.totalPackCards > 0;

  // History began 2026-08-20 and cannot be reconstructed, so a window reaching
  // further back is shorter than it looks. Say so rather than letting a
  // "year" total quietly mean something narrower.
  const windowStart = shiftDate(localDateString(), -(rangeDays - 1));
  const partialWindow = historyStartsMidWindow(windowStart);

  const learned = matureCount;
  /**
   * The window's languages and the all-time learned counts, as one list — the
   * union, so a language left alone lately keeps its learned count instead of
   * vanishing with it.
   */
  const languageRows = mergeLanguageRows(summary.byLanguage, matureCount?.byLanguage ?? {});
  /** The last seven days, dense — the same builder the calendar uses. */
  // Scaled against a rounded ceiling rather than its own busiest day — see
  // `niceCeiling`. The chart owns that now, so nothing is derived here.
  const weekCells = buildHeatmap(days ?? [], localDateString(), 7);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.description}>{t(interfaceLanguage, 'progressDescription')}</Text>

        {/* Share sits in the range row rather than in the header, so the window
            being shared is the one selected right beside it. */}
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
                  {t(interfaceLanguage, range.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Offered once there is any history at all, rather than once this
              window has some: the preview screen offers every window and asks
              the zeroed-image question per card, so gating on the selected
              range here would hide the way to a year that is full. */}
          {hasHistory && (
            <TouchableOpacity
              // The range travels so the carousel opens on the card for the
              // window being looked at, rather than making it be found again.
              onPress={() => router.push({
                pathname: '/share',
                params: { range: String(rangeDays) },
              })}
              // The drawn chip is about 36×28, under the 44pt minimum, and it
              // sits at the very edge of the screen where a thumb is least
              // precise. The slop is asymmetric for that reason — more of it on
              // the right, where there is nothing to steal a tap from.
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 16 }}
              style={[s.rangeBtn, s.shareBtn]}
              accessibilityRole="button"
              accessibilityLabel={t(interfaceLanguage, 'shareTitle')}
            >
              {/* Icon only, unlike web. Three labelled range chips plus a
                  labelled Share overflow the row on a phone — and because the
                  row's intrinsic width already exceeds the screen,
                  `marginLeft: 'auto'` pushes the button off the edge rather
                  than wrapping it. An icon survives any width and any locale,
                  and the accessibility label carries the name. */}
              <Ionicons name="share-outline" size={16} color={C.highlight} />
            </TouchableOpacity>
          )}
        </View>

        {partialWindow && (
          <Text style={s.historyNote}>
            {t(interfaceLanguage, 'progressHistoryNote', {
              date: formatDay(interfaceLanguage, PROGRESS_HISTORY_START, true),
            })}
          </Text>
        )}

        {days === null ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'progressLoading')}</Text>
        ) : !hasHistory ? (
          <View>
            <Text style={s.empty}>{t(interfaceLanguage, 'progressEmpty')}</Text>
            <Text style={s.emptyBody}>{t(interfaceLanguage, 'progressEmptyBody')}</Text>
          </View>
        ) : (
          <>
            {/* The streak is `UserContext`'s stored counter, not derived from
                these rows — they start empty the day this ships, so deriving
                would show `1` to someone on a 200-day streak. */}
            <View style={s.statGrid}>
              <Stat s={s} label={t(interfaceLanguage, 'progressStreak')}
                value={streak === 1
                  ? t(interfaceLanguage, 'progressStreakDay')
                  : t(interfaceLanguage, 'progressStreakDays', { count: streak })} />
              <Stat s={s} label={t(interfaceLanguage, 'progressStatReviews')} value={summary.totalReviews} />
              <Stat s={s} label={t(interfaceLanguage, 'progressStatAverage')} value={summary.averagePerActiveDay} />
              {/* Shares its label with the tile on the shared image, so the two
                  surfaces cannot describe one number differently. Note it
                  counts *cards* where Reviews above counts directions — the
                  reason they carry different nouns and never one shared one. */}
              {learned !== null && (
                <Stat s={s} label={t(interfaceLanguage, 'shareStatLearned')} value={learned.total} />
              )}
            </View>

            <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressCalendar')}</Text>
            {/* The weekday gutter sits *outside* the scroller so it stays put
                while a year of columns slides past it. Everything that scrolls
                — the month row and the grid — shares one content view, so the
                two can never drift apart horizontally. */}
            <View style={s.calendarRow}>
              <View style={s.weekdayGutter}>
                {weekdays.map((name, row) => (
                  <Text key={name} style={s.weekdayLabel} numberOfLines={1}>
                    {LABELLED_WEEKDAYS.includes(row) ? name : ''}
                  </Text>
                ))}
              </View>
              {/* Scrolls sideways on its own — a year is 52 columns and will not
                  fit a phone. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                // Vertical room for the bubble, which is absolutely positioned
                // and would otherwise be clipped by the scroller's own bounds.
                contentContainerStyle={s.heatmapScroll}
              >
                <View>
                  <View style={[s.monthRow, { width: grid.columns.length * PITCH }]}>
                    {grid.months.map(tick => (
                      <Text key={tick.date} style={[s.monthLabel, { left: tick.column * PITCH }]}>
                        {formatMonth(interfaceLanguage, tick.date)}
                      </Text>
                    ))}
                  </View>
                  <View style={s.heatmap}>
                    {grid.columns.map((column, columnIndex) => (
                      <View key={columnIndex} style={s.heatmapCol}>
                        {column.map((cell, row) => (cell === null
                          // A slot outside the window: drawn as nothing, because
                          // an empty square would claim it was a day nobody
                          // studied.
                          ? <View key={`pad-${row}`} style={s.cellPad} />
                          : (
                            <TouchableOpacity
                              key={cell.date}
                              activeOpacity={0.6}
                              onPress={() => setSelected(current => (
                                current?.date === cell.date
                                  ? null
                                  : { date: cell.date, column: columnIndex, row }
                              ))}
                              onLongPress={() => setSelected({ date: cell.date, column: columnIndex, row })}
                              accessibilityRole="button"
                              accessibilityLabel={describeDay(interfaceLanguage, cell.date, daysByDate.get(cell.date))}
                              style={[
                                s.cell,
                                { backgroundColor: levelColor(C, cell.level) },
                                selected?.date === cell.date && { borderWidth: 1, borderColor: C.text },
                              ]}
                            />
                          )))}
                      </View>
                    ))}

                    {selected && (
                      <DayTooltip
                        C={C}
                        s={s}
                        interfaceLanguage={interfaceLanguage}
                        date={selected.date}
                        day={daysByDate.get(selected.date)}
                        {...heatmapTooltipAt(selected.column, selected.row, grid.columns.length)}
                      />
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
            {/* Named, not just graded: "Less → More" alone never says more of
                what. */}
            <View style={s.legend}>
              <Text style={s.legendText}>{t(interfaceLanguage, 'progressStatReviews')}</Text>
              <Text style={s.legendText}>{t(interfaceLanguage, 'progressLessMore')}</Text>
              {([0, 1, 2, 3, 4] as const).map(level => (
                <View key={level} style={[s.cell, { backgroundColor: levelColor(C, level) }]} />
              ))}
              <Text style={s.legendText}>{t(interfaceLanguage, 'progressMore')}</Text>
            </View>

            <WeekChart
              C={C}
              s={s}
              interfaceLanguage={interfaceLanguage}
              cells={weekCells}
              daysByDate={daysByDate}
              weekdays={weekdays}
            />

            {languageRows.length > 0 && (
              <>
                <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressByLanguage')}</Text>
                <Text style={s.sectionNote}>{t(interfaceLanguage, 'progressBarScale')}</Text>
                {languageRows.map(({ studyLanguage: language, progress, learned: learnedHere }) => (
                  <LanguageRow
                    key={language}
                    s={s}
                    C={C}
                    interfaceLanguage={interfaceLanguage}
                    language={language}
                    progress={progress}
                    learned={learnedHere}
                    // Share of the busiest language rather than of the total:
                    // with one language the bar would otherwise always be full
                    // and say nothing, and with five it is the comparison
                    // between them that is being read.
                    // From the list actually being drawn, not from the window's
                    // own ranking: a language can now be in this list for its
                    // learned count alone, in which case `summary.byLanguage`
                    // may be empty while there are still rows to scale.
                    busiest={languageRows[0]?.progress.reviews ?? 0}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      {switcher}
    </SafeAreaView>
  );
}

/**
 * One language's slice of the window: a bar for volume and the counts under it.
 *
 * The bar is what turns this from a list into an answer. "Which languages am I
 * learning and how far along" was already in the data (`byLanguage` has been
 * written since rollups began); it was just never drawn.
 *
 * It carried a retention percentage until 2026-09-12. That came off because
 * review is about how much you reviewed and how many cards you have learned,
 * not how accurately you recalled them — the verdict counters behind it are
 * still written, and `retentionRate` still computes it for whoever needs it
 * next.
 */
function LanguageRow({ s, C, interfaceLanguage, language, progress, learned, busiest }: {
  s: ReturnType<typeof makeStyles>;
  C: Palette;
  interfaceLanguage: string | null | undefined;
  language: StudyLanguage;
  progress: LanguageProgress;
  /** All-time cards over the maturity line, unlike everything else on the row. */
  learned: number;
  busiest: number;
}) {
  const cardsAdded = progress.newCards + progress.packCards;
  const share = busiest > 0 ? progress.reviews / busiest : 0;

  return (
    <View style={s.langRow}>
      <Text style={s.langName} numberOfLines={1}>
        {t(interfaceLanguage, languageLabelKey(language))}
      </Text>
      <View style={s.langBarTrack}>
        <View
          style={[
            s.langBarFill,
            // A language with any reviews at all keeps a visible sliver, for
            // the same reason the heatmap gives a one-review day level 1.
            { width: `${progress.reviews > 0 ? Math.max(4, share * 100) : 0}%`, backgroundColor: C.highlight },
          ]}
        />
      </View>
      <Text style={s.langStat}>
        {/* A row can be here for its learned count alone, with nothing in the
            window — "0 reviews" would read as a slump rather than as a language
            left alone for a while. */}
        {progress.reviews === 0
          ? t(interfaceLanguage, 'progressTooltipNoReviews')
          : t(interfaceLanguage, 'progressLanguageReviews', { count: progress.reviews })}
        {learned > 0
          ? ` · ${t(interfaceLanguage, 'progressLanguageLearned', { count: learned })}`
          : ''}
        {cardsAdded > 0
          ? ` · ${t(interfaceLanguage, 'progressStatNewCards')} ${cardsAdded}`
          : ''}
      </Text>
    </View>
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
/** Room above the grid for the month ticks. */
const MONTH_ROW_HEIGHT = 14;
/** The weekly plot's height in pixels; the axis ceiling fills it. */
const WEEK_PLOT_HEIGHT = 64;
/** Room above the plot for the bubble, so it never overlaps the marks. */
const WEEK_TOOLTIP_LANE = 44;
/** Left gutter the axis labels sit in. Matches web, so both plots inset alike. */
const WEEK_AXIS_GUTTER = 26;

/** Where the calendar's bubble goes, from the cell it points at. */
function heatmapTooltipAt(column: number, row: number, columnCount: number) {
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
  return { left, top };
}

/**
 * The bubble naming one day, positioned by whoever is pointing at it.
 *
 * ⚠️ **Geometry is the caller's, content is not.** The calendar places this off
 * a column and a row of its fixed grid; the weekly chart places it off a slot
 * in a measured plot. Only the placement differs, so only the placement moved
 * out — a second bubble component would be two things to keep saying the same
 * sentence, and this one already says it in both locales.
 */
function DayTooltip({ C, s, interfaceLanguage, date, day, left, top }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  date: string;
  day: DailyProgress | undefined;
  left: number;
  top: number;
}) {
  // A day with no document is a day with no reviews, which is what the cell
  // behind this bubble is already drawing.
  const reviews = day?.reviews ?? 0;
  const cardsAdded = (day?.newCards ?? 0) + (day?.packCards ?? 0);

  return (
    <View style={[s.tooltip, { left, top, width: TOOLTIP_WIDTH, borderColor: C.muted, backgroundColor: C.surface }]}>
      <Text style={s.tooltipDate}>{formatDay(interfaceLanguage, date)}</Text>
      <Text style={s.tooltipDetail} numberOfLines={1}>
        {reviews === 0
          ? t(interfaceLanguage, 'progressTooltipNoReviews')
          : reviews === 1
            ? t(interfaceLanguage, 'progressTooltipOneReview')
            : t(interfaceLanguage, 'progressTooltipReviews', { count: reviews })}
        {cardsAdded > 0
          ? ` · ${cardsAdded === 1
            ? t(interfaceLanguage, 'progressTooltipOneCard')
            : t(interfaceLanguage, 'progressTooltipCards', { count: cardsAdded })}`
          : ''}
      </Text>
    </View>
  );
}

type WeekMark = 'bars' | 'line';
/** Device-local, like the theme and the pronunciation speed beside it. */
const WEEK_MARK_KEY = 'amgi_week_chart_mark';

/**
 * Reviews per day for the last week, drawn as bars or as a line.
 *
 * The web chart's twin, and deliberately so — same title, same `niceCeiling`
 * scale, same gridlines, same two marks. What differs is only what has to:
 * the line is `react-native-svg` rather than inline SVG, and the detail is a
 * **tap** rather than a hover, because a phone has no pointer to rest.
 *
 * ⚠️ **The scale is the point of the rewrite.** This plot used to size bars
 * against its own busiest day, which guarantees exactly one full-height bar and
 * therefore says nothing about how big a week it was. Ruling it against a
 * rounded ceiling is what turns seven heights into seven readable numbers.
 */
function WeekChart({ C, s, interfaceLanguage, cells, daysByDate, weekdays }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  interfaceLanguage: string | null | undefined;
  cells: HeatmapCell[];
  daysByDate: Map<string, DailyProgress>;
  weekdays: string[];
}) {
  /**
   * The remembered mark.
   *
   * Held here rather than in the screen, unlike web: that copy lives in the
   * page because `useSyncExternalStore` has to hand the server a snapshot to
   * hydrate against, and there is no server here. Reading storage in a promise
   * callback is the shape `ThemeContext` and `PronunciationContext` already
   * use — asynchronous, so it is not the synchronous set-state-in-effect the
   * lint rule is about.
   */
  const [mark, setMark] = useState<WeekMark>('bars');
  useEffect(() => {
    AsyncStorage.getItem(WEEK_MARK_KEY)
      .then(saved => { if (saved === 'line') setMark('line'); })
      // Not remembering the choice is no reason to refuse it.
      .catch(() => undefined);
  }, []);

  /** The tapped day, by index. Tapping it again clears it, as the calendar does. */
  const [selected, setSelected] = useState<number | null>(null);
  /** The plot's drawn width, measured — the line needs real pixels. */
  const [plotWidth, setPlotWidth] = useState(0);

  const choose = (next: WeekMark) => {
    setMark(next);
    setSelected(null);
    AsyncStorage.setItem(WEEK_MARK_KEY, next).catch(() => undefined);
  };

  const busiest = Math.max(0, ...cells.map(cell => cell.reviews));
  /** The axis top. Marks scale to this, not to the raw busiest day. */
  const ceiling = niceCeiling(busiest);
  const ticks = weekAxisTicks(ceiling);
  /** A day's height in px, so both marks sit on one scale. */
  const heightOf = (reviews: number) => (ceiling > 0 && reviews > 0
    ? Math.max(2, Math.round((reviews / ceiling) * WEEK_PLOT_HEIGHT))
    : 0);
  /**
   * Horizontal centre of a day's slot, in pixels.
   *
   * Measured rather than expressed as a percentage of a stretched viewBox: web
   * scales its SVG with `preserveAspectRatio="none"` and then has to undo the
   * damage with `vectorEffect` and HTML dots. Drawing in real pixels sidesteps
   * that entirely — the stroke is uniform and a dot is round because nothing
   * was stretched.
   */
  const centre = (index: number) => ((index + 0.5) * plotWidth) / Math.max(1, cells.length);

  const onPlot = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setPlotWidth(current => (current === width ? current : width));
  };

  const active = selected !== null ? cells[selected] ?? null : null;

  return (
    <>
      <View style={s.weekHeader}>
        <Text style={s.sectionTitle}>{t(interfaceLanguage, 'progressWeekTitle')}</Text>
        <View style={s.weekMarkRow}>
          {(['bars', 'line'] as const).map(option => (
            <TouchableOpacity
              key={option}
              onPress={() => choose(option)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: mark === option }}
              style={[
                s.weekMarkBtn,
                { borderColor: mark === option ? C.highlight : C.border },
              ]}
            >
              <Text style={[s.weekMarkText, { color: mark === option ? C.highlight : C.muted }]}>
                {t(interfaceLanguage, option === 'bars' ? 'progressChartBars' : 'progressChartLine')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.weekPlot}>
        {/* Gridlines and their labels. Hairlines a shade off the surface, never
            dashed — a dashed rule reads as a threshold when it is only a
            scale. The zero line replaces the border this plot used to wear. */}
        {ticks.map(value => (
          <View
            key={value}
            style={[
              s.weekGridRow,
              { bottom: ceiling > 0 ? (value / ceiling) * WEEK_PLOT_HEIGHT : 0 },
            ]}
          >
            <Text style={s.weekGridLabel}>{value}</Text>
            <View style={s.weekGridLine} />
          </View>
        ))}

        <View style={s.weekMarksLayer} onLayout={onPlot}>
          {mark === 'bars' ? (
            <View style={s.weekBars}>
              {cells.map((cell, index) => (
                <View
                  key={cell.date}
                  // A day with reviews keeps a visible sliver, for the same
                  // reason the calendar gives a one-review day a level of 1.
                  style={[s.weekBar, {
                    height: Math.max(heightOf(cell.reviews), cell.reviews > 0 ? 2 : 1),
                    opacity: selected === null || selected === index ? 1 : 0.55,
                  }]}
                />
              ))}
            </View>
          ) : plotWidth > 0 && (
            <>
              <Svg width={plotWidth} height={WEEK_PLOT_HEIGHT}>
                <Polyline
                  points={cells
                    .map((cell, index) => `${centre(index)},${WEEK_PLOT_HEIGHT - heightOf(cell.reviews)}`)
                    .join(' ')}
                  fill="none"
                  stroke={C.heat[4]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </Svg>
              {/* The vertices, as plain Views. The ring is a border in the
                  background colour, which punches the dot out of the line it
                  sits on — RN has no outset shadow to do it the way web does. */}
              {cells.map((cell, index) => {
                const on = selected === index;
                const size = on ? 12 : 8;
                return (
                  <View
                    key={cell.date}
                    style={[s.weekDot, {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      left: centre(index) - size / 2,
                      bottom: heightOf(cell.reviews) - size / 2,
                      backgroundColor: C.heat[4],
                      borderColor: C.bg,
                      opacity: selected === null || on ? 1 : 0.5,
                    }]}
                  />
                );
              })}
            </>
          )}
        </View>

        {/* One full-height target per day, over the marks. A quiet day's bar is
            two pixels tall and a line has no width at all — tapping the mark
            itself would be a game rather than a chart. */}
        <View style={s.weekTargets}>
          {cells.map((cell, index) => (
            <TouchableOpacity
              key={cell.date}
              activeOpacity={0.6}
              style={s.weekTarget}
              onPress={() => setSelected(current => (current === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={describeDay(interfaceLanguage, cell.date, daysByDate.get(cell.date))}
            />
          ))}
        </View>

        {selected !== null && active && (
          <DayTooltip
            C={C}
            s={s}
            interfaceLanguage={interfaceLanguage}
            date={active.date}
            day={daysByDate.get(active.date)}
            left={WEEK_AXIS_GUTTER + Math.max(0, Math.min(
              centre(selected) - TOOLTIP_WIDTH / 2,
              Math.max(0, plotWidth - TOOLTIP_WIDTH),
            ))}
            top={0}
          />
        )}
      </View>

      <View style={s.weekLabels}>
        {cells.map(cell => (
          // From the cell's own date: these seven days end on today, so they
          // are not a fixed Sunday-to-Saturday run.
          <Text key={cell.date} style={s.weekLabel}>
            {weekdays[weekdayIndex(cell.date)]}
          </Text>
        ))}
      </View>
    </>
  );
}

/** `2026-09-01` → `Sep` / `9월`, for the calendar's month ticks. */
function formatMonth(interfaceLanguage: string | null | undefined, date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'short' },
  );
}

/**
 * `2026-08-19` → `19 August` / `8월 19일`, in the reader's language.
 *
 * `withYear` is for the history note, which names a fixed date rather than one
 * inside the window on screen — "recorded from 20 August" stops being an
 * answer the moment a second August exists.
 */
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

/** The same content as the tooltip, flattened for screen readers. */
function describeDay(
  interfaceLanguage: string | null | undefined,
  date: string,
  day: DailyProgress | undefined,
): string {
  const reviews = day?.reviews ?? 0;
  const cardsAdded = (day?.newCards ?? 0) + (day?.packCards ?? 0);
  const parts = [
    formatDay(interfaceLanguage, date),
    reviews === 0
      ? t(interfaceLanguage, 'progressTooltipNoReviews')
      : t(interfaceLanguage, 'progressTooltipReviews', { count: reviews }),
  ];
  if (cardsAdded > 0) parts.push(t(interfaceLanguage, 'progressTooltipCards', { count: cardsAdded }));
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

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { backgroundColor: C.highlight, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: C.bg, fontSize: 17, fontWeight: '700' },
    headerText: { flex: 1 },
    headerName: { color: C.text, fontSize: 16, fontWeight: '700' },
    headerLang: { color: C.muted, fontSize: 13, marginTop: 1 },
    headerLangChevron: { fontSize: 10 },
    signInBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingVertical: 13, alignItems: 'center', marginTop: 16, marginHorizontal: 16,
    },
    signInBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
    content: { padding: 16, paddingTop: 0, paddingBottom: tabBarHeight },
    description: { color: C.muted, fontSize: 13, marginBottom: 16 },
    historyNote: { color: C.muted, fontSize: 12, opacity: 0.8, marginBottom: 16 },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    rangeBtnOn: { borderColor: C.highlight },
    rangeText: { color: C.muted, fontSize: 13 },
    // `flexShrink: 0` so the icon keeps its box if the range labels grow; the
    // horizontal padding is trimmed from `rangeBtn`'s 12 because there is no
    // text beside the icon to balance it.
    shareBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginLeft: 'auto', flexShrink: 0, borderColor: C.highlight },
    rangeTextOn: { color: C.highlight, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 14, paddingHorizontal: 16 },
    emptyBody: { color: C.muted, fontSize: 13, opacity: 0.7, marginTop: 8, paddingHorizontal: 16 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    stat: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    statValue: { color: C.highlight, fontSize: 20, fontWeight: '700' },
    statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
    sectionTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
    sectionNote: { color: C.muted, fontSize: 11, marginTop: -4, marginBottom: 10 },
    calendarRow: { flexDirection: 'row' },
    // Padded down by the month row plus the scroller's own top inset, so row 0
    // of the labels lines up with row 0 of the cells.
    weekdayGutter: { marginRight: 6, paddingTop: 48 + MONTH_ROW_HEIGHT },
    weekdayLabel: {
      height: CELL, marginBottom: GAP, width: 22, textAlign: 'right',
      color: C.muted, fontSize: 9, lineHeight: CELL,
    },
    monthRow: { height: MONTH_ROW_HEIGHT, position: 'relative' },
    monthLabel: { position: 'absolute', top: 0, color: C.muted, fontSize: 9 },
    // The bubble sits above or below a cell and is absolutely positioned, so
    // the scroller needs room for it or it gets clipped at the grid's edge.
    heatmapScroll: { paddingTop: 48, paddingBottom: 24 },
    heatmap: { flexDirection: 'row', gap: GAP, position: 'relative' },
    heatmapCol: { flexDirection: 'column', gap: GAP },
    cell: { width: CELL, height: CELL, borderRadius: 2 },
    // Holds a slot's place in the column without drawing anything in it.
    cellPad: { width: CELL, height: CELL },
    tooltip: {
      position: 'absolute', zIndex: 10, paddingHorizontal: 8, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1,
    },
    tooltipDate: { fontSize: 11, fontWeight: '700', color: C.text },
    tooltipDetail: { fontSize: 11, color: C.muted, marginTop: 1 },
    legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginBottom: 24 },
    legendText: { color: C.muted, fontSize: 11 },
    weekHeader: {
      flexDirection: 'row', alignItems: 'baseline',
      justifyContent: 'space-between', gap: 12,
    },
    weekMarkRow: { flexDirection: 'row', gap: 4 },
    weekMarkBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    weekMarkText: { fontSize: 11 },
    // The lane above the plot belongs to the bubble; the marks sit on the
    // bottom of it, so a tooltip can never overlap what it is describing.
    weekPlot: { height: WEEK_PLOT_HEIGHT + WEEK_TOOLTIP_LANE },
    weekGridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
    weekGridLabel: {
      width: WEEK_AXIS_GUTTER, paddingRight: 4, textAlign: 'right',
      color: C.muted, fontSize: 10, lineHeight: 10,
    },
    weekGridLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.muted, opacity: 0.3 },
    weekMarksLayer: {
      position: 'absolute', left: WEEK_AXIS_GUTTER, right: 0, bottom: 0,
      height: WEEK_PLOT_HEIGHT,
    },
    weekBars: { flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 8 },
    weekBar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: C.heat[4] },
    weekDot: { position: 'absolute', borderWidth: 2 },
    weekTargets: {
      position: 'absolute', left: WEEK_AXIS_GUTTER, right: 0, bottom: 0,
      height: WEEK_PLOT_HEIGHT, flexDirection: 'row', gap: 8,
    },
    weekTarget: { flex: 1, height: '100%' },
    weekLabels: {
      flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 24,
      marginLeft: WEEK_AXIS_GUTTER,
    },
    weekLabel: { flex: 1, textAlign: 'center', color: C.muted, fontSize: 10 },
    langRow: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    // No `flex: 1`: the name sits directly in the card's column now that the
    // retention figure is gone, where flex would stretch it vertically rather
    // than fill the row it used to share.
    langName: { color: C.text, fontSize: 14, fontWeight: '700' },
    langBarTrack: {
      height: 6, borderRadius: 3, backgroundColor: C.border,
      overflow: 'hidden', marginTop: 8, marginBottom: 6,
    },
    langBarFill: { height: 6, borderRadius: 3 },
    langStat: { color: C.muted, fontSize: 12 },
  });
}
