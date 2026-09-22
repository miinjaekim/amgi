'use client';
import Link from 'next/link';
import { conjugationSpec, enrolledCountOfKind } from '@amgi/core';
import type { ConjugationSubject, TranslationKey } from '@amgi/core';
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
  const { enrolment } = useConjugation();
  const spec = conjugationSpec(studyLanguage);

  /**
   * ⚠️ **Two topics, not one with two halves.** A regular group is a rule that
   * one example demonstrates; an irregular verb is a fact no other verb tells
   * you anything about — a handful of patterns against what will be a long list
   * of verbs.
   */
  const topics: { kind: ConjugationSubject['kind']; href: string; labelKey: TranslationKey }[] = [
    { kind: 'group', href: '/munli/topics/regular', labelKey: 'topicRegularVerbs' },
    { kind: 'verb', href: '/munli/topics/irregular', labelKey: 'verbsIrregular' },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader titleKey="verbsTitle" className="mb-1" />
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'topicsIntro')}
      </p>

      {topics.map(topic => {
        const saved = spec && enrolment ? enrolledCountOfKind(spec, enrolment, topic.kind) : 0;
        return (
          <Link
            key={topic.href}
            href={topic.href}
            className="flex items-center gap-4 p-4 mb-3 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
          >
            <span className="min-w-0 flex-1">
              <span className="block font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                {t(interfaceLanguage, topic.labelKey)}
              </span>
              <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {!spec
                  ? t(interfaceLanguage, 'conjugationUnavailable')
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
