'use client';
import { useMemo, useState } from 'react';
import { enrolledTenses, isEnrolled, setEnrolled } from '@amgi/core';
import type { ConjugationSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import { t } from '@/lib/i18n';

/**
 * Verbs: read any table, save the ones you want to practise.
 *
 * ⚠️ **Content first, saving second — the decks page's shape, not a form.**
 * ⚠️ **The tense chips are a *view*; Save is what commits.** Selecting the
 * imparfait shows it without enrolling it, which is how somebody decides whether
 * to take it on.
 *
 * **One verb at a time, across tenses.** The verbs inside a group conjugate
 * identically, so a column per verb would print one pattern three times; the
 * chips swap which verb the pattern lands on instead.
 */
export default function VerbsTopicPage() {
  const { interfaceLanguage } = useUser();
  const { spec, enrolment, setEnrolment } = useConjugation();
  const [chosenTenses, setChosenTenses] = useState<string[] | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, string>>({});

  /** `null` reads as the tenses already saved, so the page opens on what is being practised. */
  const tenseIds = useMemo(() => {
    if (chosenTenses) return chosenTenses;
    if (!spec || !enrolment) return [];
    const saved = enrolledTenses(spec, enrolment).map(tense => tense.id);
    return saved.length > 0 ? saved : [spec.tenses[0].id];
  }, [chosenTenses, spec, enrolment]);

  if (!spec || !enrolment) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>
          {t(interfaceLanguage, 'topicVerbs')}
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      </div>
    );
  }

  const chip = (label: string, on: boolean, onClick: () => void, key: string) => (
    <button
      key={key}
      aria-pressed={on}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-mono border transition-colors"
      style={on
        ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
        : { color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
    >
      {label}
    </button>
  );

  const section = (subject: ConjugationSubject) => {
    const key = `${subject.kind}:${subject.id}`;
    const vehicleList = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    const vehicle = vehicles[key] ?? vehicleList[0];
    const shown = tenseIds.filter(id => subject.kind === 'group' || subject.forms[id]);
    const savedCount = shown.filter(id => isEnrolled(enrolment, subject, id)).length;
    const allSaved = shown.length > 0 && savedCount === shown.length;

    return (
      <section key={key} className="pb-6 mb-6 border-b" style={{ borderColor: 'var(--color-muted)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-mono text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {subject.kind === 'group' ? subject.label : subject.infinitive}
            </h2>
            <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {t(interfaceLanguage, 'verbsSavedCount', { saved: savedCount, total: shown.length })}
            </p>
          </div>
          {/* Saves whatever tenses are being looked at — the decks pattern of
              committing what is in front of you. */}
          <button
            onClick={() => setEnrolment(setEnrolled(enrolment, subject, shown, !allSaved))}
            aria-pressed={allSaved}
            className="px-4 py-1.5 rounded-full text-sm font-mono font-bold border transition-colors"
            style={allSaved
              ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
              : { color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}
          >
            {t(interfaceLanguage, allSaved ? 'verbsSaved' : 'verbsSave')}
          </button>
        </div>

        {vehicleList.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {vehicleList.map(candidate => chip(
              candidate,
              candidate === vehicle,
              () => setVehicles(prev => ({ ...prev, [key]: candidate })),
              candidate,
            ))}
          </div>
        )}

        <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} tenseIds={shown} />
      </section>
    );
  };

  const groups = spec.subjects.filter(s => s.kind === 'group');
  const irregulars = spec.subjects.filter(s => s.kind === 'verb');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'topicVerbs')}
      </h1>
      <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIntro')}
      </p>

      <div className="flex flex-wrap gap-2 mb-2">
        {spec.tenses.map(tense => chip(
          tense.label,
          tenseIds.includes(tense.id),
          () => setChosenTenses(tenseIds.includes(tense.id)
            ? tenseIds.filter(id => id !== tense.id)
            : [...tenseIds, tense.id]),
          tense.id,
        ))}
      </div>
      <p className="font-mono text-xs mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsReference')}
      </p>

      {tenseIds.length === 0
        ? <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationPickTense')}
          </p>
        : groups.map(section)}

      <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIrregular')}
      </p>
      {irregulars.length === 0
        ? <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'verbsIrregularEmpty')}
          </p>
        : irregulars.map(section)}
    </div>
  );
}
