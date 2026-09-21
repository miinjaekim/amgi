import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { conjugationSpec, enrolledTenses, isEnrolled, setEnrolled, subjectsOfKind, subjectKey, t } from '@amgi/core';
import type { ConjugationSubject } from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useConjugation } from '../../../src/context/ConjugationContext';
import ParadigmTable from '../../../src/components/ParadigmTable';
import FilterSheet, { type FilterGroup } from '../../../src/components/FilterSheet';
import type { Palette } from '../../../src/theme';

/**
 * One verb topic — regular or irregular. Read any table, save what you want to
 * practise.
 *
 * ⚠️ **Two topics through one screen, keyed on `kind`.** They differ in what
 * they list, not in how they work: both are subjects with tables, saved the same
 * way. Two files would have been two copies of the same Save semantics.
 *
 * ⚠️ **Content first, saving second — the decks page's shape, not a form.** It
 * was a list of checkboxes you had to fill in before the page became useful;
 * now it opens on real tables and Save is a secondary action on each section.
 *
 * ⚠️ **The tense chips are a *view*, and Save is what commits.** Selecting the
 * imparfait shows it without enrolling it, which is how somebody decides whether
 * to take it on. Conflating the two would mean deselecting a tense to stop
 * *looking* at it silently stopped you *practising* it.
 *
 * **One verb at a time, across tenses — never several verbs in one tense.** The
 * verbs inside a group conjugate identically, so a column per verb would be the
 * same pattern printed three times. The verb chips swap which verb the pattern
 * lands on, which is the thing worth seeing.
 */
