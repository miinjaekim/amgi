import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getCharacterBreakdown, getExampleSides, getStudyLanguageConfig, t } from '@amgi/core';
import type { Flashcard } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { rtlLine } from '../rtl';
import type { EnrichKind } from '../hooks/useCardEnrichment';
import Markdown from './Markdown';
import PronounceButton from './PronounceButton';
import type { Palette } from '../theme';

interface CardDetailsBlockProps {
  /** The enriched copy when something was just generated, the caller's otherwise. */
  card: Flashcard;
  showDetails: boolean;
  onToggle: () => void;
  /** From `useCardEnrichment`, which the caller owns so the card it writes stays theirs. */
  isRunning: (kind: EnrichKind) => boolean;
  error: string | null | undefined;
  enrich: (kind: EnrichKind) => void;
  /** Pronunciation is a network call, so its buttons are hidden offline. */
  isOnline: boolean;
}

/**
 * The details toggle on the back of a card and what it opens: definition,
 * character breakdown, notes and examples, with buttons to generate whichever
 * is missing. Shared by Review and Preview so a card reads the same in both.
 */
export default function CardDetailsBlock({
  card, showDetails, onToggle, isRunning, error, enrich, isOnline,
}: CardDetailsBlockProps) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, deckNativeLanguage, studyLanguage } = useUser();
  const config = getStudyLanguageConfig(studyLanguage);

  const definition = card.definition;
  const characterBreakdown = getCharacterBreakdown(card);
  const characterSectionKey = config.characterSectionKey ?? 'sectionHanja';
  const hasExamples = !!card.examples && card.examples.length > 0;
  const hasDepth = !!(definition || characterBreakdown || card.notes);

  return (
    <>
      {/* One toggle for everything, shown whenever there is either
          something to read or something to write. */}
      <TouchableOpacity style={s.detailsBtn} onPress={onToggle}>
        <Text style={s.detailsBtnText}>
          {t(interfaceLanguage, showDetails ? 'hideDetails' : 'showDetails')}
        </Text>
      </TouchableOpacity>

      {showDetails && (
        <View style={s.definitionWrap}>
          {!!definition && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>{t(interfaceLanguage, 'sectionDefinition')}</Text>
              <Markdown style={s.definitionText}>{definition}</Markdown>
            </View>
          )}
          {!!characterBreakdown && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>{t(interfaceLanguage, characterSectionKey)}</Text>
              <Markdown style={s.definitionText}>{characterBreakdown}</Markdown>
            </View>
          )}
          {!!card.notes && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>{t(interfaceLanguage, 'sectionNotes')}</Text>
              <Markdown style={s.definitionText}>{card.notes}</Markdown>
            </View>
          )}
          {hasExamples && (
            <View style={s.detailSection}>
              <Text style={s.detailLabel}>{t(interfaceLanguage, 'sectionExamples')}</Text>
              {card.examples!.map((ex, i) => {
                const sides = getExampleSides(ex, studyLanguage, deckNativeLanguage);
                return (
                  <View key={i} style={s.exampleItem}>
                    <View style={s.exampleStudyRow}>
                      <Text style={[s.exampleStudy, s.rowText, rtlLine(sides.study)]}>{sides.study}</Text>
                      {isOnline && (
                        <PronounceButton
                          text={sides.study}
                          studyLanguage={studyLanguage}
                          kind="sentence"
                          size="sm"
                        />
                      )}
                    </View>
                    {sides.back ? <Text style={s.exampleBack}>{sides.back}</Text> : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* A one-line gloss most often turns out not to be enough at the
              moment you are looking at the card, so the write is offered
              here. Each button waits only on its own request. */}
          {(!hasDepth || !hasExamples) && (
            <View style={s.enrichRow}>
              {!hasDepth && (
                <TouchableOpacity
                  style={[s.detailsBtn, isRunning('depth') && s.btnDisabled]}
                  onPress={() => enrich('depth')}
                  disabled={isRunning('depth')}
                >
                  <Text style={s.detailsBtnText}>
                    {isRunning('depth')
                      ? t(interfaceLanguage, 'cardEnriching')
                      : t(interfaceLanguage, 'loadDefinition')}
                  </Text>
                </TouchableOpacity>
              )}
              {!hasExamples && (
                <TouchableOpacity
                  style={[s.detailsBtn, isRunning('examples') && s.btnDisabled]}
                  onPress={() => enrich('examples')}
                  disabled={isRunning('examples')}
                >
                  <Text style={s.detailsBtnText}>
                    {isRunning('examples')
                      ? t(interfaceLanguage, 'cardEnriching')
                      : t(interfaceLanguage, 'loadExamples')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {error ? <Text style={s.enrichError}>{error}</Text> : null}
        </View>
      )}
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    rowText: { flexShrink: 1 },
    exampleStudyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailsBtn: {
      marginTop: 14, borderWidth: 1, borderColor: C.border,
      borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
    },
    detailsBtnText: { fontSize: 13, color: C.muted, fontWeight: '500' },
    btnDisabled: { opacity: 0.5 },
    enrichError: { fontSize: 12, color: C.error, marginTop: 8, textAlign: 'center' },
    definitionWrap: { marginTop: 14 },
    detailSection: { marginBottom: 16 },
    detailLabel: {
      fontSize: 11, fontWeight: '700', color: C.muted,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
    },
    exampleItem: { marginBottom: 10 },
    exampleStudy: { fontSize: 14, color: C.text, lineHeight: 21 },
    exampleBack: { fontSize: 13, color: C.highlight, marginTop: 2 },
    enrichRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    definitionText: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 20 },
  });
}
