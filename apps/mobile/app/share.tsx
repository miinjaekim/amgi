/**
 * The share preview — pick a card by swiping, see it full size, then post it.
 *
 * **Why this is a screen and not a sheet.** The chooser used to be a
 * `BottomSheet`, which is a React Native `Modal`, and it closed itself on the
 * way to the OS share sheet. `Sharing.shareAsync` presents a native view
 * controller, and iOS silently refuses to present one while a modal is still
 * animating out — so the share sheet never appeared, `shareAsync`'s promise
 * never settled, the `finally` that cleared the busy flag never ran, and the
 * Share button stayed disabled until the app was reloaded. All three symptoms,
 * one cause. A pushed screen is not mid-transition when its own button is
 * tapped, so the race is structurally gone rather than merely timed around.
 *
 * **Why it fetches its own rows.** `shareStats.ts` promises that building the
 * numbers costs no reads, and it still does — but this screen offers *every*
 * window at once, and the Progress tab only ever holds the one range it is
 * showing. One 364-day query on open is the same single indexed read the "1yr"
 * chip already runs, and it keeps the carousel honest: every card is built from
 * the same rows, so two of them cannot disagree about a day they share.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  buildShareCards, localDateString, shareImageFilename, shareImagePath, t,
  type DailyProgress, type ShareCard,
} from '@amgi/core';
import { useUser } from '../src/context/UserContext';
import { useTheme } from '../src/context/ThemeContext';
import { fetchRecentProgress } from '../src/services/progress';
import { withTimeout } from '../src/services/withTimeout';
import type { Palette } from '../src/theme';

/** The web deployment that renders the image, same host as every AI route. */
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * The windows on offer, matching the Progress tab's range chips.
 *
 * Shared shape, not a shared constant: `RANGES` there carries i18n keys for
 * chips and this carries day counts for `buildShareCards`. If one gains a range
 * the other should too, which is why they are named the same thing.
 */
const WINDOWS = [30, 90, 364] as const;

/** Enough rows for the longest card. One query, same as picking "1yr". */
const HISTORY_DAYS = Math.max(...WINDOWS);

/** Story format, the shape every card is drawn at. */
const ASPECT = 9 / 16;