export default function VerbTopicScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { enrolment, setEnrolment } = useConjugation();
  const router = useRouter();
  const spec = conjugationSpec(studyLanguage);
  // Anything unrecognised reads as regular rather than erroring: the cost of
  // being wrong is landing on the topic that has content in it.
  const { kind: param } = useLocalSearchParams<{ kind: string }>();
  const irregular = param === 'irregular';

  /**
   * Which tenses the tables show. `null` means "has not chosen", which reads as
   * the tenses already saved — so the page opens on what is actually being
   * practised, and adding one is: pick it in the filter, look at it, Save.
   */
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  /** Which verb each group is being shown through, by subject key. */
  const [vehicles, setVehicles] = useState<Record<string, string>>({});
  /**
   * Which groups are shown. `null` means "has not narrowed", i.e. all of them —
   * distinct from the empty array, which is the real state of having deselected
   * everything and is what the empty message speaks to.
   */
  const [chosenGroups, setChosenGroups] = useState<string[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tenseIds = useMemo(() => {
    if (chosenTenses) return chosenTenses;
    if (!spec || !enrolment) return [];
    const saved = enrolledTenses(spec, enrolment).map(tense => tense.id);
    return saved.length > 0 ? saved : [spec.tenses[0].id];
  }, [chosenTenses, spec, enrolment]);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityRole="button"
                        accessibilityLabel={t(interfaceLanguage, 'practiceBack')}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title}>
        {t(interfaceLanguage, irregular ? 'verbsIrregular' : 'topicRegularVerbs')}
      </Text>
    </View>
  );

  if (!spec || !enrolment) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
      </SafeAreaView>
    );
  }

  const section = (subject: ConjugationSubject) => {
    const key = `${subject.kind}:${subject.id}`;
    const vehicleList = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    const vehicle = vehicles[key] ?? vehicleList[0];
    const shown = tenseIds.filter(id => subject.kind === 'group' || subject.forms[id]);
    const savedCount = shown.filter(id => isEnrolled(enrolment, subject, id)).length;
    const allSaved = shown.length > 0 && savedCount === shown.length;

    return (
      <View key={key} style={s.section}>
        <View style={s.sectionHead}>
          <View style={s.sectionText}>
            <Text style={s.sectionLabel}>
              {subject.kind === 'group' ? subject.label : subject.infinitive}
            </Text>
            <Text style={s.sectionSub}>
              {t(interfaceLanguage, 'verbsSavedCount', { saved: savedCount, total: shown.length })}
            </Text>
          </View>
          {/* Saves whatever tenses are being looked at — the decks pattern of
              committing what is in front of you. */}
          <TouchableOpacity
            style={[s.save, allSaved && s.saveOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: allSaved }}
            onPress={() => setEnrolment(setEnrolled(enrolment, subject, shown, !allSaved))}
          >
            <Text style={[s.saveText, allSaved && s.saveTextOn]}>
              {t(interfaceLanguage, allSaved ? 'verbsSaved' : 'verbsSave')}
            </Text>
          </TouchableOpacity>
        </View>

        {vehicleList.length > 1 && (
          <View style={s.chips}>
            {vehicleList.map(candidate => {
              const on = candidate === vehicle;
              return (
                <TouchableOpacity
                  key={candidate}
                  style={[s.chip, on && s.chipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setVehicles(prev => ({ ...prev, [key]: candidate }))}
                >
                  <Text style={[s.chipText, on && s.chipTextOn]}>{candidate}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} tenseIds={shown} />
      </View>
    );
  };

  const allSubjects = subjectsOfKind(spec, irregular ? 'verb' : 'group');
  const subjects = allSubjects.filter(
    subject => chosenGroups?.includes(subjectKey(subject)) ?? true,
  );

  /**
   * Two multi-selects behind one button — the Cards filter idiom, for the same
   * reason it exists there: inline chips are the better control right up until
   * there are two rows of them, and a page whose first screen is all chrome is
   * a page you scroll past to reach anything.
   *
   * No counts. A count here would be the product of the two selections, which
   * says nothing a learner could act on.
   */
  const filterGroups: FilterGroup[] = [
    {
      title: t(interfaceLanguage, 'verbsFilterTenses'),
      options: spec.tenses.map(tense => ({ key: tense.id, label: tense.label })),
      selected: tenseIds,
      onSelect: key => setChosenTenses(
        tenseIds.includes(key) ? tenseIds.filter(id => id !== key) : [...tenseIds, key],
      ),
    },
    ...(allSubjects.length > 1 ? [{
      title: t(interfaceLanguage, 'verbsFilterGroups'),
      options: allSubjects.map(subject => ({
        key: subjectKey(subject),
        label: subject.kind === 'group' ? subject.label : subject.infinitive,
      })),
      selected: subjects.map(subjectKey),
      onSelect: (key: string) => {
        const shownKeys = subjects.map(subjectKey);
        setChosenGroups(
          shownKeys.includes(key) ? shownKeys.filter(k => k !== key) : [...shownKeys, key],
        );
      },
    }] : []),
  ];

  /** What is on, stated rather than left to be spotted among what is available. */
  const filterSummary = [
    tenseIds.length > 0
      ? spec.tenses.filter(tense => tenseIds.includes(tense.id)).map(tense => tense.label).join(', ')
      : t(interfaceLanguage, 'conjugationPickTense'),
    allSubjects.length > 1
      ? (subjects.length === allSubjects.length
          ? t(interfaceLanguage, 'verbsFilterAllGroups')
          : t(interfaceLanguage, 'verbsFilterGroupCount', { count: subjects.length }))
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content} stickyHeaderIndices={[0]}>
        <View style={s.filterBar}>
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'cardsFilterButtonLabel')}
            accessibilityValue={{ text: filterSummary }}
          >
            <Text style={s.filterBtnText} numberOfLines={1}>{filterSummary}</Text>
            <Text style={s.filterBtnCaret}>▾</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.intro}>
          {t(interfaceLanguage, irregular ? 'irregularIntro' : 'verbsReference')}
        </Text>

        {/* Three different empties, and they say different things: a topic with
            no content yet, a filter that excludes everything, and one that has
            no tense to put in the columns. */}
        {allSubjects.length === 0
          ? <Text style={s.empty}>{t(interfaceLanguage, 'verbsIrregularEmpty')}</Text>
          : tenseIds.length === 0 || subjects.length === 0
            ? <Text style={s.empty}>{t(interfaceLanguage, 'verbsFilterNone')}</Text>
            : subjects.map(section)}
      </ScrollView>

      {filtersOpen && (
        <FilterSheet
          groups={filterGroups}
          interfaceLanguage={interfaceLanguage}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
    title: { color: C.text, fontSize: 22, fontWeight: '700' },
    content: { paddingBottom: 48 },
    filterBar: { backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
    filterBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    filterBtnText: { flex: 1, color: C.text, fontSize: 13 },
    filterBtnCaret: { color: C.muted, fontSize: 12 },
    intro: { color: C.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 18 },
    section: { paddingHorizontal: 16, paddingBottom: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    sectionText: { flex: 1 },
    sectionLabel: { color: C.text, fontSize: 17, fontWeight: '700' },
    sectionSub: { color: C.muted, fontSize: 11, marginTop: 2 },
    save: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: C.highlight },
    saveOn: { backgroundColor: C.highlight },
    saveText: { color: C.highlight, fontSize: 13, fontWeight: '700' },
    saveTextOn: { color: C.bg },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.muted, fontSize: 12 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  });
}
