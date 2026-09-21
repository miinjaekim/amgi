'use client';
import { getMode } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/**
 * Munli's home — the list of its tools, which is empty today.
 *
 * The mode ships before its first tool on purpose: the switcher is one build
 * and the tools are the next two. What this page must not do is look broken
 * while that is true, so it names what is coming rather than rendering nothing.
 */
export default function MunliHome() {
  const { interfaceLanguage } = useUser();
  const munli = getMode('munli');

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {munli.name}
      </h1>
      <p className="text-sm font-mono mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'munliTagline')}
      </p>

      <div
        className="rounded-xl border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--color-muted)' }}
      >
        <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text)' }}>
          {t(interfaceLanguage, 'munliNoTools')}
        </p>
        <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
          {t(interfaceLanguage, 'munliNoToolsBody')}
        </p>
      </div>
    </div>
  );
}
