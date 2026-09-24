import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStudyLanguageConfig, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import AddLanguageSheet from './AddLanguageSheet';
import type { Palette } from '../theme';

/**
 * The languages you have added, with a check on the one in force.
 *
 * ⚠️ **Only added languages appear**, where this used to list all nine the app
 * supports. That change is what removes the confirmation dialog this component
 * used to carry: the warning existed because picking the language Amgi was
 * speaking to you in would relocate your *native* language and re-language the
 * whole interface. Neither half of that can happen now — the interface language
 * is its own setting, and a deck's explanation language is chosen when the deck
 * is added. `resolveNativeLanguage` is gone from the codebase entirely.
 *
 * Each row names the pair, because that is what a deck is: the language, and
 * the language it is explained in.
 *
 * Mirrors web's `StudyLanguageList` and exists for the same reason: the
 * settings screen and the quick switcher on Progress both offer this choice,
 * and a switch that behaves differently depending on where it was made is a
 * switch nobody trusts.
 */
export default function StudyLanguageList({ onSelect }: { onSelect?: () => void }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, languages, studyLanguage, setStudyLanguage } = useUser();
  const [addOpen, setAddOpen] = useState(false);

  const nativeLabel = (native: string) =>
    t(interfaceLanguage, native === 'Korean' ? 'labelKorean' : 'labelEnglish');

  return (
    <View>
      {languages.map(pair => {
        const active = studyLanguage === pair.study;
        return (
          <TouchableOpacity
            key={pair.study}
            style={s.row}
            onPress={() => { void setStudyLanguage(pair.study); onSelect?.(); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <View style={s.rowMain}>
              <Text style={[s.label, active && s.labelActive]} numberOfLines={1}>
                {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
              </Text>
              {/* The half that used to be invisible. Without it two decks read
                  as the same choice made twice. */}
              <Text style={s.native} numberOfLines={1}>
                {t(interfaceLanguage, 'languagePairSummary', { native: nativeLabel(pair.native) })}
              </Text>
            </View>
            {active && <Ionicons name="checkmark" size={18} color={C.highlight} />}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[s.row, s.addRow]}
        onPress={() => setAddOpen(true)}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={C.muted} />
        <Text style={s.addLabel}>{t(interfaceLanguage, 'addLanguage')}</Text>
      </TouchableOpacity>

      {addOpen && (
        <AddLanguageSheet
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); onSelect?.(); }}
        />
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, paddingVertical: 13, paddingHorizontal: 20,
    },
    rowMain: { flex: 1 },
    label: { fontSize: 15, color: C.text },
    labelActive: { color: C.highlight, fontWeight: '700' },
    native: { fontSize: 12, color: C.muted, marginTop: 1 },
    addRow: { justifyContent: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    addLabel: { fontSize: 15, color: C.muted },
  });
}