export default function ShareScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage, streak } = useUser();
  // Which card to open on, so the preview starts where the reader just was.
  const { range } = useLocalSearchParams<{ range?: string }>();

  const [days, setDays] = useState<DailyProgress[] | null>(null);
  /**
   * Which card the reader swiped to, or `null` while it is still the one the
   * screen opened on.
   *
   * Held apart from the opening position rather than initialised to it: the
   * cards arrive asynchronously, so a single `index` state would have to be
   * written from an effect once they did, and a `setState` in an effect body is
   * the cascading-render pattern this codebase lints against. Nothing writes
   * this until a finger moves.
   */
  const [swiped, setSwiped] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The carousel's own box, measured rather than guessed from the window. */
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  const scroller = useRef<ScrollView>(null);
  /** The opening scroll happens once; after that the reader owns the position. */
  const positioned = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) { setDays([]); return; }
      let cancelled = false;
      fetchRecentProgress(user.uid, HISTORY_DAYS)
        .then(result => { if (!cancelled) setDays(result); })
        // An empty list is the "nothing to share" state, which is also the
        // honest thing to show when the read failed — there is no card to
        // offer either way.
        .catch(() => { if (!cancelled) setDays([]); });
      return () => { cancelled = true; };
    }, [user]),
  );

  const cards = useMemo(
    () => buildShareCards(days ?? [], {
      streak,
      endDate: localDateString(),
      windows: WINDOWS,
    }),
    [days, streak],
  );

  /**
   * Open on the range the Progress tab had selected.
   *
   * Falls through to the first card when that window has nothing in it — it was
   * filtered out, and starting on a card that is not there would leave the
   * carousel scrolled past its own content.
   */
  const openAt = useMemo(() => {
    const wanted = cards.findIndex(card => card.id === `w${range}`);
    return wanted === -1 ? 0 : wanted;
  }, [cards, range]);

  /** Where the carousel actually is: the reader's choice, else where it opened. */
  const index = swiped ?? openAt;

  const onFrame = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame(current => (current?.width === width && current?.height === height
      ? current
      : { width, height }));
  };

  /**
   * Open on the card the reader was already looking at.
   *
   * Purely an external-system sync — it moves an imperative child and writes no
   * state, because `index` already reads `openAt` until a swipe replaces it.
   * The measured frame lands a layout pass after the cards do, so this has to
   * be free to run on a later render than the one that loaded them; without the
   * frame the offset would be zero, which is why it waits. The ref spends it
   * once, so a reader who swipes away is not dragged back by a re-render.
   */
  useEffect(() => {
    if (positioned.current || frame === null || cards.length === 0) return;
    positioned.current = true;
    if (openAt > 0) scroller.current?.scrollTo({ x: openAt * frame.width, animated: false });
  }, [frame, cards.length, openAt]);

  const onPaged = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (frame === null || frame.width === 0) return;
    const page = Math.round(event.nativeEvent.contentOffset.x / frame.width);
    setSwiped(Math.max(0, Math.min(cards.length - 1, page)));
  };

  /**
   * Fetch the rendered PNG and hand it to the OS share sheet.
   *
   * `downloadFileAsync` rather than fetch-then-write because `shareAsync` needs
   * a local uri and cannot take a remote one; going through the download path
   * also avoids handling the image bytes in JS at all.
   *
   * The download is raced against a deadline and the *share* deliberately is
   * not: a download that never settles would wedge the button exactly the way
   * the old bug did, while the sheet is allowed to stay open as long as the
   * reader wants it.
   */
  const shareCard = async (card: ShareCard) => {
    if (sharing) return;
    setSharing(true);
    setFailed(false);
    try {
      if (!API_BASE_URL) throw new Error('no API base url configured');
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');

      const target = new File(Paths.cache, shareImageFilename(card.stats, card.variant));
      // A cached file from an earlier share would be silently reused, so the
      // window's own numbers could go out under a newer window's filename —
      // which is also why the variant is part of that name.
      if (target.exists) target.delete();

      const file = await withTimeout(File.downloadFileAsync(
        `${API_BASE_URL}${shareImagePath(card.stats, nativeLanguage, card.variant)}`,
        target,
      ));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t(nativeLanguage, 'shareTitle'),
      });
    } catch {
      // Inline rather than an `Alert`: the reader is looking at the button they
      // just pressed, and the button is also the retry. Cancelling the sheet is
      // not a failure and does not reject here, so anything reaching this
      // really did go wrong.
      setFailed(true);
    } finally {
      setSharing(false);
    }
  };

  const header = (
    <View style={s.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t(nativeLanguage, 'shareBack')}
      >
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{t(nativeLanguage, 'shareTitle')}</Text>
      {/* Balances the back arrow so the title sits centred. */}
      <View style={s.headerSpacer} />
    </View>
  );

  if (days === null) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <View style={s.center}><ActivityIndicator color={C.highlight} /></View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <View style={s.center}>
          <Text style={s.empty}>{t(nativeLanguage, 'shareNothingYet')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = cards[Math.min(index, cards.length - 1)];
  // Fit the story shape inside whatever the carousel was actually given, from
  // both directions: sizing from width alone overflows a short screen, and from
  // height alone leaves a phone-width card floating in the middle of a tall one.
  const cardWidth = frame === null
    ? 0
    : Math.min(frame.width - 48, (frame.height - 16) * ASPECT);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}

      <View style={s.carousel} onLayout={onFrame}>
        {frame !== null && (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onPaged}
          >
            {cards.map(card => (
              <View key={card.id} style={[s.page, { width: frame.width }]}>
                {/* The picture itself, at the size it will be posted at. It
                    costs no new machinery — the asset *is* a URL, so this is
                    the same address the share sheet is about to be handed, and
                    there is no second confirm step. Without a host to ask it
                    stays a placeholder; the card still shares. */}
                {API_BASE_URL === '' ? (
                  <View style={[s.card, { width: cardWidth, height: cardWidth / ASPECT }]} />
                ) : (
                  <Image
                    source={{
                      uri: `${API_BASE_URL}${shareImagePath(card.stats, nativeLanguage, card.variant)}`,
                    }}
                    style={[s.card, { width: cardWidth, height: cardWidth / ASPECT }]}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={s.label}>
        {t(nativeLanguage, current.labelKey, { count: current.windowDays })}
      </Text>

      {/* Only worth drawing once there is more than one card to be on. */}
      {cards.length > 1 && (
        <View style={s.dots}>
          {cards.map((card, at) => (
            <View key={card.id} style={[s.dot, at === index && s.dotOn]} />
          ))}
        </View>
      )}

      <View style={s.footer}>
        {failed && <Text style={s.error}>{t(nativeLanguage, 'shareFailed')}</Text>}
        <TouchableOpacity
          style={[s.shareBtn, sharing && s.shareBtnBusy]}
          onPress={() => shareCard(current)}
          disabled={sharing}
          accessibilityRole="button"
          accessibilityLabel={t(nativeLanguage, 'shareTitle')}
        >
          {sharing
            ? <ActivityIndicator color={C.bg} size="small" />
            : <Text style={s.shareBtnText}>{t(nativeLanguage, 'shareTitle')}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 12,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    headerSpacer: { width: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    empty: { color: C.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    carousel: { flex: 1 },
    page: { alignItems: 'center', justifyContent: 'center' },
    // The border colour shows through while the PNG loads, so the card does not
    // pop into existence against the background.
    card: { borderRadius: 14, backgroundColor: C.border },
    label: { color: C.text, fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 14 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
    dotOn: { backgroundColor: C.highlight },
    footer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    error: { color: C.error, fontSize: 13, textAlign: 'center', marginBottom: 10 },
    shareBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    },
    shareBtnBusy: { opacity: 0.6 },
    shareBtnText: { color: C.bg, fontSize: 16, fontWeight: '700' },
  });
}
