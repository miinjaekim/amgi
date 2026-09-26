'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import PageHeader from '@/components/PageHeader';
import { useUserPacks } from '@/components/UserPacksContext';
import { subscribeToAllUserFlashcards } from '@/services/firestore';
import {
  collectSavedTerms,
  countSavedPackTerms,
  getPackText,
  getPackTerms,
  getVocabPacks,
  userPackId,
  userPackProgress,
} from '@amgi/core';
import { t } from '@/lib/i18n';

/**
 * Entirely chrome: a pack's name and description are UI copy, which is what
 * `getPackText` keys on. Only a pack *back* belongs to the deck's language, and
 * this page shows none — see `resolvePackBack` for that distinction.
 */
export default function DecksPage() {
  const { user, interfaceLanguage, studyLanguage } = useUser();
  // Read so this re-renders when the learner's own packs arrive or change;
  // `getVocabPacks` already includes them.
  const { userPacks } = useUserPacks();
  const packs = getVocabPacks(studyLanguage);
  const progressOf = (packId: string) => {
    const pack = userPacks?.find(p => userPackId(p.id) === packId);
    return pack ? userPackProgress(pack) : null;
  };
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);

  // Live, so enrolling from a pack detail page or saving from Learn updates the
  // per-deck progress here without a revisit.
  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    return subscribeToAllUserFlashcards(
      user.uid,
      studyLanguage,
      cards => setSavedTerms(collectSavedTerms(cards)),
      () => {}, // progress is a nicety — browsing still works
    );
  }, [user, studyLanguage]);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader titleKey="decksTitle" />

      {user && (
        <Link
          href="/decks/new"
          className="block mb-6 p-4 rounded-xl border border-dashed border-[var(--color-highlight)] text-center font-semibold text-[var(--color-highlight)] hover:bg-[var(--color-muted)]/20 transition-colors"
        >
          + {t(interfaceLanguage, 'decksMakePack')}
        </Link>
      )}

      {packs.length === 0 ? (
        // Packs is in the nav for every language, so this state is reachable on
        // most of them. It says what a pack is rather than promising one:
        // nothing is committed to a date.
        <div>
          <p className="text-[var(--color-muted)]">{t(interfaceLanguage, 'decksEmpty')}</p>
          <p className="text-sm text-[var(--color-muted)] opacity-70 mt-2">
            {t(interfaceLanguage, 'decksEmptyBody')}
          </p>
        </div>
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
                      {getPackText(pack.name, interfaceLanguage)}
                    </h2>
                    <span className="text-xs text-[var(--color-muted)] shrink-0">
                      {saved !== null
                        ? t(interfaceLanguage, 'packsSaved', { added: saved, total })
                        : t(interfaceLanguage, 'deckEntryCount', { count: total })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {getPackText(pack.description, interfaceLanguage)}
                  </p>
                  {(() => {
                    const progress = progressOf(pack.id);
                    return progress && !progress.done ? (
                      <p className="text-xs text-[var(--color-highlight)] mt-2">
                        {t(interfaceLanguage, 'userPackMaking', { ready: progress.ready, total: progress.total })}
                      </p>
                    ) : null;
                  })()}
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
