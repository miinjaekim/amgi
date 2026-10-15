'use client';
import React, { useEffect, useState } from 'react';
import { PREVIEW_SCOPES } from '@amgi/core';
import type { PreviewScope } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/** The last scope picked, per device: what someone previews tends to stay the same. */
const SCOPE_KEY = 'preview-scope';

const SCOPE_LABEL = {
  new: 'previewScopeNew',
  due: 'previewScopeDue',
  both: 'previewScopeBoth',
} as const;

function readScope(): PreviewScope | null {
  try {
    const stored = localStorage.getItem(SCOPE_KEY);
    return PREVIEW_SCOPES.find(scope => scope === stored) ?? null;
  } catch {
    // Private mode, or storage disabled. Nothing is marked.
    return null;
  }
}

interface PreviewLauncherProps {
  counts: Record<PreviewScope, number>;
  onStart: (scope: PreviewScope) => void;
}

/**
 * The way into Preview, beside Start rather than instead of it: Preview is an
 * option, not a step you have to take before reviewing. Secondary in weight
 * for the same reason.
 *
 * One button, which opens the choice of cards underneath it with a count for
 * each; picking one starts. An empty choice is shown disabled rather than
 * left out, so the three always read as the same three. The last one picked
 * is marked, remembered on this device.
 */
export default function PreviewLauncher({ counts, onStart }: PreviewLauncherProps) {
  const { interfaceLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const [lastScope, setLastScope] = useState<PreviewScope | null>(null);

  // After mount, so the server render and hydration agree.
  useEffect(() => { setLastScope(readScope()); }, []);

  if (counts.new === 0 && counts.due === 0) return null;

  const start = (scope: PreviewScope) => {
    try {
      localStorage.setItem(SCOPE_KEY, scope);
    } catch {
      // Not being able to remember the choice is no reason to refuse it.
    }
    setLastScope(scope);
    onStart(scope);
  };

  return (
    <div className="mb-4 flex flex-col items-center">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="px-4 py-2 rounded-lg border border-[var(--color-muted)] text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
      >
        {t(interfaceLanguage, 'previewStart')} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div role="group" aria-label={t(interfaceLanguage, 'previewChoose')} className="mt-2 flex flex-wrap justify-center gap-2">
          {PREVIEW_SCOPES.map(scope => {
            const marked = scope === lastScope && counts[scope] > 0;
            return (
              <button
                key={scope}
                onClick={() => start(scope)}
                disabled={counts[scope] === 0}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  marked
                    ? 'border-[var(--color-highlight)] bg-[var(--color-highlight)] text-[var(--color-bg)] font-semibold'
                    : 'border-[var(--color-muted)] text-[var(--color-text)] enabled:hover:bg-[var(--color-muted)]/20'
                }`}
              >
                {t(interfaceLanguage, SCOPE_LABEL[scope], { count: counts[scope] })}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-[var(--color-muted)]">{t(interfaceLanguage, 'previewNote')}</p>
    </div>
  );
}
