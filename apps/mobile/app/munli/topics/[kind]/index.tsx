import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getStudyLanguageConfig, listVerbRows, t } from '@amgi/core';
import type { VerbRow } from '@amgi/core';
import { useUser } from '../../../../src/context/UserContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import { useConjugation } from '../../../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../../../src/components/FloatingTabBar';
import AddVerbField from '../../../../src/components/AddVerbField';
import { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../../../src/components/PageHeader';
import StudyLanguageChip from '../../../../src/components/StudyLanguageChip';
import type { Palette } from '../../../../src/theme';

/**
 * The Verbs topic: a row per pattern and per irregular verb.
 *
 * ⚠️ **The Packs list, for verbs** — the user's call, 2026-10-04. This screen
 * used to open on every table of every group with two filters above them,
 * which was a lot to land on and made a learner operate a filter before
 * seeing anything they chose. A row says what the thing is and how much of it
 * is saved; its table, and saving, are one tap in.
 *
 * Regular and irregular are two headed groups on one list rather than two
 * screens: the patterns are five rows and do not grow, so the verbs under them
 * are never far down.
 *
 * The route segment is the topic's id and nothing reads it. Verbs is the only
 * topic that has a screen.
 */
export default function VerbsTopicScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { spec, enrolment, loading } = useConjugation();
  const router = useRouter();

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityRole="button"
                        accessibilityLabel={t(interfaceLanguage, 'practiceBack')}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title}>{t(interfaceLanguage, 'topicVerbs')}</Text>
      <StudyLanguageChip />
    </View>
  );

  // ⚠️ Nothing paints before the snapshot lands: an enrolment that has not
  // arrived normalises to the default set, and its counts would be false.
  if (loading || !spec || !enrolment) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
        </Text>
      </SafeAreaView>
    );
  }

  const rows = listVerbRows(spec, enrolment);
  const row = (item: VerbRow) => (
    <TouchableOpacity
      key={item.key}
      style={s.row}
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={() => router.push(`/munli/topics/verbs/${encodeURIComponent(item.key)}` as never)}
    >
      <View style={s.rowTitle}>
        <Text style={s.rowLabel}>
          {item.label}
          {item.userAdded && <Text style={s.rowTag}>  {t(interfaceLanguage, 'verbUnverifiedTag')}</Text>}
        </Text>
        <Text style={s.rowCount}>{t(interfaceLanguage, 'verbRowTenses', { saved: item.saved, total: item.total })}</Text>
      </View>
      <Text style={s.rowPreview} numberOfLines={1}>{item.preview}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(item.saved / Math.max(1, item.total)) * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
  const group = (kind: VerbRow['kind'], titleKey: 'topicRegularVerbs' | 'verbsIrregular') => {
    const items = rows.filter(item => item.kind === kind);
    if (items.length === 0) return null;
    return (
      <View style={s.group}>
        <Text style={s.groupTitle}>{t(interfaceLanguage, titleKey)}</Text>
        {items.map(row)}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={s.intro}>{t(interfaceLanguage, 'verbsIntro')}</Text>
        <AddVerbField />
        {group('group', 'topicRegularVerbs')}
        {group('verb', 'verbsIrregular')}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 4,
    },
    title: { color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700' },
    content: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: tabBarHeight },
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 14 },
    group: { marginTop: 18, gap: 10 },
    groupTitle: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
    row: { padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
    rowTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
    rowLabel: { color: C.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
    rowTag: { color: C.muted, fontSize: 11, fontWeight: '400' },
    rowCount: { color: C.muted, fontSize: 12 },
    rowPreview: { color: C.muted, fontSize: 13, marginTop: 4 },
    track: { height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 12, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: C.highlight },
    empty: { color: C.muted, fontSize: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 },
  });
}
