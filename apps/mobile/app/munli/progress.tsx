import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { conjugationSpec, getStudyLanguageConfig, summarizeConjugation, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import ProgressHeader from '../../src/components/ProgressHeader';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../src/components/PageHeader';
import type { Palette } from '../../src/theme';

/**
 * Munli's Progress tab.
 *
 * ⚠️ **Same shell, different subject.** It renders the identical
 * `ProgressHeader` as Amgi's Progress tab — avatar, study language, mode
 * switcher, settings gear — because switching modes changes what is being
 * measured, not who you are or how you get to your settings. What differs is
 * everything below the header.
 *
 * **It measures conjugation and says so, rather than showing an empty chart for
 * writing.** Writing findings are not stored — deliberately, and the passage
 * never is — so there is nothing here to count. That is a real gap with an item
 * on the backlog, and naming it is better than a zero that looks like a bug.
 */
export default function MunliProgressScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  // ⚠️ The shared source, not a copy of its own. Holding one here is what made
  // a rating invisible on this tab until the app was restarted.
  const { progress, enrolment, loading } = useConjugation();
  const spec = conjugationSpec(studyLanguage);

  const summary = useMemo(
    () => (spec && enrolment ? summarizeConjugation(spec, enrolment, progress) : null),
    [spec, enrolment, progress],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ProgressHeader />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t(interfaceLanguage, 'munliProgressTitle')}</Text>

        {/* ⚠️ Waiting is not the same as having none: an absent snapshot
            falls back to the default practice set with everything due, which
            is a plausible enough picture to be believed. */}
        {loading || !summary ? (
          <Text style={s.note}>
            {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
          </Text>
        ) : (
          <>
            <View style={s.tiles}>
              <View style={s.tile}>
                <Text style={s.tileNumber}>{summary.practised}</Text>
                <Text style={s.tileLabel}>{t(interfaceLanguage, 'munliProgressPractised')}</Text>
              </View>
              <View style={s.tile}>
                <Text style={s.tileNumber}>{summary.due}</Text>
                <Text style={s.tileLabel}>{t(interfaceLanguage, 'munliProgressDue')}</Text>
              </View>
              <View style={s.tile}>
                <Text style={s.tileNumber}>{summary.total}</Text>
                <Text style={s.tileLabel}>{t(interfaceLanguage, 'munliProgressForms')}</Text>
              </View>
            </View>

            <Text style={s.section}>{t(interfaceLanguage, 'conjugationTenses')}</Text>
            {summary.byTense.map(tense => (
              <View key={tense.tenseId} style={s.row}>
                <Text style={s.rowLabel}>{tense.label}</Text>
                <Text style={s.rowValue}>{tense.practised} / {tense.total}</Text>
              </View>
            ))}

            {/* The tally no longer decides anything — a due box is asked
                because it is due — but it still says how badly, and how badly
                is what ranks this list. */}
            {summary.weakest.length > 0 && (
              <>
                <Text style={s.section}>{t(interfaceLanguage, 'munliProgressWeakest')}</Text>
                {summary.weakest.map(box => (
                  <View key={`${box.subjectLabel}-${box.tenseLabel}-${box.personLabel}`} style={s.row}>
                    <Text style={s.rowLabel} numberOfLines={1}>
                      {box.subjectLabel} · {box.personLabel} · {box.tenseLabel}
                    </Text>
                    <Text style={s.rowValue}>{box.form}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <Text style={s.footnote}>{t(interfaceLanguage, 'munliProgressWritingNote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    content: { padding: SCREEN_GUTTER, paddingTop: 0, paddingBottom: tabBarHeight },
    // ⚠️ Not `PageHeader`: `ProgressHeader` is already above this, and two
    // headers on one screen is one too many. The constants keep the title in
    // step anyway — the arrangement `cards.tsx` has.
    title: { color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700', marginBottom: 16 },
    note: { color: C.muted, fontSize: 13, marginBottom: 16 },
    tiles: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    tile: {
      flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    },
    tileNumber: { color: C.highlight, fontSize: 24, fontWeight: '700' },
    tileLabel: { color: C.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
    section: {
      color: C.muted, fontSize: 11, textTransform: 'uppercase',
      letterSpacing: 1.5, marginTop: 8, marginBottom: 8,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    rowLabel: { flex: 1, color: C.text, fontSize: 14 },
    rowValue: { color: C.muted, fontSize: 13 },
    footnote: { color: C.muted, fontSize: 12, opacity: 0.8, marginTop: 24, lineHeight: 17 },
  });
}
