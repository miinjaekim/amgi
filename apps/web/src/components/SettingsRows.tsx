'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMode, modeFromPath } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import ModeSwitcher from '@/components/ModeSwitcher';
import { t } from '@/lib/i18n';

/**
 * The row the account menu and the settings page are both made of: a leading
 * icon, a label, and a chevron saying it goes somewhere.
 *
 * One component for both so the menu reads as the short version of the page
 * rather than as a different thing — the convention is Claude's account menu,
 * and mobile's settings list follows the same one.
 */

const ICONS = {
  settings: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
  mode: ['M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'],
  languages: ['M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129'],
  appearance: ['M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'],
  pronunciation: ['M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'],
  data: ['M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'],
  about: ['M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  account: ['M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'],
  signOut: ['M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'],
} as const;

export type SettingsIcon = keyof typeof ICONS;

interface RowProps {
  icon: SettingsIcon;
  labelKey: TranslationKey;
  /** What the setting is now, where one word says it. */
  value?: string;
  /** A row that goes somewhere. Without it the row is a button. */
  href?: string;
  onClick?: () => void;
  /** For a row that opens in place: which way its chevron points. */
  expanded?: boolean;
}

const ROW_CLASS = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-mono text-left transition-colors hover:bg-[var(--color-muted)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-highlight)]';

export function SettingsRow({ icon, labelKey, value, href, onClick, expanded }: RowProps) {
  const { interfaceLanguage } = useUser();
  // A link or a disclosure gets a chevron; a plain action (sign out) does not,
  // because it does not lead anywhere.
  const chevron = href ? 'M9 5l7 7-7 7' : expanded === undefined ? null : 'M19 9l-7 7-7-7';

  const body = (
    <>
      <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        {ICONS[icon].map(d => <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />)}
      </svg>
      <span className="flex-1 min-w-0 truncate">{t(interfaceLanguage, labelKey)}</span>
      {value && <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{value}</span>}
      {chevron && (
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={chevron} />
        </svg>
      )}
    </>
  );

  return href ? (
    <Link href={href} onClick={onClick} className={ROW_CLASS} style={{ color: 'var(--color-text)' }}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} aria-expanded={expanded} className={ROW_CLASS} style={{ color: 'var(--color-text)' }}>
      {body}
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
      <SettingsRow
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
