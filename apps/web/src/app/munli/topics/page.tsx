'use client';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import { t } from '@/lib/i18n';

/**
 * The topics Munli practises — one row each.
 *
 * ⚠️ **One row today, and that is the point.** The plan is one grammar tool at a
 * time with the grouping read off the collection later; this is where that
 * collection becomes visible. A second tool adds a row and nothing about verbs
 * moves to make space.
 */
export default function TopicsPage() {
  const { interfaceLanguage } = useUser();
  const { enrolment } = useConjugation();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {t(interfaceLanguage, 'verbsTitle')}
      </h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'topicsIntro')}
      </p>

      <Link
        href="/munli/topics/verbs"
        className="flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-mono font-bold" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'topicVerbs')}
          </span>
          <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {enrolment
              ? t(interfaceLanguage, 'topicVerbsSummary', {
                  tenses: enrolment.tenses.length,
                  groups: enrolment.subjects.length,
                })
              : t(interfaceLanguage, 'conjugationUnavailable')}
          </span>
        </span>
        <span style={{ color: 'var(--color-muted)' }}>›</span>
      </Link>
    </div>
  );
}
