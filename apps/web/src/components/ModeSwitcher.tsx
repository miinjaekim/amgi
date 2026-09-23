'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MODES, modeFromPath } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { rememberMode } from '@/lib/mode';
import { t } from '@/lib/i18n';

/**
 * The list of modes, as rows.
 *
 * ⚠️ **This is web's primary door into Munli, not a secondary one.** Native
 * switches by holding the last tab; web has no long-press convention and no
 * bottom-right anything on desktop, so the account menu is where a mode switch
 * is *found* rather than known about. That asymmetry is deliberate: the gesture
 * is the fast path for someone who already knows, and a row is how anyone else
 * discovers the mode exists at all.
 *
 * Rendered inside `SettingsMenu`, which both the sidebar popover and the narrow
 * -screen header dropdown use — so the two entry points cannot drift.
 */
export default function ModeSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { interfaceLanguage } = useUser();
  const current = modeFromPath(pathname);

  return (
    <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
      <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
        {t(interfaceLanguage, 'modeSwitchTitle')}
      </p>
      <div className="space-y-1">
        {MODES.map((mode) => {
          const active = mode.id === current;
          return (
            <button
              key={mode.id}
              onClick={() => {
                // Remember first, then navigate: the cookie is what `/` reads on
                // the next cold open, and a navigation that raced it would leave
                // the two disagreeing.
                rememberMode(mode.id);
                if (!active) router.push(mode.home);
                onSwitch?.();
              }}
              aria-current={active ? 'true' : undefined}
              className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg text-sm font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)]"
              style={{
                background: active ? 'var(--color-surface)' : 'var(--color-bg)',
                color: 'var(--color-text)',
                borderColor: active ? 'var(--color-highlight)' : 'var(--color-muted)',
              }}
            >
              <span className="min-w-0 text-left">
                <span className="block truncate font-semibold">{t(interfaceLanguage, mode.nameKey)}</span>
                <span className="block text-xs opacity-60 truncate">
                  {t(interfaceLanguage, mode.taglineKey)}
                </span>
              </span>
              {active && (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                     style={{ color: 'var(--color-highlight)' }} aria-label={t(interfaceLanguage, 'modeCurrent')}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
