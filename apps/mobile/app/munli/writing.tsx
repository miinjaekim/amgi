import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import WritingReviewPanel from '../../src/components/WritingReviewPanel';
import type { Palette } from '../../src/theme';

/**
 * Munli's writing tool, as a tab.
 *
 * ⚠️ **It reserves the tab bar's height again** — the panel dropped that reserve
 * when Munli was a Stack with no bar, and Munli has one now. Without it the last
 * finding sits under the bar.
 */
export default function MunliWritingScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <Text style={s.title}>{t(interfaceLanguage, 'munliToolWriting')}</Text>
      </View>
      <WritingReviewPanel />
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
    title: { color: C.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
  });
}
