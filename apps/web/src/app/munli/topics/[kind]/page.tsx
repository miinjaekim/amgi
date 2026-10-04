'use client';
import Link from 'next/link';
import { getStudyLanguageConfig, listVerbRows } from '@amgi/core';
import type { VerbRow } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { useConjugation } from '@/hooks/useConjugation';
import PageHeader from '@/components/PageHeader';
import AddVerbField from '@/components/AddVerbField';
import { t } from '@/lib/i18n';

/**
 * The Verbs topic: a row per pattern and per irregular verb.
 *
 * ⚠️ **The Packs list, for verbs** — the user's call, 2026-10-04. This page
 * used to open on every table of every group with two filters above them,
 * which was a lot to land on and made a learner operate a filter before
 * seeing anything they chose. A row says what the thing is and how much of it
 * is saved; its table, and saving, are one tap in.
 *
 * Regular and irregular are two headed groups on one list rather than two
 * pages: the patterns are five rows and do not grow, so the verbs under them
 * are never far down.
 *
 * The route segment is the topic's id and nothing reads it. Verbs is the only
 * topic that has a page.
 */
export default function VerbsTopicPage() {
  const { interfaceLanguage, studyLanguage } = useUser();
  const { spec, enrolment, loading } = useConjugation();

  // ⚠️ Nothing paints before the snapshot lands: an enrolment that has not
  // arrived normalises to the default set, and its counts would be false.
  if (loading || !spec || !enrolment) {
    return (
      <div className="max-w-2xl">
        <PageHeader titleKey="topicVerbs" />
        <p className="font-mono text-sm" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, loading ? 'munliLoading' : 'munliUnavailable', { language: getStudyLanguageConfig(studyLanguage).label })}
        </p>
      </div>
    );
  }

  const rows = listVerbRows(spec, enrolment);
  const row = (item: VerbRow) => (
    <li key={item.key}>
      <Link
        href={`/munli/topics/verbs/${encodeURIComponent(item.key)}`}
        className="block p-4 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
        style={{ borderColor: 'var(--color-muted)' }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>
            {item.label}
            {item.userAdded && (
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted)' }}>
                {t(interfaceLanguage, 'verbUnverifiedTag')}
              </span>
            )}
          </h3>
          <span className="font-mono text-xs shrink-0" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'verbRowTenses', { saved: item.saved, total: item.total })}
          </span>
        </div>
        <p className="font-mono text-sm mt-1 truncate" style={{ color: 'var(--color-muted)' }}>{item.preview}</p>
        <div className="mt-3 h-1 rounded-full overflow-hidden bg-[var(--color-muted)]/30">
          <div className="h-full bg-[var(--color-highlight)]" style={{ width: `${(item.saved / Math.max(1, item.total)) * 100}%` }} />
        </div>
      </Link>
    </li>
  );
  const group = (kind: VerbRow['kind'], titleKey: 'topicRegularVerbs' | 'verbsIrregular') => {
    const items = rows.filter(item => item.kind === kind);
    if (items.length === 0) return null;
    return (
      <section className="mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, titleKey)}
        </h2>
        <ul className="flex flex-col gap-3">{items.map(row)}</ul>
      </section>
    );
  };

  return (
    <div className="max-w-2xl">
      <PageHeader titleKey="topicVerbs" className="mb-1" />
      <p className="font-mono text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'verbsIntro')}
      </p>
      <AddVerbField />
      {group('group', 'topicRegularVerbs')}
      {group('verb', 'verbsIrregular')}
    </div>
  );
}
