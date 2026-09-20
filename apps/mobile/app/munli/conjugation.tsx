import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  buildTables, conjugationHints, conjugationItemId, conjugationSpec, dueTables,
  hintedVerdict, isCorrectForm, pickPerson, rateTable, t,
} from '@amgi/core';
import type { ConjugationProgressMap } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { getUserPreferences, saveUserPreferences } from '../../src/services/userPreferences';
import type { Palette } from '../../src/theme';

/**
 * Verb conjugation practice, native side. Mirrors the web screen exactly —
 * every scheduling and grading decision is in `@amgi/core`, so the two cannot
 * disagree about what a miss does.
 */
/**
 * A deterministic [0, 1) from an integer.
 *
 * `Math.sin` is pure, so this is safe to call during render where `Math.random`
 * is not. It is a shuffle, not a security primitive — the only property needed
 * is that consecutive nonces give unrelated values.
 */
function seeded(n: number): number {
  const x = Math.sin(n * 9973) * 10000;
  return x - Math.floor(x);
}

export default function ConjugationScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage, studyLanguage } = useUser();
  const router = useRouter();
  const spec = conjugationSpec(studyLanguage);

  const [progress, setProgress] = useState<ConjugationProgressMap>({});
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [nonce, setNonce] = useState(0);
  // The progress the current question was drawn against — see `question`.
  const [drawProgress, setDrawProgress] = useState<ConjugationProgressMap>({});
  const [typed, setTyped] = useState('');
  const [hintsTaken, setHintsTaken] = useState(0);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getUserPreferences(user.uid).then(prefs => {
      if (cancelled) return;
      const loaded = prefs?.conjugation ?? {};
      setProgress(loaded);
      setDrawProgress(loaded);
      // Advancing by what is already known varies which table a session opens
      // on, without a clock or a random seed — both of which are impure during
      // render and neither of which is needed for this.
      setNonce(Object.keys(loaded).length);
    });
    return () => { cancelled = true; };
  }, [user]);

  /**
   * Which tenses are being practised.
   *
   * Derived rather than set by an effect: `null` is "has not chosen", which
   * defaults to the first tense — three tenses at once is a 54-table queue on a
   * surface someone is trying for the first time — and an empty array is the
   * different, real state of having deselected everything.
   */
  const tenseIds = useMemo(
    () => chosenTenses ?? (spec ? [spec.tenses[0].id] : []),
    [chosenTenses, spec],
  );

  const tables = useMemo(
    () => (spec && tenseIds.length ? buildTables(spec, tenseIds) : []),
    [spec, tenseIds],
  );
  /** For the count on screen. The question draws its own, from a ref. */
  const due = useMemo(() => (spec ? dueTables(spec, tables, progress) : []), [spec, tables, progress]);

  /**
   * The current question.
   *
   * ⚠️ **Pure, and that is a constraint rather than a preference.** React
   * Compiler's rules forbid both reading a ref and calling an impure function
   * during render, which rules out `Math.random()` here and rules out keeping
   * the draw in an effect (the effect would `setState` synchronously, which the
   * same ruleset flags and which this repo has 13 outstanding warnings about
   * already — adding more was not an option).
   *
   * So the draw is a pure function of two pieces of state. `nonce` advances on
   * every answer and seeds the shuffle; `drawProgress` is the progress
   * *snapshot* the draw uses. Snapshotting matters: answering writes progress,
   * and a draw that depended on live progress would redraw the question the
   * instant it was answered, so the learner would never see the verdict for the
   * box they just typed.
   */
  const question = useMemo(() => {
    if (!spec || tables.length === 0) return null;
    const pool = dueTables(spec, tables, drawProgress);
    const from = pool.length > 0 ? pool : tables;
    // Off the front of the queue, but not always its very front — a fixed head
    // would ask the same table every session until it was learned.
    const table = from[Math.floor(seeded(nonce * 2 + 1) * Math.min(from.length, 10))] ?? from[0];
    const state = drawProgress[conjugationItemId(spec.language, table.verbId, table.tenseId)];
    const person = pickPerson(spec, state, () => seeded(nonce * 2 + 2));
    return { table, personId: person.id, person };
  }, [spec, tables, drawProgress, nonce]);

  const table = question?.table ?? null;
  const personId = question?.personId ?? '';
  const person = question?.person;

  const nextQuestion = useCallback(() => {
    setNonce(n => n + 1);
    setDrawProgress(progress);
    setTyped('');
    setHintsTaken(0);
    setVerdict(null);
  }, [progress]);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} style={s.back} accessibilityRole="button">
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </TouchableOpacity>
      <Text style={s.title}>{t(interfaceLanguage, 'munliToolConjugation')}</Text>
    </View>
  );

  if (!spec) {
    return (
      <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
        {header}
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{t(interfaceLanguage, 'conjugationUnavailable')}</Text>
          <Text style={s.emptyBody}>{t(interfaceLanguage, 'conjugationUnavailableBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hints = table ? conjugationHints(table, personId) : [];

  const check = () => {
    if (!table || !typed.trim() || verdict) return;
    const correct = isCorrectForm(spec, table, personId, typed);
    setVerdict(correct ? 'correct' : 'wrong');
    const itemId = conjugationItemId(spec.language, table.verbId, table.tenseId);
    const next = rateTable(progress[itemId], personId, hintedVerdict(hintsTaken, correct));
    setProgress(prev => ({ ...prev, [itemId]: next }));
    // Fire and forget, like every rating on this platform. The nested map merges
    // key by key, so this writes one table's progress and not the whole set.
    if (user) void saveUserPreferences(user.uid, { conjugation: { [itemId]: next } }).catch(() => {});
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {header}
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.due}>{t(interfaceLanguage, 'conjugationDue', { count: due.length })}</Text>

        <View style={s.chips}>
          {spec.tenses.map(tense => {
            const on = tenseIds.includes(tense.id);
            return (
              <TouchableOpacity
                key={tense.id}
                style={[s.chip, on && s.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setChosenTenses(tenseIds.includes(tense.id) ? tenseIds.filter(x => x !== tense.id) : [...tenseIds, tense.id]);
                  nextQuestion();
                }}
              >
                <Text style={[s.chipText, on && s.chipTextOn]}>{tense.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tenseIds.length === 0 ? (
          <Text style={s.emptyBody}>{t(interfaceLanguage, 'conjugationPickTense')}</Text>
        ) : table && person ? (
          <View style={s.card}>
            <Text style={s.infinitive}>{table.infinitive}</Text>
            <Text style={s.prompt}>{person.label} · {table.tenseLabel}</Text>

            <TextInput
              style={s.input}
              value={typed}
              onChangeText={setTyped}
              placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              // ⚠️ Off deliberately. The keyboard's suggestion strip would
              // hand the learner the form this screen is asking them to produce.
              autoComplete="off"
              spellCheck={false}
              editable={!verdict}
              onSubmitEditing={() => (verdict ? nextQuestion() : check())}
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
                  : `${t(interfaceLanguage, 'conjugationWrong')} ${table.forms[personId]}`}
              </Text>
            )}

            <TouchableOpacity
              style={[s.submit, !verdict && !typed.trim() && s.submitDisabled]}
              disabled={!verdict && !typed.trim()}
              onPress={() => (verdict ? nextQuestion() : check())}
            >
              <Text style={s.submitText}>{t(interfaceLanguage, verdict ? 'conjugationNext' : 'conjugationCheck')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
    back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { color: C.text, fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
    content: { padding: 20, paddingBottom: 40 },
    due: { color: C.muted, fontFamily: 'monospace', fontSize: 12, marginBottom: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { color: C.text, fontFamily: 'monospace', fontSize: 13 },
    chipTextOn: { color: C.bg, fontWeight: '700' },
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 24 },
    infinitive: { color: C.text, fontFamily: 'monospace', fontSize: 26, fontWeight: '700' },
    prompt: { color: C.muted, fontFamily: 'monospace', fontSize: 14, marginTop: 4, marginBottom: 20 },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      padding: 14, color: C.text, fontFamily: 'monospace', fontSize: 18,
    },
    hintBtn: {
      alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 16, borderWidth: 1, borderColor: C.border,
    },
    hintBtnText: { color: C.muted, fontFamily: 'monospace', fontSize: 12 },
    hint: { color: C.muted, fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, marginTop: 12 },
    verdict: { color: C.muted, fontFamily: 'monospace', fontSize: 14, marginTop: 16 },
    verdictWrong: { color: C.highlight },
    submit: { marginTop: 24, backgroundColor: C.highlight, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: C.bg, fontFamily: 'monospace', fontSize: 15, fontWeight: '700' },
    empty: { margin: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: C.muted, borderRadius: 16, padding: 28 },
    emptyTitle: { color: C.text, fontFamily: 'monospace', fontSize: 14, textAlign: 'center' },
    emptyBody: { color: C.muted, fontFamily: 'monospace', fontSize: 12, textAlign: 'center', marginTop: 6 },
  });
}
