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
import { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../../src/components/PageHeader';
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
  const { enrolment, setEnrolment, loading } = useConjugation();
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
  /** Which filter dropdown is open — one per filter, never both at once. */
  const [openFilter, setOpenFilter] = useState<'tenses' | 'groups' | null>(null);
  /** Which section's verb picker is open, by subject key. */
  const [verbPickerFor, setVerbPickerFor] = useState<string | null>(null);

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

  /**
   * ⚠️ **Nothing here may paint before the snapshot lands.**
   *
   * `users/{uid}` is subscribed to, not fetched, so `conjugation` is
   * `undefined` until the first snapshot, and `normalizeEnrolment` falls back
   * to the *default* practice set rather than to nothing.
   *
   * ⚠️ **This page writes, which makes it the worst place to render early.**
   * `setEnrolled` takes the enrolment it is handed, so a save pill tapped
   * during the window would write *default plus that change* over the real
   * saved set. That is data loss, from a control that looked ready.
   *
   * The window is one round trip, and it was invisible until the 2026-09-22
   * launch work began painting before the server answered. It was always here.
   */
  if (loading || !spec || !enrolment) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header}
        <Text style={s.empty}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'conjugationUnavailable')}
        </Text>
      </SafeAreaView>
    );
  }

  const section = (subject: ConjugationSubject) => {
    const key = `${subject.kind}:${subject.id}`;
    const vehicleList = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    const vehicle = vehicles[key] ?? vehicleList[0];
    const shown = tenseIds.filter(id => subject.kind === 'group' || subject.forms[id]);

    return (
      <View key={key} style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>
            {subject.kind === 'group' ? subject.label : subject.infinitive}
          </Text>
          {/* Which verb the pattern is shown through. A dropdown rather than a
              chip row: one answer at a time, and the list grows with the group. */}
          {vehicleList.length > 1 && (
            <TouchableOpacity
              style={s.verbBtn}
              onPress={() => setVerbPickerFor(key)}
              accessibilityRole="button"
              accessibilityLabel={t(interfaceLanguage, 'verbsFilterVerb')}
              accessibilityValue={{ text: vehicle }}
            >
              <Text style={s.verbBtnText} numberOfLines={1}>{vehicle}</Text>
              <Text style={s.filterBtnCaret}>▾</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ⚠️ **One save control per tense, not one per group.** Enrolment is
            per subject-and-tense pair, and a single button could only ever say
            "all of these" or "not all of these" — so two tenses saved out of
            three read as nothing saved, which is the thing being fixed. A pill
            each states its own answer and toggles exactly its own pair. */}
        <View style={s.chips}>
          {shown.map(tenseId => {
            const tense = spec.tenses.find(x => x.id === tenseId);
            if (!tense) return null;
            const on = isEnrolled(enrolment, subject, tenseId);
            return (
              <TouchableOpacity
                key={tenseId}
                style={[s.savePill, on && s.savePillOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(interfaceLanguage, on ? 'verbsSaved' : 'verbsSave', { tense: tense.label })}
                onPress={() => setEnrolment(setEnrolled(enrolment, subject, [tenseId], !on))}
              >
                <Ionicons
                  name={on ? 'checkmark' : 'add'}
                  size={13}
                  color={on ? C.bg : C.muted}
                />
                <Text style={[s.savePillText, on && s.savePillTextOn]}>{tense.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} tenseIds={shown} />
      </View>
    );
  };

  const allSubjects = subjectsOfKind(spec, irregular ? 'verb' : 'group');
  const subjects = allSubjects.filter(
    subject => chosenGroups?.includes(subjectKey(subject)) ?? true,
  );

  /**
   * ⚠️ **One dropdown per filter, not two groups behind one button.** The Cards
   * sheet holds three groups together because they narrow *one* list in three
   * ways; these two are independent axes, and putting them behind a single
   * control meant opening something unlabelled to find out what it filtered.
   *
   * No counts. A count here would be the product of the two selections, which
   * says nothing a learner could act on — and `FilterSheet`'s own rule is that a
   * count belongs where it informs a choice.
   */
  const tenseFilter: FilterGroup = {
    title: t(interfaceLanguage, 'verbsFilterTenses'),
    options: spec.tenses.map(tense => ({ key: tense.id, label: tense.label })),
    selected: tenseIds,
    onSelect: key => setChosenTenses(
      tenseIds.includes(key) ? tenseIds.filter(id => id !== key) : [...tenseIds, key],
    ),
  };

  const groupFilter: FilterGroup = {
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
  };

  const tenseSummary = tenseIds.length > 0
    ? spec.tenses.filter(tense => tenseIds.includes(tense.id)).map(tense => tense.label).join(', ')
    : '—';
  const groupSummary = subjects.length === allSubjects.length
    ? t(interfaceLanguage, 'verbsFilterAllGroups')
    : t(interfaceLanguage, 'verbsFilterGroupCount', { count: subjects.length });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content} stickyHeaderIndices={[0]}>
        <View style={s.filterBar}>
          <TouchableOpacity
            style={s.filterBtn}
            onPress={() => setOpenFilter('tenses')}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'verbsFilterTenses')}
            accessibilityValue={{ text: tenseSummary }}
          >
            <Text style={s.filterBtnLabel}>{t(interfaceLanguage, 'verbsFilterTenses')}</Text>
            <Text style={s.filterBtnText} numberOfLines={1}>{tenseSummary}</Text>
            <Text style={s.filterBtnCaret}>▾</Text>
          </TouchableOpacity>
          {allSubjects.length > 1 && (
            <TouchableOpacity
              style={s.filterBtn}
              onPress={() => setOpenFilter('groups')}
              accessibilityRole="button"
              accessibilityLabel={t(interfaceLanguage, 'verbsFilterGroups')}
              accessibilityValue={{ text: groupSummary }}
            >
              <Text style={s.filterBtnLabel}>{t(interfaceLanguage, 'verbsFilterGroups')}</Text>
              <Text style={s.filterBtnText} numberOfLines={1}>{groupSummary}</Text>
              <Text style={s.filterBtnCaret}>▾</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.intro}>
          {t(interfaceLanguage, irregular ? 'irregularIntro' : 'verbsSaveHint')}
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

      {verbPickerFor && (() => {
        const subject = subjects.find(x => `${x.kind}:${x.id}` === verbPickerFor);
        if (!subject || subject.kind !== 'group') return null;
        return (
          <FilterSheet
            interfaceLanguage={interfaceLanguage}
            onClose={() => setVerbPickerFor(null)}
            groups={[{
              title: t(interfaceLanguage, 'verbsFilterVerb'),
              options: subject.vehicles.map(v => ({ key: v, label: v })),
              // A plain string, so the sheet renders it single-select.
              selected: vehicles[verbPickerFor] ?? subject.vehicles[0],
              onSelect: v => {
                setVehicles(prev => ({ ...prev, [verbPickerFor]: v }));
                setVerbPickerFor(null);
              },
            }]}
          />
        );
      })()}

      {openFilter && (
        <FilterSheet
          groups={[openFilter === 'tenses' ? tenseFilter : groupFilter]}
          interfaceLanguage={interfaceLanguage}
          onClose={() => setOpenFilter(null)}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    // ⚠️ `SCREEN_GUTTER` rather than a literal: this screen renders its own
    // header, and a title four pixels off the list under it is exactly the
    // drift the constant exists to stop.
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 4,
    },
    title: { color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700' },
    content: { paddingBottom: 48 },
    filterBar: {
      flexDirection: 'row', gap: 8, backgroundColor: C.bg,
      paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 10,
    },
    filterBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    filterBtnLabel: { color: C.muted, fontSize: 12 },
    filterBtnText: { flex: 1, color: C.text, fontSize: 13 },
    filterBtnCaret: { color: C.muted, fontSize: 12 },
    intro: { color: C.muted, fontSize: 12, paddingHorizontal: SCREEN_GUTTER, marginBottom: 18 },
    section: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    sectionLabel: { flex: 1, color: C.text, fontSize: 17, fontWeight: '700' },
    verbBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 6, maxWidth: 160,
    },
    verbBtnText: { color: C.text, fontSize: 13 },
    savePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 11, paddingVertical: 6, borderRadius: 15,
      borderWidth: 1, borderColor: C.highlight,
    },
    savePillOn: { backgroundColor: C.highlight },
    savePillText: { color: C.highlight, fontSize: 12, fontWeight: '700' },
    savePillTextOn: { color: C.bg },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.muted, fontSize: 12 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: 8 },
  });
}
