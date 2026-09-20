'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildTables,
  conjugationHints,
  conjugationItemId,
  conjugationSpec,
  dueTables,
  hintedVerdict,
  isCorrectForm,
  pickPerson,
  rateTable,
} from '@amgi/core';
import type { ConjugationProgressMap } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/**
 * Verb conjugation practice.
 *
 * **One screen, not two.** The tense chips, the due count and the question all
 * live together: a separate "start practising" route would be a page whose only
 * content is a button, and the house rule is lean single-purpose surfaces.
 *
 * ⚠️ **The schedule belongs to the table, so this screen picks in two steps** —
 * `dueTables` chooses the verb-and-tense, then `pickPerson` chooses which of its
 * six boxes to ask, preferring one that has been missed. Both live in core; this
 * screen holds no scheduling logic of its own.
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

export default function ConjugationPage() {
  const { user, interfaceLanguage, studyLanguage } = useUser();
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
  const due = useMemo(
    () => (spec ? dueTables(spec, tables, progress) : []),
    [spec, tables, progress],
  );

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

  if (!spec) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>
          {t(interfaceLanguage, 'munliToolConjugation')}
        </h1>
        <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--color-muted)' }}>
          <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'conjugationUnavailable')}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationUnavailableBody')}
          </p>
        </div>
      </div>
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
    // Fire and forget, like every other rating in the app: a lost write costs
    // one table's scheduling, and blocking the next question on a round trip is
    // what makes a five-second exercise feel like a forty-second one.
    // The nested map merges key by key, so this writes one table's progress.
    if (user) void saveUserPreferences(user.uid, { conjugation: { [itemId]: next } }).catch(() => {});
  };

  const toggleTense = (id: string) => {
    setChosenTenses(tenseIds.includes(id) ? tenseIds.filter(x => x !== id) : [...tenseIds, id]);
    nextQuestion();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'munliToolConjugation')}
      </h1>
      <p className="text-xs font-mono mb-6" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'conjugationDue', { count: due.length })}
      </p>

      {/* The learner picks; nothing here infers a level. */}
      <div className="flex flex-wrap gap-2 mb-8">
        {spec.tenses.map(tense => {
          const on = tenseIds.includes(tense.id);
          return (
            <button
              key={tense.id}
              onClick={() => toggleTense(tense.id)}
              aria-pressed={on}
              className="px-3 py-1.5 rounded-full text-sm font-mono border transition-colors"
              style={on
                ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                : { color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
            >
              {tense.label}
            </button>
          );
        })}
      </div>

      {tenseIds.length === 0 ? (
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationPickTense')}
        </p>
      ) : table && person ? (
        <div className="p-8 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}>
          <p className="font-mono text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            {table.infinitive}
          </p>
          <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            {person.label} · {table.tenseLabel}
          </p>

          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              // Enter checks, then Enter moves on — the same key all the way
              // through, so a five-second question needs no mouse.
              if (verdict) nextQuestion();
              else check();
            }}
            placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            disabled={!!verdict}
            className="w-full p-3 rounded-lg font-mono text-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
          />

          {/* The hints, and the verdict falling with each one taken. */}
          {!verdict && hintsTaken < hints.length && (
            <button
              onClick={() => setHintsTaken(n => n + 1)}
              className="mt-3 text-xs px-3 py-1 rounded-full border transition-colors"
              style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
            >
              {t(interfaceLanguage, 'conjugationHint')}
            </button>
          )}
          {hintsTaken > 0 && (
            <p className="mt-3 font-mono text-lg tracking-widest" style={{ color: 'var(--color-muted)' }}>
              {hints.slice(0, hintsTaken).join('  ')}
            </p>
          )}

          {verdict && (
            <p className="mt-4 font-mono text-sm" style={{ color: verdict === 'correct' ? 'var(--color-muted)' : 'var(--color-highlight)' }}>
              {verdict === 'correct'
                ? t(interfaceLanguage, 'conjugationCorrect')
                : `${t(interfaceLanguage, 'conjugationWrong')} ${table.forms[personId]}`}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => (verdict ? nextQuestion() : check())}
              disabled={!verdict && !typed.trim()}
              className="px-5 py-2 rounded-lg font-mono font-bold transition-colors disabled:opacity-50"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              {t(interfaceLanguage, verdict ? 'conjugationNext' : 'conjugationCheck')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
