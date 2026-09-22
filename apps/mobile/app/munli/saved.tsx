import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { conjugationSpec, daysUntil, listSavedSubjects, setEnrolled, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import ParadigmTable from '../../src/components/ParadigmTable';
import type { Palette } from '../../src/theme';

/**
 * Saved — what you have taken on, and where you take it back out.
 *
 * ⚠️ **Three surfaces, three questions, and keeping them apart is the point.**
 * Topics is the catalogue you add from (Packs). Progress is the totals. This is
 * the set you curate: one row per pattern, carrying the tenses saved under it.
 * Amgi has exactly this split and it is why none of its three has to be a
 * dashboard.
 *
 * ⚠️ **It manages something, which is the half it did not have.** It was a flat
 * list of `-er · présent` rows that only read; saving and unsaving lived on
 * Topics. A pill here is the **same control and the same semantics** as Topics'
 * save pill — `setEnrolled` on one subject-and-tense pair — rather than a
 * second way to say the same thing.
 *
 * ⚠️ **Grained by pattern, where Practice is grained by tense.** One enrolment,
 * two questions: "what have I taken on" against "what should I sit down to".
 */
export default function SavedScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { progress, enrolment, setEnrolment } = useConjugation();
  const spec = conjugationSpec(studyLanguage);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () => (spec && enrolment ? listSavedSubjects(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t(interfaceLanguage, 'savedTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {!spec || !enrolment ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
        ) : rows.length === 0 ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'savedEmpty')}</Text>
        ) : (
          <>
            <Text style={s.intro}>{t(interfaceLanguage, 'savedIntro')}</Text>
            {rows.map(row => {
              const isOpen = open === row.key;
              return (
                <View key={row.key} style={s.row}>
                  <TouchableOpacity
                    style={s.rowHead}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => setOpen(isOpen ? null : row.key)}
                  >
                    <View style={s.rowText}>
                      <Text style={s.rowLabel}>{row.label}</Text>
                      {row.weakBoxes.length > 0 && (
                        <Text style={s.rowSub} numberOfLines={1}>
                          {t(interfaceLanguage, 'savedMissed', {
                            list: row.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
                          })}
                        </Text>
                      )}
                    </View>
                    {/* Three states, not two: never practised is not the same
                        as due, even though a session treats them alike. */}
                    <Text style={[s.state, row.due > 0 && s.stateDue]}>
                      {row.started === 0
                        ? t(interfaceLanguage, 'savedNotStarted')
                        : row.due > 0
                          ? t(interfaceLanguage, 'conjugationDue', { count: row.due })
                          : t(interfaceLanguage, 'savedDueIn', { days: daysUntil(row.dueAt!) })}
                    </Text>
                  </TouchableOpacity>

                  {/* ⚠️ A pill per saved tense, carrying its own due count and
                      toggling exactly its own pair — Topics' rule, for the same
                      reason: a control that cannot state its own answer makes
                      two saved out of three read as nothing saved. */}
                  <View style={s.pills}>
                    {row.tenses.map(tense => (
                      <TouchableOpacity
                        key={tense.tenseId}
                        style={s.pill}
                        accessibilityRole="button"
                        accessibilityLabel={t(interfaceLanguage, 'savedRemove', { tense: tense.label })}
                        onPress={() => setEnrolment(setEnrolled(enrolment, row.subject, [tense.tenseId], false))}
                      >
                        <Text style={s.pillText}>
                          ✓ {tense.label}{tense.due > 0 ? ` · ${tense.due}` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {isOpen && (
                    <ParadigmTable
                      spec={spec}
                      subject={row.subject}
                      tenseIds={row.tenses.map(tense => tense.tenseId)}
                    />
                  )}
                </View>
              );
            })}
          </>
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
    intro: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
    row: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowText: { flex: 1 },
    rowLabel: { color: C.text, fontSize: 15, fontWeight: '600' },
    rowSub: { color: C.muted, fontSize: 11, marginTop: 3 },
    state: { color: C.muted, fontSize: 12 },
    stateDue: { color: C.highlight, fontWeight: '700' },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: C.highlight, borderWidth: 1, borderColor: C.highlight,
    },
    pillText: { color: C.bg, fontSize: 12, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 13, lineHeight: 19 },
  });
}
