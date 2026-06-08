'use client';
import React from 'react';
import { SUPPORTED_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';

export default function LanguageSetupModal() {
  const { setNativeLanguage } = useUser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl border border-[#418E7B]"
        style={{ background: '#1e5246' }}
      >
        <h2 className="text-2xl font-bold mb-2 text-[#EAA09C]">Welcome to Amgi</h2>
        <p className="text-[#E9E0D2] opacity-80 mb-8 text-sm">
          What is your native language? Explanations will be written in this language.
        </p>
        <div className="flex flex-col gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setNativeLanguage(lang.code)}
              className="w-full py-3 rounded-lg font-semibold text-base border border-[#418E7B] text-[#E9E0D2] hover:bg-[#418E7B] hover:text-[#173F35] transition-colors"
              style={{ background: '#173F35' }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
