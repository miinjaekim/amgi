import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  buildPackCardDraft, collectSavedTerms, getPackText, getPackTerms, getVocabPack, t,
} from '@amgi/core';
import type { PackCard } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { fetchAllUserFlashcards, saveFlashcardToFirestore } from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import PronounceButton from '../../src/components/PronounceButton';
import type { Palette } from '../../src/theme';

export default function DeckDetailScreen() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage, studyLanguage } = useUser();
  const pack = getVocabPack(studyLanguage, packId);
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);
  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => { if (!cancelled) setSavedTerms(collectSavedTerms(cards)); })
      .catch(() => {}); // saved-marking is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage]);

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
    setSavingTerm(card.study);
    try {
      const draft = buildPackCardDraft(card, pack.id, user.uid, studyLanguage);
      await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
      setSavedTerms(prev => new Set(prev ?? []).add(card.study.toLowerCase()));
      setError(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingTerm(null);
    }
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
        </Text>

        {error && <Text style={s.error}>{error}</Text>}

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
              return (
                <View
                  key={card.study}
                  style={[s.cardTile, saved && s.dimmed, savingTerm === card.study && s.cardTileSaving]}
                >
                  <TouchableOpacity
                    onPress={() => handleSaveCard(card)}
                    disabled={saved}
                    style={s.cardTapArea}
                    accessibilityLabel={`Save ${card.study} (${card.back}) as a card`}
                  >
                    <Text style={s.cardStudy}>{card.study}</Text>
                    <Text style={s.cardBack}>{card.back}{saved ? ' ✓' : ''}</Text>
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

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
    back: { fontSize: 24, color: C.muted, lineHeight: 26 },
    headerLabel: { fontSize: 14, color: C.muted },
    empty: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, color: C.muted },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
    title: { fontSize: 21, fontWeight: '700', color: C.highlight },
    count: { fontSize: 12, color: C.muted },
    desc: { fontSize: 13, color: C.muted, marginTop: 6 },
    hint: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 6, marginBottom: 18 },
    error: { fontSize: 13, color: C.error, marginBottom: 12 },
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
    cardTapArea: { alignItems: 'center', alignSelf: 'stretch' },
    cardStudy: { fontSize: 22, color: C.text },
    cardBack: { fontSize: 10, color: C.muted },
  });
}
