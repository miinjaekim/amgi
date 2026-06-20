'use client';
import React from 'react';
import { SUPPORTED_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

export default function LanguageSetupModal() {
  const { setNativeLanguage } = useUser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
        style={{ background: 'var(--color-surface)' }}
      >
        <h2 className="text-2xl font-bold mb-2 text-[var(--color-highlight)]">{t(null, 'welcomeTitle')}</h2>
        <p className="text-[var(--color-text)] opacity-80 mb-8 text-sm">
          {t(null, 'welcomeSubtitle')}
        </p>
        <div className="flex flex-col gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setNativeLanguage(lang.code)}
              className="w-full py-3 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors"
              style={{ background: 'var(--color-bg)' }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
