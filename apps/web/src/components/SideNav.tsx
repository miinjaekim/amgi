'use client';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AmgiLogo from './AmgiLogo';
import SettingsMenu, { StudyLanguageList } from './SettingsMenu';
import { useUser } from '@/components/UserContext';
import { SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { getNavItems } from './nav-items';
import { t } from '@/lib/i18n';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

/** Every row keeps identical padding/geometry in both states — collapsing
 *  only hides the text, so icons never move or resize. */
export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, handleSignIn } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen && !langOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen, langOpen]);

  const navItems = getNavItems(nativeLanguage, pathname);
  const studyLang = SUPPORTED_STUDY_LANGUAGES.find((l) => l.code === studyLanguage);
  const studyLangTitle = `${t(nativeLanguage, 'settingsStudyLanguage')} · ${studyLang?.label ?? studyLanguage}`;

  return (
    <aside
      className="hidden sm:flex fixed left-0 top-0 bottom-0 z-40 w-[var(--sidenav-w,14rem)] flex-col border-r border-[var(--color-muted)]/40 transition-[width] duration-200"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Collapse toggle + logo — toggle sits left of the logo and never moves */}
      <div className="flex items-center gap-2 px-2 py-5">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded-lg hover:bg-[var(--color-muted)]/20 transition-colors flex-shrink-0"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <a href="/" className="flex items-center gap-3 flex-shrink-0">
          <AmgiLogo color="var(--color-highlight)" stroke="var(--color-text)" size={30} />
          {!collapsed && (
            <span className="font-mono font-bold text-lg whitespace-nowrap" style={{ color: 'var(--color-text)' }}>
              Amgi
            </span>
          )}
        </a>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20"
            style={
              item.active
                ? { background: 'var(--color-surface)', color: 'var(--color-highlight)', fontWeight: 700 }
                : { color: 'var(--color-text)' }
            }
          >
            <span className="flex-shrink-0">{item.icon(item.active, 'w-7 h-7')}</span>
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Bottom: streak + study language + user/settings */}
      <div className="pb-4 space-y-1 px-2">
        {user && streak > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 font-mono text-sm"
            style={{ color: 'var(--color-text)' }}
            title={nativeLanguage === 'Korean' ? `${streak}일 연속 · 오늘 ${reviewedToday}개` : `${streak}-day streak · ${reviewedToday} reviewed today`}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-highlight)' }}>
              <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-5-5-11-5-11zm0 15a3 3 0 01-3-3c0-2.5 2-5.5 3-7 1 1.5 3 4.5 3 7a3 3 0 01-3 3z" />
            </svg>
            <span className="font-semibold whitespace-nowrap">
              {streak}
              {!collapsed && (nativeLanguage === 'Korean' ? '일' : ` ${streak === 1 ? 'day' : 'days'}`)}
            </span>
            {!collapsed && (
              <span className="whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
                · {nativeLanguage === 'Korean' ? `오늘 ${reviewedToday}개` : `${reviewedToday} today`}
              </span>
            )}
          </div>
        )}

        {!authLoading && !user && (
          <button
            onClick={handleSignIn}
            title={collapsed ? t(nativeLanguage, 'signIn') : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono font-semibold text-sm transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            <svg className="w-7 h-7 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {!collapsed && <span className="whitespace-nowrap">{t(nativeLanguage, 'signIn')}</span>}
          </button>
        )}

        <div className="relative space-y-1" ref={popoverRef}>
          {/* Study language indicator — opens the language list only */}
          <button
            onClick={() => { setLangOpen((v) => !v); setSettingsOpen(false); }}
            title={studyLangTitle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-xs transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ color: 'var(--color-muted)' }}
          >
            <span
              className="w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
            >
              {(studyLang?.code ?? studyLanguage).slice(0, 2).toUpperCase()}
            </span>
            {!collapsed && (
              <span className="truncate whitespace-nowrap">
                {t(nativeLanguage, 'settingsStudyLanguage')} · <span style={{ color: 'var(--color-text)' }}>{studyLang?.label ?? studyLanguage}</span>
              </span>
            )}
          </button>

          {/* User / settings */}
          <button
            onClick={() => { setSettingsOpen((v) => !v); setLangOpen(false); }}
            title={collapsed ? (user?.displayName ?? undefined) : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-mono text-sm transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ color: 'var(--color-text)' }}
          >
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User avatar" className="w-7 h-7 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                  >
                    {user.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {!collapsed && <span className="truncate flex-1 text-left whitespace-nowrap">{user.displayName}</span>}
              </>
            ) : (
              <>
                <svg className="w-7 h-7 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!collapsed && (
                  <span className="flex-1 text-left whitespace-nowrap" style={{ color: 'var(--color-muted)' }}>
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

          {langOpen && (
            <div
              className="absolute left-full bottom-0 ml-2 w-64 rounded-xl shadow-xl border border-[var(--color-muted)] z-50 overflow-hidden"
              style={{ background: 'var(--color-surface)' }}
            >
              <p className="px-4 pt-3 pb-1 text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                {t(nativeLanguage, 'settingsStudyLanguage')}
              </p>
              <StudyLanguageList onSelect={() => setLangOpen(false)} />
            </div>
          )}

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
