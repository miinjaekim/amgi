import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMode, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import ModeSwitcherSheet from '../../src/components/ModeSwitcherSheet';
import type { Palette } from '../../src/theme';

/**
 * Munli's home — its list of tools, which is empty today.
 *
 * The mode ships before its first tool on purpose: the switcher is one build,
 * the tools are the next two. What this screen must not do is look broken while
 * that is true, so it names what is coming instead of rendering nothing.
 */
export default function MunliHome() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const munli = getMode('munli');

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.title}>{munli.name}</Text>
            <Text style={s.tagline}>{t(interfaceLanguage, 'munliTagline')}</Text>
          </View>
          {/* Munli has no tab bar to hold, so the switcher is an explicit
              control here — a tap, not a hidden gesture. */}
          <TouchableOpacity
            style={s.switchButton}
            onPress={() => setSwitcherOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'modeSwitchTitle')}
          >
            <Ionicons name="swap-horizontal" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={s.empty}>
          <Text style={s.emptyTitle}>{t(interfaceLanguage, 'munliNoTools')}</Text>
          <Text style={s.emptyBody}>{t(interfaceLanguage, 'munliNoToolsBody')}</Text>
        </View>
      </ScrollView>

      <ModeSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    // 20 matches every other screen's gutter — see the shared-constant item in
    // the backlog, which is about the fact that this number is copied.
    content: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 28 },
    headerText: { flex: 1 },
    title: { color: C.text, fontFamily: 'monospace', fontSize: 28, fontWeight: '700' },
    tagline: { color: C.muted, fontFamily: 'monospace', fontSize: 13, marginTop: 4 },
    switchButton: {
      width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    empty: {
      borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted, borderRadius: 16,
      padding: 28, alignItems: 'center',
    },
    emptyTitle: { color: C.text, fontFamily: 'monospace', fontSize: 14, textAlign: 'center' },
    emptyBody: { color: C.muted, fontFamily: 'monospace', fontSize: 12, textAlign: 'center', marginTop: 6 },
  });
}
