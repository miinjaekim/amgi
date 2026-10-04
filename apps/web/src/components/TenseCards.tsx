'use client';
import { Fragment, useState } from 'react';
import { buildParadigm, isUserVerb } from '@amgi/core';
import type { ConjugationSpec, ConjugationSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/** Past this many tenses, a card that is not saved starts closed. */
const ALL_OPEN_UP_TO = 3;

/**
 * A verb's paradigm as a card per tense, stacked.
 *
 * ⚠️ **The tense is the row, not the column** — the user's call, 2026-10-04.
 * This was one table with a column per tense and a row of save chips above
 * it: it scrolled sideways with no sign of how far, each new tense made it
 * wider, and a chip had to be matched by name to the column it saved. A card
 * per tense grows downward, and carries its own Save in its header, the way a
 * subpack does on a pack's page.
 *
 * Inside a card the persons run in two columns, singular then plural, which is
 * how a paradigm is printed and fits a phone without scrolling.
 *
 * Shared by the Verbs topic and Saved so one cannot disagree with the other —
 * the same reason `buildParadigm` is in core. `tenseIds` narrows which tenses
 * are shown; Saved passes the one a row is about. Without `onToggleSave` a
 * card has no Save, for a surface that manages saving its own way.
 *
 * ⚠️ **A verb the learner added is labelled here, under its forms.** They came
 * from the model, and saying so wherever they are shown is the condition
 * `docs/packs/README.md` allows them on. In this component rather than on each
 * page, so a new surface that shows a paradigm cannot forget it.
 */
export default function TenseCards({
  spec, subject, vehicle, tenseIds, isSaved, onToggleSave, notes = false,
}: {
  spec: ConjugationSpec;
  subject: ConjugationSubject;
  vehicle?: string;
  tenseIds?: readonly string[];
  isSaved?: (tenseId: string) => boolean;
  onToggleSave?: (tenseId: string, save: boolean) => void;
  /** Show each tense's one-line note, where the language has a sourced one. */
  notes?: boolean;
}) {
  const { interfaceLanguage } = useUser();
  const [opened, setOpened] = useState<readonly string[]>([]);
  const tenses = buildParadigm(spec, subject, vehicle)
    .filter(tense => (tenseIds ? tenseIds.includes(tense.tenseId) : true));
  // The verb `buildTable` lands on: the subject itself, or the group's vehicle.
  const shown = subject.kind === 'verb'
    ? subject.infinitive
    : vehicle && subject.vehicles.includes(vehicle) ? vehicle : subject.vehicles[0];
  // Reading the forms is the point, so everything is open while it fits. Once
  // a language has more tenses, the ones not being practised fold to a line.
  const foldable = tenses.length > ALL_OPEN_UP_TO;
  const half = Math.ceil(spec.persons.length / 2);
  const columns = [spec.persons.slice(0, half), spec.persons.slice(half)];

  return (
    <div className="mt-4 flex flex-col gap-3">
      {tenses.map(tense => {
        const saved = isSaved?.(tense.tenseId) ?? false;
        const open = !foldable || saved || opened.includes(tense.tenseId);
        const specTense = spec.tenses.find(x => x.id === tense.tenseId);
        return (
          <section key={tense.tenseId} className="rounded-xl border p-4" style={{ borderColor: 'var(--color-muted)' }}>
            <div className="flex items-center gap-3">
              <h3 className="font-mono font-bold flex-1" style={{ color: 'var(--color-text)' }}>{tense.label}</h3>
              {onToggleSave && (
                <button
                  aria-pressed={saved}
                  aria-label={t(interfaceLanguage, saved ? 'verbsSaved' : 'verbsSave', { tense: tense.label })}
                  onClick={() => onToggleSave(tense.tenseId, !saved)}
                  className="px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-colors"
                  style={saved
                    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                    : { color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
                >
                  {saved ? `✓ ${t(interfaceLanguage, 'writingCardSaved')}` : t(interfaceLanguage, 'save')}
                </button>
              )}
            </div>

            {open ? (
              <div className="mt-3 grid grid-cols-2 gap-x-6 font-mono text-sm">
                {columns.map((persons, column) => (
                  // The label column is as wide as its longest label and no
                  // wider, so the form sits right beside its person.
                  <div key={column} className="grid grid-cols-[max-content_1fr] gap-x-3 content-start">
                    {persons.map(person => (
                      <Fragment key={person.id}>
                        <span className="py-1 whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{person.label}</span>
                        <span className="py-1 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>{tense.forms[person.id]}</span>
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setOpened(prev => [...prev, tense.tenseId])}
                className="mt-2 block w-full text-left font-mono text-sm truncate"
                style={{ color: 'var(--color-muted)' }}
              >
                {spec.persons.slice(0, 3).map(person => tense.forms[person.id]).join(', ')}… ▾
              </button>
            )}

            {open && notes && specTense?.aboutLeadKey && (
              <p className="font-mono text-xs mt-3" style={{ color: 'var(--color-muted)' }}>
                {t(interfaceLanguage, specTense.aboutLeadKey)}
              </p>
            )}
          </section>
        );
      })}
      {isUserVerb(spec, shown) && (
        <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'verbUnverified')}
        </p>
      )}
    </div>
  );
}
