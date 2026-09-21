import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import WritingReviewPanel from '../../src/components/WritingReviewPanel';
import type { Palette } from '../../src/theme';

/**
 * Munli's writing tool — a pushed screen with a back button, not a tab.
 *
 * Munli's nav is a home that lists its tools; a tab bar arrives when there are
 * enough tools to want one. A pushed screen is also what lets the panel use the
 * full height: there is no floating bar here to reserve space for.
 */
export default function MunliWritingScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const router = useRouter();

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.back}
          accessibilityRole="button"
          accessibilityLabel={t(interfaceLanguage, 'cancel')}
        >
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t(interfaceLanguage, 'munliToolWriting')}</Text>
      </View>
      <WritingReviewPanel />
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
    back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { color: C.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
  });
}
