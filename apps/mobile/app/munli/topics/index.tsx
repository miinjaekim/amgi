import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { conjugationSpec, enrolledCountOfKind, t } from '@amgi/core';
import type { ConjugationSubject, TranslationKey } from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useConjugation } from '../../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../../src/components/FloatingTabBar';
import PageHeader, { SCREEN_GUTTER } from '../../../src/components/PageHeader';
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
  const { interfaceLanguage, studyLanguage } = useUser();
  const { enrolment } = useConjugation();
  const router = useRouter();
  const spec = conjugationSpec(studyLanguage);

  /**
   * ⚠️ **Two topics, not one with two halves.** A regular group is a rule that
   * one example demonstrates; an irregular verb is a fact no other verb tells
   * you anything about. Browsing them together meant one page whose halves
   * wanted different shapes — a handful of patterns against what will be a long
   * list of verbs.
   */
  const TOPICS: { kind: ConjugationSubject['kind']; route: string; labelKey: TranslationKey; icon: 'repeat-outline' | 'shuffle-outline' }[] = [
    { kind: 'group', route: '/munli/topics/regular', labelKey: 'topicRegularVerbs', icon: 'repeat-outline' },
    { kind: 'verb', route: '/munli/topics/irregular', labelKey: 'verbsIrregular', icon: 'shuffle-outline' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <PageHeader titleKey="verbsTitle" />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.intro}>{t(interfaceLanguage, 'topicsIntro')}</Text>

        {TOPICS.map(topic => {
          const saved = spec && enrolment ? enrolledCountOfKind(spec, enrolment, topic.kind) : 0;
          return (
            <TouchableOpacity
              key={topic.route}
              style={s.row}
              activeOpacity={0.7}
              accessibilityRole="button"
              onPress={() => router.push(topic.route as never)}
            >
              <Ionicons name={topic.icon} size={22} color={C.muted} />
              <View style={s.rowText}>
                <Text style={s.rowLabel}>{t(interfaceLanguage, topic.labelKey)}</Text>
                <Text style={s.rowSub}>
                  {!spec
                    ? t(interfaceLanguage, 'conjugationUnavailable')
                    : saved > 0
                      ? t(interfaceLanguage, 'topicVerbsSummary', { count: saved })
                      : t(interfaceLanguage, 'topicNothingSaved')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    content: { padding: SCREEN_GUTTER, paddingTop: 4, paddingBottom: tabBarHeight },
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16, marginBottom: 10,
    },
    rowText: { flex: 1 },
    rowLabel: { color: C.text, fontSize: 16, fontWeight: '600' },
    rowSub: { color: C.muted, fontSize: 12, marginTop: 3 },
  });
}
