'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { modeFromPath } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { SettingsRow, RowSeparator, SwitchModeRow } from '@/components/SettingsRows';
import { settingsHome } from '@/lib/mode';
import { t } from '@/lib/i18n';

/**
 * The account menu: who is signed in, then a handful of rows.
 *
 * ⚠️ **This used to *be* the settings screen** — every control stacked in a
 * 16rem popover, which had to be given a scroll bound on 2026-09-09 when it
 * outgrew the viewport. It is a menu now: the rows lead to the settings page
 * (`SettingsPage`), and nothing here is a control. A menu this short cannot
 * overflow, so the containers no longer bound it.
 *
 * **Languages has its own row beside Settings** because it is the one section
 * reached often, and on a narrow screen it is the only way to switch decks —
 * the sidebar's language popover is not there.
 *
 * Rendered inside the header dropdown (narrow) and the sidebar popover (wide).
 * The container provides positioning.
 */
export default function AccountMenu({ onClose }: { onClose: () => void }) {
  const { user, interfaceLanguage, handleSignOut } = useUser();
  const settings = settingsHome(modeFromPath(usePathname()));

  return (
    <div className="py-1">
      <p className="px-4 py-2 text-xs font-mono truncate" style={{ color: 'var(--color-muted)' }}>
        {user?.email ?? t(interfaceLanguage, 'settingsNotSignedIn')}
      </p>
      <RowSeparator />
      <SettingsRow icon="settings" labelKey="settingsTitle" href={settings} onClick={onClose} />
      <SettingsRow icon="languages" labelKey="settingsLanguages" href={`${settings}/languages`} onClick={onClose} />
      <SwitchModeRow onSwitch={onClose} />
      {user && (
        <>
          <RowSeparator />
          <SettingsRow icon="signOut" labelKey="signOut" onClick={() => { handleSignOut(); onClose(); }} />
        </>
      )}
    </div>
  );
}
