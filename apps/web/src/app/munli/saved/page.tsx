'use client';
import { useMemo, useState } from 'react';
import { daysUntil, listSavedKinds, setEnrolled } from '@amgi/core';
import type { ConjugationSavedSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import PageHeader from '@/components/PageHeader';
import { t } from '@/lib/i18n';

/**
 * Saved — an inventory of what you have taken on, and where you take it back out.
 *
 * ⚠️ **Tiles on shelves, not a list of rows**, on the user's call after using
 * the list: *"the saved tab should have verbs as tiles like items in an
 * inventory … an inventory of grammar tools used for challenges in
 * communication"*. Three levels — **kind → item → detail** — which is the split
 * Topics already makes between regular and irregular, mirrored here so the
 * catalogue and the inventory describe one set the same way.
 *
 * ⚠️ **The detail is where a tense gets explained.** A chip selects one tense,
 * the table shows that tense, and under it is a **sourced** note on what the
 * tense is for — tiered and cited in
 * `docs/packs/french-tense-notes-draft.md`, because when a French speaker
 * reaches for the imparfait is a claim about French and not a thing to
 * generate.
 *
 * ⚠️ **Removing is a button, not the chip.** On Topics a pill both shows and
 * toggles enrolment; here the chip's job is to choose what you are reading, so
 * the destructive action needs a control of its own rather than the same tap
 * meaning two things on two screens.
 *
 * Levels are local state rather than routes, the way Practice's stages are:
 * nothing here is worth linking to, and a nested route per level is the thing
 * that makes expo-router draw a tab icon per screen on native.
 */
export default function SavedPage() {
  const { interfaceLanguage } = useUser();
  const { spec, progress, enrolment, setEnrolment } = useConjugation();
  const [openKind, setOpenKind] = useState<string | null>(null);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  /** `null` reads as "the first tense worth opening" — see `shownTense`. */
  const [chosenTense, setChosenTense] = useState<string | null>(null);

  const shelves = useMemo(
    () => (spec && enrolment ? listSavedKinds(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );
  const shelf = shelves.find(s => s.kind === openKind);
  const subject = shelf?.subjects.find(s => s.key === openSubject);
  /**
   * Which tense the detail opens on: the first with something due, else the
   * first saved. A screen you opened to practise from should not make you find
   * the work.
   */
  const shownTense = subject
    ? chosenTense ?? (subject.tenses.find(x => x.due > 0) ?? subject.tenses[0])?.tenseId
    : undefined;
  const tense = subject?.tenses.find(x => x.tenseId === shownTense);
  const specTense = spec?.tenses.find(x => x.id === shownTense);

  const open = (next: () => void) => () => { next(); setChosenTense(null); };

  const backLink = (label: string, onClick: () => void) => (
    <button onClick={onClick} className="font-mono text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-muted)' }}>
      ← {label}
    </button>
  );

  /** One tile. Square-ish, a name, what is in it, and what is owed. */
  const tile = (key: string, label: string, sub: string, due: number, onClick: () => void) => (
    <button
      key={key}
      onClick={onClick}
      className="flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-colors hover:bg-[var(--color-muted)]/20"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)', minHeight: '6.5rem' }}
    >
      <span className="font-mono font-bold text-lg" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{sub}</span>
      <span className="mt-auto font-mono text-xs"
            style={{ color: due > 0 ? 'var(--color-highlight)' : 'var(--color-muted)', fontWeight: due > 0 ? 700 : 400 }}>
        {due > 0
          ? t(interfaceLanguage, 'conjugationDue', { count: due })
          : t(interfaceLanguage, 'practiceNothingDue')}
      </span>
    </button>
  );

  const grid = 'grid grid-cols-2 sm:grid-cols-3 gap-3';

  if (!spec || !enrolment) {
    return (
      <div className="max-w-2xl">
        <PageHeader titleKey="savedTitle" className="mb-1" />
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      </div>
    );
  }

  /* ── The detail: one subject, one tense at a time ────────────────────── */
  if (shelf && subject && tense && specTense) {
    return (
      <div className="max-w-2xl">
        <PageHeader titleKey="savedTitle" className="mb-4" />
        {backLink(
          t(interfaceLanguage, shelf.kind === 'group' ? 'topicRegularVerbs' : 'verbsIrregular'),
          () => { setOpenSubject(null); setChosenTense(null); },
        )}
        <h2 className="mt-4 font-mono text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          {subject.label}
        </h2>
        <p className="font-mono text-xs mb-4" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'savedTenseCount', { count: subject.tenses.length })}
        </p>

        {/* ⚠️ Single-select: the chip chooses what you are reading, so two of
            them lit would be two answers to one question. */}
        <div className="flex flex-wrap gap-2 mb-2">
          {subject.tenses.map(x => {
            const on = x.tenseId === tense.tenseId;
            return (
              <button
                key={x.tenseId}
                aria-pressed={on}
                onClick={() => setChosenTense(x.tenseId)}
                className="px-3 py-1.5 rounded-full text-sm font-mono border transition-colors"
                style={on
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
              >
                {x.label}{x.due > 0 ? ` · ${x.due}` : ''}
              </button>
            );
          })}
        </div>
        <p className="font-mono text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
          {tense.due > 0
            ? t(interfaceLanguage, 'conjugationDue', { count: tense.due })
            : subject.dueAt
              ? t(interfaceLanguage, 'savedDueIn', { days: daysUntil(subject.dueAt) })
              : t(interfaceLanguage, 'practiceNothingDue')}
        </p>

        {/* The tally, where it is worth reading: this is the screen you are on
            because you wanted to know how a pattern is going. */}
        {subject.weakBoxes.length > 0 && (
          <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'savedMissed', {
              list: subject.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
            })}
          </p>
        )}

        <ParadigmTable spec={spec} subject={subject.subject} tenseIds={[tense.tenseId]} />

        {/* The sourced half — absent rather than invented for a tense with no
            note, which is why the keys are optional on the spec. */}
        {specTense.aboutLeadKey && specTense.aboutPointsKey && (
          <div className="mt-8">
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'savedAbout')}
            </p>
            <p className="font-mono text-sm mb-3" style={{ color: 'var(--color-text)' }}>
              {t(interfaceLanguage, specTense.aboutLeadKey)}
            </p>
            <ul className="flex flex-col gap-2">
              {t(interfaceLanguage, specTense.aboutPointsKey).split('\n').map(point => (
                <li key={point} className="flex gap-2 font-mono text-sm" style={{ color: 'var(--color-text)', opacity: 0.75 }}>
                  <span style={{ color: 'var(--color-muted)' }}>·</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => {
            setEnrolment(setEnrolled(enrolment, subject.subject, [tense.tenseId], false));
            setChosenTense(null);
          }}
          aria-label={t(interfaceLanguage, 'savedRemoveLabel', { tense: tense.label })}
          className="mt-10 px-4 py-2 rounded-lg text-sm font-mono border transition-colors hover:bg-[var(--color-muted)]/20"
          style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
        >
          {t(interfaceLanguage, 'savedRemove')}
        </button>
      </div>
    );
  }

  /* ── One shelf: the items on it ──────────────────────────────────────── */
  if (shelf) {
    return (
      <div className="max-w-2xl">
        <PageHeader titleKey="savedTitle" className="mb-4" />
        {backLink(t(interfaceLanguage, 'savedTitle'), () => setOpenKind(null))}
        <h2 className="mt-4 mb-4 font-mono text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          {t(interfaceLanguage, shelf.kind === 'group' ? 'topicRegularVerbs' : 'verbsIrregular')}
        </h2>
        <div className={grid}>
          {shelf.subjects.map((s: ConjugationSavedSubject) => tile(
            s.key, s.label,
            s.started === 0
              ? t(interfaceLanguage, 'savedNotStarted')
              : t(interfaceLanguage, 'savedTenseCount', { count: s.tenses.length }),
            s.due,
            open(() => setOpenSubject(s.key)),
          ))}
        </div>
      </div>
    );
  }

  /* ── The shelves ─────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl">
      <PageHeader titleKey="savedTitle" className="mb-1" />
      {shelves.length === 0 ? (
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'savedEmpty')}
        </p>
      ) : (
        <>
          <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'savedIntro')}
          </p>
          <div className={grid}>
            {shelves.map(s => tile(
              s.kind,
              t(interfaceLanguage, s.kind === 'group' ? 'topicRegularVerbs' : 'verbsIrregular'),
              t(interfaceLanguage, 'savedKindSaved', { count: s.subjects.length }),
              s.due,
              open(() => { setOpenKind(s.kind); setOpenSubject(null); }),
            ))}
          </div>
        </>
      )}
    </div>
  );
}
