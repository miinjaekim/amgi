'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getStudyLanguageConfig, modeFromPath } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/**
 * A page title, with a "?" that explains what the page is for.
 *
 * ⚠️ **Native has had this since 2026-09-04 and web has had nothing**, which is
 * why Writing could drop a learner into a panel with no guidance on either
 * platform and only one of them had a place to put the answer. This is
 * `apps/mobile/src/components/PageHeader.tsx` on web, deliberately down to the
 * copy keys: one component per platform reading one pair of strings is what
 * keeps the two from explaining the same screen differently.
 *
 * **Pull, not push** — the mobile component's argument, unchanged. The answer is
 * there when you wonder and invisible when you don't, which is why it needs no
 * record of who has seen what, and why it works where a first-run tour cannot:
 * a tour names every surface at the one moment you have the least context to
 * attach the names to. Explaining rather than demonstrating is fine here, and
 * only here, because the user asked.
 *
 * ⚠️ **The help keys are optional.** A page with nothing non-obvious to say
 * renders the title alone rather than a "?" opening a restatement of its name.
 *
 * ⚠️ **The face comes off the path, not from a prop.** Munli's surfaces are
 * monospaced throughout and Amgi's are not, so a title has to know which mode
 * it is in — and `getNavItemsForMode` already derives exactly that from the
 * pathname, for the stated reason that a caller then cannot render one mode's
 * chrome around another mode's page. A prop would be one more thing to get
 * wrong on a new page; the colour is shared either way, which is the whole
 * point of this change.
 *
 * **Munli titles carry the study language at the right end**, off the same
 * path check. What Munli offers depends on the language — French has verb
 * tables, Mandarin does not — so the page says which one it is showing.
 */
export default function PageHeader({
  titleKey, helpTitleKey, helpLeadKey, helpPointsKey, className = 'mb-6',
}: {
  titleKey: TranslationKey;
  helpTitleKey?: TranslationKey;
  helpLeadKey?: TranslationKey;
  helpPointsKey?: TranslationKey;
  /** Spacing below the row, since pages differ in what follows the title. */
  className?: string;
}) {
  const { interfaceLanguage, studyLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const hasHelp = !!helpTitleKey && !!helpLeadKey && !!helpPointsKey;
  const munli = modeFromPath(usePathname()) === 'munli';
  const face = munli ? 'font-mono' : '';
  const language = getStudyLanguageConfig(studyLanguage).label;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <h1 className={`text-2xl font-bold ${face}`} style={{ color: 'var(--color-highlight)' }}>
          {t(interfaceLanguage, titleKey)}
        </h1>
        {hasHelp && (
          <button
            onClick={() => setOpen(true)}
            aria-label={t(interfaceLanguage, 'helpButtonLabel')}
            className="rounded-full p-1 transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ color: 'var(--color-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-.9.7-.9 1.3v.4M12 16.8h.01" />
            </svg>
          </button>
        )}
        {munli && (
          <span
            className="ml-auto shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-xs"
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
            aria-label={t(interfaceLanguage, 'munliLanguageChipLabel', { language })}
          >
            {language}
          </span>
        )}
      </div>

      {open && hasHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className={`text-lg font-bold mb-4 ${face}`} style={{ color: 'var(--color-highlight)' }}>
              {t(interfaceLanguage, helpTitleKey)}
            </h2>
            {/* Shaped rather than merely shortened: one sentence that answers
                the question, then the mechanics a user cannot infer from the
                screen. Someone who opened this wants to stop reading quickly. */}
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text)' }}>
              {t(interfaceLanguage, helpLeadKey)}
            </p>
            <ul className="flex flex-col gap-2">
              {t(interfaceLanguage, helpPointsKey).split('\n').map(point => (
                <li key={point} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-text)', opacity: 0.75 }}>
                  <span style={{ color: 'var(--color-muted)' }}>·</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-lg py-3 font-semibold transition-colors"
              style={{ background: 'var(--color-muted)', color: 'var(--color-bg)' }}
            >
              {t(interfaceLanguage, 'helpClose')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
