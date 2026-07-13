'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchAllUserFlashcards } from '@/services/firestore';
import { getVocabPacks, getPackText, getStudyLanguageConfig } from '@amgi/core';
import { t } from '@/lib/i18n';

export default function PacksModal({
  onClose,
  onSelectWord,
}: {
  onClose: () => void;
  onSelectWord: (word: string, context?: string) => void;
}) {
  const { user, nativeLanguage, studyLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const packs = getVocabPacks(studyLanguage);
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => {
        if (cancelled) return;
        const terms = new Set<string>();
        for (const card of cards) {
          const study = card[langConfig.studyField] ?? card.term;
          if (study) terms.add(study.toLowerCase());
          if (card.term) terms.add(card.term.toLowerCase());
        }
        setSavedTerms(terms);
      })
      .catch(() => {}); // saved-marking is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage, langConfig.studyField]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-[var(--color-muted)] flex flex-col"
        style={{ background: 'var(--color-surface)', maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-6 pb-2 shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-highlight)]">{t(nativeLanguage, 'packsLink')}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {packs.map(pack => {
            const savedCount = savedTerms
              ? pack.words.filter(w => savedTerms.has(w.word.toLowerCase())).length
              : null;
            return (
              <div key={pack.id} className="mt-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-bold text-[var(--color-text)]">{getPackText(pack.name, nativeLanguage)}</h3>
                  {savedCount !== null && (
                    <span className="text-xs text-[var(--color-muted)]">
                      {t(nativeLanguage, 'packsSaved', { added: savedCount, total: pack.words.length })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-muted)] mt-1 mb-2">{getPackText(pack.description, nativeLanguage)}</p>
                <p className="text-xs text-[var(--color-muted)] opacity-70 mb-3">{t(nativeLanguage, 'packTapHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {pack.words.map(({ word, context }) => {
                    const saved = savedTerms?.has(word.toLowerCase()) ?? false;
                    return (
                      <button
                        key={word}
                        onClick={() => onSelectWord(word, context)}
                        className={`px-3 py-1 rounded-full border text-sm transition-colors border-[var(--color-muted)] hover:bg-[var(--color-muted)]/30 ${
                          saved ? 'opacity-40 text-[var(--color-muted)]' : 'text-[var(--color-text)]'
                        }`}
                      >
                        {word}
                        {saved && <span className="ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
