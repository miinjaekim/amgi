import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import {
  fetchUserFlashcards, updateFlashcardReview,
  archiveFlashcard, updateFlashcardFields,
} from '../../src/services/firestore';
import type { Flashcard, ReviewTracking } from '../../src/services/firestore';
import { getNextReviewData, t } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import type { Palette } from '../../src/theme';

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
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, recordReview } = useUser();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [done, setDone] = useState(false);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;

  // Card options (⋯ menu)
  const [showOptions, setShowOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<{ korean: string; english: string } | null>(null);
  const [submitting, setSubmitting] = useState<Rating | null>(null);

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

  const resetCardState = () => {
    setRevealed(false);
    setShowDetails(false);
    setShowOptions(false);
    setEditing(false);
    setEditDraft(null);
    revealAnim.setValue(0);
  };

  const handleReveal = () => {
    setRevealed(true);
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  const handleRate = async (rating: Rating) => {
    if (submitting) return;
    const item = queue[index];
    if (!item) return;
    recordReview();
    setSubmitting(rating);
    const { card, direction } = item;
    const tracking: ReviewTracking = card[direction] ?? {
      nextReview: new Date(), interval: 0, ease: 2.5, repetitions: 0,
    };
    const next = getNextReviewData(tracking, rating);
    const otherDir = direction === 'frontToBack' ? 'backToFront' : 'frontToBack';
    try {
      await updateFlashcardReview(card.id!, direction, next, card[otherDir]);
    } catch {
      // fire-and-forget
    }
    setSubmitting(null);
    resetCardState();
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  const handleEditSave = async () => {
    const item = queue[index];
    if (!item?.card.id || !editDraft) return;
    try {
      await updateFlashcardFields(item.card.id, editDraft);
      setQueue(prev => prev.map((qi, i) =>
        i === index ? { ...qi, card: { ...qi.card, ...editDraft } } : qi
      ));
      setEditing(false);
      setEditDraft(null);
      setShowOptions(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const handleArchive = () => {
    const item = queue[index];
    if (!item?.card.id) return;
    Alert.alert('Archive card?', 'This card will be removed from your active deck.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          try {
            await archiveFlashcard(item.card.id!);
            const newQueue = queue.filter((_, i) => i !== index);
            setQueue(newQueue);
            resetCardState();
            if (newQueue.length === 0) setDone(true);
            else if (index >= newQueue.length) setIndex(newQueue.length - 1);
          } catch {
            Alert.alert('Error', 'Failed to archive card.');
          }
        },
      },
    ]);
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
    <SafeAreaView style={s.root} edges={['top']}>
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
        {/* Card header: term + options button */}
        <View style={s.cardHeader}>
          <Text style={s.prompt}>{prompt}</Text>
          <TouchableOpacity
            style={s.optionsBtn}
            onPress={() => {
              if (editing) {
                setEditing(false);
                setEditDraft(null);
              }
              setShowOptions(v => !v);
            }}
          >
            <Text style={s.optionsBtnText}>···</Text>
          </TouchableOpacity>
        </View>

        {/* Options menu */}
        {showOptions && !editing && (
          <View style={s.optionsMenu}>
            <TouchableOpacity
              style={s.optionsMenuItem}
              onPress={() => {
                setEditDraft({ korean: card.korean || card.term, english: card.english || card.translation || '' });
                setEditing(true);
                setShowOptions(false);
              }}
            >
              <Text style={s.optionsMenuText}>Edit</Text>
            </TouchableOpacity>
            <View style={s.optionsMenuDivider} />
            <TouchableOpacity style={s.optionsMenuItem} onPress={handleArchive}>
              <Text style={[s.optionsMenuText, { color: C.error }]}>Archive</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Edit form */}
        {editing && editDraft ? (
          <View style={s.editForm}>
            <Text style={s.editLabel}>Korean</Text>
            <TextInput
              style={s.editInput}
              value={editDraft.korean}
              onChangeText={v => setEditDraft(d => d ? { ...d, korean: v } : d)}
              autoFocus
            />
            <Text style={s.editLabel}>English</Text>
            <TextInput
              style={s.editInput}
              value={editDraft.english}
              onChangeText={v => setEditDraft(d => d ? { ...d, english: v } : d)}
            />
            <View style={s.editActions}>
              <TouchableOpacity style={s.editSaveBtn} onPress={handleEditSave}>
                <Text style={s.editSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editCancelBtn} onPress={() => { setEditing(false); setEditDraft(null); }}>
                <Text style={s.editCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.frontText}>{frontText}</Text>

            {revealed && (
              <Animated.View style={[s.revealWrap, revealStyle]}>
                <View style={s.divider} />
                <Text style={s.backText}>{backText}</Text>
                {card.definition && !showDetails && (
                  <TouchableOpacity style={s.detailsBtn} onPress={() => setShowDetails(true)}>
                    <Text style={s.detailsBtnText}>Show definition</Text>
                  </TouchableOpacity>
                )}
                {card.definition && showDetails && (
                  <Text style={s.definitionText}>{card.definition}</Text>
                )}
              </Animated.View>
            )}
          </>
        )}
      </View>

      {/* Bottom action row — same position for both show-answer and ratings */}
      {!editing && (
        revealed ? (
          <View style={s.ratingRow}>
            {RATINGS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[s.ratingBtn, { borderColor: r.color }]}
                onPress={() => handleRate(r.key)}
                disabled={!!submitting}
              >
                <Text style={[s.ratingBtnText, { color: r.color, opacity: submitting && submitting !== r.key ? 0.4 : submitting === r.key ? 0 : 1 }]}>
                  {r.label}
                </Text>
                {submitting === r.key && (
                  <ActivityIndicator size="small" color={r.color} style={StyleSheet.absoluteFill} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity style={s.showBtn} onPress={handleReveal}>
            <Text style={s.showBtnText}>{t(nativeLanguage, 'showAnswer')}</Text>
          </TouchableOpacity>
        )
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingBottom: tabBarHeight },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },

  progressBar: { height: 3, backgroundColor: C.border, marginTop: 8 },
  progressFill: { height: 3, backgroundColor: C.highlight },
  progressText: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 6 },
  directionLabel: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },

  cardWrap: {
    flex: 1, margin: 16, backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    padding: 28,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  prompt: { fontSize: 13, color: C.muted, flex: 1 },
  optionsBtn: { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  optionsBtnText: { fontSize: 20, color: C.muted, letterSpacing: 2 },

  optionsMenu: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    marginBottom: 16, overflow: 'hidden',
  },
  optionsMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  optionsMenuText: { fontSize: 15, color: C.text, fontWeight: '500' },
  optionsMenuDivider: { height: 1, backgroundColor: C.border },

  editForm: { gap: 8, marginTop: 4 },
  editLabel: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  editInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.text,
    backgroundColor: C.bg,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editSaveBtn: { flex: 1, backgroundColor: C.highlight, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editSaveBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
  editCancelBtn: { flex: 1, backgroundColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editCancelBtnText: { color: C.text, fontWeight: '600', fontSize: 15 },

  frontText: { fontSize: 32, fontWeight: '700', color: C.text, lineHeight: 40 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
  backText: { fontSize: 22, fontWeight: '600', color: C.highlight, lineHeight: 30 },
  detailsBtn: {
    marginTop: 14, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  detailsBtnText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  definitionText: { fontSize: 14, color: C.text, opacity: 0.7, marginTop: 14, lineHeight: 20 },
  revealWrap: {},
  showBtn: {
    marginHorizontal: 16, paddingBottom: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  showBtnText: { fontSize: 16, color: C.text, fontWeight: '600' },

  ratingRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8,
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
}
