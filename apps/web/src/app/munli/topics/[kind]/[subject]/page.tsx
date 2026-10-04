'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { findSubject, getStudyLanguageConfig, isEnrolled, isUserVerb, setEnrolled } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import TenseCards from '@/components/TenseCards';
import MultiSelect from '@/components/MultiSelect';
import { t } from '@/lib/i18n';

/**
 * One pattern or one irregular verb: its table, and which tenses are saved.
 *
 * What a row on the Verbs topic opens — a pack's page, for a verb, with a card
 * per tense where a pack has a section per subpack. Every tense the subject
 * has is shown, saved or not, because reading a form is not bounded by
 * practising it; the Save on a card is what commits.
 *
 * ⚠️ **One save control per tense, on its card.** Enrolment is per
 * subject-and-tense pair, so a single Save could only say "all" or "not all",
 * and two saved out of three would read as nothing saved.
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

  const vehicle = subject.kind === 'group' ? chosenVehicle ?? subject.vehicles[0] : subject.infinitive;

  return (
    <div className="max-w-2xl">
      {back}
      <div className="flex items-center gap-3 mt-2">
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

      <TenseCards
        spec={spec}
        subject={subject}
        vehicle={vehicle}
        notes
        isSaved={tenseId => isEnrolled(enrolment, subject, tenseId)}
        onToggleSave={(tenseId, save) => setEnrolment(setEnrolled(enrolment, subject, [tenseId], save))}
      />
    </div>
  );
}
