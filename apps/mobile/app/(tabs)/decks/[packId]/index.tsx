import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  buildPackCardDraft, collectSavedTerms, unsavedPackCards, getCollectionId, getPackText, getPackTerms,
  getStudyLanguageConfig,
  getBackSideConfig, getStudyLangSide, getVocabPack, t,
} from '@amgi/core';
import type { PackCard } from '@amgi/core';
import { useUser } from '../../../../src/context/UserContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import {
  archiveFlashcard, deleteFlashcard, fetchAllUserFlashcards, restoreFlashcard,
  saveFlashcardToFirestore, saveFlashcardsBatch, updateFlashcardFields,
} from '../../../../src/services/firestore';
import type { Flashcard } from '../../../../src/services/firestore';
import PronounceButton from '../../../../src/components/PronounceButton';
import { useFloatingTabBarHeight } from '../../../../src/components/FloatingTabBar';
import type { Palette } from '../../../../src/theme';

export default function DeckDetailScreen() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage } = useUser();
  const config = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  /** The pack's authored back, in the language this reader wants it. */
  const packBack = (card: PackCard) => getPackText(card.back, nativeLanguage);
  const pack = getVocabPack(studyLanguage, packId);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageTerm, setManageTerm] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string | null>(null);

  const loadCards = useCallback(() => {
    if (!user) { setCards(null); return; }
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(fetched => { setCards(fetched); setLoadFailed(false); })
      // Browsing still works without this, but enrolling does not: a failure
      // used to be swallowed, leaving the deck looking empty and the enrol
      // button primed to add every card a second time.
      .catch(() => setLoadFailed(true));
  }, [user, studyLanguage]);

  useEffect(loadCards, [loadCards]);

  // Progress deliberately matches on text: a word you looked up on your own
  // counts towards the deck. Management is keyed on `packId` instead, because
  // only a card this deck produced belongs to this deck — one you looked up is
  // yours, and stays on My Cards.
  const savedTerms = useMemo(() => cards && collectSavedTerms(cards), [cards]);

  /**
   * Whether we actually know what this account has already saved.
   *
   * `savedTerms` is null while the fetch is in flight and after it fails, and
   * the enrol path read that as "nothing is saved" — so a tap before the load
   * landed, or any failed load, enrolled the entire deck on top of itself. One
   * account ended up with all 71 katakana cards twice that way. Not knowing has
   * to block the write, not wave it through.
   */
  const knowsSaved = savedTerms !== null;
  const deckCards = useMemo(() => {
    const byTerm = new Map<string, Flashcard>();
    for (const card of cards ?? []) {
      if (getCollectionId(card) === packId) byTerm.set(getStudyLangSide(card).toLowerCase(), card);
    }
    return byTerm;
  }, [cards, packId]);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(nativeLanguage, 'decksBack')}</Text>
    </View>
  );

  // A pack belongs to one study language, so switching languages while a deck
  // is open leaves this route pointing at nothing.
  if (!pack) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <Text style={s.empty}>{t(nativeLanguage, 'deckNotFound')}</Text>
      </SafeAreaView>
    );
  }

  // A looked-up word needs the full Learn flow — the value is the explanation
  // Gemini writes. `nonce` forces the Learn screen's effect to re-fire when the
  // same word is tapped twice, which identical params alone would not do.
  const openInLearn = (word: string, context?: string) => {
    router.navigate({
      pathname: '/',
      params: { term: word, ...(context ? { context } : {}), nonce: String(Date.now()) },
    });
  };

  // A pre-authored card is already complete, so it goes straight to Firestore —
  // there is nothing for /api/explain to add about あ, and asking would cost a
  // model call per character to get prose nobody wants on the card.
  const handleSaveCard = async (card: PackCard) => {
    if (savingTerm || savedTerms?.has(card.study.toLowerCase())) return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    // Same reasoning as the deck enrol: without the saved set we cannot tell a
    // new card from one already held, and a duplicate costs more than a wait.
    if (!knowsSaved) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
    setSavingTerm(card.study);
    try {
      const draft = buildPackCardDraft(card, pack.id, user.uid, studyLanguage);
      await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
      loadCards();
      setError(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingTerm(null);
    }
  };

  /**
   * Enrol the whole deck, then go straight to reviewing it. Everything not
   * already saved goes in one batched write: enrolling is one decision to the
   * user, so it should not be 107 taps or 107 round trips.
   *
   * The deck lands in review as ~2 items per card, uncapped. That flood is
   * contained to this collection, which is much of why collections are kept
   * apart in the first place.
   */
  const handleReviewDeck = async () => {
    if (pack.kind !== 'cards') return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    const unsaved = unsavedPackCards(pack, savedTerms);
    if (unsaved === null) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
    if (unsaved.length > 0) {
      setEnrolling(true);
      try {
        await saveFlashcardsBatch(
          unsaved.map(card =>
            buildPackCardDraft(card, pack.id, user.uid, studyLanguage) as Omit<Flashcard, 'createdAt' | 'id'>
          ),
          studyLanguage,
        );
      } catch {
        setError(t(nativeLanguage, 'deckEnrollError'));
        setEnrolling(false);
        return;
      }
      setEnrolling(false);
    }
    router.navigate({ pathname: '/review', params: { collection: pack.id, nonce: String(Date.now()) } });
  };

  const managed = manageTerm ? deckCards.get(manageTerm.toLowerCase()) : undefined;

  const openManage = (term: string) => {
    const card = deckCards.get(term.toLowerCase());
    if (!card) return;
    setManageTerm(term);
    setEditDraft(card[backConfig.backField] ?? card.english ?? card.translation ?? '');
    setError(null);
  };

  const closeManage = () => {
    setManageTerm(null);
    setEditDraft(null);
  };

  // Only the back side is editable: the study side is the pack's own text, and
  // rewriting あ would leave the entry unmatched against the deck it came from.
  const handleManageSave = async () => {
    if (!managed?.id || editDraft === null) return;
    try {
      await updateFlashcardFields(managed.id, { [backConfig.backField]: editDraft }, studyLanguage);
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorSaveChanges'));
    }
  };

  const handleManageArchive = () => {
    if (!managed?.id) return;
    const id = managed.id;
    Alert.alert(t(nativeLanguage, 'confirmArchive'), undefined, [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'archive'), style: 'destructive',
        onPress: async () => {
          try {
            await archiveFlashcard(id, studyLanguage);
            loadCards();
            closeManage();
          } catch {
            setError(t(nativeLanguage, 'errorArchiveFlashcard'));
          }
        },
      },
    ]);
  };

  const handleManageRestore = async () => {
    if (!managed?.id) return;
    try {
      await restoreFlashcard(managed.id, studyLanguage);
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorRestoreFlashcard'));
    }
  };

  const handleManageDelete = () => {
    if (!managed?.id) return;
    const id = managed.id;
    Alert.alert(t(nativeLanguage, 'confirmDelete'), undefined, [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteFlashcard(id, studyLanguage);
            loadCards();
            closeManage();
          } catch {
            setError(t(nativeLanguage, 'errorDeleteFlashcard'));
          }
        },
      },
    ]);
  };

  const terms = getPackTerms(pack);
  const savedCount = savedTerms
    ? terms.filter(term => savedTerms.has(term.toLowerCase())).length
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <Text style={s.title}>{getPackText(pack.name, nativeLanguage)}</Text>
          <Text style={s.count}>
            {savedCount !== null
              ? t(nativeLanguage, 'packsSaved', { added: savedCount, total: terms.length })
              : t(nativeLanguage, 'deckEntryCount', { count: terms.length })}
          </Text>
        </View>
        <Text style={s.desc}>{getPackText(pack.description, nativeLanguage)}</Text>
        <Text style={s.hint}>
          {t(nativeLanguage, pack.kind === 'cards' ? 'packTapHintCards' : 'packTapHint')}
          {deckCards.size > 0 ? ` ${t(nativeLanguage, 'deckManageHint')}` : ''}
        </Text>

        {/* Only a `cards` pack can be reviewed or drilled as a deck — a lookup
            pack holds words with no back side, so there is neither a card to
            enrol nor an answer to check against. */}
        {pack.kind === 'cards' && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.reviewBtn, (enrolling || (!!user && !knowsSaved)) && s.btnDisabled]}
              onPress={handleReviewDeck}
              // Signed out is not the same as still loading: that case keeps
              // the button live so the tap can explain itself.
              disabled={enrolling || (!!user && !knowsSaved)}
            >
              <Text style={s.reviewBtnText}>
                {enrolling ? t(nativeLanguage, 'deckEnrolling') : t(nativeLanguage, 'deckReviewDeck')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.drillBtn}
              onPress={() => router.push(`/decks/${pack.id}/drill`)}
            >
              <Text style={s.drillBtnText}>{t(nativeLanguage, 'drillLink')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* A failed load leaves the deck looking empty, which reads as "nothing
            saved yet" — say so, rather than letting it be discovered by
            enrolling a second copy. */}
        {loadFailed && !error && (
          <Text style={s.error}>{t(nativeLanguage, 'deckCardsUnavailable')}</Text>
        )}
        {error && <Text style={s.error}>{error}</Text>}

        {/* Management for one entry. Inline above the list rather than a control
            per row, so the list stays a list — the grid is what makes 107
            characters scannable. */}
        {managed && (
          <View style={s.managePanel}>
            <View style={s.manageHeader}>
              <Text style={s.manageTerm}>{manageTerm}</Text>
              {managed.archived && (
                <Text style={s.manageBadge}>{t(nativeLanguage, 'cardsFilterArchived')}</Text>
              )}
            </View>
            <Text style={s.manageLabel}>{t(nativeLanguage, backConfig.backLabelKey)}</Text>
            <TextInput
              style={s.manageInput}
              value={editDraft ?? ''}
              onChangeText={setEditDraft}
              autoFocus
            />
            <View style={s.manageActions}>
              <TouchableOpacity style={s.manageSave} onPress={handleManageSave}>
                <Text style={s.manageSaveText}>{t(nativeLanguage, 'save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.manageSecondary}
                onPress={managed.archived ? handleManageRestore : handleManageArchive}
              >
                <Text style={s.manageSecondaryText}>
                  {t(nativeLanguage, managed.archived ? 'restore' : 'archive')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.manageSecondary} onPress={handleManageDelete}>
                <Text style={[s.manageSecondaryText, { color: C.error }]}>
                  {t(nativeLanguage, 'delete')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.manageSecondary} onPress={closeManage}>
                <Text style={s.manageSecondaryText}>{t(nativeLanguage, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pack.kind === 'lookup' ? (
          <View style={s.wordWrap}>
            {pack.words.map(({ word, context }) => {
              const saved = savedTerms?.has(word.toLowerCase()) ?? false;
              return (
                <TouchableOpacity
                  key={word}
                  style={[s.wordChip, saved && s.dimmed]}
                  onPress={() => openInLearn(word, context)}
                >
                  <Text style={[s.wordChipText, saved && s.wordChipTextSaved]}>
                    {word}{saved ? '  ✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={s.cardWrap}>
            {pack.cards.map(card => {
              const saved = savedTerms?.has(card.study.toLowerCase()) ?? false;
              const owned = deckCards.get(card.study.toLowerCase());
              return (
                <View
                  key={card.study}
                  style={[
                    s.cardTile,
                    saved && s.dimmed,
                    savingTerm === card.study && s.cardTileSaving,
                    manageTerm === card.study && s.cardTileManaging,
                  ]}
                >
                  {/* One tap does the thing this entry needs: save it if it
                      isn't saved, manage it once this deck owns a card. */}
                  <TouchableOpacity
                    onPress={() => owned ? openManage(card.study) : handleSaveCard(card)}
                    disabled={saved && !owned}
                    style={s.cardTapArea}
                    accessibilityLabel={owned
                      ? `Manage the card for ${card.study} (${packBack(card)})`
                      : `Save ${card.study} (${packBack(card)}) as a card`}
                  >
                    <Text style={s.cardStudy}>{card.study}</Text>
                    <Text style={s.cardBack}>
                      {owned ? (owned[backConfig.backField] ?? packBack(card)) : packBack(card)}{saved ? ' ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                  {pack.pronounceable && (
                    <PronounceButton text={card.study} studyLanguage={studyLanguage} size="sm" />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
    back: { fontSize: 24, color: C.muted, lineHeight: 26 },
    headerLabel: { fontSize: 14, color: C.muted },
    empty: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, color: C.muted },
    scroll: { paddingHorizontal: 20, paddingBottom: tabBarHeight },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
    title: { fontSize: 21, fontWeight: '700', color: C.highlight },
    count: { fontSize: 12, color: C.muted },
    desc: { fontSize: 13, color: C.muted, marginTop: 6 },
    hint: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 6, marginBottom: 14 },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    reviewBtn: {
      backgroundColor: C.highlight,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    },
    reviewBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
    btnDisabled: { opacity: 0.5 },
    drillBtn: {
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    },
    drillBtnText: { fontSize: 15, fontWeight: '600', color: C.text },
    error: { fontSize: 13, color: C.error, marginBottom: 12 },

    managePanel: {
      borderWidth: 1, borderColor: C.border, borderRadius: 14,
      padding: 14, marginBottom: 16, gap: 8, backgroundColor: C.surface,
    },
    manageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    manageTerm: { fontSize: 24, color: C.text },
    manageBadge: {
      fontSize: 11, color: C.muted, borderWidth: 1, borderColor: C.border,
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    manageLabel: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    manageInput: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.text,
      backgroundColor: C.bg,
    },
    manageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    manageSave: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    manageSaveText: { fontSize: 14, fontWeight: '700', color: C.bg },
    manageSecondary: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    manageSecondaryText: { fontSize: 14, fontWeight: '600', color: C.text },
    wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    wordChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    dimmed: { opacity: 0.45 },
    wordChipText: { fontSize: 14, color: C.text },
    wordChipTextSaved: { color: C.muted },
    cardWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cardTile: {
      width: 68, alignItems: 'center', paddingVertical: 6,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
    },
    cardTileSaving: { opacity: 0.6 },
    cardTileManaging: { borderColor: C.highlight },
    cardTapArea: { alignItems: 'center', alignSelf: 'stretch' },
    cardStudy: { fontSize: 22, color: C.text },
    cardBack: { fontSize: 10, color: C.muted },
  });
}
