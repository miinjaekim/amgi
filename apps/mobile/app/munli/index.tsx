import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  boxItemId, buildConjugationQueue, buildTables, conjugationHints, conjugationSpec,
  countDueBoxes, countQuestions, enrolledTenses, findSubject, hintedVerdict,
  isCorrectForm, rateBox, t,
} from '@amgi/core';
import type { ConjugationProgressMap, ConjugationRound } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useConjugation } from '../../src/context/ConjugationContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
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
  // `null` is "has not narrowed", which means the whole practice set. An empty
  // array is the different, real state of having deselected everything.
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [chosenSubjects, setChosenSubjects] = useState<string[] | null>(null);
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
   * What this session will cover — the practice set, optionally narrowed.
   *
   * ⚠️ **Enrolment is the outer bound.** A tense that is not in the practice set
   * cannot be selected here; adding it is a decision made on the Topics tab. The
   * two surfaces answer different questions and this one is the narrower.
   *
   * The chips are derived from the enrolment rather than stored beside it, so a
   * chip can never offer something that is not in the set.
   */
  const enrolledTenseIds = useMemo(
    () => (spec && enrolment ? enrolledTenses(spec, enrolment).map(tense => tense.id) : []),
    [spec, enrolment],
  );
  const enrolledSubjectKeys = useMemo(
    () => (enrolment
      ? [...new Set(enrolment.items.map(item => item.slice(0, item.lastIndexOf(':'))))]
      : []),
    [enrolment],
  );
  const tenseIds = useMemo(
    () => enrolledTenseIds.filter(id => chosenTenses?.includes(id) ?? true),
    [enrolledTenseIds, chosenTenses],
  );
  const subjectKeys = useMemo(
    () => enrolledSubjectKeys.filter(key => chosenSubjects?.includes(key) ?? true),
    [enrolledSubjectKeys, chosenSubjects],
  );
  const tables = useMemo(
    () => (spec && enrolment ? buildTables(spec, enrolment, { tenses: tenseIds, subjects: subjectKeys }) : []),
    [spec, enrolment, tenseIds, subjectKeys],
  );
  /** For the count on the picker — the whole practice set, unnarrowed. */
  const dueCount = useMemo(
    () => (spec && enrolment ? countDueBoxes(spec, buildTables(spec, enrolment), progress) : 0),
    [spec, enrolment, progress],
  );
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
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {header(t(interfaceLanguage, 'munliToolConjugation'), () => setStage('picker'))}
        <ScrollView contentContainerStyle={s.content}>
          {!spec ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
              <Text style={s.emptyBody}>{t(interfaceLanguage, 'conjugationUnavailableBody')}</Text>
            </View>
          ) : (
            <>
              <Text style={s.section}>{t(interfaceLanguage, 'conjugationTenses')}</Text>
              <View style={s.chips}>
                {enrolledTenseIds.map(tenseId => {
                  const tense = spec.tenses.find(x => x.id === tenseId);
                  if (!tense) return null;
                  const on = tenseIds.includes(tenseId);
                  return (
                    <TouchableOpacity
                      key={tenseId}
                      style={[s.chip, on && s.chipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setChosenTenses(
                        on ? tenseIds.filter(x => x !== tenseId) : [...tenseIds, tenseId]
                      )}
                    >
                      <Text style={[s.chipText, on && s.chipTextOn]}>{tense.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.section}>{t(interfaceLanguage, 'practiceGroups')}</Text>
              <View style={s.chips}>
                {enrolledSubjectKeys.map(key => {
                  const subject = findSubject(spec, key);
                  if (!subject) return null;
                  const on = subjectKeys.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.chip, on && s.chipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setChosenSubjects(
                        on ? subjectKeys.filter(x => x !== key) : [...subjectKeys, key]
                      )}
                    >
                      <Text style={[s.chipText, on && s.chipTextOn]}>
                        {subject.kind === 'group' ? subject.label : subject.infinitive}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* The switch that used to be a silent fallback in the draw. */}
              <View style={s.switchRow}>
                <Text style={s.switchLabel}>{t(interfaceLanguage, 'practiceIncludeNotDue')}</Text>
                <Switch
                  value={includeNotDue}
                  onValueChange={setIncludeNotDue}
                  trackColor={{ false: C.border, true: C.highlight }}
                  thumbColor={C.bg}
                />
              </View>

              {tenseIds.length === 0 || subjectKeys.length === 0 ? (
                <Text style={s.emptyBody}>{t(interfaceLanguage, 'conjugationPickTense')}</Text>
              ) : (
                <>
                  <Text style={s.dueLine}>
                    {dueInSelection > 0
                      ? t(interfaceLanguage, 'conjugationDue', { count: dueInSelection })
                      : t(interfaceLanguage, 'practiceNothingDue')}
                  </Text>
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
                </>
              )}
            </>
          )}
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    title: { color: C.text, fontSize: 22, fontWeight: '700' },
    stop: { color: C.muted, fontSize: 14 },
    count: { color: C.muted, fontSize: 13, marginLeft: 'auto' },
    content: { padding: 16, paddingTop: 4, paddingBottom: tabBarHeight },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16,
    },
    rowLabel: { flex: 1, color: C.text, fontSize: 16, fontWeight: '600' },
    rowDue: { color: C.muted, fontSize: 13 },
    rowDueOn: { color: C.highlight, fontWeight: '700' },
    section: { color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.text, fontSize: 13 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
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
