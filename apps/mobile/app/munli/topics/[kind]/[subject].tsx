import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { findSubject, getStudyLanguageConfig, isEnrolled, isUserVerb, setEnrolled, t } from '@amgi/core';
import { useUser } from '../../../../src/context/UserContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import { useConjugation } from '../../../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../../../src/components/FloatingTabBar';
import TenseCards from '../../../../src/components/TenseCards';
import FilterSheet from '../../../../src/components/FilterSheet';
import { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../../../src/components/PageHeader';
import type { Palette } from '../../../../src/theme';

/**
 * One pattern or one irregular verb: its table, and which tenses are saved.
 *
 * What a row on the Verbs topic opens — a pack's screen, for a verb, with a
 * card per tense where a pack has a section per subpack. Every tense the
 * subject has is shown, saved or not, because reading a form is not bounded by
 * practising it; the Save on a card is what commits.
 *
 * ⚠️ **One save control per tense, on its card.** Enrolment is per
 * subject-and-tense pair, so a single Save could only say "all" or "not all",
 * and two saved out of three would read as nothing saved.
 */
export default function VerbSubjectScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { spec, enrolment, setEnrolment, loading } = useConjugation();
  const router = useRouter();
  const { subject: param } = useLocalSearchParams<{ subject: string }>();
  const [chosenVehicle, setChosenVehicle] = useState<string | null>(null);
  const [pickingVerb, setPickingVerb] = useState(false);

  const subject = spec && findSubject(spec, decodeURIComponent(param ?? ''));
  const header = (
    <View style={s.header}>
      {/* Reached from Amgi too, where there is nothing behind it in this
          stack to go back to, so the chevron falls back to the list. */}
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/munli/topics/verbs' as never))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t(interfaceLanguage, 'practiceBack')}
      >
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title} numberOfLines={1}>
        {subject ? (subject.kind === 'group' ? subject.label : subject.infinitive) : t(interfaceLanguage, 'topicVerbs')}
      </Text>
    </View>
  );

  // ⚠️ Nothing paints before the snapshot lands. This screen writes, and
  // `setEnrolled` on an enrolment that has not arrived would save the default
  // set plus one change over the learner's real one. A verb the learner added
  // is also not in the spec until then, so "not found" would be premature.
  if (loading || !spec || !enrolment || !subject) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
        </Text>
      </SafeAreaView>
    );
  }

  const vehicle = subject.kind === 'group' ? chosenVehicle ?? subject.vehicles[0] : subject.infinitive;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        {/* Which verb the pattern is shown through. The learner's own are
            marked, since choosing one puts unverified forms in the table. */}
        {subject.kind === 'group' && subject.vehicles.length > 1 && (
          <TouchableOpacity
            style={s.verbBtn}
            onPress={() => setPickingVerb(true)}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'verbsFilterVerb')}
            accessibilityValue={{ text: vehicle }}
          >
            <Text style={s.verbBtnLabel}>{t(interfaceLanguage, 'verbsFilterVerb')}</Text>
            <Text style={s.verbBtnText} numberOfLines={1}>{vehicle}</Text>
            <Text style={s.verbBtnLabel}>▾</Text>
          </TouchableOpacity>
        )}

        <TenseCards
          spec={spec}
          subject={subject}
          vehicle={vehicle}
          notes
          isSaved={tenseId => isEnrolled(enrolment, subject, tenseId)}
          onToggleSave={(tenseId, save) => setEnrolment(setEnrolled(enrolment, subject, [tenseId], save))}
        />
      </ScrollView>

      {pickingVerb && subject.kind === 'group' && (
        <FilterSheet
          interfaceLanguage={interfaceLanguage}
          onClose={() => setPickingVerb(false)}
          groups={[{
            title: t(interfaceLanguage, 'verbsFilterVerb'),
            options: subject.vehicles.map(verb => ({
              key: verb,
              label: isUserVerb(spec, verb) ? `${verb} · ${t(interfaceLanguage, 'verbUnverifiedTag')}` : verb,
            })),
            // A plain string, so the sheet renders it single-select.
            selected: vehicle,
            onSelect: verb => { setChosenVehicle(verb); setPickingVerb(false); },
          }]}
        />
      )}
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
    title: { flex: 1, color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700' },
    content: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: tabBarHeight },
    verbBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    verbBtnLabel: { color: C.muted, fontSize: 12 },
    verbBtnText: { color: C.text, fontSize: 13 },
    empty: { color: C.muted, fontSize: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 },
  });
}
