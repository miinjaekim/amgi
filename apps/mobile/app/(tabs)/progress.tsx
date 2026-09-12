import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  PROGRESS_HISTORY_START, SUPPORTED_STUDY_LANGUAGES, buildHeatmap, buildShareStats,
  buildTodayStats, buildWeekGrid, cardsLearnedIn, hasShareableHistory,
  historyStartsMidWindow, localDateString,
  shareImageFilename, shareImagePath, shiftDate,
  summarizeProgress, t,
  type DailyProgress, type HeatmapCell, type LanguageProgress,
  type ShareVariant, type StudyLanguage, type TranslationKey,
} from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import BottomSheet from '../../src/components/BottomSheet';
import StudyLanguageList from '../../src/components/StudyLanguageList';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { fetchRecentProgress } from '../../src/services/progress';
import type { Palette } from '../../src/theme';

/** The web deployment that renders the share image, same host as every AI route. */
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

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
function weekdayLabels(nativeLanguage: string | null | undefined): string[] {
  const locale = nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB';
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
  const { user, nativeLanguage, studyLanguage, streak, handleSignIn } = useUser();
  const [days, setDays] = useState<DailyProgress[] | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(90);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  /**
   * The numbers the shareable image is built from — the same window the screen
   * is showing, so what someone posts matches what they were looking at.
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
    { variant: 'window' as const, stats: shareStats, labelKey: 'shareVariantWindow' as const },
    { variant: 'today' as const, stats: todayStats, labelKey: 'shareVariantToday' as const },
  ].filter(option => hasShareableHistory(option.stats))), [shareStats, todayStats]);

  /**
   * Fetch the rendered PNG and hand it to the OS share sheet.
   *
   * **No new native module.** `expo-file-system` and `expo-sharing` are both
   * already in the shipped build — `expo-sharing` carries the CSV export — so
   * this needs no config plugin and keeps working in Expo Go, which
   * `react-native-view-shot` would not.
   *
   * `downloadFileAsync` rather than fetch-then-write because `shareAsync` needs
   * a local uri and cannot take a remote one; going through the download path
   * also avoids handling the image bytes in JS at all.
   */
  const handleShare = async (variant: ShareVariant) => {
    if (sharing) return;
    setShareOpen(false);
    setSharing(true);
    try {
      if (!API_BASE_URL) throw new Error('no API base url configured');
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');

      const stats = variant === 'today' ? todayStats : shareStats;
      const target = new File(Paths.cache, shareImageFilename(stats, variant));
      // A cached file from an earlier share would be silently reused, so the
      // window's own numbers could go out under a newer window's filename —
      // which is also why the variant is part of that name.
      if (target.exists) target.delete();

      const file = await File.downloadFileAsync(
        `${API_BASE_URL}${shareImagePath(stats, nativeLanguage, variant)}`,
        target,
        { idempotent: true },
      );
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t(nativeLanguage, 'shareTitle'),
      });
    } catch {
      // Cancelling the sheet is not a failure and does not reject here, so
      // anything reaching this really did go wrong.
      Alert.alert(t(nativeLanguage, 'shareFailed'));
    } finally {
      setSharing(false);
    }
  };

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
  const weekdays = useMemo(() => weekdayLabels(nativeLanguage), [nativeLanguage]);

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
          {user?.displayName ?? user?.email ?? t(nativeLanguage, 'settingsNotSignedIn')}
        </Text>
        <TouchableOpacity
          onPress={() => setSwitcherOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t(nativeLanguage, 'settingsStudyLanguage')}
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
        accessibilityLabel={t(nativeLanguage, 'settingsTitle')}
      >
        <Ionicons name="settings-outline" size={22} color={C.muted} />
      </TouchableOpacity>
    </View>
  );

  const switcher = (
    <BottomSheet
      visible={switcherOpen}
      title={t(nativeLanguage, 'settingsStudyLanguage')}
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
        <Text style={s.empty}>{t(nativeLanguage, 'progressSignedOut')}</Text>
        <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
          <Text style={s.signInBtnText}>{t(nativeLanguage, 'settingsSignInWithGoogle')}</Text>
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

  /**
   * Cards learned, over as much of the window as the counter can answer for.
   *
   * Withholding it outright — what the shared image still does — meant it never
   * appeared here at all: every range on offer is 30 days or more, and
   * `cardsMatured` only began on 2026-09-06. A shorter span with the span said
   * out loud beats an absent tile on a screen with room to say it.
   */
  const learned = cardsLearnedIn(days ?? [], localDateString(), rangeDays);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.description}>{t(nativeLanguage, 'progressDescription')}</Text>

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
                  {t(nativeLanguage, range.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Offered only once there is something on *some* image. A zeroed
              story asset is not a modest result, it is a broken-looking one. */}
          {shareOptions.length > 0 && (
            <TouchableOpacity
              onPress={() => setShareOpen(true)}
              disabled={sharing}
              // The drawn chip is about 36×28, under the 44pt minimum, and it
              // sits at the very edge of the screen where a thumb is least
              // precise. The slop is asymmetric for that reason — more of it on
              // the right, where there is nothing to steal a tap from.
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 16 }}
              style={[s.rangeBtn, s.shareBtn, sharing && s.shareBtnBusy]}
              accessibilityRole="button"
              accessibilityLabel={t(nativeLanguage, 'shareTitle')}
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
            {t(nativeLanguage, 'progressHistoryNote', {
              date: formatDay(nativeLanguage, PROGRESS_HISTORY_START, true),
            })}
          </Text>
        )}

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
              <Stat s={s} label={t(nativeLanguage, 'progressStatAverage')} value={summary.averagePerActiveDay} />
              {/* Shares its label with the tile on the shared image, so the two
                  surfaces cannot describe one number differently. Note it
                  counts *cards* where Reviews above counts directions — the
                  reason they carry different nouns and never one shared one. */}
              {learned !== null && (
                <Stat
                  s={s}
                  label={t(nativeLanguage, 'shareStatLearned')}
                  value={learned.count}
                  note={learned.partial
                    ? t(nativeLanguage, 'progressSince', {
                      date: formatDay(nativeLanguage, learned.from),
                    })
                    : undefined}
                />
              )}
            </View>

            <Text style={s.sectionTitle}>{t(nativeLanguage, 'progressCalendar')}</Text>
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
                        {formatMonth(nativeLanguage, tick.date)}
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
                              accessibilityLabel={describeDay(nativeLanguage, cell.date, daysByDate.get(cell.date))}
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
                        nativeLanguage={nativeLanguage}
                        date={selected.date}
                        day={daysByDate.get(selected.date)}
                        column={selected.column}
                        row={selected.row}
                        columnCount={grid.columns.length}
                      />
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
            {/* Named, not just graded: "Less → More" alone never says more of
                what. */}
            <View style={s.legend}>
              <Text style={s.legendText}>{t(nativeLanguage, 'progressStatReviews')}</Text>
              <Text style={s.legendText}>{t(nativeLanguage, 'progressLessMore')}</Text>
              {([0, 1, 2, 3, 4] as const).map(level => (
                <View key={level} style={[s.cell, { backgroundColor: levelColor(C, level) }]} />
              ))}
              <Text style={s.legendText}>{t(nativeLanguage, 'progressMore')}</Text>
            </View>

            {summary.byLanguage.length > 0 && (
              <>
                <Text style={s.sectionTitle}>{t(nativeLanguage, 'progressByLanguage')}</Text>
                <Text style={s.sectionNote}>{t(nativeLanguage, 'progressBarScale')}</Text>
                {summary.byLanguage.map(({ studyLanguage: language, progress }) => (
                  <LanguageRow
                    key={language}
                    s={s}
                    C={C}
                    nativeLanguage={nativeLanguage}
                    language={language}
                    progress={progress}
                    // Share of the busiest language rather than of the total:
                    // with one language the bar would otherwise always be full
                    // and say nothing, and with five it is the comparison
                    // between them that is being read.
                    busiest={summary.byLanguage[0].progress.reviews}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
      {switcher}
      {/* The same sheet the study-language switcher on this screen uses, rather
          than a second kind of popover for the second thing that asks a
          question. */}
      <BottomSheet
        visible={shareOpen}
        title={t(nativeLanguage, 'shareChoose')}
        onClose={() => setShareOpen(false)}
      >
        {shareOptions.map(option => (
          <TouchableOpacity
            key={option.variant}
            style={s.shareOption}
            onPress={() => handleShare(option.variant)}
            accessibilityRole="button"
          >
            {/* The picture itself, before it goes anywhere. It costs no new
                machinery — the asset is a URL, so this is the same address the
                share sheet is about to be handed. Only drawn when there is a
                host to ask; without one the row still works and still shares,
                it just cannot show what it is about to send. */}
            {API_BASE_URL !== '' && (
              <Image
                source={{
                  uri: `${API_BASE_URL}${shareImagePath(option.stats, nativeLanguage, option.variant)}`,
                }}
                style={s.shareThumb}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            )}
            <Text style={s.shareOptionText}>{t(nativeLanguage, option.labelKey)}</Text>
            <Ionicons name="share-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        ))}
      </BottomSheet>
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
function LanguageRow({ s, C, nativeLanguage, language, progress, busiest }: {
  s: ReturnType<typeof makeStyles>;
  C: Palette;
  nativeLanguage: string | null | undefined;
  language: StudyLanguage;
  progress: LanguageProgress;
  busiest: number;
}) {
  const cardsAdded = progress.newCards + progress.packCards;
  const share = busiest > 0 ? progress.reviews / busiest : 0;

  return (
    <View style={s.langRow}>
      <Text style={s.langName} numberOfLines={1}>
        {t(nativeLanguage, languageLabelKey(language))}
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
        {t(nativeLanguage, 'progressLanguageReviews', { count: progress.reviews })}
        {cardsAdded > 0
          ? ` · ${t(nativeLanguage, 'progressStatNewCards')} ${cardsAdded}`
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

function DayTooltip({ C, s, nativeLanguage, date, day, column, row, columnCount }: {
  C: Palette;
  s: ReturnType<typeof makeStyles>;
  nativeLanguage: string | null | undefined;
  date: string;
  day: DailyProgress | undefined;
  column: number;
  row: number;
  columnCount: number;
}) {
  // A day with no document is a day with no reviews, which is what the cell
  // behind this bubble is already drawing.
  const reviews = day?.reviews ?? 0;
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
      <Text style={s.tooltipDate}>{formatDay(nativeLanguage, date)}</Text>
      <Text style={s.tooltipDetail} numberOfLines={1}>
        {reviews === 0
          ? t(nativeLanguage, 'progressTooltipNoReviews')
          : reviews === 1
            ? t(nativeLanguage, 'progressTooltipOneReview')
            : t(nativeLanguage, 'progressTooltipReviews', { count: reviews })}
        {cardsAdded > 0
          ? ` · ${cardsAdded === 1
            ? t(nativeLanguage, 'progressTooltipOneCard')
            : t(nativeLanguage, 'progressTooltipCards', { count: cardsAdded })}`
          : ''}
      </Text>
    </View>
  );
}

/** `2026-09-01` → `Sep` / `9월`, for the calendar's month ticks. */
function formatMonth(nativeLanguage: string | null | undefined, date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
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
  nativeLanguage: string | null | undefined,
  date: string,
  withYear = false,
): string {
  // Parsed at UTC noon so the date can't slip a day either side of the line.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    nativeLanguage === 'Korean' ? 'ko-KR' : 'en-GB',
    { month: 'long', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) },
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

function Stat({ s, label, value, note }: {
  s: ReturnType<typeof makeStyles>;
  label: string;
  value: string | number;
  /** Qualifies the figure when it covers less than the selected range. */
  note?: string;
}) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {note !== undefined && <Text style={s.statNote}>{note}</Text>}
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
    shareBtnBusy: { opacity: 0.5 },
    shareOption: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    // 9:16, the canvas the image is drawn on. The border colour shows through
    // while the PNG is still loading, so the row does not jump.
    shareThumb: {
      width: 54, height: 96, borderRadius: 6,
      backgroundColor: C.border, marginRight: 12,
    },
    shareOptionText: { flex: 1, color: C.text, fontSize: 15 },
    rangeTextOn: { color: C.highlight, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 14, paddingHorizontal: 16 },
    emptyBody: { color: C.muted, fontSize: 13, opacity: 0.7, marginTop: 8, paddingHorizontal: 16 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    stat: { flexGrow: 1, flexBasis: '45%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    statValue: { color: C.highlight, fontSize: 20, fontWeight: '700' },
    statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
    statNote: { color: C.muted, fontSize: 10, opacity: 0.8, marginTop: 1 },
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
