'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { findSubject, getStudyLanguageConfig, isEnrolled, isUserVerb, setEnrolled } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import MultiSelect from '@/components/MultiSelect';
import { t } from '@/lib/i18n';

/**
 * One pattern or one irregular verb: its table, and which tenses are saved.
 *
 * What a row on the Verbs topic opens — a pack's page, for a verb. Every tense
 * the subject has is shown, saved or not, because reading a form is not
 * bounded by practising it; the pills above the table are what commit.
 *
 * ⚠️ **One save control per tense.** Enrolment is per subject-and-tense pair,
 * so a single Save could only say "all" or "not all", and two saved out of
 * three would read as nothing saved.
 */
export default function VerbSubjectPage() {
  const { interfaceLanguage, studyLanguage } = useUser();
  const { spec, enrolment, setEnrolment, loading } = useConjugation();
  const key = decodeURIComponent(useParams<{ subject: string }>().subject);
  const [chosenVehicle, setChosenVehicle] = useState<string | null>(null);

  const back = (
    <Link href="/munli/topics/verbs" className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
      ‹ {t(interfaceLanguage, 'verbsBack')}
    </Link>
  );
  const subject = spec && findSubject(spec, key);

  // ⚠️ Nothing paints before the snapshot lands. This page writes, and
  // `setEnrolled` on an enrolment that has not arrived would save the default
  // set plus one change over the learner's real one. A verb the learner added
  // is also not in the spec until then, so "not found" would be premature.
  if (loading || !spec || !enrolment || !subject) {
    return (
      <div className="max-w-2xl">
        {back}
        <p className="font-mono text-sm mt-4" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
        </p>
      </div>
    );
  }

  const tenses = spec.tenses.filter(tense => subject.kind === 'group' || subject.forms[tense.id]);
  const vehicle = subject.kind === 'group' ? chosenVehicle ?? subject.vehicles[0] : subject.infinitive;

  return (
    <div className="max-w-2xl">
      {back}
      <div className="flex items-center gap-3 mt-2 mb-4">
        <h1 className="font-mono text-2xl font-bold flex-1" style={{ color: 'var(--color-highlight)' }}>
          {subject.kind === 'group' ? subject.label : subject.infinitive}
        </h1>
        {/* Which verb the pattern is shown through. The learner's own are
            marked, since choosing one puts unverified forms in the table. */}
        {subject.kind === 'group' && subject.vehicles.length > 1 && (
          <MultiSelect
            label={t(interfaceLanguage, 'verbsFilterVerb')}
            options={subject.vehicles.map(verb => ({
              key: verb,
              label: isUserVerb(spec, verb) ? `${verb} · ${t(interfaceLanguage, 'verbUnverifiedTag')}` : verb,
            }))}
            selected={vehicle}
            onToggle={setChosenVehicle}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tenses.map(tense => {
          const on = isEnrolled(enrolment, subject, tense.id);
          return (
            <button
              key={tense.id}
              aria-pressed={on}
              aria-label={t(interfaceLanguage, on ? 'verbsSaved' : 'verbsSave', { tense: tense.label })}
              onClick={() => setEnrolment(setEnrolled(enrolment, subject, [tense.id], !on))}
              className="px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors"
              style={on
                ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                : { color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
            >
              {on ? '✓' : '+'} {tense.label}
            </button>
          );
        })}
      </div>
      <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsSaveHint')}
      </p>

      <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} />
    </div>
  );
}
