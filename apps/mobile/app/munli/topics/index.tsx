import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { t } from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useConjugation } from '../../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../../src/components/FloatingTabBar';
import type { Palette } from '../../../src/theme';

/**
 * The topics Munli practises — one row each.
 *
 * ⚠️ **A list with one row today, and that is the point.** The plan is one
 * grammar tool at a time with the grouping read off the collection later; this
 * is where that collection becomes visible. Prepositions or articles add a row,
 * and nothing about verbs has to move to make space.
 *
 * Each row's subtitle says what is enrolled, so the practice set is legible
 * without opening anything.
 */
export default function TopicsScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage } = useUser();
  const { enrolment } = useConjugation();
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t(interfaceLanguage, 'verbsTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.intro}>{t(interfaceLanguage, 'topicsIntro')}</Text>

        <TouchableOpacity
          style={s.row}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() => router.push('/munli/topics/verbs')}
        >
          <Ionicons name="repeat-outline" size={22} color={C.muted} />
          <View style={s.rowText}>
            <Text style={s.rowLabel}>{t(interfaceLanguage, 'topicVerbs')}</Text>
            <Text style={s.rowSub}>
              {enrolment
                ? t(interfaceLanguage, 'topicVerbsSummary', { count: enrolment.items.length })
                : t(interfaceLanguage, 'conjugationUnavailable')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    title: { color: C.text, fontSize: 22, fontWeight: '700' },
    content: { padding: 16, paddingTop: 8, paddingBottom: tabBarHeight },
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16,
    },
    rowText: { flex: 1 },
    rowLabel: { color: C.text, fontSize: 16, fontWeight: '600' },
    rowSub: { color: C.muted, fontSize: 12, marginTop: 3 },
  });
}
