'use client';
import React, { useState } from 'react';
import { useUser } from '@/components/UserContext';
import { getStudyLanguageConfig } from '@amgi/core';
import { t } from '@/lib/i18n';
import AddLanguageModal from '@/components/AddLanguageModal';

/**
 * The languages you have added, and the way to add another.
 *
 * ⚠️ **Only added languages appear.** This used to list every language the app
 * supports, which made switching decks a scroll through nine options — eight of
 * which the user had never asked for — and gave the choice no memory: each one
 * silently inherited whatever native language happened to be set globally.
 *
 * Each row names the pair, because the pair is what a deck *is*: the language
 * and the language it is explained in. Two people studying Japanese do not have
 * the same deck if one reads Korean backs and the other English.
 *
 * Used on the Languages settings page and standalone in the sidebar's language
 * popover.
 */
export default function StudyLanguageList({ onSelect }: { onSelect?: () => void }) {
  const { interfaceLanguage, languages, studyLanguage, setStudyLanguage } = useUser();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      {languages.map(pair => {
        const active = studyLanguage === pair.study;
        return (
          <button
            key={pair.study}
            onClick={() => { void setStudyLanguage(pair.study); onSelect?.(); }}
            className="w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 text-sm font-mono transition-colors hover:bg-[var(--color-muted)]/30"
            style={active ? { color: 'var(--color-highlight)', fontWeight: 700 } : { color: 'var(--color-text)' }}
          >
            <span className="min-w-0">
              <span className="block truncate">
                {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
              </span>
              {/* The half that used to be invisible. Without it two decks read
                  as the same choice made twice. */}
              <span className="block text-xs font-normal opacity-60 truncate">
                {t(interfaceLanguage, 'languagePairSummary', {
                  native: t(interfaceLanguage, pair.native === 'Korean' ? 'labelKorean' : 'labelEnglish'),
                })}
              </span>
            </span>
            {active && (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}

      <button
        onClick={() => setAddOpen(true)}
        className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm font-mono border-t border-[var(--color-muted)]/40 transition-colors hover:bg-[var(--color-muted)]/30"
        style={{ color: 'var(--color-muted)' }}
      >
        <span className="text-base leading-none">+</span>
        {t(interfaceLanguage, 'addLanguage')}
      </button>

      {addOpen && <AddLanguageModal onClose={() => { setAddOpen(false); onSelect?.(); }} />}
    </>
  );
}
