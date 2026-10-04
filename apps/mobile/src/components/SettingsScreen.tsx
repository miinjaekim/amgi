import React, { useMemo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * The frame every settings screen sits in: a back arrow, a title, and a
 * scrolling body.
 *
 * Settings became a list of rows that each push a detail screen on 2026-10-04
 * — one long screen of ten sections was a wall to scroll, where a list is
 * something you skim. The list and its details share this so that going one
 * level in changes the title and the body and nothing else.
 *
 * ⚠️ **Every settings route carries `?mode=`**, not only the list. They all sit
 * outside every mode's tree, so the mode they were opened from travels in the
 * route — see `modeForTheme`. A detail screen pushed without it repaints to
 * Amgi's palette under a Munli user.
 */
export default function SettingsScreen({ titleKey, children }: { titleKey: TranslationKey; children: ReactNode }) {
  const { C, s } = useSettingsStyles();
  const { authLoading, interfaceLanguage } = useUser();

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerLabel}>{t(interfaceLanguage, titleKey)}</Text>
      </View>
      {authLoading ? (
        <View style={s.center}><ActivityIndicator color={C.highlight} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>{children}</ScrollView>
      )}
    </SafeAreaView>
  );
}

/** The palette and the styles the settings screens have in common. */
export function useSettingsStyles() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  return { C, s };
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    back: { color: C.highlight, fontSize: 22 },
    headerLabel: { color: C.text, fontSize: 17, fontWeight: '700' },

    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: C.muted,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
    },
    card: {
      backgroundColor: C.surface, borderRadius: 14, padding: 18,
      borderWidth: 1, borderColor: C.border, marginBottom: 24,
    },
    settingDescription: { fontSize: 14, color: C.muted, marginBottom: 14 },

    // Chips — app language, theme, pronunciation speed, export format.
    chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: 18, paddingVertical: 9,
      borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    },
    chipActive: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { fontSize: 15, color: C.text, fontWeight: '500' },
    chipTextActive: { color: C.bg, fontWeight: '700' },

    rowText: { fontSize: 15, color: C.text, fontWeight: '500' },
    rowDesc: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  });
}
