'use client';
import { buildParadigm, isUserVerb } from '@amgi/core';
import type { ConjugationSpec, ConjugationSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/**
 * A verb's paradigm: persons down, tenses across.
 *
 * Shared by the Topics detail and the Tables page so one table cannot disagree
 * with the other — the same reason `buildParadigm` is in core.
 *
 * `tenseIds` narrows the columns. Topics omits it and shows every tense the
 * language has, because reading a form is not bounded by having enrolled it;
 * Tables passes the one tense a row is about.
 *
 * ⚠️ **A verb the learner added is labelled here, under its forms.** They came
 * from the model, and saying so wherever they are shown is the condition
 * `docs/packs/README.md` allows them on. In the table rather than on each page,
 * so a new surface that shows a paradigm cannot forget it.
 */
export default function ParadigmTable({
  spec, subject, vehicle, tenseIds,
}: {
  spec: ConjugationSpec;
  subject: ConjugationSubject;
  vehicle?: string;
  tenseIds?: readonly string[];
}) {
  const { interfaceLanguage } = useUser();
  const tenses = buildParadigm(spec, subject, vehicle)
    .filter(tense => (tenseIds ? tenseIds.includes(tense.tenseId) : true));
  // The verb `buildTable` lands on: the subject itself, or the group's vehicle.
  const shown = subject.kind === 'verb'
    ? subject.infinitive
    : vehicle && subject.vehicles.includes(vehicle) ? vehicle : subject.vehicles[0];

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
      {isUserVerb(spec, shown) && (
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'verbUnverified')}
        </p>
      )}
    </div>
  );
}
