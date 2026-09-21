import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  buildConjugationQueue, buildTables, conjugationHints, conjugationSpec, dueTables,
  findSubject, hintedVerdict, isCorrectForm, rateTable, subjectKey, tableItemId, t,
} from '@amgi/core';
import type { ConjugationQuestion } from '@amgi/core';
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
 * **The session ends.** Its queue is fixed at Start and owned from then on, so a
 * rating written mid-session moves the picker's counts and leaves the questions
 * alone. Running out is `done`; quitting early is `stopped`, and the two say
 * different things — telling someone who quit at 8 of 30 that they are finished
 * would be untrue.
 *
 * **A miss does not rejoin the session in progress.** `rateTable` makes a missed
 * table due immediately, so it comes back in the *next* session: "a session ends
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

  // Session state. `queue` is fixed at Start; `index` walks it.
  const [queue, setQueue] = useState<ConjugationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [typed, setTyped] = useState('');
  const [hintsTaken, setHintsTaken] = useState(0);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);

  /**
   * What this session will cover — the practice set, optionally narrowed.
   *
   * ⚠️ **Enrolment is the outer bound.** A tense that is not in the practice set
   * cannot be selected here; adding it is a decision made on the Verbs tab. The
   * two surfaces answer different questions and this one is the narrower.
   */
  const tenseIds = useMemo(
    () => (enrolment ? enrolment.tenses.filter(id => chosenTenses?.includes(id) ?? true) : []),
    [enrolment, chosenTenses],
  );
  const subjectKeys = useMemo(
    () => (enrolment ? enrolment.subjects.filter(key => chosenSubjects?.includes(key) ?? true) : []),
    [enrolment, chosenSubjects],
  );
  const tables = useMemo(
    () => (spec && enrolment ? buildTables(spec, enrolment, { tenses: tenseIds, subjects: subjectKeys }) : []),
    [spec, enrolment, tenseIds, subjectKeys],
  );
  /** For the count on the picker — the whole practice set, unnarrowed. */
  const dueCount = useMemo(
    () => (spec && enrolment ? dueTables(spec, buildTables(spec, enrolment), progress).length : 0),
    [spec, enrolment, progress],
  );
  const dueInSelection = useMemo(
    () => (spec ? dueTables(spec, tables, progress).length : 0),
    [spec, tables, progress],
  );

  const start = () => {
    if (!spec) return;
    setQueue(buildConjugationQueue(spec, tables, progress, { includeNotDue }));
    setIndex(0);
    setStopped(false);
    setTyped('');
    setHintsTaken(0);
    setVerdict(null);
    setStage('session');
  };

  const check = () => {
    const current = queue[index];
    if (!spec || !current || !typed.trim() || verdict) return;
    const correct = isCorrectForm(spec, current.table, current.personId, typed);
    setVerdict(correct ? 'correct' : 'wrong');
    const itemId = tableItemId(spec, current.table);
    rate(itemId, rateTable(progress[itemId], current.personId, hintedVerdict(hintsTaken, correct)));
  };

  const advance = () => {
    setIndex(i => i + 1);
    setTyped('');
    setHintsTaken(0);
    setVerdict(null);
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
                {(enrolment?.tenses ?? []).map(tenseId => {
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
                {(enrolment?.subjects ?? []).map(key => {
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
  const current = queue[index];
  const finished = !current;

  if (finished) {
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
                ? t(interfaceLanguage, 'practiceCount', { done: index, total: queue.length })
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

  const person = spec?.persons.find(p => p.id === current.personId);
  const hints = conjugationHints(current.table, current.personId);

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
          {t(interfaceLanguage, 'practiceCount', { done: index + 1, total: queue.length })}
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          {/* The verb is the vehicle; the subject is what is being tested. For
              a group they differ, and the learner needs both — which verb to
              conjugate, and which pattern it belongs to. */}
          <Text style={s.infinitive}>{current.table.infinitive}</Text>
          <Text style={s.prompt}>
            {person?.label} · {current.table.tenseLabel}
            {current.table.subjectKind === 'group' ? ` · ${current.table.subjectLabel}` : ''}
          </Text>

          <TextInput
            style={s.input}
            value={typed}
            onChangeText={setTyped}
            placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            // ⚠️ Off deliberately. The keyboard's suggestion strip would hand
            // the learner the form this screen is asking them to produce.
            autoComplete="off"
            spellCheck={false}
            editable={!verdict}
            onSubmitEditing={() => (verdict ? advance() : check())}
            returnKeyType="done"
          />

          {!verdict && hintsTaken < hints.length && (
            <TouchableOpacity style={s.hintBtn} onPress={() => setHintsTaken(n => n + 1)}>
              <Text style={s.hintBtnText}>{t(interfaceLanguage, 'conjugationHint')}</Text>
            </TouchableOpacity>
          )}
          {hintsTaken > 0 && <Text style={s.hint}>{hints.slice(0, hintsTaken).join('  ')}</Text>}

          {!!verdict && (
            <Text style={[s.verdict, verdict === 'wrong' && s.verdictWrong]}>
              {verdict === 'correct'
                ? t(interfaceLanguage, 'conjugationCorrect')
                : `${t(interfaceLanguage, 'conjugationWrong')} ${current.table.forms[current.personId]}`}
            </Text>
          )}

          <TouchableOpacity
            style={[s.primary, !verdict && !typed.trim() && s.primaryOff]}
            disabled={!verdict && !typed.trim()}
            onPress={() => (verdict ? advance() : check())}
          >
            <Text style={s.primaryText}>
              {t(interfaceLanguage, verdict ? 'conjugationNext' : 'conjugationCheck')}
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
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24 },
    infinitive: { color: C.text, fontSize: 26, fontWeight: '700' },
    prompt: { color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 20 },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      padding: 14, color: C.text, fontSize: 18,
    },
    hintBtn: {
      alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 16, borderWidth: 1, borderColor: C.border,
    },
    hintBtnText: { color: C.muted, fontSize: 12 },
    hint: { color: C.muted, fontSize: 18, letterSpacing: 2, marginTop: 12 },
    verdict: { color: C.muted, fontSize: 14, marginTop: 16 },
    verdictWrong: { color: C.highlight },
    empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted, borderRadius: 16, padding: 28 },
    emptyTitle: { color: C.text, fontSize: 15, textAlign: 'center' },
    emptyBody: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  });
}
