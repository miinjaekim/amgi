import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { conjugationSpec, subjectKey, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import type { Palette } from '../../src/theme';

/**
 * The practice set — what conjugation practice draws from at all.
 *
 * ⚠️ **A different job from the setup screen, which is why it is a surface of
 * its own.** Setup chooses what to cover *this session* and resets; this chooses
 * what exists to be covered, and persists. That is the same split Amgi already
 * has between enrolling a pack and picking a collection to review.
 *
 * **Progression lives here.** A beginner practises the présent; adding the
 * imparfait is a decision the learner makes, on this screen. Nothing reads a
 * level off anything — `vision.md` allows per-level content and refuses the app
 * deciding what you are ready for, and this is the allowed half.
 */
export default function VerbsScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { enrolment, setEnrolment } = useConjugation();
  const spec = conjugationSpec(studyLanguage);

  if (!spec || !enrolment) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}><Text style={s.title}>{t(interfaceLanguage, 'verbsTitle')}</Text></View>
        <Text style={s.empty}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
      </SafeAreaView>
    );
  }

  const groups = spec.subjects.filter(subject => subject.kind === 'group');
  const irregulars = spec.subjects.filter(subject => subject.kind === 'verb');

  /**
   * ⚠️ The last one cannot be removed. An empty practice set is not a state
   * anyone wants — it reads as broken rather than as a choice — and
   * `normalizeEnrolment` would silently refill it, which is worse than refusing
   * the tap.
   */
  const toggle = (list: string[], id: string, onNext: (next: string[]) => void) => {
    const on = list.includes(id);
    if (on && list.length === 1) return;
    onNext(on ? list.filter(x => x !== id) : [...list, id]);
  };

  const check = (on: boolean) => (
    <Ionicons
      name={on ? 'checkbox' : 'square-outline'}
      size={22}
      color={on ? C.highlight : C.muted}
    />
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}><Text style={s.title}>{t(interfaceLanguage, 'verbsTitle')}</Text></View>
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
              {check(on)}
              <Text style={s.rowLabel}>{tense.label}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.section}>{t(interfaceLanguage, 'verbsGroups')}</Text>
        {groups.map(group => {
          const key = subjectKey(group);
          const on = enrolment.subjects.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={s.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(enrolment.subjects, key, next => setEnrolment({ ...enrolment, subjects: next }))}
            >
              {check(on)}
              <View style={s.rowText}>
                <Text style={s.rowLabel}>{group.kind === 'group' ? group.label : ''}</Text>
                {/* The verbs a group is practised through, named so the set is
                    not a black box — the learner is producing the ending, but
                    they still see which words it will arrive on. */}
                <Text style={s.rowSub} numberOfLines={1}>
                  {group.kind === 'group' ? group.vehicles.join(', ') : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={s.section}>{t(interfaceLanguage, 'verbsIrregular')}</Text>
        {irregulars.length === 0 ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'verbsIrregularEmpty')}</Text>
        ) : (
          irregulars.map(verb => {
            const key = subjectKey(verb);
            const on = enrolment.subjects.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={s.row}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(enrolment.subjects, key, next => setEnrolment({ ...enrolment, subjects: next }))}
              >
                {check(on)}
                <Text style={s.rowLabel}>{verb.kind === 'verb' ? verb.infinitive : ''}</Text>
              </TouchableOpacity>
            );
          })
        )}
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
    section: {
      color: C.muted, fontSize: 11, textTransform: 'uppercase',
      letterSpacing: 1.5, marginTop: 20, marginBottom: 6,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    rowText: { flex: 1 },
    rowLabel: { flex: 1, color: C.text, fontSize: 15 },
    rowSub: { color: C.muted, fontSize: 11, marginTop: 2 },
    empty: { color: C.muted, fontSize: 12, paddingVertical: 10 },
  });
}
