'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  boxItemId, buildConjugationQueue, buildTables, conjugationHints, countDueBoxes,
  countQuestions, hintedVerdict, isCorrectForm, listPracticeSections, rateBox,
} from '@amgi/core';
import type { ConjugationProgressMap, ConjugationRound, TranslationKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import PageHeader from '@/components/PageHeader';
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
 * ⚠️ **A question is a round, and a round is a table** — every box of it that is
 * due, asked together as its paradigm, each rating independently. See the grain
 * note at the head of `conjugation.ts`; the counts everywhere on this page are
 * in boxes, because a box is what carries a schedule.
 *
 * Progress is loaded here rather than in a provider, unlike native: web has no
 * second surface reading it during a session — the Progress page mounts fresh
 * when it is navigated to — so there is no second copy to disagree with.
 */
type Stage = 'picker' | 'setup' | 'session';

/**
 * How long a right answer stays on screen before the next question.
 *
 * ⚠️ **Long enough to be seen, short enough not to be waited on.** The learner
 * already knows they were right; this is confirmation, not reading. Asked for
 * 2026-09-22 — *"I can't imagine any reason a user might want to stay on that
 * question longer if they already have answered correctly"* — and the flash is
 * what keeps the auto-advance from feeling like the answer was ignored.
 */
const CORRECT_PAUSE_MS = 800;

export default function PracticePage() {
  const { interfaceLanguage } = useUser();
  const { spec, progress, enrolment, rate } = useConjugation();

  const [stage, setStage] = useState<Stage>('picker');
  /** Which section's patterns are open, one level down. */
  const [openTense, setOpenTense] = useState<string | null>(null);
  /**
   * What this session will cover. `null` on either field is "everything at this
   * level" — the everything row, and the whole-tense row.
   */
  const [chosen, setChosen] = useState<{ tenseId: string | null; subjectKey: string | null } | null>(null);
  const [includeNotDue, setIncludeNotDue] = useState(false);
  /** Ask a whole table at once. Off by default — a question is one form. */
  const [wholeTable, setWholeTable] = useState(false);

  const [queue, setQueue] = useState<ConjugationRound[]>([]);
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  /** Person id → what the learner typed, for the round on screen. */
  const [typed, setTyped] = useState<Record<string, string>>({});
  /** Person id → hints taken, so a hint costs the box it was taken on. */
  const [hints, setHints] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  /**
   * A right answer in one-box mode, on screen while it advances itself.
   *
   * ⚠️ **Separate from `checked` so the input is never disabled**, which is
   * what would drop focus — and on native, the keyboard with it — between two
   * questions that are meant to run together.
   */
  const [flash, setFlash] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  // Leaving mid-flash — Stop, a nav click, a tab close — must not fire an
  // advance into a session that is gone.
  useEffect(() => clearAdvance, []);

  /**
   * The practice set as sections with due counts — one row per tense, each
   * opening into its patterns.
   *
   * ⚠️ **Enrolment is the outer bound.** A tense that is not in the practice set
   * has no row here; adding it is a decision made on the Topics page.
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

  /**
   * ⚠️ **Nothing here returns this page to the picker on a nav click, because
   * web already does.** `SideNav` and `BottomNav` render plain `<a href>`
   * rather than `Link`, so clicking Practice while on Practice is a document
   * navigation and every piece of this state is new. Native needs a
   * `tabPress` listener for the same behaviour; that difference is in the
   * navigator, not in the intent.
   */
  const start = () => {
    if (!spec) return;
    setQueue(buildConjugationQueue(spec, tables, progress, { includeNotDue, wholeTable }));
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
   * ⚠️ **One write for the round, not one per box.** The provider merges key by
   * key, so six ratings are one round trip — and a rating that is a blank box is
   * still `again`, because not producing a form is not knowing it.
   */
  const check = () => {
    const round = queue[index];
    if (!spec || !round || checked || flash) return;
    const updates: ConjugationProgressMap = {};
    let right = 0;
    for (const personId of round.personIds) {
      const correct = isCorrectForm(spec, round.table, personId, typed[personId] ?? '');
      if (correct) right += 1;
      const id = boxItemId(spec, round.table, personId);
      updates[id] = rateBox(progress[id], hintedVerdict(hints[personId] ?? 0, correct));
    }
    rate(updates);
    // ⚠️ One right answer to one question moves on by itself. A whole table
    // does not: there is a score to read and, usually, a form to look at.
    if (round.personIds.length === 1 && right === 1) {
      setFlash(true);
      advanceTimer.current = setTimeout(() => { setFlash(false); advance(); }, CORRECT_PAUSE_MS);
    } else {
      setChecked(true);
    }
  };

  const advance = () => {
    clearAdvance();
    setFlash(false);
    setIndex(i => i + 1);
    setTyped({});
    setHints({});
    setChecked(false);
  };

  // One component for every title in the mode, which is what stops five of
  // them drifting apart — the argument `PAGE_TITLE_SIZE` makes on native.
  const heading = (key: TranslationKey) => <PageHeader titleKey={key} />;
  const primary = 'px-5 py-2.5 rounded-lg font-mono font-bold transition-colors disabled:opacity-40';

  if (stage === 'picker') {
    return (
      <div className="max-w-2xl">
        {heading('practiceTitle')}
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
    /**
     * One row of the picker — Review's, for verbs.
     *
     * `opens` marks a row that shows a second choice rather than starting one.
     * Without the mark, a tense holding several patterns and a tense holding one
     * look identical and one of them does something you did not ask for.
     */
    const row = (
      key: string,
      label: string,
      due: number,
      total: number,
      onClick: () => void,
      opens?: boolean,
    ) => (
      <li key={key}>
        <button
          onClick={onClick}
          className="w-full text-left p-4 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
          style={{ borderColor: 'var(--color-muted)' }}
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>
              {label}
              {opens && <span className="ml-2 font-normal" style={{ color: 'var(--color-muted)' }}>›</span>}
            </span>
            <span className="font-mono text-xs shrink-0"
                  style={{ color: due > 0 ? 'var(--color-highlight)' : 'var(--color-muted)' }}>
              {due > 0
                ? t(interfaceLanguage, 'conjugationDue', { count: due })
                : t(interfaceLanguage, 'practiceNothingDue')}
            </span>
          </div>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'practiceSectionForms', { count: total })}
          </p>
        </button>
      </li>
    );

    const backLink = (label: string, onClick: () => void) => (
      <button onClick={onClick} className="font-mono text-sm transition-colors hover:opacity-80"
              style={{ color: 'var(--color-muted)' }}>
        ← {label}
      </button>
    );

    if (!spec) {
      return (
        <div className="max-w-2xl">
          {heading('munliToolConjugation')}
          <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationUnavailable')}
          </p>
        </div>
      );
    }

    /* ── The start screen for what was chosen ─────────────────────────── */
    if (chosen) {
      const label = chosen.subjectKey
        ? `${openSection?.label ?? ''} · ${openSection?.subjects.find(s => s.key === chosen.subjectKey)?.label ?? ''}`
        : chosen.tenseId
          ? sections.find(section => section.tenseId === chosen.tenseId)?.label ?? ''
          : t(interfaceLanguage, 'practiceEverything');
      return (
        <div className="max-w-2xl">
          {heading('munliToolConjugation')}
          {backLink(t(interfaceLanguage, 'practiceBackToSections'), () => setChosen(null))}
          <p className="mt-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>{label}</p>
          <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            {dueInSelection > 0
              ? t(interfaceLanguage, 'conjugationDue', { count: dueInSelection })
              : t(interfaceLanguage, 'practiceNothingDue')}
          </p>

          {/* The switch that used to be a silent fallback in the draw. It
              belongs here rather than on the list: it is about this session,
              not about which part of the set you are looking at. */}
          <label className="flex items-center gap-3 mb-3 font-mono text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
            <input type="checkbox" checked={includeNotDue} onChange={e => setIncludeNotDue(e.target.checked)} />
            {t(interfaceLanguage, 'practiceIncludeNotDue')}
          </label>
          {/* ⚠️ A different exercise, not a different packaging: it asks how
              much of a table you can produce in one go. Off by default, on the
              user's call — imposing it turned a five-second question into a
              form to fill in. */}
          <label className="flex items-center gap-3 mb-1 font-mono text-sm cursor-pointer" style={{ color: 'var(--color-text)' }}>
            <input type="checkbox" checked={wholeTable} onChange={e => setWholeTable(e.target.checked)} />
            {t(interfaceLanguage, 'practiceWholeTable')}
          </label>
          <p className="font-mono text-xs mb-6 ml-7" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'practiceWholeTableHint')}
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
        </div>
      );
    }

    /* ── One section's patterns ───────────────────────────────────────── */
    if (openSection) {
      return (
        <div className="max-w-2xl">
          {heading('munliToolConjugation')}
          {backLink(t(interfaceLanguage, 'practiceBackToSections'), () => setOpenTense(null))}
          <p className="mt-4 font-mono font-bold" style={{ color: 'var(--color-text)' }}>{openSection.label}</p>
          <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'practicePickSubject')}
          </p>
          <ul className="flex flex-col gap-3">
            {/* The whole-tense row is deliberately there and deliberately
                first — Review's reasoning, and the same one: practising the
                patterns one at a time is the same material several times. */}
            {row(
              'whole', t(interfaceLanguage, 'practiceWholeTense'), openSection.due, openSection.total,
              () => setChosen({ tenseId: openSection.tenseId, subjectKey: null }),
            )}
            {openSection.subjects.map(subject => row(
              subject.key, subject.label, subject.due, subject.total,
              () => setChosen({ tenseId: openSection.tenseId, subjectKey: subject.key }),
            ))}
          </ul>
        </div>
      );
    }

    /* ── The sections ─────────────────────────────────────────────────── */
    return (
      <div className="max-w-2xl">
        {heading('munliToolConjugation')}
        <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'practicePickSection')}
        </p>
        <ul className="flex flex-col gap-3">
          {/* Everything first, for the learner who did not sit down with one
              tense in mind — and because it is what the tool did before it had
              sections at all. */}
          {row(
            'everything', t(interfaceLanguage, 'practiceEverything'), dueCount, totalCount,
            () => setChosen({ tenseId: null, subjectKey: null }),
          )}
          {sections.map(section => row(
            section.tenseId, section.label, section.due, section.total,
            () => (section.subjects.length > 1
              ? setOpenTense(section.tenseId)
              : setChosen({ tenseId: section.tenseId, subjectKey: null })),
            section.subjects.length > 1,
          ))}
        </ul>
      </div>
    );
  }

  const round = queue[index];
  /** Boxes, not rounds: the same unit the picker counts in. */
  const total = countQuestions(queue);
  const answered = countQuestions(queue.slice(0, index));

  if (!round) {
    return (
      <div className="max-w-2xl">
        {heading(stopped ? 'practiceStoppedTitle' : 'practiceDoneTitle')}
        <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
          {stopped
            ? t(interfaceLanguage, 'practiceCount', { done: answered, total })
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

  const ready = round.personIds.every(id => (typed[id] ?? '').trim().length > 0);
  /**
   * One box or a paradigm.
   *
   * ⚠️ **Read off the round rather than from the switch that built it**, so a
   * whole-table round whose table has one box due renders as the single
   * question it actually is — which is the honest answer, not a degraded one.
   */
  const single = round.personIds.length === 1;
  const only = round.personIds[0];
  const onlyPerson = spec?.persons.find(p => p.id === only);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { clearAdvance(); setFlash(false); setStopped(true); setIndex(queue.length); }}
          className="font-mono text-sm"
          style={{ color: 'var(--color-muted)' }}
        >
          {t(interfaceLanguage, 'practiceStop')}
        </button>
        <span className="ml-auto font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'practiceCount', {
            done: answered + (checked || flash ? round.personIds.length : 0),
            total,
          })}
        </span>
      </div>

      <div className="p-8 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}>
        <p className="font-mono text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          {round.table.infinitive}
        </p>
        {/* The verb is the vehicle; the subject is what is being tested. For a
            group they differ, and the learner needs both. */}
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {single ? `${onlyPerson?.label} · ` : ''}{round.table.tenseLabel}
          {round.table.subjectKind === 'group' ? ` · ${round.table.subjectLabel}` : ''}
        </p>
        {!single && !checked && (
          <p className="font-mono text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationFillDue')}
          </p>
        )}

        {single ? (
          /* ── One box ──────────────────────────────────────────────────── */
          <div className="mt-6">
            <input
              value={typed[only] ?? ''}
              onChange={e => setTyped({ [only]: e.target.value })}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                // Enter checks, then Enter moves on — the same key all the way
                // through, so a five-second question needs no mouse.
                if (checked) advance();
                else if (ready) check();
              }}
              placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
              aria-label={`${onlyPerson?.label} · ${round.table.tenseLabel}`}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              // ⚠️ Never disabled. Disabling drops focus — and the keyboard
              // with it on a phone — between two questions meant to run
              // together; `check` guards the double-submit instead.
              readOnly={checked}
              className="w-full p-3 rounded-lg font-mono text-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
            />
            {!checked && (hints[only] ?? 0) < conjugationHints(round.table, only).length && (
              <button
                onClick={() => setHints({ [only]: (hints[only] ?? 0) + 1 })}
                className="mt-3 text-xs px-3 py-1 rounded-full border transition-colors"
                style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
              >
                {t(interfaceLanguage, 'conjugationHint')}
              </button>
            )}
            {(hints[only] ?? 0) > 0 && (
              <p className="mt-3 font-mono text-lg tracking-widest" style={{ color: 'var(--color-muted)' }}>
                {conjugationHints(round.table, only).slice(0, hints[only] ?? 0).join('  ')}
              </p>
            )}
            {/* ⚠️ Right gets said out loud. It used to be the absence of a
                correction, which reads as no feedback at all — and now that a
                right answer advances by itself, the flash is the only thing
                that says the answer landed. The glyph carries it as much as the
                colour does, since a palette can put highlight and error close
                together. */}
            {flash && (
              <p className="mt-4 font-mono text-base font-bold" style={{ color: 'var(--color-highlight)' }}>
                ✓ {t(interfaceLanguage, 'conjugationCorrect')}
              </p>
            )}
            {checked && (
              <div className="mt-4">
                <p className="font-mono text-base font-bold text-red-400">
                  ✗ {t(interfaceLanguage, 'conjugationWrong')} {round.table.forms[only]}
                </p>
                {!!(typed[only] ?? '').trim() && (
                  <p className="mt-1 font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
                    {t(interfaceLanguage, 'typedAnswerYours')}: <span className="line-through">{(typed[only] ?? '').trim()}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── A paradigm ───────────────────────────────────────────────── */
          <div className="mt-6 flex flex-col gap-2">
            {spec?.persons.map(person => {
              const due = round.personIds.includes(person.id);
              const form = round.table.forms[person.id];
              const answer = (typed[person.id] ?? '').trim();
              const correct = !!spec && isCorrectForm(spec, round.table, person.id, answer);
              const taken = hints[person.id] ?? 0;
              const hintHalves = conjugationHints(round.table, person.id);

              return (
                <div key={person.id} className="flex items-start gap-3">
                  <span className="w-20 shrink-0 pt-2 font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
                    {person.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* ⚠️ A box that is not due stays masked until the round is
                        checked: `nous parlons` on screen makes `tu parles`
                        free, and the paradigm is only reference once it has
                        been answered. */}
                    {!due ? (
                      <p className="py-2 font-mono text-lg" style={{ color: 'var(--color-muted)' }}
                         aria-label={checked ? undefined : t(interfaceLanguage, 'conjugationNotDue')}>
                        {checked ? form : '—'}
                      </p>
                    ) : checked ? (
                      <>
                        {/* A mark, not merely a colour: "nothing was corrected"
                            is what read as no feedback, and a palette can put
                            highlight and error close together. */}
                        <p className={`py-2 font-mono text-lg font-bold ${correct ? '' : 'text-red-400'}`}
                           style={correct ? { color: 'var(--color-highlight)' } : undefined}>
                          {correct ? '✓' : '✗'} {form}
                        </p>
                        {!correct && answer && (
                          <p className="font-mono text-xs line-through" style={{ color: 'var(--color-muted)' }}>
                            {answer}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          value={typed[person.id] ?? ''}
                          onChange={e => setTyped(prev => ({ ...prev, [person.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key !== 'Enter') return;
                            if (ready) check();
                          }}
                          placeholder={t(interfaceLanguage, 'conjugationAnswerPlaceholder')}
                          aria-label={`${person.label} · ${round.table.tenseLabel}`}
                          spellCheck={false}
                          autoComplete="off"
                          className="w-full p-2 rounded-lg font-mono text-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                        />
                        {taken > 0 && (
                          <p className="mt-1 font-mono text-sm tracking-widest" style={{ color: 'var(--color-muted)' }}>
                            {hintHalves.slice(0, taken).join('  ')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {/* A hint costs the box it is taken on, which is only possible
                      now that the box carries its own schedule. */}
                  {due && !checked && taken < hintHalves.length && (
                    <button
                      onClick={() => setHints(prev => ({ ...prev, [person.id]: taken + 1 }))}
                      className="mt-1.5 shrink-0 text-xs px-3 py-1 rounded-full border transition-colors"
                      style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                    >
                      {t(interfaceLanguage, 'conjugationHint')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* How the round went, said whether or not anything needs fixing. */}
        {checked && !single && (() => {
          const right = round.personIds.filter(
            id => !!spec && isCorrectForm(spec, round.table, id, (typed[id] ?? '').trim()),
          ).length;
          const all = right === round.personIds.length;
          return (
            <p className="mt-6 font-mono text-base font-bold"
               style={{ color: all ? 'var(--color-highlight)' : 'var(--color-muted)' }}>
              {all
                ? `✓ ${t(interfaceLanguage, 'conjugationAllRight')}`
                : t(interfaceLanguage, 'conjugationRoundScore', { correct: right, total: round.personIds.length })}
            </p>
          );
        })()}

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => (checked ? advance() : check())}
            disabled={flash || (!checked && !ready)}
            className={primary}
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(interfaceLanguage, checked ? 'conjugationNext' : 'conjugationCheck')}
          </button>
        </div>
      </div>
    </div>
  );
}
