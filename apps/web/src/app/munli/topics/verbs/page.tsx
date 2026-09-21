'use client';
import { useState } from 'react';
import { subjectKey } from '@amgi/core';
import type { ConjugationSubject } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import ParadigmTable from '@/components/ParadigmTable';
import { t } from '@/lib/i18n';

/**
 * Verbs: what is practised, and what the forms actually are.
 *
 * ⚠️ **Two jobs on one page, deliberately** — an enrolment checklist *and*
 * somewhere to look a form up. Every group carries a chip per verb, and opening
 * one shows that verb's whole paradigm: persons down, tenses across.
 *
 * ⚠️ **The reference shows every tense, enrolled or not.** Enrolment bounds what
 * is practised and has no business bounding what can be read.
 */
export default function VerbsTopicPage() {
  const { interfaceLanguage } = useUser();
  const { spec, enrolment, setEnrolment } = useConjugation();
  /** Which verb's table is open, by `${subjectKey}:${vehicle}`. One at a time. */
  const [openVerb, setOpenVerb] = useState<string | null>(null);

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

  /** ⚠️ The last one cannot be removed — an empty practice set reads as broken. */
  const toggle = (list: string[], id: string, onNext: (next: string[]) => void) => {
    const on = list.includes(id);
    if (on && list.length === 1) return;
    onNext(on ? list.filter(x => x !== id) : [...list, id]);
  };

  const subjectBlock = (subject: ConjugationSubject) => {
    const key = subjectKey(subject);
    const on = enrolment.subjects.includes(key);
    const vehicles = subject.kind === 'group' ? subject.vehicles : [subject.infinitive];
    return (
      <div key={key} className="py-3 border-b" style={{ borderColor: 'var(--color-muted)' }}>
        <label className="flex items-center gap-3 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={on}
            onChange={() => toggle(enrolment.subjects, key, next => setEnrolment({ ...enrolment, subjects: next }))}
          />
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {subject.kind === 'group' ? subject.label : subject.infinitive}
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {vehicles.map(vehicle => {
            const id = `${key}:${vehicle}`;
            const open = openVerb === id;
            return (
              <button
                key={vehicle}
                aria-expanded={open}
                onClick={() => setOpenVerb(open ? null : id)}
                className="px-2.5 py-1 rounded-full text-xs font-mono border transition-colors"
                style={open
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
              >
                {vehicle}
              </button>
            );
          })}
        </div>
        {vehicles.map(vehicle => (openVerb === `${key}:${vehicle}` ? (
          <div key={`${vehicle}-table`}>
            <ParadigmTable spec={spec} subject={subject} vehicle={vehicle} />
          </div>
        ) : null))}
      </div>
    );
  };

  const groups = spec.subjects.filter(s => s.kind === 'group');
  const irregulars = spec.subjects.filter(s => s.kind === 'verb');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'topicVerbs')}
      </h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIntro')}
      </p>

      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsTenses')}
      </p>
      {spec.tenses.map(tense => (
        <label key={tense.id} className="flex items-center gap-3 py-3 border-b cursor-pointer"
               style={{ borderColor: 'var(--color-muted)' }}>
          <input
            type="checkbox"
            checked={enrolment.tenses.includes(tense.id)}
            onChange={() => toggle(enrolment.tenses, tense.id, next => setEnrolment({ ...enrolment, tenses: next }))}
          />
          <span className="font-mono text-sm" style={{ color: 'var(--color-text)' }}>{tense.label}</span>
        </label>
      ))}

      <p className="text-xs font-mono uppercase tracking-widest mt-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsGroups')}
      </p>
      <p className="font-mono text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsReference')}
      </p>
      {groups.map(subjectBlock)}

      <p className="text-xs font-mono uppercase tracking-widest mt-8 mb-1" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIrregular')}
      </p>
      {irregulars.length === 0 ? (
        <p className="font-mono text-xs py-3" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'verbsIrregularEmpty')}
        </p>
      ) : irregulars.map(subjectBlock)}
    </div>
  );
}
