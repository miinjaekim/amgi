import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Easing,
  ScrollView, useWindowDimensions,
} from 'react-native';
import {
  advancePreviewQueue, getBackSide, getReading, getStudyLangSide, hanjaFaces,
  partOfSpeechLabel, startPreviewQueue, t,
} from '@amgi/core';
import type { Flashcard } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import PronounceButton from './PronounceButton';
import CardDetailsBlock from './CardDetailsBlock';
import { useCardEnrichment } from '../hooks/useCardEnrichment';
import type { Palette } from '../theme';

/** Review's turn, for the same card: out to edge-on, swap faces, back in. */
const FLIP_OUT_MS = 70;
const FLIP_IN_MS = 120;
/** How far across, as a share of the screen, a release has to be to count. */
const SWIPE_DISTANCE = 0.28;
/** Or how fast, in points per millisecond: a flick counts from anywhere. */
const SWIPE_VELOCITY = 0.6;
/** Movement before a touch is a drag rather than a tap that flips. */
const DRAG_SLOP = 8;

interface PreviewSessionProps {
  /** The collection's cards. Which of them are new is decided here, once, on start. */
  cards: readonly Flashcard[];
  /** Shown above the card when the user has more than one collection to tell apart. */
  collectionName?: string;
  /** Pronunciation is a network call, hidden offline as Review hides it. */
  isOnline: boolean;
  onExit: () => void;
}

/**
 * Preview: a pass through a deck's new cards before reviewing them, with
 * nothing at stake. See `preview.ts` in core for the rules; nothing here
 * writes anything.
 *
 * Tap flips. Swipe right and the card is out for the session, swipe left and
 * it comes round again a few cards later. Both are also VoiceOver and TalkBack
 * actions on the card, since a swipe is not something a screen reader can do.
 */
