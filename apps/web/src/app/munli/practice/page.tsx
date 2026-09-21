'use client';
import { useMemo, useState } from 'react';
import {
  buildConjugationQueue, buildTables, conjugationHints, dueTables, enrolledTenses,
  findSubject, hintedVerdict, isCorrectForm, rateTable, tableItemId,
} from '@amgi/core';
import type { ConjugationQuestion } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
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
  const { interfaceLanguage } = useUser();
  const { spec, progress, enrolment, rate } = useConjugation();

  const [stage, setStage] = useState<Stage>('picker');
  // `null` is "has not narrowed", meaning the whole practice set.
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [chosenSubjects, setChosenSubjects] = useState<string[] | null>(null);
  const [includeNotDue, setIncludeNotDue] = useState(false);

  const [queue, setQueue] = useState<ConjugationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [typed, setTyped] = useState('');
  const [hintsTaken, setHintsTaken] = useState(0);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);

  /**
   * What this session will cover — the practice set, optionally narrowed.
   *
   * ⚠️ Enrolment is the outer bound: a tense that is not in the practice set
   * cannot be selected here. Adding it is a decision made on the Verbs page.
   */
  /**
   * The tenses and groups the practice set touches, which is what the setup
   * chips offer — derived from the enrolment rather than stored beside it, so a
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
              {enrolledTenseIds.map(tenseId => {
                const tense = spec.tenses.find(x => x.id === tenseId);
                if (!tense) return null;
                const on = tenseIds.includes(tenseId);
                return (
                  <button
                    key={tenseId}
                    aria-pressed={on}
                    onClick={() => setChosenTenses(on ? tenseIds.filter(x => x !== tenseId) : [...tenseIds, tenseId])}
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

            <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'practiceGroups')}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {enrolledSubjectKeys.map(key => {
                const subject = findSubject(spec, key);
                if (!subject) return null;
                const on = subjectKeys.includes(key);
                return (
                  <button
                    key={key}
                    aria-pressed={on}
                    onClick={() => setChosenSubjects(on ? subjectKeys.filter(x => x !== key) : [...subjectKeys, key])}
                    className="px-3 py-1.5 rounded-full text-sm font-mono border transition-colors"
                    style={on
                      ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                      : { color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
                  >
                    {subject.kind === 'group' ? subject.label : subject.infinitive}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-3 mb-6 font-mono text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
              <input type="checkbox" checked={includeNotDue} onChange={e => setIncludeNotDue(e.target.checked)} />
              {t(interfaceLanguage, 'practiceIncludeNotDue')}
            </label>

            {tenseIds.length === 0 || subjectKeys.length === 0 ? (
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
        {/* The verb is the vehicle; the subject is what is being tested. For a
            group they differ, and the learner needs both. */}
        <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
          {person?.label} · {current.table.tenseLabel}
          {current.table.subjectKind === 'group' ? ` · ${current.table.subjectLabel}` : ''}
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
