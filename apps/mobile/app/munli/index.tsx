import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  boxItemId, buildConjugationQueue, buildTables, conjugationHints, conjugationSpec,
  countDueBoxes, countQuestions, hintedVerdict, isCorrectForm, listPracticeSections,
  rateBox, t,
} from '@amgi/core';
import type { ConjugationProgressMap, ConjugationRound } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { PAGE_TITLE_SIZE, SCREEN_GUTTER } from '../../src/components/PageHeader';
import type { Palette } from '../../src/theme';

/**
 * Practice — the picker, the setup screen and the session, in that order.
 *
 * ⚠️ **Deliberately the same three states as Review, on one screen.** Review's
 * start screen is not a separate route either: it is what `review.tsx` renders
 * before `started` flips. Following that shape rather than inventing one means
 * the two surfaces behave alike, and it is what the user asked for after trying
 * the first cut, which opened straight into an endless stream of questions.
 *
 * ⚠️ **A question is a round, and a round is a table** — every box of it that is
 * due, asked together as its paradigm, each rating on its own answer. That is
 * the 2026-09-22 reversal; the grain note at the head of `conjugation.ts` has
 * the reasoning. Every count on this screen is in **boxes**, because a box is
 * what carries a schedule.
 *
 * **The session ends.** Its queue is fixed at Start and owned from then on, so a
 * rating written mid-session moves the picker's counts and leaves the questions
 * alone. Running out is `done`; quitting early is `stopped`, and the two say
 * different things — telling someone who quit at 8 of 30 that they are finished
 * would be untrue.
 *
 * **A miss does not rejoin the session in progress.** `rateBox` makes a missed
 * box due immediately, so it comes back in the *next* session: "a session ends
 * when it said it would", the same rule `sm2.ts` states for cards.
 */
type Stage = 'picker' | 'setup' | 'session';