export default function PreviewSession({ cards, collectionName, isOnline, onExit }: PreviewSessionProps) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, deckNativeLanguage, studyLanguage, hanjaPartition } = useUser();
  const reduceMotion = useReduceMotion();
  const { width } = useWindowDimensions();

  // Built once. The card list behind it is live, but nothing a preview does
  // changes it, and a snapshot landing mid-session must not reshuffle the pass.
  const [queue, setQueue] = useState<Flashcard[]>(() => startPreviewQueue(cards));
  const [showingBack, setShowingBack] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const drag = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  /** A turn or a throw is under way; taps and drags wait for it. */
  const busy = useRef(false);

  const current = queue[0];

  // Getting to know a card is exactly when its definition and examples help,
  // so the back has Review's details, generated on demand by the same routes.
  // Generating writes that content onto the card, as it does from Review; it
  // is the card's content, not its schedule, so Preview still saves no study.
  // The queue stores what was written, so a card seen again keeps it.
  const {
    saved: enrichedCard, isRunning: enrichRunning, error: enrichError, enrich,
  } = useCardEnrichment({
    card: current,
    studyLanguage,
    interfaceLanguage,
    deckNativeLanguage,
    onChanged: card => {
      setQueue(prev => prev.map(c => (c.id === card.id ? { ...c, ...card } : c)));
    },
  });

  const flip = () => {
    if (busy.current) return;
    busy.current = true;
    const direction = showingBack ? -1 : 1;
    Animated.timing(flipAnim, {
      toValue: direction, duration: FLIP_OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true,
    }).start(() => {
      setShowingBack(back => !back);
      flipAnim.setValue(-direction);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: FLIP_IN_MS,
        easing: reduceMotion ? Easing.out(Easing.quad) : Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start(() => { busy.current = false; });
    });
  };

  /** The card is answered: off the screen the way it went, then the next one. */
  const answer = (gotIt: boolean) => {
    if (busy.current) return;
    busy.current = true;
    Animated.timing(drag, {
      toValue: (gotIt ? 1 : -1) * width * 1.2,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setQueue(q => (q.length > 0 ? advancePreviewQueue(q, gotIt) : q));
      setShowingBack(false);
      setShowDetails(false);
      drag.setValue(0);
      flipAnim.setValue(0);
      busy.current = false;
    });
  };

  // Rebuilt each render so the handlers see the current card and side. Cheap:
  // `create` only wraps the callbacks.
  const pan = PanResponder.create({
    // Taps fall through to the card's touchable; only a sideways drag is ours,
    // so the back face can still scroll up and down. Capture, so that drag is
    // ours even when it starts on that scroll view.
    onMoveShouldSetPanResponderCapture: (_, g) =>
      !busy.current && Math.abs(g.dx) > DRAG_SLOP && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => drag.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      const far = Math.abs(g.dx) > width * SWIPE_DISTANCE;
      const fast = Math.abs(g.vx) > SWIPE_VELOCITY && Math.abs(g.dx) > DRAG_SLOP * 3;
      if (far || fast) {
        answer(g.dx > 0);
      } else {
        Animated.spring(drag, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(drag, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    },
  });

  const header = (
    <View style={s.bar}>
      <View style={s.barText}>
        {collectionName ? <Text style={s.collection} numberOfLines={1}>{collectionName}</Text> : null}
        <Text style={s.title}>
          {t(interfaceLanguage, 'previewTitle')}
          {current ? (
            <Text style={s.remaining}>  {t(interfaceLanguage, 'previewRemaining', { count: queue.length })}</Text>
          ) : null}
        </Text>
      </View>
      {current ? (
        <TouchableOpacity onPress={onExit} hitSlop={12} accessibilityLabel={t(interfaceLanguage, 'previewEnd')}>
          <Text style={s.end}>{t(interfaceLanguage, 'previewEnd')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (!current) {
    return (
      <View style={s.fill}>
        {header}
        <View style={s.centered}>
          <Text style={s.doneTitle}>{t(interfaceLanguage, 'previewDoneTitle')}</Text>
          <Text style={s.doneBody}>{t(interfaceLanguage, 'previewDoneBody')}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={onExit}>
            <Text style={s.primaryBtnText}>{t(interfaceLanguage, 'previewBackToReview')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setQueue(startPreviewQueue(cards))}>
            <Text style={s.secondaryBtnText}>{t(interfaceLanguage, 'previewRestart')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Front is the study side, so a preview always opens on the word being
  // learned. Hanja follows the learner's chosen partition, as Review's forward
  // direction does.
  const study = getStudyLangSide(current);
  const { front, back } = studyLanguage === 'Hanja'
    ? hanjaFaces(current, hanjaPartition)
    : { front: study, back: getBackSide(current, deckNativeLanguage) };
  const gloss = studyLanguage === 'Hanja' && deckNativeLanguage !== 'Korean' ? current.english : undefined;
  const badges = [
    partOfSpeechLabel(deckNativeLanguage, current),
    current.gender,
    getReading(current, studyLanguage, deckNativeLanguage),
  ].filter(Boolean);

  const flipStyle = reduceMotion
    ? { opacity: flipAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0], extrapolate: 'clamp' }) }
    : {
        transform: [
          { perspective: 1000 },
          { rotateY: flipAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-90deg', '90deg'] }) },
        ],
      };
  const dragStyle = {
    transform: [
      { translateX: drag },
      // A slight tilt, so the card reads as being thrown rather than slid.
      ...(reduceMotion ? [] : [{
        rotate: drag.interpolate({ inputRange: [-width, 0, width], outputRange: ['-8deg', '0deg', '8deg'] }),
      }]),
    ],
  };
  // What letting go would do, fading in as the card goes that way.
  const gotItOpacity = drag.interpolate({ inputRange: [0, width * SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp' });
  const againOpacity = drag.interpolate({ inputRange: [-width * SWIPE_DISTANCE, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={s.fill}>
      {header}
      <View style={s.body}>
        <Animated.View
          // Keyed by card, so a card's flip and drag never carry to the next.
          key={current.id}
          style={[s.cardWrap, dragStyle]}
          {...pan.panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel={showingBack ? back : front}
          accessibilityHint={t(interfaceLanguage, 'previewSwipeHint')}
          accessibilityActions={[
            { name: 'activate' },
            { name: 'gotIt', label: t(interfaceLanguage, 'previewGotIt') },
            { name: 'again', label: t(interfaceLanguage, 'previewAgain') },
          ]}
          onAccessibilityAction={e => {
            if (e.nativeEvent.actionName === 'gotIt') answer(true);
            else if (e.nativeEvent.actionName === 'again') answer(false);
            else flip();
          }}
        >
          <Animated.View style={[s.card, flipStyle]}>
            <TouchableOpacity activeOpacity={0.9} onPress={flip} style={s.cardTouch}>
              {showingBack ? (
                <ScrollView contentContainerStyle={s.face}>
                  {back ? <Text style={s.back}>{back}</Text> : null}
                  {gloss ? <Text style={s.gloss}>{gloss}</Text> : null}
                  {current.briefDefinition ? <Text style={s.brief}>{current.briefDefinition}</Text> : null}
                  {current.formsNote ? <Text style={s.forms}>{current.formsNote}</Text> : null}
                  {badges.length > 0 && (
                    <View style={s.badges}>
                      {badges.map((label, i) => (
                        <View key={i} style={s.badge}><Text style={s.badgeText}>{label}</Text></View>
                      ))}
                    </View>
                  )}
                  <CardDetailsBlock
                    card={enrichedCard && enrichedCard.id === current.id ? enrichedCard : current}
                    showDetails={showDetails}
                    onToggle={() => setShowDetails(v => !v)}
                    isRunning={enrichRunning}
                    error={enrichError}
                    enrich={enrich}
                    isOnline={isOnline}
                  />
                </ScrollView>
              ) : (
                <View style={[s.face, s.frontFace]}>
                  <Text style={s.front}>{front}</Text>
                  {isOnline && (
                    <PronounceButton text={front} furigana={current.furigana} eum={current.eum} studyLanguage={studyLanguage} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[s.stamp, s.stampRight, { opacity: gotItOpacity }]}>
            <Text style={s.stampText}>{t(interfaceLanguage, 'previewGotIt')}</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[s.stamp, s.stampLeft, { opacity: againOpacity }]}>
            <Text style={s.stampText}>{t(interfaceLanguage, 'previewAgain')}</Text>
          </Animated.View>
        </Animated.View>
        <Text style={s.hint}>{t(interfaceLanguage, 'previewSwipeHint')}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    fill: { flex: 1 },
    bar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 12, gap: 12,
    },
    barText: { flex: 1 },
    collection: { fontSize: 12, color: C.muted, marginBottom: 2 },
    title: { fontSize: 18, fontWeight: '700', color: C.text },
    remaining: { fontSize: 13, fontWeight: '400', color: C.muted },
    end: { fontSize: 13, color: C.muted },
    body: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, justifyContent: 'center' },
    cardWrap: { height: 360 },
    card: {
      flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20,
      overflow: 'hidden',
    },
    cardTouch: { flex: 1 },
    face: { padding: 24, flexGrow: 1 },
    frontFace: { alignItems: 'center', justifyContent: 'center', gap: 14 },
    front: { fontSize: 40, fontWeight: '600', color: C.highlight, textAlign: 'center' },
    back: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 12 },
    gloss: { fontSize: 16, color: C.muted, marginBottom: 12 },
    brief: { fontSize: 14, color: C.muted, marginBottom: 12, lineHeight: 20 },
    forms: { fontSize: 12, color: C.muted, marginBottom: 12 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    badge: { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 12, color: C.muted },
    stamp: {
      position: 'absolute', top: 18, borderWidth: 2, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.bg, borderColor: C.highlight,
    },
    // Each label sits on the edge the card is travelling away from, so it is
    // the part still on screen.
    stampRight: { left: 18 },
    stampLeft: { right: 18, borderColor: C.muted },
    stampText: { fontSize: 15, fontWeight: '700', color: C.text },
    hint: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    doneTitle: { fontSize: 24, fontWeight: '700', color: C.highlight, marginBottom: 12, textAlign: 'center' },
    doneBody: { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
    primaryBtn: {
      marginTop: 20, backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11,
    },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
    secondaryBtn: {
      marginTop: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
    },
    secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
  });
}
