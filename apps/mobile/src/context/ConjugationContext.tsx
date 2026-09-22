import React, { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { conjugationSpec, normalizeEnrolment, normalizeProgress } from '@amgi/core';
import type { ConjugationEnrolment, ConjugationProgressMap } from '@amgi/core';
import { useUser } from './UserContext';
import { saveUserPreferences } from '../services/userPreferences';

/**
 * Conjugation progress and enrolment, for every Munli surface.
 *
 * ⚠️ **The data comes off `UserContext`'s live snapshot, not a read of its
 * own.** This originally did its own one-shot `getUserPreferences`, which fixed
 * only the symptom it was written for — Practice and Progress disagreeing on one
 * device — and left the real one: a session on the laptop was invisible on the
 * phone until it was relaunched. `users/{uid}` is already subscribed to, and
 * this data lives on it, so riding that subscription is both less code and the
 * actual fix.
 *
 * ⚠️ **What this still owns is the pending write.** A snapshot can land between
 * rating a table and that rating reaching the server, and the snapshot would be
 * *older* than what is on screen. So every rating is held here until a snapshot
 * comes back carrying it, and local always wins for a held item — the same shape
 * as the pending-review replay in `review.tsx`, and the same reason.
 */
interface ConjugationContextType {
  progress: ConjugationProgressMap;
  enrolment: ConjugationEnrolment | undefined;
  /** True until the first snapshot lands. "Not yet" is not "none". */
  loading: boolean;
  /** Write a round's ratings — up to one per box, in a single merge write. */
  rate: (updates: ConjugationProgressMap) => void;
  setEnrolment: (next: ConjugationEnrolment) => void;
}

const ConjugationContext = createContext<ConjugationContextType>({
  progress: {},
  enrolment: undefined,
  loading: true,
  rate: () => {},
  setEnrolment: () => {},
});

export function ConjugationProvider({ children }: { children: ReactNode }) {
  const { user, studyLanguage, conjugation, conjugationEnrolment } = useUser();
  const spec = conjugationSpec(studyLanguage);

  /** Ratings written but not yet seen coming back. */
  const [pending, setPending] = useState<ConjugationProgressMap>({});
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  /** Set locally and not yet echoed by a snapshot. */
  const [pendingEnrolment, setPendingEnrolment] = useState<ConjugationEnrolment | null>(null);

  const progress = useMemo(() => {
    if (!spec) return {};
    const server = conjugation ?? {};
    // Drop anything the server has now confirmed, so `pending` cannot grow for
    // the life of the app — it is a write buffer, not a cache.
    const stillPending: ConjugationProgressMap = {};
    for (const [id, state] of Object.entries(pending)) {
      if (server[id]?.nextReview !== state.nextReview) stillPending[id] = state;
    }
    // ⚠️ `normalizeProgress` is what performs the 2026-09-22 reset: a user
    // document's table-grained entries are dropped on read, not migrated.
    return normalizeProgress(spec, { ...server, ...stillPending });
  }, [spec, conjugation, pending]);

  const enrolment = useMemo(() => {
    if (!spec) return undefined;
    return normalizeEnrolment(spec, pendingEnrolment ?? conjugationEnrolment);
  }, [spec, pendingEnrolment, conjugationEnrolment]);

  const rate = useCallback((updates: ConjugationProgressMap) => {
    setPending(prev => ({ ...prev, ...updates }));
    // Fire and forget, like every other rating in the app: blocking the next
    // question on a round trip is what makes a five-second exercise feel like a
    // forty-second one. The nested map merges key by key, so a round writes the
    // boxes it asked and not the set — one write rather than six.
    if (user) void saveUserPreferences(user.uid, { conjugation: updates }).catch(() => {});
  }, [user]);

  const setEnrolment = useCallback((next: ConjugationEnrolment) => {
    setPendingEnrolment(next);
    if (user) void saveUserPreferences(user.uid, { conjugationEnrolment: next }).catch(() => {});
  }, [user]);

  const value = useMemo(
    () => ({ progress, enrolment, loading: conjugation === undefined, rate, setEnrolment }),
    [progress, enrolment, conjugation, rate, setEnrolment],
  );

  return <ConjugationContext.Provider value={value}>{children}</ConjugationContext.Provider>;
}

export function useConjugation() {
  return useContext(ConjugationContext);
}
