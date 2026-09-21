'use client';
import Link from 'next/link';
import { getMode } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { getMunliNavItems } from '@/components/nav-items';
import { t } from '@/lib/i18n';

/**
 * Munli's home — its tools, one row each.
 *
 * The list comes from the same place the nav does, so a tool cannot exist in
 * one and not the other.
 */
export default function MunliHome() {
  const { interfaceLanguage } = useUser();
  const munli = getMode('munli');
  const tools = getMunliNavItems(interfaceLanguage, '/munli');

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-mono font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {munli.name}
      </h1>
      <p className="text-sm font-mono mb-8" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'munliTagline')}
      </p>

      {tools.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'var(--color-muted)' }}>
          <p className="font-mono text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            {t(interfaceLanguage, 'munliNoTools')}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'munliNoToolsBody')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-[var(--color-muted)]/20"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
            >
              <span style={{ color: 'var(--color-highlight)' }}>{tool.icon(false, 'w-7 h-7')}</span>
              <span className="min-w-0">
                <span className="block font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                  {tool.label}
                </span>
                <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                  {t(interfaceLanguage, 'munliToolWritingBlurb')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
