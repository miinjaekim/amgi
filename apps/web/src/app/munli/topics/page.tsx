'use client';
import Link from 'next/link';
import { conjugationSpec, enrolledCountOfKind, getStudyLanguageConfig, munliTopics } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import PageHeader from '@/components/PageHeader';
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
  const { interfaceLanguage, studyLanguage } = useUser();
  const { enrolment, loading } = useConjugation();
  const spec = conjugationSpec(studyLanguage);
  // Only this language's topics — see `munliTopics`. Regular and irregular
  // verbs are two topics, not one with two halves: a rule one example
  // demonstrates against a fact no other verb tells you anything about.
  const topics = munliTopics(studyLanguage);

  return (
    <div className="max-w-2xl">
      <PageHeader titleKey="verbsTitle" className="mb-1" />
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'topicsIntro')}
      </p>

      {topics.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--color-muted)' }}>
          <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'munliUnavailableBody')}
          </p>
        </div>
      )}

      {topics.map(topic => {
        const saved = spec && enrolment ? enrolledCountOfKind(spec, enrolment, topic.kind) : 0;
        return (
          <Link
            key={topic.id}
            href={`/munli/topics/${topic.id}`}
            className="flex items-center gap-4 p-4 mb-3 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                {t(interfaceLanguage, topic.labelKey)}
              </span>
              <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {/* ⚠️ A count off an enrolment that has not arrived is the
                    default set's count, not this account's. */}
                {loading
                  ? t(interfaceLanguage, 'munliLoading')
                  : saved > 0
                    ? t(interfaceLanguage, 'topicVerbsSummary', { count: saved })
                    : t(interfaceLanguage, 'topicNothingSaved')}
              </span>
            </span>
            <span style={{ color: 'var(--color-muted)' }}>›</span>
          </Link>
        );
      })}
    </div>
  );
}
