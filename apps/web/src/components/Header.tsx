'use client';
import React, { useRef, useState, useEffect } from 'react';
import AmgiLogo from './AmgiLogo';
import SettingsMenu from './SettingsMenu';
import { useUser } from '@/components/UserContext';
import { SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/** Mobile-only top bar — desktop navigation lives in SideNav. */
const Header: React.FC = () => {
  const { user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, handleSignIn } = useUser();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header
      className="sm:hidden w-full flex items-center justify-between px-4 py-2 shadow-md"
      style={{ background: 'var(--color-bg)' }}
    >
      <a href="/" className="flex items-center">
        <AmgiLogo color="var(--color-highlight)" stroke="var(--color-text)" size={30} />
      </a>

      <div className="flex items-center gap-3">
        <span
          className="px-2 py-0.5 text-xs rounded-full border font-mono"
          style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
          title={t(nativeLanguage, 'settingsStudyLanguage')}
        >
          {SUPPORTED_STUDY_LANGUAGES.find((l) => l.code === studyLanguage)?.label ?? studyLanguage}
        </span>
        {user && streak > 0 && (
          <div
            className="flex items-center gap-1.5 font-mono text-sm"
            style={{ color: 'var(--color-text)' }}
            title={nativeLanguage === 'Korean' ? `${streak}일 연속 · 오늘 ${reviewedToday}개` : `${streak}-day streak · ${reviewedToday} reviewed today`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-highlight)' }}>
              <path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-5-5-11-5-11zm0 15a3 3 0 01-3-3c0-2.5 2-5.5 3-7 1 1.5 3 4.5 3 7a3 3 0 01-3 3z" />
            </svg>
            <span className="font-semibold">
              {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
            </span>
          </div>
        )}
        {authLoading ? null : (
          <>
          {!user && (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 rounded-lg font-mono font-semibold transition-colors"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              {t(nativeLanguage, 'signIn')}
            </button>
          )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-2 transition-colors ${
                user
                  ? 'rounded-lg px-3 py-1.5 border hover:bg-[var(--color-muted)]/20'
                  : 'rounded-full px-2 py-1 hover:bg-[var(--color-muted)]/30'
              }`}
              style={user ? { borderColor: 'var(--color-muted)', color: 'var(--color-text)' } : { color: 'var(--color-text)' }}
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User avatar" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                    >
                      {user.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                style={{ color: 'var(--color-text)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border border-[var(--color-muted)] z-50 overflow-hidden"
                style={{ background: 'var(--color-surface)' }}
              >
                <SettingsMenu onClose={() => setOpen(false)} />
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
