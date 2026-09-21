'use client';
import { buildParadigm } from '@amgi/core';
import type { ConjugationSpec, ConjugationSubject } from '@amgi/core';

/**
 * A verb's paradigm: persons down, tenses across.
 *
 * Shared by the Topics detail and the Tables page so one table cannot disagree
 * with the other — the same reason `buildParadigm` is in core.
 *
 * `tenseIds` narrows the columns. Topics omits it and shows every tense the
 * language has, because reading a form is not bounded by having enrolled it;
 * Tables passes the one tense a row is about.
 */
export default function ParadigmTable({
  spec, subject, vehicle, tenseIds,
}: {
  spec: ConjugationSpec;
  subject: ConjugationSubject;
  vehicle?: string;
  tenseIds?: readonly string[];
}) {
  const tenses = buildParadigm(spec, subject, vehicle)
    .filter(tense => (tenseIds ? tenseIds.includes(tense.tenseId) : true));

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="font-mono text-sm border-collapse">
        <thead>
          <tr>
            <th />
            {tenses.map(tense => (
              <th key={tense.tenseId} className="px-3 py-1.5 text-left text-xs uppercase tracking-widest font-normal"
                  style={{ color: 'var(--color-muted)' }}>
                {tense.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.persons.map(person => (
            <tr key={person.id} className="border-t" style={{ borderColor: 'var(--color-muted)' }}>
              <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>{person.label}</td>
              {tenses.map(tense => (
                <td key={tense.tenseId} className="px-3 py-1.5 whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
                  {tense.forms[person.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
