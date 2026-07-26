'use client';
import React, { useState } from 'react';
import { useUser } from '@/components/UserContext';
import { useTheme } from '@/components/ThemeContext';
import { SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { t } from '@/lib/i18n';

/** The study-language option list — used inside SettingsMenu and standalone
 *  in the sidebar's language popover. */
export function StudyLanguageList({ onSelect }: { onSelect?: () => void }) {
  const { studyLanguage, setStudyLanguage } = useUser();
  return (
    <>
      {SUPPORTED_STUDY_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => { setStudyLanguage(lang.code); onSelect?.(); }}
          className="w-full flex items-center justify-between text-left px-3 py-2.5 text-sm font-mono transition-colors hover:bg-[var(--color-muted)]/30"
          style={studyLanguage === lang.code ? { color: 'var(--color-highlight)', fontWeight: 700 } : { color: 'var(--color-text)' }}
        >
          <span>
            {lang.label}
            {lang.labelNative !== lang.label && (
              <span className="ml-2 font-normal opacity-60">{lang.labelNative}</span>
            )}
          </span>
          {studyLanguage === lang.code && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ))}
    </>
  );
}

/** Shared settings panel body — rendered inside the header dropdown (mobile)
 *  and the sidebar popover (desktop). The container provides positioning. */
export default function SettingsMenu({ onClose }: { onClose: () => void }) {
  const { user, nativeLanguage, studyLanguage, setNativeLanguage, handleSignOut } = useUser();
  const { theme, setTheme, themes } = useTheme();
  const [langListOpen, setLangListOpen] = useState(false);

  return (
    <>
      {/* Study language selector */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
          {t(nativeLanguage, 'settingsStudyLanguage')}
        </p>
        <button
          onClick={() => setLangListOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)]"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
        >
          <span>
            {(() => {
              const current = SUPPORTED_STUDY_LANGUAGES.find((l) => l.code === studyLanguage);
              return current ? `${current.label}${current.labelNative !== current.label ? ` · ${current.labelNative}` : ''}` : studyLanguage;
            })()}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${langListOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {langListOpen && (
          <div
            className="mt-2 rounded-lg border overflow-hidden"
            style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
          >
            <StudyLanguageList onSelect={() => { setLangListOpen(false); onClose(); }} />
          </div>
        )}
      </div>

      {/* Native language selector */}
      <div className="px-4 py-3 border-b border-[var(--color-muted)]/50">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          {t(nativeLanguage, 'settingsLanguage')}
        </p>
        <div className="flex gap-2 mt-2">
          {SUPPORTED_NATIVE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setNativeLanguage(lang.code); onClose(); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-mono border transition-colors"
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
        <div className="grid grid-cols-2 gap-2 mt-2">
          {themes.map((th) => (
            <button
              key={th.value}
              onClick={() => setTheme(th.value)}
              className="py-2.5 rounded-lg text-sm font-mono border transition-colors"
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

      <a
        href={nativeLanguage === 'Korean' ? '/privacy/ko' : '/privacy'}
        onClick={onClose}
        className="block px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
        style={{ color: 'var(--color-text)' }}
      >
        {t(nativeLanguage, 'settingsPrivacyPolicy')}
      </a>

      {user && (
        <button
          onClick={() => { handleSignOut(); onClose(); }}
          className="w-full text-left px-4 py-3 text-sm font-mono hover:bg-[var(--color-muted)]/30 transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          {t(nativeLanguage, 'signOut')}
        </button>
      )}
    </>
  );
}
