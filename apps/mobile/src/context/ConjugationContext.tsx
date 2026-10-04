import React, { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { conjugationSpec, normalizeEnrolment, normalizeProgress, withUserVerbs } from '@amgi/core';
import type { ConjugationEnrolment, ConjugationProgressMap, ConjugationSpec, VehicleMisses } from '@amgi/core';
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
  /**
   * The study language's spec with this learner's added verbs in it.
   *
   * ⚠️ **Screens read this one rather than calling `conjugationSpec`.** The
   * enrolment and progress beside it are normalised against it, so a screen
   * holding the bare spec would not find an added verb's tables.
   */
  spec: ConjugationSpec | undefined;
  progress: ConjugationProgressMap;
  enrolment: ConjugationEnrolment | undefined;
  /** True until the first snapshot lands. "Not yet" is not "none". */
  loading: boolean;
  /**
   * Write a round's ratings — up to one per box, in a single merge write.
   * `vehicle` is `rateVehicle`'s entry for the verb the round was asked
   * through, and goes in the same write.
   */
  rate: (updates: ConjugationProgressMap, vehicle?: VehicleMisses) => void;
  /** Miss counts per verb, for `buildConjugationQueue` and `rateVehicle`. */
  vehicleMisses: VehicleMisses | undefined;
  setEnrolment: (next: ConjugationEnrolment) => void;
}

const ConjugationContext = createContext<ConjugationContextType>({
  spec: undefined,
  progress: {},
  enrolment: undefined,
  loading: true,
  rate: () => {},
  vehicleMisses: undefined,
  setEnrolment: () => {},
});

export function ConjugationProvider({ children }: { children: ReactNode }) {
  const { user, studyLanguage, conjugation, conjugationEnrolment, conjugationVerbs, conjugationVehicleMisses } = useUser();
  const spec = useMemo(() => {
    const base = conjugationSpec(studyLanguage);
    return base && withUserVerbs(base, conjugationVerbs);
  }, [studyLanguage, conjugationVerbs]);

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

  /**
   * ⚠️ **No enrolment until the snapshot lands, rather than a plausible one.**
   *
   * `normalizeEnrolment` falls back to the *default* practice set for an
   * absent one, which is the right answer for a new account and the wrong one
   * for an account whose data is still in flight — five patterns nobody saved,
   * every box of them due. Returning `undefined` through the window makes a
   * screen that forgets to check `loading` render nothing instead of something
   * false, and stops `setEnrolled` ever being handed the default to write over
   * a real set with.
   *
   * The window is one round trip. It was invisible until the 2026-09-22 launch
   * work started painting before the server answered; it was always here.
   */
  const enrolment = useMemo(() => {
    if (!spec || conjugation === undefined) return undefined;
    return normalizeEnrolment(spec, pendingEnrolment ?? conjugationEnrolment);
  }, [spec, conjugation, pendingEnrolment, conjugationEnrolment]);

  const rate = useCallback((updates: ConjugationProgressMap, vehicle?: VehicleMisses) => {
    setPending(prev => ({ ...prev, ...updates }));
    // Fire and forget, like every other rating in the app: blocking the next
    // question on a round trip is what makes a five-second exercise feel like a
    // forty-second one. The nested map merges key by key, so a round writes the
    // boxes it asked and not the set — one write rather than six.
    // The verb's count is not held in `pending`: nothing on screen reads it,
    // only the draw when a session starts.
    if (user) {
      void saveUserPreferences(user.uid, {
        conjugation: updates,
        ...(vehicle ? { conjugationVehicleMisses: vehicle } : {}),
      }).catch(() => {});
    }
  }, [user]);

  const setEnrolment = useCallback((next: ConjugationEnrolment) => {
    setPendingEnrolment(next);
    if (user) void saveUserPreferences(user.uid, { conjugationEnrolment: next }).catch(() => {});
  }, [user]);

  const value = useMemo(
    () => ({
      spec, progress, enrolment, loading: conjugation === undefined, rate, setEnrolment,
      vehicleMisses: conjugationVehicleMisses,
    }),
    [spec, progress, enrolment, conjugation, rate, setEnrolment, conjugationVehicleMisses],
  );

  return <ConjugationContext.Provider value={value}>{children}</ConjugationContext.Provider>;
}

export function useConjugation() {
  return useContext(ConjugationContext);
}
