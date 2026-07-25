'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { fetchAllUserFlashcards } from '@/services/firestore';
import {
  collectSavedTerms,
  countSavedPackTerms,
  getPackText,
  getPackTerms,
  getVocabPacks,
} from '@amgi/core';
import { t } from '@/lib/i18n';

export default function DecksPage() {
  const { user, nativeLanguage, studyLanguage } = useUser();
  const packs = getVocabPacks(studyLanguage);
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => { if (!cancelled) setSavedTerms(collectSavedTerms(cards)); })
      .catch(() => {}); // progress is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-highlight)] mb-6">
        {t(nativeLanguage, 'decksTitle')}
      </h1>

      {packs.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t(nativeLanguage, 'decksEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {packs.map(pack => {
            const total = getPackTerms(pack).length;
            const saved = savedTerms ? countSavedPackTerms(pack, savedTerms) : null;
            return (
              <li key={pack.id}>
                <Link
                  href={`/decks/${pack.id}`}
                  className="block p-4 rounded-xl border border-[var(--color-muted)] hover:bg-[var(--color-muted)]/20 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h2 className="font-bold text-[var(--color-text)]">
                      {getPackText(pack.name, nativeLanguage)}
                    </h2>
                    <span className="text-xs text-[var(--color-muted)] shrink-0">
                      {saved !== null
                        ? t(nativeLanguage, 'packsSaved', { added: saved, total })
                        : t(nativeLanguage, 'deckEntryCount', { count: total })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {getPackText(pack.description, nativeLanguage)}
                  </p>
                  {saved !== null && total > 0 && (
                    <div className="mt-3 h-1 rounded-full bg-[var(--color-muted)]/30 overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-highlight)]"
                        style={{ width: `${(saved / total) * 100}%` }}
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
