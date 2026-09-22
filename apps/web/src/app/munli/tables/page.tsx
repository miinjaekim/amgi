'use client';
import { useMemo, useState } from 'react';
import { daysUntil, findSubject, listPracticeTables } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import { t } from '@/lib/i18n';

/**
 * What you are learning — Munli's answer to Amgi's Cards.
 *
 * ⚠️ **Three surfaces, three questions.** Topics is the catalogue you add from,
 * Progress is the totals, and this is the inventory: every table in the practice
 * set with how it is going. Amgi has exactly this split, and it is why none of
 * its three has to be a dashboard.
 *
 * ⚠️ **It lists what is not due as well** — `dueRounds` answers "what now" and a
 * session is built from it; an inventory that hid what you had learned would be
 * a strange inventory.
 *
 * ⚠️ **A row's count is in boxes**, because a box is what carries a schedule:
 * `-er · présent` is six facts, and "3 due" is the honest thing to say about it.
 */
export default function TablesPage() {
  const { interfaceLanguage } = useUser();
  const { spec, progress, enrolment } = useConjugation();
  const [open, setOpen] = useState<string | null>(null);

  const items = useMemo(
    () => (spec && enrolment ? listPracticeTables(spec, enrolment, progress) : []),
    [spec, enrolment, progress],
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'tablesTitle')}
      </h1>

      {!spec ? (
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      ) : items.length === 0 ? (
        <p className="font-mono text-sm mt-6" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'tablesEmpty')}
        </p>
      ) : (
        <>
          <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'tablesIntro')}
          </p>
          {items.map(item => {
            const subject = findSubject(spec, `${item.table.subjectKind}:${item.table.subjectId}`);
            const isOpen = open === item.itemId;
            return (
              <div key={item.itemId} className="border-b pb-2" style={{ borderColor: 'var(--color-muted)' }}>
                <button
                  onClick={() => setOpen(isOpen ? null : item.itemId)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm" style={{ color: 'var(--color-text)' }}>
                      {item.table.subjectLabel} · {item.table.tenseLabel}
                    </span>
                    {item.weakBoxes.length > 0 && (
                      <span className="block font-mono text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                        {t(interfaceLanguage, 'tablesMissed', {
                          list: item.weakBoxes.slice(0, 3).map(b => b.personLabel).join(', '),
                        })}
                      </span>
                    )}
                  </span>
                  {/* Three states, not two: never practised is not the same as
                      due, even though a session treats them alike. */}
                  <span
                    className="font-mono text-xs whitespace-nowrap"
                    style={{ color: item.due ? 'var(--color-highlight)' : 'var(--color-muted)', fontWeight: item.due ? 700 : 400 }}
                  >
                    {item.started === 0
                      ? t(interfaceLanguage, 'tablesNotStarted')
                      : item.due
                        ? t(interfaceLanguage, 'conjugationDue', { count: item.dueCount })
                        : t(interfaceLanguage, 'tablesDueIn', { days: daysUntil(item.dueAt!) })}
                  </span>
                </button>
                {isOpen && subject && (
                  <ParadigmTable spec={spec} subject={subject} tenseIds={[item.table.tenseId]} />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
