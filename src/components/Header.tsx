'use client';
import React, { useRef, useState, useEffect } from 'react';
import AmgiLogo from './AmgiLogo';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { SUPPORTED_LANGUAGES } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

const Header: React.FC = () => {
  const { user, authLoading, nativeLanguage, setNativeLanguage, handleSignIn, handleSignOut } = useUser();
  const { theme, setTheme, themes } = useTheme();

  const navItems = [
    { label: t(nativeLanguage, 'navLearn'), href: '/' },
    { label: t(nativeLanguage, 'navReview'), href: '/review' },
  ];
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
      className="w-full flex items-center justify-between px-4 py-2 shadow-md"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex items-center gap-6">
        <AmgiLogo color="var(--color-highlight)" stroke="var(--color-text)" size={36} />
        <nav className="flex items-center gap-6 ml-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-base font-mono hover:underline"
              style={{ color: 'var(--color-text)' }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {authLoading ? null : user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-[var(--color-muted)]/30 transition-colors"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                >
                  {user.displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="font-medium font-mono" style={{ color: 'var(--color-text)' }}>{user.displayName}</span>
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
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-[var(--color-muted)] z-50 overflow-hidden"
                style={{ background: 'var(--color-surface)' }}
              >
                {/* Language selector */}
                <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'settingsLanguage')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setNativeLanguage(lang.code); setOpen(false); }}
                        className="flex-1 py-1.5 rounded-lg text-sm font-mono border transition-colors"
                        style={
                          nativeLanguage === lang.code
                            ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                            : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                        }
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme selector */}
                <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'settingsTheme')}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {themes.map((th) => (
                      <button
                        key={th.value}
                        onClick={() => setTheme(th.value)}
                        className="flex-1 py-1.5 rounded-lg text-sm font-mono border transition-colors"
                        style={
                          theme === th.value
                            ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                            : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                        }
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { handleSignOut(); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(nativeLanguage, 'signOut')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-4 py-2 rounded-lg font-mono font-semibold transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          >
            {t(nativeLanguage, 'signIn')}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
