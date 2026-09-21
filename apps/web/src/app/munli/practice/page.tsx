'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  buildConjugationQueue, buildTables, conjugationHints, conjugationItemId, conjugationSpec,
  dueTables, hintedVerdict, isCorrectForm, rateTable,
} from '@amgi/core';
import type { ConjugationProgress, ConjugationProgressMap, ConjugationQuestion } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/**
 * Practice — the picker, the setup screen and the session, mirroring native.
 *
 * ⚠️ **Same three states as Review, on one page**, which is also how
 * `review/page.tsx` does it. The session's queue is fixed at Start and owned
 * from then on, so ratings written mid-session move the picker's counts and
 * leave the questions alone; a miss comes back in the *next* session rather
 * than rejoining this one.
 *
 * Progress is loaded here rather than in a provider, unlike native: web has no
 * second surface reading it during a session — the Progress page mounts fresh
 * when it is navigated to — so there is no second copy to disagree with.
 */
type Stage = 'picker' | 'setup' | 'session';

export default function PracticePage() {
  const { user, interfaceLanguage, studyLanguage } = useUser();
  const spec = conjugationSpec(studyLanguage);

  const [progress, setProgress] = useState<ConjugationProgressMap>({});
  const [stage, setStage] = useState<Stage>('picker');
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [includeNotDue, setIncludeNotDue] = useState(false);

  const [queue, setQueue] = useState<ConjugationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [typed, setTyped] = useState('');
  const [hintsTaken, setHintsTaken] = useState(0);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getUserPreferences(user.uid).then(prefs => {
      if (!cancelled) setProgress(prefs?.conjugation ?? {});
    });
    return () => { cancelled = true; };
  }, [user]);

  /** `null` is "has not chosen"; an empty array is "deselected everything". */
  const tenseIds = useMemo(
    () => chosenTenses ?? (spec ? [spec.tenses[0].id] : []),
    [chosenTenses, spec],
  );
  const tables = useMemo(
    () => (spec && tenseIds.length ? buildTables(spec, tenseIds) : []),
    [spec, tenseIds],
  );
  const dueCount = useMemo(
    () => (spec ? dueTables(spec, buildTables(spec, spec.tenses.map(x => x.id)), progress).length : 0),
    [spec, progress],
  );
  const dueInSelection = useMemo(
    () => (spec ? dueTables(spec, tables, progress).length : 0),
    [spec, tables, progress],
  );

  const rate = (itemId: string, state: ConjugationProgress) => {
    setProgress(prev => ({ ...prev, [itemId]: state }));
    if (user) void saveUserPreferences(user.uid, { conjugation: { [itemId]: state } }).catch(() => {});
  };

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
    const itemId = conjugationItemId(spec.language, current.table.verbId, current.table.tenseId);
    rate(itemId, rateTable(progress[itemId], current.personId, hintedVerdict(hintsTaken, correct)));
  };

  const advance = () => {
    setIndex(i => i + 1);
    setTyped('');
    setHintsTaken(0);
    setVerdict(null);
  };

  const heading = (text: string) => (
    <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>{text}</h1>
  );
  const primary = 'px-5 py-2.5 rounded-lg font-mono font-bold transition-colors disabled:opacity-40';

  if (stage === 'picker') {
    return (
      <div className="max-w-2xl">
        {heading(t(interfaceLanguage, 'practiceTitle'))}
        {/* One row per practice type. Writing is not here — it diagnoses
            rather than practises, so it keeps its own surface. */}
        <button
          onClick={() => setStage('setup')}
          className="w-full flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        >
          <span className="flex-1 text-left font-mono font-bold" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'munliToolConjugation')}
          </span>
          <span className="font-mono text-sm" style={{ color: dueCount > 0 ? 'var(--color-highlight)' : 'var(--color-muted)' }}>
            {dueCount > 0
              ? t(interfaceLanguage, 'conjugationDue', { count: dueCount })
              : t(interfaceLanguage, 'practiceNothingDue')}
          </span>
        </button>
      </div>
    );
  }

  if (stage === 'setup') {
    return (
      <div className="max-w-2xl">
        {heading(t(interfaceLanguage, 'munliToolConjugation'))}
        {!spec ? (
          <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationUnavailable')}
          </p>
        ) : (
          <>
            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'conjugationTenses')}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {spec.tenses.map(tense => {
                const on = tenseIds.includes(tense.id);
                return (
                  <button
                    key={tense.id}
                    aria-pressed={on}
                    onClick={() => setChosenTenses(on ? tenseIds.filter(x => x !== tense.id) : [...tenseIds, tense.id])}
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

            <label className="flex items-center gap-3 mb-6 font-mono text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={includeNotDue} onChange={e => setIncludeNotDue(e.target.checked)} />
              {t(interfaceLanguage, 'practiceIncludeNotDue')}
            </label>

            {tenseIds.length === 0 ? (
              <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
                {t(interfaceLanguage, 'conjugationPickTense')}
              </p>
            ) : (
              <>
                <p className="font-mono text-sm mb-3" style={{ color: 'var(--color-muted)' }}>
                  {dueInSelection > 0
                    ? t(interfaceLanguage, 'conjugationDue', { count: dueInSelection })
                    : t(interfaceLanguage, 'practiceNothingDue')}
                </p>
                <button
                  onClick={start}
                  disabled={dueInSelection === 0 && !includeNotDue}
                  className={primary}
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                >
                  {t(interfaceLanguage, 'practiceStart')}
                </button>
                {dueInSelection === 0 && !includeNotDue && (
                  <p className="font-mono text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'practiceSessionEmpty')}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const current = queue[index];

  if (!current) {
    return (
      <div className="max-w-2xl">
        {heading(t(interfaceLanguage, stopped ? 'practiceStoppedTitle' : 'practiceDoneTitle'))}
        <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
          {stopped
            ? t(interfaceLanguage, 'practiceCount', { done: index, total: queue.length })
            : t(interfaceLanguage, 'practiceDoneBody')}
        </p>
        <button
          onClick={() => setStage('setup')}
          className={primary}
          style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
        >
          {t(interfaceLanguage, 'practiceAgain')}
        </button>
      </div>
    );
  }

  const person = spec?.persons.find(p => p.id === current.personId);
  const hints = conjugationHints(current.table, current.personId);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setStopped(true); setIndex(queue.length); }}
          className="font-mono text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          {t(interfaceLanguage, 'practiceStop')}
        </button>
        <span className="ml-auto font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'practiceCount', { done: index + 1, total: queue.length })}
        </span>
      </div>

      <div className="p-8 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}>
        <p className="font-mono text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          {current.table.infinitive}
        </p>
        <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
          {person?.label} · {current.table.tenseLabel}
        </p>

        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            // Enter checks, then Enter moves on — the same key all the way
            // through, so a five-second question needs no mouse.
            if (verdict) advance();
            else check();
          }}
          placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          disabled={!!verdict}
          className="w-full p-3 rounded-lg font-mono text-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
        />

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
              : `${t(interfaceLanguage, 'conjugationWrong')} ${current.table.forms[current.personId]}`}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => (verdict ? advance() : check())}
            disabled={!verdict && !typed.trim()}
            className={primary}
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(interfaceLanguage, verdict ? 'conjugationNext' : 'conjugationCheck')}
          </button>
        </div>
      </div>
    </div>
  );
}
