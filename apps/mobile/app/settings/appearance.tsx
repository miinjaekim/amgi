import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';

export default function AppearanceSettings() {
  const { s } = useSettingsStyles();
  // `themes` rather than a fixed list: the picker offers the themes of the mode
  // settings was opened from, which is what the `?mode=` in the route says.
  const { theme, setTheme, themes } = useTheme();
  const { interfaceLanguage } = useUser();

  return (
    <SettingsScreen titleKey="settingsAppearance">
      <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsTheme')}</Text>
      <View style={s.card}>
        <View style={s.chipRow}>
          {themes.map(({ value, labelKey }) => {
            const active = theme === value;
            return (
              <TouchableOpacity
                key={value}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setTheme(value)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {t(interfaceLanguage, labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SettingsScreen>
  );
}
