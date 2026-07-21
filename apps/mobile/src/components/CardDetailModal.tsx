import React, { useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { getStudyLangSide, getBackSide, getExampleSides, t } from '@amgi/core';
import type { ExamplePair } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import PronounceButton from './PronounceButton';
import type { Flashcard } from '../services/firestore';
import type { Palette } from '../theme';

interface Props {
  card: Flashcard;
  nativeLanguage: string | null | undefined;
  onClose: () => void;
}

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
}

export default function CardDetailModal({ card, nativeLanguage, onClose }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const studyLanguage = card.studyLanguage ?? 'Korean';
  const studySide = getStudyLangSide(card);
  const hasDetails = card.definition || card.hanja || card.notes || (card.examples && card.examples.length > 0);
  const badges = [card.formality && card.formality !== 'N/A' ? card.formality : null, card.gender, card.furigana].filter(Boolean) as string[];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View style={s.headerMain}>
              <View style={s.titleRow}>
                <Text style={s.term}>{studySide}</Text>
                <PronounceButton text={studySide} studyLanguage={studyLanguage} />
                {badges.map((b, i) => (
                  <View key={i} style={s.badge}><Text style={s.badgeText}>{b}</Text></View>
                ))}
              </View>
              <Text style={s.back}>{getBackSide(card)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.close}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body}>
            {!hasDetails ? (
              <Text style={s.muted}>{t(nativeLanguage, 'noCardDetails')}</Text>
            ) : (
              <>
                {card.definition && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionDefinition')}</Text>
                    <Text style={s.sectionBody}>{card.definition}</Text>
                  </View>
                )}
                {card.hanja && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionHanja')}</Text>
                    <Text style={s.sectionBody}>{card.hanja}</Text>
                  </View>
                )}
                {card.notes && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionContext')}</Text>
                    <Text style={s.sectionBody}>{card.notes}</Text>
                  </View>
                )}
                {card.examples && card.examples.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionExamples')}</Text>
                    {(() => {
                      const raw = card.examples as unknown[];
                      if (raw.length > 0 && typeof raw[0] === 'string') {
                        return (raw as string[]).map((ex, i) => (
                          <Text key={i} style={s.exampleStudy}>{ex}</Text>
                        ));
                      }
                      if (isExamplePairArray(raw)) {
                        return (raw as ExamplePair[]).map((ex, i) => {
                          const sides = getExampleSides(ex, studyLanguage);
                          return (
                            <View key={i} style={s.exampleItem}>
                              <View style={s.exampleStudyRow}>
                                <Text style={[s.exampleStudy, s.exampleStudyText]}>{sides.study}</Text>
                                <PronounceButton text={sides.study} studyLanguage={studyLanguage} size="sm" />
                              </View>
                              {sides.back ? <Text style={s.exampleBack}>{sides.back}</Text> : null}
                            </View>
                          );
                        });
                      }
                      return null;
                    })()}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
    sheet: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, maxHeight: '85%', overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    headerMain: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    term: { fontSize: 24, fontWeight: '700', color: C.highlight },
    badge: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, color: C.muted },
    back: { fontSize: 16, color: C.text, marginTop: 4 },
    close: { fontSize: 28, color: C.muted, lineHeight: 30, marginLeft: 12 },
    body: { padding: 20 },
    muted: { fontSize: 14, color: C.muted },
    section: { marginBottom: 18 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    sectionBody: { fontSize: 14, color: C.text, lineHeight: 21, opacity: 0.9 },
    exampleItem: { marginBottom: 12 },
    exampleStudyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    exampleStudy: { fontSize: 14, color: C.text, lineHeight: 21 },
    exampleStudyText: { flexShrink: 1 },
    exampleBack: { fontSize: 13, color: C.highlight, marginTop: 2 },
  });
}
