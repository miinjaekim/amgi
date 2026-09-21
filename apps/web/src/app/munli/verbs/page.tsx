'use client';
import { subjectKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import { t } from '@/lib/i18n';

/**
 * The practice set — what conjugation practice draws from at all.
 *
 * ⚠️ **A different job from the setup screen.** Setup chooses what to cover
 * *this session* and resets; this chooses what exists to be covered, and
 * persists. The same split Amgi already has between enrolling a pack and
 * picking a collection to review.
 *
 * **Progression lives here**, chosen by the learner: a beginner practises the
 * présent and adds the imparfait when they are ready. Nothing reads a level off
 * anything.
 */
export default function VerbsPage() {
  const { interfaceLanguage } = useUser();
  const { spec, enrolment, setEnrolment } = useConjugation();

  if (!spec || !enrolment) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>
          {t(interfaceLanguage, 'verbsTitle')}
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      </div>
    );
  }

  const groups = spec.subjects.filter(s => s.kind === 'group');
  const irregulars = spec.subjects.filter(s => s.kind === 'verb');

  /**
   * ⚠️ The last one cannot be removed. An empty practice set reads as broken
   * rather than as a choice, and `normalizeEnrolment` would silently refill it
   * — which is worse than refusing the click.
   */
  const toggle = (list: string[], id: string, onNext: (next: string[]) => void) => {
    const on = list.includes(id);
    if (on && list.length === 1) return;
    onNext(on ? list.filter(x => x !== id) : [...list, id]);
  };

  const check = (on: boolean, label: string, sub: string | null, onClick: () => void) => (
    <label
      key={label}
      className="flex items-center gap-3 py-3 border-b cursor-pointer"
      style={{ borderColor: 'var(--color-muted)' }}
    >
      <input type="checkbox" checked={on} onChange={onClick} />
      <span className="min-w-0">
        <span className="block font-mono text-sm" style={{ color: 'var(--color-text)' }}>{label}</span>
        {sub && <span className="block font-mono text-xs truncate" style={{ color: 'var(--color-muted)' }}>{sub}</span>}
      </span>
    </label>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'verbsTitle')}
      </h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIntro')}
      </p>

      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsTenses')}
      </p>
      {spec.tenses.map(tense => check(
        enrolment.tenses.includes(tense.id),
        tense.label,
        null,
        () => toggle(enrolment.tenses, tense.id, next => setEnrolment({ ...enrolment, tenses: next })),
      ))}

      <p className="text-xs font-mono uppercase tracking-widest mt-8 mb-1" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsGroups')}
      </p>
      {groups.map(group => check(
        enrolment.subjects.includes(subjectKey(group)),
        group.kind === 'group' ? group.label : '',
        // The verbs a group is practised through, named so the set is not a
        // black box: the learner produces the ending, but still sees which
        // words it will arrive on.
        group.kind === 'group' ? group.vehicles.join(', ') : null,
        () => toggle(enrolment.subjects, subjectKey(group), next => setEnrolment({ ...enrolment, subjects: next })),
      ))}

      <p className="text-xs font-mono uppercase tracking-widest mt-8 mb-1" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIrregular')}
      </p>
      {irregulars.length === 0 ? (
        <p className="font-mono text-xs py-3" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'verbsIrregularEmpty')}
        </p>
      ) : (
        irregulars.map(verb => check(
          enrolment.subjects.includes(subjectKey(verb)),
          verb.kind === 'verb' ? verb.infinitive : '',
          null,
          () => toggle(enrolment.subjects, subjectKey(verb), next => setEnrolment({ ...enrolment, subjects: next })),
        ))
      )}
    </div>
  );
}
