import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getMode, t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import ModeSwitcherSheet from '../../src/components/ModeSwitcherSheet';
import type { Palette } from '../../src/theme';

/**
 * Munli's home — its tools, one row each.
 *
 * ⚠️ **A list, not a tab bar.** Munli's nav grows with its tools and no faster;
 * with two of them a bar would be furniture, and a list also leaves the tool
 * screens their full height. The empty state below is still reachable and still
 * correct — it is what a mode with no tools yet renders, which is true again
 * the day a third mode is added.
 */
interface Tool {
  key: string;
  labelKey: TranslationKey;
  blurbKey: TranslationKey;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
}

const TOOLS: readonly Tool[] = [
  { key: 'writing', labelKey: 'munliToolWriting', blurbKey: 'munliToolWritingBlurb', icon: 'create-outline', href: '/munli/writing' },
];

export default function MunliHome() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const router = useRouter();
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

        {TOOLS.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{t(interfaceLanguage, 'munliNoTools')}</Text>
            <Text style={s.emptyBody}>{t(interfaceLanguage, 'munliNoToolsBody')}</Text>
          </View>
        ) : (
          TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.key}
              style={s.tool}
              activeOpacity={0.7}
              accessibilityRole="button"
              onPress={() => router.push(tool.href as never)}
            >
              <Ionicons name={tool.icon} size={26} color={C.highlight} />
              <View style={s.toolText}>
                <Text style={s.toolLabel}>{t(interfaceLanguage, tool.labelKey)}</Text>
                <Text style={s.toolBlurb}>{t(interfaceLanguage, tool.blurbKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </TouchableOpacity>
          ))
        )}
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
    tool: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 16, padding: 16, marginBottom: 10,
    },
    toolText: { flex: 1 },
    toolLabel: { color: C.text, fontFamily: 'monospace', fontSize: 16, fontWeight: '700' },
    toolBlurb: { color: C.muted, fontFamily: 'monospace', fontSize: 12, marginTop: 3 },
  });
}
