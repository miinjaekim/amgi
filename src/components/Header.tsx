'use client';
import React, { useRef, useState, useEffect } from 'react';
import AmgiLogo from './AmgiLogo';
import { useUser } from '@/components/UserContext';
import { SUPPORTED_LANGUAGES } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

const palette = {
  background: '#173F35',
  text: '#E9E0D2',
  highlight: '#EAA09C',
  bgText: '#418E7B',
};

const Header: React.FC = () => {
  const { user, nativeLanguage, setNativeLanguage, handleSignIn, handleSignOut } = useUser();

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
      style={{ background: palette.background }}
      className="w-full flex items-center justify-between px-4 py-2 shadow-md"
    >
      <div className="flex items-center gap-6">
        <AmgiLogo color={palette.highlight} stroke={palette.text} size={36} />
        <nav className="flex items-center gap-6 ml-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-base font-mono hover:underline"
              style={{ color: palette.text }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-[#418E7B]/30 transition-colors"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="User avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: palette.highlight, color: palette.background }}
                >
                  {user.displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="font-medium font-mono" style={{ color: palette.text }}>{user.displayName}</span>
              <svg
                className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                style={{ color: palette.text }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-[#418E7B] z-50 overflow-hidden"
                style={{ background: '#1e5246' }}
              >
                <div className="px-4 py-3 border-b border-[#418E7B]/50">
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: palette.bgText }}>{t(nativeLanguage, 'settingsLanguage')}</p>
                  <div className="flex gap-2 mt-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setNativeLanguage(lang.code); setOpen(false); }}
                        className="flex-1 py-1.5 rounded-lg text-sm font-mono border transition-colors"
                        style={
                          nativeLanguage === lang.code
                            ? { background: palette.highlight, color: palette.background, borderColor: palette.highlight }
                            : { background: 'transparent', color: palette.text, borderColor: palette.bgText }
                        }
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => { handleSignOut(); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-mono hover:bg-[#418E7B]/30 transition-colors"
                  style={{ color: palette.text }}
                >
                  {t(nativeLanguage, 'signOut')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-mono"
          >
            {t(nativeLanguage, 'signIn')}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