export default function PracticeScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const { progress, enrolment, rate } = useConjugation();
  const spec = conjugationSpec(studyLanguage);

  const [stage, setStage] = useState<Stage>('picker');
  /** Which section's patterns are open, one level down. */
  const [openTense, setOpenTense] = useState<string | null>(null);
  /**
   * What this session will cover. `null` on either field is "everything at this
   * level" — the everything row, and the whole-tense row.
   */
  const [chosen, setChosen] = useState<{ tenseId: string | null; subjectKey: string | null } | null>(null);
  const [includeNotDue, setIncludeNotDue] = useState(false);

  // Session state. `queue` is fixed at Start; `index` walks it a round at a time.
  const [queue, setQueue] = useState<ConjugationRound[]>([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  /** Person id → what the learner typed, for the round on screen. */
  const [typed, setTyped] = useState<Record<string, string>>({});
  /** Person id → hints taken, so a hint costs the box it was taken on. */
  const [hints, setHints] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  /**
   * The practice set as sections with due counts — one row per tense, each
   * opening into its patterns.
   *
   * ⚠️ **Enrolment is the outer bound.** A tense that is not in the practice set
   * has no row here; adding it is a decision made on the Topics tab. The two
   * surfaces answer different questions and this one is the narrower.
   */
  const sections = useMemo(
    () => (spec && enrolment ? listPracticeSections(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );
  /** The everything row is the sum of the sections, which is exact. */
  const dueCount = useMemo(() => sections.reduce((n, section) => n + section.due, 0), [sections]);
  const totalCount = useMemo(() => sections.reduce((n, section) => n + section.total, 0), [sections]);
  const openSection = sections.find(section => section.tenseId === openTense);

  const tables = useMemo(() => {
    if (!spec || !enrolment || !chosen) return [];
    return buildTables(spec, enrolment, {
      tenses: chosen.tenseId ? [chosen.tenseId] : undefined,
      subjects: chosen.subjectKey ? [chosen.subjectKey] : undefined,
    });
  }, [spec, enrolment, chosen]);
  const dueInSelection = useMemo(
    () => (spec ? countDueBoxes(spec, tables, progress) : 0),
    [spec, tables, progress],
  );

  const start = () => {
    if (!spec) return;
    setQueue(buildConjugationQueue(spec, tables, progress, { includeNotDue }));
    setIndex(0);
    setStopped(false);
    setTyped({});
    setHints({});
    setChecked(false);
    setStage('session');
  };

  /**
   * Rate every box of the round, each on its own answer.
   *
   * ⚠️ **One write for the round, not one per box.** The nested map merges key
   * by key, so six ratings cost one round trip — and a blank box is still
   * `again`, because not producing a form is not knowing it.
   */
  const check = () => {
    const round = queue[index];
    if (!spec || !round || checked) return;
    const updates: ConjugationProgressMap = {};
    for (const personId of round.personIds) {
      const correct = isCorrectForm(spec, round.table, personId, typed[personId] ?? '');
      const id = boxItemId(spec, round.table, personId);
      updates[id] = rateBox(progress[id], hintedVerdict(hints[personId] ?? 0, correct));
    }
    rate(updates);
    setChecked(true);
  };

  const advance = () => {
    setIndex(i => i + 1);
    setTyped({});
    setHints({});
    setChecked(false);
  };

  const header = (title: string, onBack?: () => void) => (
    <View style={s.header}>
      {onBack && (
        <TouchableOpacity onPress={onBack} hitSlop={10} accessibilityRole="button"
                          accessibilityLabel={t(interfaceLanguage, 'practiceBack')}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
      )}
      <Text style={s.title}>{title}</Text>
    </View>
  );

  /* ── Picker ───────────────────────────────────────────────────────────── */
  if (stage === 'picker') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(t(interfaceLanguage, 'practiceTitle'))}
        <ScrollView contentContainerStyle={s.content}>
          {/* One row per practice type, with its due count on the right —
              Review's collection picker, which is the state the user asked to
              start from. Writing is not here: it diagnoses rather than
              practises, so it keeps its own tab. */}
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => setStage('setup')}
          >
            <Ionicons name="grid-outline" size={22} color={C.muted} />
            <Text style={s.rowLabel}>{t(interfaceLanguage, 'munliToolConjugation')}</Text>
            {/* Open even at zero, on the user's call: a new account has nothing
                scheduled, and a dead row on first launch is a bad first
                impression. Over-practice is offered on the next screen. */}
            <Text style={[s.rowDue, dueCount > 0 && s.rowDueOn]}>
              {dueCount > 0
                ? t(interfaceLanguage, 'conjugationDue', { count: dueCount })
                : t(interfaceLanguage, 'practiceNothingDue')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── Setup ────────────────────────────────────────────────────────────── */
  if (stage === 'setup') {
    /**
     * One row of the picker — Review's collection row, for verbs.
     *
     * `opens` marks a row that shows a second choice rather than starting one.
     * Without it, a tense holding several patterns and a tense holding one look
     * identical and one of them does something you did not ask for.
     */
    const sectionRow = (
      key: string,
      label: string,
      due: number,
      total: number,
      onPress: () => void,
      opens?: boolean,
    ) => (
      <TouchableOpacity
        key={key}
        style={s.sectionRow}
        activeOpacity={0.7}
        accessibilityRole="button"
        onPress={onPress}
      >
        <View style={s.sectionText}>
          <Text style={s.sectionLabel}>
            {label}{opens ? ' ›' : ''}
          </Text>
          <Text style={s.sectionSub}>
            {t(interfaceLanguage, 'practiceSectionForms', { count: total })}
          </Text>
        </View>
        <Text style={[s.rowDue, due > 0 && s.rowDueOn]}>
          {due > 0
            ? t(interfaceLanguage, 'conjugationDue', { count: due })
            : t(interfaceLanguage, 'practiceNothingDue')}
        </Text>
      </TouchableOpacity>
    );

    if (!spec) {
      return (
        <SafeAreaView style={s.safe} edges={['top']}>
          {header(t(interfaceLanguage, 'munliToolConjugation'), () => setStage('picker'))}
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
              <Text style={s.emptyBody}>{t(interfaceLanguage, 'conjugationUnavailableBody')}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    /* ── The start screen for what was chosen ─────────────────────────── */
    if (chosen) {
      const label = chosen.subjectKey
        ? `${openSection?.label ?? ''} · ${openSection?.subjects.find(x => x.key === chosen.subjectKey)?.label ?? ''}`
        : chosen.tenseId
          ? sections.find(section => section.tenseId === chosen.tenseId)?.label ?? ''
          : t(interfaceLanguage, 'practiceEverything');
      return (
        <SafeAreaView style={s.safe} edges={['top']}>
          {header(label, () => setChosen(null))}
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.dueLine}>
              {dueInSelection > 0
                ? t(interfaceLanguage, 'conjugationDue', { count: dueInSelection })
                : t(interfaceLanguage, 'practiceNothingDue')}
            </Text>

            {/* The switch that used to be a silent fallback in the draw. It
                belongs here rather than on the list: it is about this session,
                not about which part of the set you are looking at. */}
            <View style={s.switchRow}>
              <Text style={s.switchLabel}>{t(interfaceLanguage, 'practiceIncludeNotDue')}</Text>
              <Switch
                value={includeNotDue}
                onValueChange={setIncludeNotDue}
                trackColor={{ false: C.border, true: C.highlight }}
                thumbColor={C.bg}
              />
            </View>

            <TouchableOpacity
              style={[s.primary, dueInSelection === 0 && !includeNotDue && s.primaryOff]}
              disabled={dueInSelection === 0 && !includeNotDue}
              onPress={start}
            >
              <Text style={s.primaryText}>{t(interfaceLanguage, 'practiceStart')}</Text>
            </TouchableOpacity>
            {dueInSelection === 0 && !includeNotDue && (
              <Text style={s.emptyBody}>{t(interfaceLanguage, 'practiceSessionEmpty')}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    /* ── One section's patterns ───────────────────────────────────────── */
    if (openSection) {
      return (
        <SafeAreaView style={s.safe} edges={['top']}>
          {header(openSection.label, () => setOpenTense(null))}
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.pickerLead}>{t(interfaceLanguage, 'practicePickSubject')}</Text>
            {/* The whole-tense row is deliberately there and deliberately
                first — Review's reasoning, and the same one: practising the
                patterns one at a time is the same material several times. */}
            {sectionRow(
              'whole', t(interfaceLanguage, 'practiceWholeTense'), openSection.due, openSection.total,
              () => setChosen({ tenseId: openSection.tenseId, subjectKey: null }),
            )}
            {openSection.subjects.map(subject => sectionRow(
              subject.key, subject.label, subject.due, subject.total,
              () => setChosen({ tenseId: openSection.tenseId, subjectKey: subject.key }),
            ))}
          </ScrollView>
        </SafeAreaView>
      );
    }

    /* ── The sections ─────────────────────────────────────────────────── */
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(t(interfaceLanguage, 'munliToolConjugation'), () => setStage('picker'))}
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.pickerLead}>{t(interfaceLanguage, 'practicePickSection')}</Text>
          {/* Everything first, for the learner who did not sit down with one
              tense in mind — and because it is what the tool did before it had
              sections at all. */}
          {sectionRow(
            'everything', t(interfaceLanguage, 'practiceEverything'), dueCount, totalCount,
            () => setChosen({ tenseId: null, subjectKey: null }),
          )}
          {sections.map(section => sectionRow(
            section.tenseId, section.label, section.due, section.total,
            () => (section.subjects.length > 1
              ? setOpenTense(section.tenseId)
              : setChosen({ tenseId: section.tenseId, subjectKey: null })),
            section.subjects.length > 1,
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── Session ──────────────────────────────────────────────────────────── */
  const round = queue[index];
  /** Boxes, not rounds: the same unit the picker counts in. */
  const total = countQuestions(queue);
  const answered = countQuestions(queue.slice(0, index));

  if (!round) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(t(interfaceLanguage, 'munliToolConjugation'), () => setStage('picker'))}
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.empty}>
            <Text style={s.emptyTitle}>
              {t(interfaceLanguage, stopped ? 'practiceStoppedTitle' : 'practiceDoneTitle')}
            </Text>
            <Text style={s.emptyBody}>
              {stopped
                ? t(interfaceLanguage, 'practiceCount', { done: answered, total })
                : t(interfaceLanguage, 'practiceDoneBody')}
            </Text>
          </View>
          <TouchableOpacity style={s.primary} onPress={() => setStage('setup')}>
            <Text style={s.primaryText}>{t(interfaceLanguage, 'practiceAgain')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const ready = round.personIds.every(id => (typed[id] ?? '').trim().length > 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => { setStopped(true); setIndex(queue.length); }}
          hitSlop={10}
          accessibilityRole="button"
        >
          <Text style={s.stop}>{t(interfaceLanguage, 'practiceStop')}</Text>
        </TouchableOpacity>
        <Text style={s.count}>
          {t(interfaceLanguage, 'practiceCount', {
            done: answered + (checked ? round.personIds.length : 0),
            total,
          })}
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          {/* The verb is the vehicle; the subject is what is being tested. For
              a group they differ, and the learner needs both — which verb to
              conjugate, and which pattern it belongs to. */}
          <Text style={s.infinitive}>{round.table.infinitive}</Text>
          <Text style={s.prompt}>
            {round.table.tenseLabel}
            {round.table.subjectKind === 'group' ? ` · ${round.table.subjectLabel}` : ''}
          </Text>
          {!checked && <Text style={s.lead}>{t(interfaceLanguage, 'conjugationFillDue')}</Text>}

          {spec?.persons.map(person => {
            const due = round.personIds.includes(person.id);
            const form = round.table.forms[person.id];
            const answer = (typed[person.id] ?? '').trim();
            const correct = !!spec && isCorrectForm(spec, round.table, person.id, answer);
            const taken = hints[person.id] ?? 0;
            const hintHalves = conjugationHints(round.table, person.id);

            return (
              <View key={person.id} style={s.boxRow}>
                <Text style={s.person}>{person.label}</Text>
                <View style={s.boxBody}>
                  {/* ⚠️ A box that is not due stays masked until the round is
                      checked: `nous parlons` on screen makes `tu parles` free,
                      and the paradigm is only reference once it has been
                      answered. */}
                  {!due ? (
                    <Text
                      style={s.masked}
                      accessibilityLabel={checked ? form : t(interfaceLanguage, 'conjugationNotDue')}
                    >
                      {checked ? form : '—'}
                    </Text>
                  ) : checked ? (
                    <>
                      <Text style={[s.answer, !correct && s.answerWrong]}>{form}</Text>
                      {!correct && !!answer && <Text style={s.typedWrong}>{answer}</Text>}
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={s.input}
                        value={typed[person.id] ?? ''}
                        onChangeText={next => setTyped(prev => ({ ...prev, [person.id]: next }))}
                        placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
                        placeholderTextColor={C.muted}
                        accessibilityLabel={`${person.label} · ${round.table.tenseLabel}`}
                        autoCapitalize="none"
                        autoCorrect={false}
                        // ⚠️ Off deliberately. The keyboard's suggestion strip
                        // would hand the learner the form being asked for.
                        autoComplete="off"
                        spellCheck={false}
                        returnKeyType="done"
                      />
                      {taken > 0 && <Text style={s.hint}>{hintHalves.slice(0, taken).join('  ')}</Text>}
                    </>
                  )}
                </View>
                {/* A hint costs the box it is taken on, which is only possible
                    now that the box carries its own schedule. */}
                {due && !checked && taken < hintHalves.length && (
                  <TouchableOpacity
                    style={s.hintBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(interfaceLanguage, 'conjugationHint')} · ${person.label}`}
                    onPress={() => setHints(prev => ({ ...prev, [person.id]: taken + 1 }))}
                  >
                    <Text style={s.hintBtnText}>{t(interfaceLanguage, 'conjugationHint')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={[s.primary, !checked && !ready && s.primaryOff]}
            disabled={!checked && !ready}
            onPress={() => (checked ? advance() : check())}
          >
            <Text style={s.primaryText}>
              {t(interfaceLanguage, checked ? 'conjugationNext' : 'conjugationCheck')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    // ⚠️ Not `PageHeader`: this header carries a back chevron and a title that
    // changes with the stage. It takes the constants instead, which is the
    // arrangement `cards.tsx` already has for the same reason.
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 8,
    },
    title: { color: C.highlight, fontSize: PAGE_TITLE_SIZE, fontWeight: '700' },
    stop: { color: C.muted, fontSize: 14 },
    count: { color: C.muted, fontSize: 13, marginLeft: 'auto' },
    content: { padding: SCREEN_GUTTER, paddingTop: 4, paddingBottom: tabBarHeight },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16,
    },
    rowLabel: { flex: 1, color: C.text, fontSize: 16, fontWeight: '600' },
    rowDue: { color: C.muted, fontSize: 13 },
    rowDueOn: { color: C.highlight, fontWeight: '700' },
    sectionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16, marginBottom: 10,
    },
    sectionText: { flex: 1 },
    sectionLabel: { color: C.text, fontSize: 16, fontWeight: '600' },
    sectionSub: { color: C.muted, fontSize: 12, marginTop: 3 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    switchLabel: { flex: 1, color: C.text, fontSize: 14 },
    dueLine: { color: C.muted, fontSize: 13, marginBottom: 12 },
    primary: { backgroundColor: C.highlight, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    primaryOff: { opacity: 0.4 },
    primaryText: { color: C.bg, fontSize: 15, fontWeight: '700' },
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20 },
    infinitive: { color: C.text, fontSize: 26, fontWeight: '700' },
    prompt: { color: C.muted, fontSize: 14, marginTop: 4 },
    lead: { color: C.muted, fontSize: 12, marginTop: 10 },
    pickerLead: { color: C.muted, fontSize: 13, marginBottom: 14 },
    // The paradigm, a row per person. ⚠️ No horizontal scroll: a round is one
    // tense, so the six rows fit a phone without the table shape Topics needs.
    boxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
    person: { color: C.muted, fontSize: 14, width: 68, paddingTop: 12 },
    boxBody: { flex: 1 },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, color: C.text, fontSize: 17,
    },
    masked: { color: C.muted, fontSize: 17, paddingVertical: 11 },
    answer: { color: C.text, fontSize: 17, paddingVertical: 11 },
    answerWrong: { color: C.highlight, fontWeight: '700' },
    typedWrong: { color: C.muted, fontSize: 12, textDecorationLine: 'line-through', marginTop: -6, marginBottom: 4 },
    hintBtn: {
      marginTop: 10, paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 16, borderWidth: 1, borderColor: C.border,
    },
    hintBtnText: { color: C.muted, fontSize: 12 },
    hint: { color: C.muted, fontSize: 15, letterSpacing: 2, marginTop: 6 },
    empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted, borderRadius: 16, padding: 28 },
    emptyTitle: { color: C.text, fontSize: 15, textAlign: 'center' },
    emptyBody: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  });
}
