'use client';
import { useEffect, useMemo, useState } from 'react';
import { conjugationSpec, summarizeConjugation } from '@amgi/core';
import type { ConjugationProgressMap } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { getUserPreferences } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/**
 * Munli's progress. Mirrors the native tab — same core summary, same claim.
 *
 * It measures conjugation and says so, rather than showing an empty chart for
 * writing: findings are not stored and the passage never is, so there is
 * nothing to count. Naming the gap beats a zero that reads as a bug.
 */
export default function MunliProgressPage() {
  const { user, interfaceLanguage, studyLanguage } = useUser();
  const [progress, setProgress] = useState<ConjugationProgressMap>({});
  const spec = conjugationSpec(studyLanguage);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getUserPreferences(user.uid).then(prefs => {
      if (!cancelled) setProgress(prefs?.conjugation ?? {});
    });
    return () => { cancelled = true; };
  }, [user]);

  const summary = useMemo(() => (spec ? summarizeConjugation(spec, progress) : null), [spec, progress]);

  const tile = (value: number, label: string) => (
    <div className="flex-1 rounded-xl border py-4 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}>
      <p className="font-mono text-2xl font-bold" style={{ color: 'var(--color-highlight)' }}>{value}</p>
      <p className="font-mono text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
    </div>
  );

  const row = (key: string, label: string, value: string) => (
    <div key={key} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: 'var(--color-muted)' }}>
      <span className="flex-1 font-mono text-sm truncate" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>{value}</span>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-6" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'munliProgressTitle')}
      </h1>

      {!summary ? (
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'conjugationUnavailable')}
        </p>
      ) : (
        <>
          <div className="flex gap-3 mb-8">
            {tile(summary.practised, t(interfaceLanguage, 'munliProgressPractised'))}
            {tile(summary.due, t(interfaceLanguage, 'munliProgressDue'))}
            {tile(summary.total, t(interfaceLanguage, 'munliProgressTables'))}
          </div>

          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'conjugationTenses')}
          </p>
          {summary.byTense.map(tense => row(tense.tenseId, tense.label, `${tense.practised} / ${tense.total}`))}

          {summary.weakest.length > 0 && (
            <>
              <p className="text-xs font-mono uppercase tracking-widest mt-8 mb-2" style={{ color: 'var(--color-muted)' }}>
                {t(interfaceLanguage, 'munliProgressWeakest')}
              </p>
              {summary.weakest.map(box => row(
                `${box.infinitive}-${box.tenseLabel}-${box.personLabel}`,
                `${box.infinitive} · ${box.personLabel} · ${box.tenseLabel}`,
                box.form,
              ))}
            </>
          )}
        </>
      )}

      <p className="font-mono text-xs mt-10 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'munliProgressWritingNote')}
      </p>
    </div>
  );
}
