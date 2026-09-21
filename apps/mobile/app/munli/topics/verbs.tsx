import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { buildParadigm, conjugationSpec, subjectKey, t } from '@amgi/core';
import type { ConjugationSubject } from '@amgi/core';
import { useUser } from '../../../src/context/UserContext';
import { useTheme } from '../../../src/context/ThemeContext';
import { useConjugation } from '../../../src/context/ConjugationContext';
import type { Palette } from '../../../src/theme';

/**
 * Verbs: what is practised, and what the forms actually are.
 *
 * ⚠️ **Two jobs on one screen, deliberately.** It was only an enrolment
 * checklist, and the user's call is that it should also be somewhere to *look a
 * form up* — so every group carries chips for its verbs, and tapping one opens
 * that verb's whole paradigm. Persons down, tenses across: the shape a learner
 * reads a conjugation table in.
 *
 * ⚠️ **The reference shows every tense, including ones that are not enrolled.**
 * Enrolment bounds what is practised and has no business bounding what can be
 * read — seeing what the imparfait looks like is how somebody decides to add it.
 */
export default function VerbsTopicScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { enrolment, setEnrolment } = useConjugation();
  const router = useRouter();
  const spec = conjugationSpec(studyLanguage);
  /** Which verb's table is open, by `${subjectKey}:${vehicle}`. One at a time. */
  const [openVerb, setOpenVerb] = useState<string | null>(null);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityRole="button"
                        accessibilityLabel={t(interfaceLanguage, 'practiceBack')}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title}>{t(interfaceLanguage, 'topicVerbs')}</Text>
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

  /**
   * ⚠️ The last one cannot be removed. An empty practice set reads as broken
   * rather than as a choice, and `normalizeEnrolment` would silently refill it —
   * worse than refusing the tap.
   */
  const toggle = (list: string[], id: string, onNext: (next: string[]) => void) => {
    const on = list.includes(id);
    if (on && list.length === 1) return;
    onNext(on ? list.filter(x => x !== id) : [...list, id]);
  };

  /** Persons down, tenses across — the whole paradigm at a glance. */
  const paradigm = (subject: ConjugationSubject, vehicle: string) => {
    const tenses = buildParadigm(spec, subject, vehicle);
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tableScroll}>
        <View>
          <View style={s.tableRow}>
            <Text style={[s.cell, s.personCell, s.headCell]} />
            {tenses.map(tense => (
              <Text key={tense.tenseId} style={[s.cell, s.headCell]} numberOfLines={1}>{tense.label}</Text>
            ))}
          </View>
          {spec.persons.map(person => (
            <View key={person.id} style={s.tableRow}>
              <Text style={[s.cell, s.personCell]} numberOfLines={1}>{person.label}</Text>
              {tenses.map(tense => (
                <Text key={tense.tenseId} style={s.cell} numberOfLines={1}>{tense.forms[person.id]}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const subjectBlock = (subject: ConjugationSubject) => {
    const key = subjectKey(subject);
    const on = enrolment.subjects.includes(key);
    const vehicles = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    return (
      <View key={key} style={s.block}>
        <TouchableOpacity
          style={s.blockHead}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: on }}
          onPress={() => toggle(enrolment.subjects, key, next => setEnrolment({ ...enrolment, subjects: next }))}
        >
          <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? C.highlight : C.muted} />
          <Text style={s.blockLabel}>
            {subject.kind === 'group' ? subject.label : subject.infinitive}
          </Text>
        </TouchableOpacity>

        {/* The reference half: a chip per verb, and the table under whichever
            one is open. Tapping the open chip closes it. */}
        <View style={s.chips}>
          {vehicles.map(vehicle => {
            const id = `${key}:${vehicle}`;
            const open = openVerb === id;
            return (
              <TouchableOpacity
                key={vehicle}
                style={[s.chip, open && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenVerb(open ? null : id)}
              >
                <Text style={[s.chipText, open && s.chipTextOn]}>{vehicle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {vehicles.map(vehicle =>
          openVerb === `${key}:${vehicle}` ? (
            <View key={`${vehicle}-table`}>{paradigm(subject, vehicle)}</View>
          ) : null
        )}
      </View>
    );
  };

  const groups = spec.subjects.filter(subject => subject.kind === 'group');
  const irregulars = spec.subjects.filter(subject => subject.kind === 'verb');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.intro}>{t(interfaceLanguage, 'verbsIntro')}</Text>

        <Text style={s.section}>{t(interfaceLanguage, 'verbsTenses')}</Text>
        {spec.tenses.map(tense => {
          const on = enrolment.tenses.includes(tense.id);
          return (
            <TouchableOpacity
              key={tense.id}
              style={s.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(enrolment.tenses, tense.id, next => setEnrolment({ ...enrolment, tenses: next }))}
            >
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? C.highlight : C.muted} />
              <Text style={s.rowLabel}>{tense.label}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.section}>{t(interfaceLanguage, 'verbsGroups')}</Text>
        <Text style={s.hint}>{t(interfaceLanguage, 'verbsReference')}</Text>
        {groups.map(subjectBlock)}

        <Text style={s.section}>{t(interfaceLanguage, 'verbsIrregular')}</Text>
        {irregulars.length === 0
          ? <Text style={s.empty}>{t(interfaceLanguage, 'verbsIrregularEmpty')}</Text>
          : irregulars.map(subjectBlock)}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
    title: { color: C.text, fontSize: 22, fontWeight: '700' },
    content: { padding: 16, paddingTop: 8, paddingBottom: 48 },
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
    section: {
      color: C.muted, fontSize: 11, textTransform: 'uppercase',
      letterSpacing: 1.5, marginTop: 24, marginBottom: 6,
    },
    hint: { color: C.muted, fontSize: 12, opacity: 0.8, marginBottom: 10 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    rowLabel: { flex: 1, color: C.text, fontSize: 15 },
    block: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12, marginBottom: 4 },
    blockHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    blockLabel: { flex: 1, color: C.text, fontSize: 15, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.muted, fontSize: 12 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
    tableScroll: { marginTop: 12 },
    tableRow: { flexDirection: 'row' },
    cell: {
      color: C.text, fontSize: 13, paddingVertical: 6, paddingHorizontal: 10,
      minWidth: 104, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    personCell: { color: C.muted, minWidth: 72 },
    headCell: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
    empty: { color: C.muted, fontSize: 12, paddingVertical: 10 },
  });
}
