'use client';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MODES, modeFromPath } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { rememberMode } from '@/lib/mode';
import { t } from '@/lib/i18n';

/**
 * The pieces the account menu and the settings modal share: one set of icons,
 * and the menu's row.
 */

const ICONS = {
  settings: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  mode: ['M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'],
  languages: ['M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129'],
  data: ['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'],
  account: ['M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'],
  signOut: ['M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'],
} as const;

export type SettingsIconName = keyof typeof ICONS;

export function SettingsIcon({ name, className = 'w-5 h-5' }: { name: SettingsIconName; className?: string }) {
  return (
    <svg className={`${className} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      {ICONS[name].map(d => <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />)}
    </svg>
  );
}

interface RowProps {
  icon: SettingsIconName;
  label: string;
  onClick: () => void;
}

/** A menu row: a leading icon and a label, after Claude's account menu. */
export function MenuRow({ icon, label, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-left transition-colors hover:bg-[var(--color-muted)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight)]"
      style={{ color: 'var(--color-text)' }}
    >
      <span style={{ color: 'var(--color-muted)' }}><SettingsIcon name={icon} /></span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
    </button>
  );
}

/** The thin rule between groups of rows. The grouping is the only structure. */
export function RowSeparator() {
  return <div className="my-1 border-t border-[var(--color-muted)]/40" />;
}

/**
 * *Switch to Munli* — one click, and you are in the other mode.
 *
 * ⚠️ **This is web's primary door into Munli, not a secondary one.** Native
 * switches by holding the last tab; web has no long-press convention, so the
 * account menu is where a mode switch is *found* rather than known about.
 *
 * **A toggle, not a list**, on the user's call 2026-10-04: with two modes, a
 * row that unfolds two options is a second click to make the only choice
 * there is, and unfolding it pushed the whole menu upward. The row names the
 * mode it goes to, so it says what it does without showing the current one.
 *
 * ⚠️ **Written as "the next mode", not "the other mode".** `modes.ts` forbids
 * assuming there are two. With a third, this cycles through them — which is
 * the point at which a list earns its place back.
 */
export function SwitchModeRow({ onSwitch }: { onSwitch?: () => void }) {
  const { interfaceLanguage } = useUser();
  const router = useRouter();
  const current = modeFromPath(usePathname());
  const next = MODES[(MODES.findIndex(mode => mode.id === current) + 1) % MODES.length];

  return (
    <MenuRow
      icon="mode"
      label={t(interfaceLanguage, 'modeSwitchTo', { mode: t(interfaceLanguage, next.nameKey) })}
      onClick={() => {
        // Remember first, then navigate: the cookie is what `/` reads on the
        // next cold open, and a navigation that raced it would leave the two
        // disagreeing.
        rememberMode(next.id);
        router.push(next.home);
        onSwitch?.();
      }}
    />
  );
}
