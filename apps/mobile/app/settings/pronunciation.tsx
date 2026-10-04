import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { usePronunciation } from '../../src/context/PronunciationContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import type { Palette } from '../../src/theme';

/**
 * Pronunciation speed, one row per kind of text: a word and a sentence want
 * different paces on every screen, which is why the split is by content rather
 * than by surface. See `PronunciationKind`.
 */
export default function PronunciationSettings() {
  const { C, s } = useSettingsStyles();
  const p = useMemo(() => makeStyles(C), [C]);
  const { speeds, setSpeed, options, kinds } = usePronunciation();
  const { interfaceLanguage } = useUser();

  return (
    <SettingsScreen titleKey="settingsPronunciation">
      <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsPronunciationSpeed')}</Text>
      <View style={s.card}>
        <Text style={s.settingDescription}>
          {t(interfaceLanguage, 'settingsPronunciationSpeedDesc')}
        </Text>
        {kinds.map(({ kind, labelKey }, i) => (
          <View key={kind} style={i > 0 && p.kindRow}>
            <Text style={p.kindLabel}>{t(interfaceLanguage, labelKey)}</Text>
            <View style={s.chipRow}>
              {options.map(({ value, labelKey: speedLabelKey }) => {
                const active = speeds[kind] === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setSpeed(kind, value)}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {t(interfaceLanguage, speedLabelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    kindLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
    kindRow: { marginTop: 16 },
  });
}
