'use client';
import React from 'react';
import { SUPPORTED_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';

export default function LanguageSetupModal() {
  const { setNativeLanguage } = useUser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
        style={{ background: 'var(--color-surface)' }}
      >
        <p className="text-xs text-[var(--color-text)] opacity-40 mb-6 tracking-wide uppercase">
          Welcome to Amgi · 암기에 오신 것을 환영합니다
        </p>
        <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">What is your native language?</h2>
        <h2 className="text-lg font-semibold mb-8 text-[var(--color-text)] opacity-60">모국어가 무엇인가요?</h2>
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
