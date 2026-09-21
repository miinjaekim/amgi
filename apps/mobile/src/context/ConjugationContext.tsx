import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { ConjugationProgress, ConjugationProgressMap } from '@amgi/core';
import { useUser } from './UserContext';
import { getUserPreferences, saveUserPreferences } from '../services/userPreferences';

/**
 * Conjugation progress, owned once for the whole mode.
 *
 * ⚠️ **This exists because two screens held two copies of it.** Practice loaded
 * its own, rated into its own, and wrote to Firestore; Progress had loaded a
 * different copy when it mounted and never heard about the write, so nothing
 * appeared there until the app was restarted. That is the same failure as the
 * 2026-09-15 entry in `status.md` — the streak chip and the Progress tab keeping
 * two copies of one number — and the fix is the same one: a single source, not
 * a reload on focus. A focus refetch would have hidden this instance and left
 * the next surface to rediscover it.
 *
 * Writes stay per-answer rather than batched at the end of a session. Batching
 * is fewer round trips and loses the whole session if the app dies mid-way,
 * which is the wrong trade for something this small.
 */
interface ConjugationContextType {
  progress: ConjugationProgressMap;
  /** True until the first load settles — the difference between "none" and "not yet". */
  loading: boolean;
  /** Record one table's new state, in memory and in Firestore. */
  rate: (itemId: string, state: ConjugationProgress) => void;
}

const ConjugationContext = createContext<ConjugationContextType>({
  progress: {},
  loading: true,
  rate: () => {},
});

export function ConjugationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [progress, setProgress] = useState<ConjugationProgressMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProgress({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getUserPreferences(user.uid)
      .then(prefs => {
        if (cancelled) return;
        setProgress(prefs?.conjugation ?? {});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const rate = useCallback((itemId: string, state: ConjugationProgress) => {
    setProgress(prev => ({ ...prev, [itemId]: state }));
    // Fire and forget, like every other rating in the app: a lost write costs
    // one table's scheduling, and blocking the next question on a round trip is
    // what makes a five-second exercise feel like a forty-second one. The
    // nested map merges key by key, so this writes one table and not the set.
    if (user) void saveUserPreferences(user.uid, { conjugation: { [itemId]: state } }).catch(() => {});
  }, [user]);

  return (
    <ConjugationContext.Provider value={{ progress, loading, rate }}>
      {children}
    </ConjugationContext.Provider>
  );
}

export function useConjugation() {
  return useContext(ConjugationContext);
}
