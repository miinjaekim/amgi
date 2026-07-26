import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, TextInput, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import {
  fetchUserFlashcards, updateFlashcardReview,
  archiveFlashcard, updateFlashcardFields,
} from '../../src/services/firestore';
import type { Flashcard, ReviewTracking } from '../../src/services/firestore';
import {
  buildReviewCollections, getBackSide, getCollectionId, getNextReviewDate,
  getNextReviewData, getStudyLangSide, getStudyLanguageConfig, isDue, t,
} from '@amgi/core';
import type { CardSideField } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import Markdown from '../../src/components/Markdown';
import type { Palette } from '../../src/theme';

type Direction = 'frontToBack' | 'backToFront';
type Rating = 'again' | 'hard' | 'good' | 'easy';
interface ReviewItem { card: Flashcard; direction: Direction }

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
  const { user, nativeLanguage, studyLanguage, recordReview } = useUser();
  const config = getStudyLanguageConfig(studyLanguage);
  const [cards, setCards] = useState<Flashcard[]>([]);
  // `undefined` is "hasn't picked yet"; `null` is the cards you made yourself,
  // which is a real choice and not the absence of one.
  const [collectionId, setCollectionId] = useState<string | null | undefined>(undefined);
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
  const [editDraft, setEditDraft] = useState<Partial<Record<CardSideField, string>> | null>(null);
  const [submitting, setSubmitting] = useState<Rating | null>(null);

  // Packs belong to one study language, so a deck is not a choice that survives
  // switching to another one — the pick resets with the cards.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setCollectionId(undefined);
    fetchUserFlashcards(user.uid, studyLanguage)
      .then(setCards)
      .finally(() => setLoading(false));
  }, [user, studyLanguage]);

  const collections = useMemo(
    () => buildReviewCollections(cards, studyLanguage, nativeLanguage),
    [cards, studyLanguage, nativeLanguage]
  );

  // A deck screen hands the choice over as `collection`; `nonce` makes a second
  // handoff of the same deck re-fire. One collection means there is no choice to
  // make — every Korean-only session — so nobody pays a tap for it.
  const { collection: requested, nonce } = useLocalSearchParams<{ collection?: string; nonce?: string }>();
  const consumedNonce = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (collections.length === 0 || collectionId !== undefined) return;
    // The param outlives the handoff, so it is consumed once — otherwise
    // "change collection" would be dragged straight back to the deck.
    if (requested && consumedNonce.current !== nonce && collections.some(c => c.id === requested)) {
      consumedNonce.current = nonce;
      setCollectionId(requested);
    } else if (collections.length === 1) {
      setCollectionId(collections[0].id);
    }
  }, [collections, collectionId, requested, nonce]);

  useEffect(() => {
    if (collectionId === undefined) { setQueue([]); setDone(false); return; }
    const inCollection = cards.filter(card => getCollectionId(card) === collectionId);
    const q = buildQueue(inCollection);
    setQueue(q);
    setIndex(0);
    setDone(q.length === 0);
    if (q.length === 0) setNextDate(getNextReviewDate(inCollection));
  }, [collectionId, cards]);

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
      await updateFlashcardReview(card.id!, direction, next, card[otherDir], studyLanguage);
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
      await updateFlashcardFields(item.card.id, editDraft, studyLanguage);
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
            await archiveFlashcard(item.card.id!, studyLanguage);
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

  if (cards.length === 0) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.emptyText}>{t(nativeLanguage, 'noFlashcardsForReview')}</Text>
      </SafeAreaView>
    );
  }

  // Your own cards and each pack are reviewed apart — katakana arriving mid-way
  // through Japanese vocabulary is worse review than either done alone — so the
  // landing is a choice of collection, not a filter over one pool.
  if (collectionId === undefined) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <ScrollView contentContainerStyle={s.pickerScroll}>
          <Text style={s.pickerTitle}>{t(nativeLanguage, 'reviewPickCollection')}</Text>
          {collections.map(collection => (
            <TouchableOpacity
              key={collection.id ?? 'mine'}
              style={s.pickerRow}
              onPress={() => setCollectionId(collection.id)}
            >
              <View style={s.pickerRowTop}>
                <Text style={s.pickerName}>{collection.name}</Text>
                <Text style={[s.pickerDue, collection.dueCount > 0 && { color: C.highlight }]}>
                  {collection.dueCount > 0
                    ? t(nativeLanguage, 'reviewCollectionDue', { count: collection.dueCount })
                    : t(nativeLanguage, 'reviewCollectionCaughtUp')}
                </Text>
              </View>
              <Text style={s.pickerCount}>
                {t(nativeLanguage, 'deckEntryCount', { count: collection.cardCount })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Only offered when there is something else to change to — a single
  // collection is not a choice, and a control for it would only be noise.
  const changeCollectionButton = collections.length > 1 && (
    <TouchableOpacity style={s.changeBtn} onPress={() => setCollectionId(undefined)}>
      <Text style={s.changeBtnText}>{t(nativeLanguage, 'reviewChangeCollection')}</Text>
    </TouchableOpacity>
  );

  if (done) {
    return (
      <SafeAreaView style={s.center}>
        {collections.length > 1 && (
          <Text style={s.collectionLabel}>
            {collections.find(c => c.id === collectionId)?.name}
          </Text>
        )}
        <Text style={s.doneTitle}>{t(nativeLanguage, 'allCaughtUp')}</Text>
        <Text style={s.doneBody}>{t(nativeLanguage, 'reviewCompleteMessage')}</Text>
        {nextDate && (
          <Text style={s.nextDate}>
            {t(nativeLanguage, 'nextReviewOn')} {nextDate.toLocaleDateString()}
          </Text>
        )}
        {changeCollectionButton}
      </SafeAreaView>
    );
  }

  const { card, direction } = queue[index];
  const isFront = direction === 'frontToBack';
  const studySide = getStudyLangSide(card);
  const backSide = getBackSide(card);
  const frontText = isFront ? studySide : backSide;
  const backText = isFront ? backSide : studySide;
  const prompt = isFront
    ? t(nativeLanguage, config.promptFrontToBackKey)
    : t(nativeLanguage, config.promptBackToFrontKey);

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
      {/* The name doubles as the way out: without it, picking the wrong
          collection would mean working through the whole queue to escape it. */}
      {collections.length > 1 ? (
        <TouchableOpacity onPress={() => setCollectionId(undefined)} hitSlop={8}>
          <Text style={s.progressText}>
            {collections.find(c => c.id === collectionId)?.name} · {index + 1} / {queue.length}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.progressText}>{index + 1} / {queue.length}</Text>
      )}

      {/* Direction label */}
      <Text style={s.directionLabel}>
        {isFront ? t(nativeLanguage, config.directionFrontToBackKey) : t(nativeLanguage, config.directionBackToFrontKey)}
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
                setEditDraft({ [config.studyField]: studySide, [config.backField]: backSide });
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
            <Text style={s.editLabel}>{t(nativeLanguage, config.studyLabelKey)}</Text>
            <TextInput
              style={s.editInput}
              value={editDraft[config.studyField] ?? ''}
              onChangeText={v => setEditDraft(d => d ? { ...d, [config.studyField]: v } : d)}
              autoFocus
            />
            <Text style={s.editLabel}>{t(nativeLanguage, config.backLabelKey)}</Text>
            <TextInput
              style={s.editInput}
              value={editDraft[config.backField] ?? ''}
              onChangeText={v => setEditDraft(d => d ? { ...d, [config.backField]: v } : d)}
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
                  <View style={s.definitionWrap}>
                    <Markdown style={s.definitionText}>{card.definition}</Markdown>
                  </View>
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
  definitionWrap: { marginTop: 14 },
  definitionText: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 20 },
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

  pickerScroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },
  pickerTitle: { fontSize: 15, color: C.muted, marginBottom: 4 },
  pickerRow: { padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  pickerRowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  pickerName: { fontSize: 16, fontWeight: '700', color: C.text, flexShrink: 1 },
  pickerDue: { fontSize: 12, color: C.muted },
  pickerCount: { fontSize: 12, color: C.muted, marginTop: 4 },
  collectionLabel: { fontSize: 13, color: C.muted, marginBottom: 8 },
  changeBtn: {
    marginTop: 20, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
  },
  changeBtnText: { fontSize: 14, fontWeight: '600', color: C.text },

  emptyText: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 24 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: C.highlight, marginBottom: 12, textAlign: 'center' },
  doneBody: { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  nextDate: { fontSize: 13, color: C.muted, textAlign: 'center' },
  });
}
