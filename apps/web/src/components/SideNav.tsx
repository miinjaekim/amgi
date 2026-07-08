'use client';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AmgiLogo from './AmgiLogo';
import SettingsMenu from './SettingsMenu';
import { useUser } from '@/components/UserContext';
import { getNavItems } from './nav-items';
import { t } from '@/lib/i18n';

export default function SideNav() {
  const pathname = usePathname();
  const { user, authLoading, nativeLanguage, streak, reviewedToday, handleSignIn } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const navItems = getNavItems(nativeLanguage, pathname);

  return (
    <aside
      className="hidden sm:flex fixed left-0 top-0 bottom-0 z-40 w-56 flex-col border-r border-[var(--color-muted)]/40"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-3 px-5 py-5">
        <AmgiLogo color="var(--color-highlight)" stroke="var(--color-text)" size={30} />
        <span className="font-mono font-bold text-lg" style={{ color: 'var(--color-text)' }}>
          Amgi
        </span>
      </a>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20"
            style={
              item.active
                ? { background: 'var(--color-surface)', color: 'var(--color-highlight)', fontWeight: 700 }
                : { color: 'var(--color-text)' }
            }
          >
            {item.icon(item.active)}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Bottom: streak + user/settings */}
      <div className="px-3 pb-4 space-y-1">
        {user && streak > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 font-mono text-sm"
            style={{ color: 'var(--color-text)' }}
            title={nativeLanguage === 'Korean' ? `${streak}일 연속 · 오늘 ${reviewedToday}개` : `${streak}-day streak · ${reviewedToday} reviewed today`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-highlight)' }}>
              <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-5-5-11-5-11zm0 15a3 3 0 01-3-3c0-2.5 2-5.5 3-7 1 1.5 3 4.5 3 7a3 3 0 01-3 3z" />
            </svg>
            <span className="font-semibold">
              {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
            </span>
            <span style={{ color: 'var(--color-muted)' }}>
              · {nativeLanguage === 'Korean' ? `오늘 ${reviewedToday}개` : `${reviewedToday} today`}
            </span>
          </div>
        )}

        {!authLoading && !user && (
          <button
            onClick={handleSignIn}
            className="w-full px-3 py-2.5 rounded-lg font-mono font-semibold text-sm transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(nativeLanguage, 'signIn')}
          </button>
        )}

        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ color: 'var(--color-text)' }}
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User avatar" className="w-6 h-6 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                  >
                    {user.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="truncate flex-1 text-left">{user.displayName}</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="flex-1 text-left" style={{ color: 'var(--color-muted)' }}>
                  {t(nativeLanguage, 'settingsLanguage')}
                </span>
              </>
            )}
            <svg
              className={`w-4 h-4 flex-shrink-0 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--color-muted)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {settingsOpen && (
            <div
              className="absolute left-full bottom-0 ml-2 w-64 rounded-xl shadow-xl border border-[var(--color-muted)] z-50 overflow-hidden"
              style={{ background: 'var(--color-surface)' }}
            >
              <SettingsMenu onClose={() => setSettingsOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
