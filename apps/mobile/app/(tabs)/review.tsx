import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { fetchUserFlashcards, updateFlashcardReview } from '../../src/services/firestore';
import type { Flashcard, ReviewTracking } from '../../src/services/firestore';
import { getNextReviewData, t } from '@amgi/core';
import { C } from '../../src/theme';

type Direction = 'frontToBack' | 'backToFront';
type Rating = 'again' | 'hard' | 'good' | 'easy';
interface ReviewItem { card: Flashcard; direction: Direction }

function isDue(card: Flashcard): Direction[] {
  const now = new Date();
  const dirs: Direction[] = [];
  const fbDate = card.frontToBack ? new Date(card.frontToBack.nextReview) : null;
  const bfDate = card.backToFront ? new Date(card.backToFront.nextReview) : null;
  if (!fbDate || fbDate <= now) dirs.push('frontToBack');
  if (!bfDate || bfDate <= now) dirs.push('backToFront');
  return dirs;
}

function buildQueue(cards: Flashcard[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const card of cards) {
    for (const dir of isDue(card)) {
      items.push({ card, direction: dir });
    }
  }
  return items.sort(() => Math.random() - 0.5);
}

export default function ReviewScreen() {
  const { user, nativeLanguage } = useUser();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchUserFlashcards(user.uid)
      .then(cards => {
        const q = buildQueue(cards);
        setQueue(q);
        setIndex(0);
        setDone(q.length === 0);
        if (q.length === 0) {
          const earliest = cards
            .flatMap(c => [c.frontToBack?.nextReview, c.backToFront?.nextReview].filter(Boolean))
            .map(d => new Date(d!))
            .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
          setNextDate(earliest);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleReveal = () => {
    setRevealed(true);
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  const handleRate = async (rating: Rating) => {
    const item = queue[index];
    if (!item) return;
    const { card, direction } = item;
    const tracking: ReviewTracking = card[direction] ?? {
      nextReview: new Date(), interval: 0, ease: 2.5, repetitions: 0,
    };
    const next = getNextReviewData(tracking, rating);
    const otherDir = direction === 'frontToBack' ? 'backToFront' : 'frontToBack';
    try {
      await updateFlashcardReview(card.id!, direction, next, card[otherDir]);
    } catch {
      // fire-and-forget; don't block the review session
    }
    revealAnim.setValue(0);
    setRevealed(false);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.emptyText}>{t(nativeLanguage, 'signInToReview')}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.highlight} size="large" />
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.doneTitle}>{t(nativeLanguage, 'allCaughtUp')}</Text>
        <Text style={s.doneBody}>{t(nativeLanguage, 'reviewCompleteMessage')}</Text>
        {nextDate && (
          <Text style={s.nextDate}>
            {t(nativeLanguage, 'nextReviewOn')} {nextDate.toLocaleDateString()}
          </Text>
        )}
      </SafeAreaView>
    );
  }

  if (queue.length === 0) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.emptyText}>{t(nativeLanguage, 'noFlashcardsForReview')}</Text>
      </SafeAreaView>
    );
  }

  const { card, direction } = queue[index];
  const isFront = direction === 'frontToBack';
  const frontText = isFront ? (card.korean || card.term) : (card.english || card.translation || card.term);
  const backText = isFront ? (card.english || card.translation || '') : (card.korean || card.term);
  const prompt = isFront
    ? t(nativeLanguage, 'promptKoreanToEnglish')
    : t(nativeLanguage, 'promptEnglishToKorean');

  const revealStyle = {
    opacity: revealAnim,
    transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  const RATINGS: { key: Rating; label: string; color: string }[] = [
    { key: 'again', label: t(nativeLanguage, 'ratingAgain'), color: '#c0392b' },
    { key: 'hard', label: t(nativeLanguage, 'ratingHard'), color: '#e67e22' },
    { key: 'good', label: t(nativeLanguage, 'ratingGood'), color: C.highlight },
    { key: 'easy', label: t(nativeLanguage, 'ratingEasy'), color: '#2980b9' },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${(index / queue.length) * 100}%` }]} />
      </View>
      <Text style={s.progressText}>{index + 1} / {queue.length}</Text>

      {/* Direction label */}
      <Text style={s.directionLabel}>
        {isFront ? t(nativeLanguage, 'directionKoreanToEnglish') : t(nativeLanguage, 'directionEnglishToKorean')}
      </Text>

      {/* Card */}
      <View style={s.cardWrap}>
        <Text style={s.prompt}>{prompt}</Text>
        <Text style={s.frontText}>{frontText}</Text>

        {revealed ? (
          <Animated.View style={[s.revealWrap, revealStyle]}>
            <View style={s.divider} />
            <Text style={s.backText}>{backText}</Text>
            {card.definition ? <Text style={s.definitionText}>{card.definition}</Text> : null}
          </Animated.View>
        ) : (
          <TouchableOpacity style={s.showBtn} onPress={handleReveal}>
            <Text style={s.showBtnText}>{t(nativeLanguage, 'showAnswer')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rating buttons */}
      {revealed && (
        <View style={s.ratingRow}>
          {RATINGS.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[s.ratingBtn, { borderColor: r.color }]}
              onPress={() => handleRate(r.key)}
            >
              <Text style={[s.ratingBtnText, { color: r.color }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },

  progressBar: { height: 3, backgroundColor: C.border, marginTop: 8 },
  progressFill: { height: 3, backgroundColor: C.highlight },
  progressText: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 6 },
  directionLabel: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },

  cardWrap: {
    flex: 1, margin: 16, backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    padding: 28, justifyContent: 'center',
  },
  prompt: { fontSize: 13, color: C.muted, marginBottom: 16 },
  frontText: { fontSize: 32, fontWeight: '700', color: C.text, lineHeight: 40 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
  backText: { fontSize: 22, fontWeight: '600', color: C.highlight, lineHeight: 30 },
  definitionText: { fontSize: 14, color: C.text, opacity: 0.7, marginTop: 12, lineHeight: 20 },
  revealWrap: {},
  showBtn: {
    marginTop: 24, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  showBtnText: { fontSize: 16, color: C.text, fontWeight: '600' },

  ratingRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 24,
  },
  ratingBtn: {
    flex: 1, borderWidth: 2, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  ratingBtnText: { fontSize: 13, fontWeight: '700' },

  emptyText: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 24 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: C.highlight, marginBottom: 12, textAlign: 'center' },
  doneBody: { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  nextDate: { fontSize: 13, color: C.muted, textAlign: 'center' },
});
