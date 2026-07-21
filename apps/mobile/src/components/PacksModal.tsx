import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { getVocabPacks, getPackText, getStudyLanguageConfig, t } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { fetchAllUserFlashcards } from '../services/firestore';
import type { Palette } from '../theme';

interface Props {
  studyLanguage: StudyLanguage;
  onClose: () => void;
  onSelectWord: (word: string, context?: string) => void;
}

export default function PacksModal({ studyLanguage, onClose, onSelectWord }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const packs = getVocabPacks(studyLanguage);
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => {
        if (cancelled) return;
        const terms = new Set<string>();
        for (const card of cards) {
          const study = card[langConfig.studyField] ?? card.term;
          if (study) terms.add(study.toLowerCase());
          if (card.term) terms.add(card.term.toLowerCase());
        }
        setSavedTerms(terms);
      })
      .catch(() => {}); // saved-marking is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage, langConfig.studyField]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{t(nativeLanguage, 'packsLink')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.close}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.scroll}>
            {packs.map(pack => {
              const savedCount = savedTerms
                ? pack.words.filter(w => savedTerms.has(w.word.toLowerCase())).length
                : null;
              return (
                <View key={pack.id} style={s.pack}>
                  <View style={s.packTitleRow}>
                    <Text style={s.packName}>{getPackText(pack.name, nativeLanguage)}</Text>
                    {savedCount !== null && (
                      <Text style={s.packSaved}>
                        {t(nativeLanguage, 'packsSaved', { added: savedCount, total: pack.words.length })}
                      </Text>
                    )}
                  </View>
                  <Text style={s.packDesc}>{getPackText(pack.description, nativeLanguage)}</Text>
                  <Text style={s.packHint}>{t(nativeLanguage, 'packTapHint')}</Text>
                  <View style={s.wordWrap}>
                    {pack.words.map(({ word, context }) => {
                      const saved = savedTerms?.has(word.toLowerCase()) ?? false;
                      return (
                        <TouchableOpacity
                          key={word}
                          style={[s.wordChip, saved && s.wordChipSaved]}
                          onPress={() => onSelectWord(word, context)}
                        >
                          <Text style={[s.wordChipText, saved && s.wordChipTextSaved]}>
                            {word}{saved ? '  ✓' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
    sheet: {
      backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
      maxHeight: '80%', overflow: 'hidden',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
    title: { fontSize: 19, fontWeight: '700', color: C.highlight },
    close: { fontSize: 28, color: C.muted, lineHeight: 30 },
    scroll: { paddingHorizontal: 20, paddingBottom: 24 },
    pack: { marginTop: 8 },
    packTitleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    packName: { fontSize: 16, fontWeight: '700', color: C.text },
    packSaved: { fontSize: 12, color: C.muted },
    packDesc: { fontSize: 13, color: C.muted, marginTop: 4 },
    packHint: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 6, marginBottom: 10 },
    wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    wordChip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    wordChipSaved: { opacity: 0.45 },
    wordChipText: { fontSize: 14, color: C.text },
    wordChipTextSaved: { color: C.muted },
  });
}
