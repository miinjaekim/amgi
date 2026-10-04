'use client';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { getMode, modeFromPath } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import ModeSwitcher from '@/components/ModeSwitcher';
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
  labelKey: TranslationKey;
  /** What the setting is now, where one word says it. */
  value?: string;
  onClick: () => void;
  /** For a row that opens in place: which way its chevron points. */
  expanded?: boolean;
}

/** A menu row: a leading icon and a label, after Claude's account menu. */
export function MenuRow({ icon, labelKey, value, onClick, expanded }: RowProps) {
  const { interfaceLanguage } = useUser();
  return (
    <button
      onClick={onClick}
      aria-expanded={expanded}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-left transition-colors hover:bg-[var(--color-muted)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight)]"
      style={{ color: 'var(--color-text)' }}
    >
      <span style={{ color: 'var(--color-muted)' }}><SettingsIcon name={icon} /></span>
      <span className="flex-1 min-w-0 truncate">{t(interfaceLanguage, labelKey)}</span>
      {value && <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{value}</span>}
      {expanded !== undefined && (
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}

/** The thin rule between groups of rows. The grouping is the only structure. */
export function RowSeparator() {
  return <div className="my-1 border-t border-[var(--color-muted)]/40" />;
}

/**
 * *Switch mode* — the row that opens in place rather than going anywhere.
 *
 * It names the mode you are in, so the row says what it does before it is
 * opened, and the modes appear under it. On web this is how Munli is found at
 * all; see `ModeSwitcher`.
 */
export function SwitchModeRow({ onSwitch }: { onSwitch?: () => void }) {
  const { interfaceLanguage } = useUser();
  const current = getMode(modeFromPath(usePathname()));
  const [open, setOpen] = useState(false);

  return (
    <>
      <MenuRow
        icon="mode"
        labelKey="modeSwitchTitle"
        value={t(interfaceLanguage, current.nameKey)}
        onClick={() => setOpen(v => !v)}
        expanded={open}
      />
      {open && (
        <div className="px-4 pt-1 pb-2">
          <ModeSwitcher onSwitch={() => { setOpen(false); onSwitch?.(); }} />
        </div>
      )}
    </>
  );
}
