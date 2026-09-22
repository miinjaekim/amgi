import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { conjugationSpec, daysUntil, findSubject, listPracticeTables, t } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import ParadigmTable from '../../src/components/ParadigmTable';
import type { Palette } from '../../src/theme';

/**
 * What you are learning — Munli's answer to Amgi's Cards tab.
 *
 * ⚠️ **Three surfaces, three questions, and keeping them apart is the point.**
 * Topics is the catalogue you add from (Packs). Progress is the totals. This is
 * the inventory: every table in the practice set, one row each, with how it is
 * going. Amgi has exactly this split and it is why none of its three surfaces
 * has to be a dashboard.
 *
 * ⚠️ **It lists what is *not* due as well.** `dueRounds` answers "what should I
 * do now" and a session is built from it; an inventory that hid everything you
 * had already learned would be a strange inventory. Due-first ordering puts what
 * needs attention at the top without dropping the rest.
 *
 * ⚠️ **A row's count is in boxes**, because a box is what carries a schedule:
 * `-er · présent` is six facts, and "3 due" is the honest thing to say about
 * it.
 *
 * Tapping a row opens the table — the same `ParadigmTable` the Topics detail
 * uses, narrowed to that row's tense, so a row about `-er · imparfait` shows the
 * imparfait rather than everything.
 */
export default function TablesScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { progress, enrolment } = useConjugation();
  const spec = conjugationSpec(studyLanguage);
  const [open, setOpen] = useState<string | null>(null);

  const items = useMemo(
    () => (spec && enrolment ? listPracticeTables(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t(interfaceLanguage, 'tablesTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {!spec ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
        ) : items.length === 0 ? (
          <Text style={s.empty}>{t(interfaceLanguage, 'tablesEmpty')}</Text>
        ) : (
          <>
            <Text style={s.intro}>{t(interfaceLanguage, 'tablesIntro')}</Text>
            {items.map(item => {
              const subject = findSubject(spec, `${item.table.subjectKind}:${item.table.subjectId}`);
              const isOpen = open === item.itemId;
              return (
                <View key={item.itemId} style={s.row}>
                  <TouchableOpacity
                    style={s.rowHead}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => setOpen(isOpen ? null : item.itemId)}
                  >
                    <View style={s.rowText}>
                      <Text style={s.rowLabel}>
                        {item.table.subjectLabel} · {item.table.tenseLabel}
                      </Text>
                      {item.weakBoxes.length > 0 && (
                        <Text style={s.rowSub} numberOfLines={1}>
                          {t(interfaceLanguage, 'tablesMissed', {
                            list: item.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
                          })}
                        </Text>
                      )}
                    </View>
                    {/* Three states, not two: never practised is not the same
                        as due, even though a session treats them alike. */}
                    <Text style={[s.state, item.due && s.stateDue]}>
                      {item.started === 0
                        ? t(interfaceLanguage, 'tablesNotStarted')
                        : item.due
                          ? t(interfaceLanguage, 'conjugationDue', { count: item.dueCount })
                          : t(interfaceLanguage, 'tablesDueIn', { days: daysUntil(item.dueAt!) })}
                    </Text>
                  </TouchableOpacity>
                  {isOpen && subject && (
                    <ParadigmTable
                      spec={spec}
                      subject={subject}
                      tenseIds={[item.table.tenseId]}
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
    row: { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8 },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowText: { flex: 1 },
    rowLabel: { color: C.text, fontSize: 15 },
    rowSub: { color: C.muted, fontSize: 11, marginTop: 3 },
    state: { color: C.muted, fontSize: 12 },
    stateDue: { color: C.highlight, fontWeight: '700' },
    empty: { color: C.muted, fontSize: 13, lineHeight: 19 },
  });
}
