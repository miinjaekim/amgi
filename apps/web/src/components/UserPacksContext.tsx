'use client';
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  getPackText,
  setUserVocabPacks,
  userPackId,
  userPackProgress,
  userPackToVocabPack,
  type StudyLanguage,
  type UserPack,
  type VocabPack,
} from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { subscribeToUserPacks } from '@/services/userPacks';
import { t } from '@/lib/i18n';

interface UserPacksContextType {
  /** Null until the first snapshot, and while signed out. */
  userPacks: UserPack[] | null;
}

const UserPacksContext = createContext<UserPacksContextType>({ userPacks: null });

/**
 * Keeps the learner's own packs live, hands them to the pack registry so every
 * pack surface sees them, and raises the notice when one finishes.
 *
 * The notice is the "tell me when it's done" half of sourcing: it takes
 * minutes, so the learner is expected to be somewhere else by then. Only a
 * pack seen unfinished in this session announces itself; one that finished
 * while the tab was closed is simply there on Packs.
 */
export function UserPacksProvider({ children }: { children: ReactNode }) {
  const { user, interfaceLanguage } = useUser();
  const [userPacks, setUserPacks] = useState<UserPack[] | null>(null);
  const [notices, setNotices] = useState<UserPack[]>([]);
  const unfinished = useRef(new Set<string>());

  useEffect(() => {
    unfinished.current = new Set();
    if (!user) {
      setUserPacks(null);
      setUserVocabPacks({});
      return;
    }
    return subscribeToUserPacks(
      user.uid,
      packs => {
        const byLanguage: Partial<Record<StudyLanguage, VocabPack[]>> = {};
        for (const pack of packs) (byLanguage[pack.studyLanguage] ??= []).push(userPackToVocabPack(pack));
        setUserVocabPacks(byLanguage);

        const finished: UserPack[] = [];
        for (const pack of packs) {
          const { done, ready } = userPackProgress(pack);
          if (!done) unfinished.current.add(pack.id);
          else if (unfinished.current.delete(pack.id) && ready > 0) finished.push(pack);
        }
        if (finished.length) setNotices(current => [...current, ...finished]);
        setUserPacks(packs);
      },
      () => setUserPacks([]),
    );
  }, [user]);

  return (
    <UserPacksContext.Provider value={{ userPacks }}>
      {children}
      {notices.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex flex-col gap-2">
          {notices.map(pack => (
            <div
              key={pack.id}
              role="status"
              className="p-4 rounded-xl border border-[var(--color-highlight)] bg-[var(--color-surface)] shadow-lg"
            >
              <p className="text-sm text-[var(--color-text)]">
                {t(interfaceLanguage, 'userPackReady', { name: getPackText(pack.name, interfaceLanguage) })}
              </p>
              <div className="flex gap-3 mt-2">
                <Link
                  href={`/decks/${userPackId(pack.id)}`}
                  onClick={() => setNotices(current => current.filter(p => p.id !== pack.id))}
                  className="text-sm font-semibold text-[var(--color-highlight)]"
                >
                  {t(interfaceLanguage, 'userPackOpen')}
                </Link>
                <button
                  onClick={() => setNotices(current => current.filter(p => p.id !== pack.id))}
                  className="text-sm text-[var(--color-muted)]"
                >
                  {t(interfaceLanguage, 'userPackDismiss')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </UserPacksContext.Provider>
  );
}

export const useUserPacks = () => useContext(UserPacksContext);
