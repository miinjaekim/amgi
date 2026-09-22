'use client';
import { useMemo, useState } from 'react';
import { daysUntil, listSavedSubjects, setEnrolled } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import { t } from '@/lib/i18n';

/**
 * Saved — what you have taken on, and where you take it back out.
 *
 * ⚠️ **Three surfaces, three questions.** Topics is the catalogue you add from,
 * Progress is the totals, and this is the set you curate: every pattern you
 * practise, with the tenses saved under it. Amgi has exactly this split — Packs
 * adds, Cards curates — and it is why none of the three has to be a dashboard.
 *
 * ⚠️ **It manages something, which is the half it did not have.** It was a flat
 * list of `-er · présent` rows that only read; saving and unsaving lived on
 * Topics. A pill here is the **same control and the same semantics** as Topics'
 * save pill — `setEnrolled` on one subject-and-tense pair — rather than a
 * second way to say the same thing.
 *
 * ⚠️ **Grained by pattern, where Practice is grained by tense.** The two
 * surfaces answer different questions off one enrolment: "what have I taken on"
 * against "what should I sit down to".
 */
export default function SavedPage() {
  const { interfaceLanguage } = useUser();
  const { spec, progress, enrolment, setEnrolment } = useConjugation();
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(
    () => (spec && enrolment ? listSavedSubjects(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'savedTitle')}
      </h1>

      {!spec || !enrolment ? (
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      ) : rows.length === 0 ? (
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'savedEmpty')}
        </p>
      ) : (
        <>
          <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'savedIntro')}
          </p>
          {rows.map(row => {
            const isOpen = open === row.key;
            return (
              <div key={row.key} className="border-b pb-3" style={{ borderColor: 'var(--color-muted)' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : row.key)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 pt-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {row.label}
                    </span>
                    {row.weakBoxes.length > 0 && (
                      <span className="block font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                        {t(interfaceLanguage, 'savedMissed', {
                          list: row.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
                        })}
                      </span>
                    )}
                  </span>
                  {/* Three states, not two: never practised is not the same as
                      due, even though a session treats them alike. */}
                  <span
                    className="font-mono text-xs whitespace-nowrap"
                    style={{ color: row.due > 0 ? 'var(--color-highlight)' : 'var(--color-muted)', fontWeight: row.due > 0 ? 700 : 400 }}
                  >
                    {row.started === 0
                      ? t(interfaceLanguage, 'savedNotStarted')
                      : row.due > 0
                        ? t(interfaceLanguage, 'conjugationDue', { count: row.due })
                        : t(interfaceLanguage, 'savedDueIn', { days: daysUntil(row.dueAt!) })}
                  </span>
                </button>

                {/* ⚠️ A pill per saved tense, carrying its own due count and
                    toggling exactly its own pair — Topics' rule, for the same
                    reason: a control that cannot state its own answer makes two
                    saved out of three read as nothing saved. */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {row.tenses.map(tense => (
                    <button
                      key={tense.tenseId}
                      aria-label={t(interfaceLanguage, 'savedRemove', { tense: tense.label })}
                      onClick={() => setEnrolment(setEnrolled(enrolment, row.subject, [tense.tenseId], false))}
                      className="px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors"
                      style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }}
                    >
                      ✓ {tense.label}
                      {tense.due > 0 && ` · ${tense.due}`}
                    </button>
                  ))}
                </div>

                {isOpen && (
                  <ParadigmTable
                    spec={spec}
                    subject={row.subject}
                    tenseIds={row.tenses.map(tense => tense.tenseId)}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
