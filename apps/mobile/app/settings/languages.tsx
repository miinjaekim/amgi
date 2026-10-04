import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  HANJA_PARTITIONS, SUPPORTED_LANGUAGES, getStudyLanguageConfig, t,
  type HanjaPartition, type StudyLanguage,
} from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import StudyLanguageList from '../../src/components/StudyLanguageList';
import type { Palette } from '../../src/theme';

/** Each partition's two i18n keys, together so neither can be guessed apart. */
const PARTITION_KEYS: Record<HanjaPartition, { label: 'hanjaPartitionCharacter' | 'hanjaPartitionHun' | 'hanjaPartitionEum'; example: 'hanjaPartitionCharacterExample' | 'hanjaPartitionHunExample' | 'hanjaPartitionEumExample' }> = {
  character: { label: 'hanjaPartitionCharacter', example: 'hanjaPartitionCharacterExample' },
  hun: { label: 'hanjaPartitionHun', example: 'hanjaPartitionHunExample' },
  eum: { label: 'hanjaPartitionEum', example: 'hanjaPartitionEumExample' },
};

/**
 * Everything that is a language choice: what you study, the decks you keep,
 * what the app speaks to you in, and — on the Hanja deck — which part of the
 * card leads.
 */
export default function LanguagesSettings() {
  const { C, s } = useSettingsStyles();
  const l = useMemo(() => makeStyles(C), [C]);
  const {
    interfaceLanguage, languages, studyLanguage, hanjaPartition,
    setInterfaceLanguage, setHanjaPartition, removeLanguage,
  } = useUser();
  const [studyListOpen, setStudyListOpen] = useState(false);

  const nativeLabel = (native: string) =>
    t(interfaceLanguage, native === 'Korean' ? 'labelKorean' : 'labelEnglish');
  const current = languages.find(pair => pair.study === studyLanguage);
  const studyLanguageLabel = t(interfaceLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);

  /**
   * Removing a deck takes it off the switcher and leaves every card where it
   * is — which the dialog says, because "remove" next to a language is
   * otherwise easy to read as "erase everything I have learned in it".
   */
  const confirmRemove = (study: StudyLanguage) => {
    const name = t(interfaceLanguage, getStudyLanguageConfig(study).studyLabelKey);
    Alert.alert(
      t(interfaceLanguage, 'removeLanguageTitle', { study: name }),
      t(interfaceLanguage, 'removeLanguageBody'),
      [
        { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(interfaceLanguage, 'removeLanguage'),
          style: 'destructive',
          onPress: () => { void removeLanguage(study); },
        },
      ],
    );
  };

  return (
    <SettingsScreen titleKey="settingsLanguages">
      {/* Study language. A disclosure row rather than the chip grid the rows
          below use: the list now carries a second line per row — the language
          each deck is explained in — and a chip cannot hold two lines. */}
      <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsStudyLanguage')}</Text>
      <View style={s.card}>
        <Text style={s.settingDescription}>
          {t(interfaceLanguage, 'settingsStudyLanguageDesc')}
        </Text>
        <TouchableOpacity
          style={l.disclosure}
          onPress={() => setStudyListOpen(open => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: studyListOpen }}
        >
          <View style={l.disclosureMain}>
            <Text style={l.disclosureValue}>{studyLanguageLabel}</Text>
            {current && (
              <Text style={l.disclosureNative}>
                {t(interfaceLanguage, 'languagePairSummary', { native: nativeLabel(current.native) })}
              </Text>
            )}
          </View>
          <Ionicons
            name={studyListOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.muted}
          />
        </TouchableOpacity>
        {studyListOpen && (
          <View style={l.disclosureList}>
            <StudyLanguageList onSelect={() => setStudyListOpen(false)} />
          </View>
        )}
      </View>

      {/* Your languages — the management view, where a deck can be removed.
          Separate from the switcher above on purpose: switching is a thing
          you do daily and removing is a thing you do once, so a destructive
          control does not sit in the row you tap to change decks. Hidden
          while there is only one, where removing it is refused anyway. */}
      {languages.length > 1 && (
        <>
          <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsYourLanguages')}</Text>
          <View style={s.card}>
            <Text style={s.settingDescription}>
              {t(interfaceLanguage, 'settingsYourLanguagesDesc')}
            </Text>
            {languages.map(pair => (
              <View key={pair.study} style={l.pairRow}>
                <View style={l.pairMain}>
                  <Text style={l.pairName} numberOfLines={1}>
                    {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
                  </Text>
                  <Text style={l.pairNative} numberOfLines={1}>
                    {t(interfaceLanguage, 'languagePairSummary', { native: nativeLabel(pair.native) })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => confirmRemove(pair.study)}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={l.removeText}>{t(interfaceLanguage, 'removeLanguage')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* App language. Deliberately no longer called "native language": it
          does not decide what your cards are explained in any more — each
          deck carries that itself — so naming it for the app is what stops
          it reading as a second answer to the question above. */}
      <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsAppLanguage')}</Text>
      <View style={s.card}>
        <Text style={s.settingDescription}>
          {t(interfaceLanguage, 'settingsAppLanguageDesc')}
        </Text>
        <View style={s.chipRow}>
          {SUPPORTED_LANGUAGES.map(({ code, label }) => {
            // No fallback highlight for an unset language: showing English as
            // selected claimed a preference nothing had stored. First run now
            // answers this before settings is reachable, so an empty row here
            // means the value is genuinely absent.
            const active = interfaceLanguage === code;
            return (
              <TouchableOpacity
                key={code}
                style={[s.chip, active && s.chipActive]}
                onPress={() => { void setInterfaceLanguage(code); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* The hanja partition — which part of the card leads. A stacked list
          rather than the chip row above, because each option carries an
          example (水 → 물 수) that a chip cannot hold.

          Shown only on the deck it describes, and deliberately only here:
          put in the review session it would become a per-session toggle, and
          every switch inherits intervals earned answering a different
          question. Chosen once, like the study language above. */}
      {studyLanguage === 'Hanja' && (
        <>
          <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsHanjaPartition')}</Text>
          <View style={s.card}>
            <Text style={s.settingDescription}>
              {t(interfaceLanguage, 'settingsHanjaPartitionDesc')}
            </Text>
            {HANJA_PARTITIONS.map(partition => {
              const active = hanjaPartition === partition;
              return (
                <TouchableOpacity
                  key={partition}
                  style={[l.partitionRow, active && l.partitionRowActive]}
                  onPress={() => setHanjaPartition(partition)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[l.partitionLabel, active && l.partitionLabelActive]}>
                    {t(interfaceLanguage, PARTITION_KEYS[partition].label)}
                  </Text>
                  <Text style={[l.partitionDesc, active && l.partitionDescActive]}>
                    {t(interfaceLanguage, PARTITION_KEYS[partition].example)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // Disclosure (study language)
    disclosure: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, paddingHorizontal: 14, paddingVertical: 12,
      borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
    },
    disclosureMain: { flex: 1 },
    disclosureValue: { fontSize: 15, color: C.text, fontWeight: '500' },
    disclosureNative: { fontSize: 12, color: C.muted, marginTop: 1 },
    // Negative side margins so the list's own row padding lines up with the card
    // edge rather than sitting inset twice over.
    disclosureList: {
      marginTop: 10, marginHorizontal: -18, borderTopWidth: 1, borderTopColor: C.border,
      paddingTop: 6,
    },

    // Your languages — one row per pair, with the way to drop one.
    pairRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    },
    pairMain: { flex: 1 },
    pairName: { fontSize: 15, color: C.text, fontWeight: '500' },
    pairNative: { fontSize: 12, color: C.muted, marginTop: 1 },
    removeText: { fontSize: 13, color: C.error, fontWeight: '600' },

    // Hanja partition — a stacked list, because each row carries an example
    // under its name and a chip row cannot hold two lines.
    partitionRow: {
      paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8,
      borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    },
    partitionRowActive: { backgroundColor: C.highlight, borderColor: C.highlight },
    partitionLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
    partitionLabelActive: { color: C.bg, fontWeight: '700' },
    partitionDesc: { fontSize: 13, color: C.muted, marginTop: 2 },
    partitionDescActive: { color: C.bg, opacity: 0.8 },
  });
}
