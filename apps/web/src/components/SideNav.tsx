'use client';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AmgiLogo from './AmgiLogo';
import SettingsMenu from './SettingsMenu';
import { useUser } from '@/components/UserContext';
import { SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { getNavItems } from './nav-items';
import { t } from '@/lib/i18n';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, handleSignIn } = useUser();
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
  const studyLang = SUPPORTED_STUDY_LANGUAGES.find((l) => l.code === studyLanguage);
  const studyLangTitle = `${t(nativeLanguage, 'settingsStudyLanguage')} · ${studyLang?.label ?? studyLanguage}`;

  return (
    <aside
      className="hidden sm:flex fixed left-0 top-0 bottom-0 z-40 w-[var(--sidenav-w,14rem)] flex-col border-r border-[var(--color-muted)]/40 transition-[width] duration-200"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center py-5 ${collapsed ? 'flex-col gap-3 px-0' : 'justify-between pl-5 pr-3'}`}>
        <a href="/" className="flex items-center gap-3">
          <AmgiLogo color="var(--color-highlight)" stroke="var(--color-text)" size={30} />
          {!collapsed && (
            <span className="font-mono font-bold text-lg" style={{ color: 'var(--color-text)' }}>
              Amgi
            </span>
          )}
        </a>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg hover:bg-[var(--color-muted)]/20 transition-colors"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20 ${
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
            style={
              item.active
                ? { background: 'var(--color-surface)', color: 'var(--color-highlight)', fontWeight: 700 }
                : { color: 'var(--color-text)' }
            }
          >
            {item.icon(item.active)}
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Bottom: streak + study language + user/settings */}
      <div className={`pb-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {user && streak > 0 && (
          <div
            className={`flex items-center font-mono text-sm ${collapsed ? 'flex-col gap-0.5 py-2' : 'gap-2 px-3 py-2'}`}
            style={{ color: 'var(--color-text)' }}
            title={nativeLanguage === 'Korean' ? `${streak}일 연속 · 오늘 ${reviewedToday}개` : `${streak}-day streak · ${reviewedToday} reviewed today`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-highlight)' }}>
              <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-5-5-11-5-11zm0 15a3 3 0 01-3-3c0-2.5 2-5.5 3-7 1 1.5 3 4.5 3 7a3 3 0 01-3 3z" />
            </svg>
            {collapsed ? (
              <span className="text-xs font-semibold">{streak}</span>
            ) : (
              <>
                <span className="font-semibold">
                  {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
                </span>
                <span style={{ color: 'var(--color-muted)' }}>
                  · {nativeLanguage === 'Korean' ? `오늘 ${reviewedToday}개` : `${reviewedToday} today`}
                </span>
              </>
            )}
          </div>
        )}

        {!authLoading && !user && (
          collapsed ? (
            <button
              onClick={handleSignIn}
              title={t(nativeLanguage, 'signIn')}
              className="w-full flex justify-center py-2.5 rounded-lg transition-colors"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="w-full px-3 py-2.5 rounded-lg font-mono font-semibold text-sm transition-colors"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              {t(nativeLanguage, 'signIn')}
            </button>
          )
        )}

        <div className="relative space-y-1" ref={popoverRef}>
          {/* Study language indicator — opens settings to change it */}
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            title={studyLangTitle}
            className={`flex items-center rounded-lg font-mono border transition-colors hover:bg-[var(--color-muted)]/20 ${
              collapsed ? 'w-8 h-8 mx-auto justify-center text-[10px] font-bold' : 'w-full gap-2 px-3 py-2 text-xs'
            }`}
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
          >
            {collapsed ? (
              (studyLang?.code ?? studyLanguage).slice(0, 2).toUpperCase()
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <span className="truncate">
                  {t(nativeLanguage, 'settingsStudyLanguage')} · <span style={{ color: 'var(--color-text)' }}>{studyLang?.label ?? studyLanguage}</span>
                </span>
              </>
            )}
          </button>

          {/* User / settings */}
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            title={collapsed ? (user?.displayName ?? undefined) : undefined}
            className={`w-full flex items-center rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20 ${
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
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
                {!collapsed && <span className="truncate flex-1 text-left">{user.displayName}</span>}
              </>
            ) : (
              <>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!collapsed && (
                  <span className="flex-1 text-left" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'settingsLanguage')}
                  </span>
                )}
              </>
            )}
            {!collapsed && (
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--color-muted)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
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
