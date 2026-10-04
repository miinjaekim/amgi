'use client';
import React from 'react';
import { useUser } from '@/components/UserContext';
import { MenuRow, RowSeparator, SwitchModeRow } from '@/components/SettingsRows';
import { useSettingsModal } from '@/components/SettingsModal';
import { t } from '@/lib/i18n';

/**
 * The account menu: who is signed in, then a handful of rows.
 *
 * ⚠️ **This used to *be* the settings screen** — every control stacked in a
 * 16rem popover, which had to be given a scroll bound on 2026-09-09 when it
 * outgrew the viewport. It is a menu now: Settings opens the settings modal
 * (`SettingsModal`), and nothing here is a control. A menu this short cannot
 * overflow, so the containers no longer bound it.
 *
 * **Languages has its own row beside Settings** because it is the one section
 * reached often, and on a narrow screen it is the only way to switch decks —
 * the sidebar's language popover is not there. It opens the same modal, on
 * that section.
 *
 * Rendered inside the header dropdown (narrow) and the sidebar popover (wide).
 * The container provides positioning.
 */
export default function AccountMenu({ onClose }: { onClose: () => void }) {
  const { user, interfaceLanguage, handleSignOut } = useUser();
  const settings = useSettingsModal();

  return (
    <div className="py-1">
      <p className="px-4 py-2 text-xs font-mono truncate" style={{ color: 'var(--color-muted)' }}>
        {user?.email ?? t(interfaceLanguage, 'settingsNotSignedIn')}
      </p>
      <RowSeparator />
      <MenuRow icon="settings" label={t(interfaceLanguage, 'settingsTitle')} onClick={() => { settings.open(); onClose(); }} />
      <MenuRow icon="languages" label={t(interfaceLanguage, 'settingsLanguages')} onClick={() => { settings.open('languages'); onClose(); }} />
      <SwitchModeRow onSwitch={onClose} />
      {user && (
        <>
          <RowSeparator />
          <MenuRow icon="signOut" label={t(interfaceLanguage, 'signOut')} onClick={() => { handleSignOut(); onClose(); }} />
        </>
      )}
    </div>
  );
}
