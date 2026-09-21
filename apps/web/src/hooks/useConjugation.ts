'use client';
import { useCallback, useMemo, useState } from 'react';
import { conjugationSpec, normalizeEnrolment } from '@amgi/core';
import type { ConjugationEnrolment, ConjugationProgress, ConjugationProgressMap } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { saveUserPreferences } from '@/services/userPreferences';

/**
 * Conjugation progress and enrolment on web, mirroring the native provider.
 *
 * ⚠️ **Reads the live snapshot from `UserContext`, not a fetch of its own.**
 * `users/{uid}` is already subscribed to, and this data lives on it, so a
 * session on the phone reaches an open tab without a reload.
 *
 * ⚠️ **It still owns the pending write.** A snapshot can land between rating a
 * table and that rating reaching the server, and would then be *older* than what
 * is on screen. Ratings are held until a snapshot carries them back, and local
 * wins for a held item — the same shape as the pending-review replay.
 *
 * A hook rather than a provider because web has no second surface reading this
 * during a session: pages mount fresh when navigated to.
 */
export function useConjugation() {
  const { user, studyLanguage, conjugation, conjugationEnrolment } = useUser();
  const spec = conjugationSpec(studyLanguage);

  const [pending, setPending] = useState<ConjugationProgressMap>({});
  const [pendingEnrolment, setPendingEnrolment] = useState<ConjugationEnrolment | null>(null);

  const progress = useMemo(() => {
    const server = conjugation ?? {};
    // Drop anything the server has confirmed, so this stays a write buffer
    // rather than growing into a cache.
    const stillPending: ConjugationProgressMap = {};
    for (const [id, state] of Object.entries(pending)) {
      if (server[id]?.nextReview !== state.nextReview) stillPending[id] = state;
    }
    return { ...server, ...stillPending };
  }, [conjugation, pending]);

  const enrolment = useMemo(
    () => (spec ? normalizeEnrolment(spec, pendingEnrolment ?? conjugationEnrolment) : undefined),
    [spec, pendingEnrolment, conjugationEnrolment],
  );

  const rate = useCallback((itemId: string, state: ConjugationProgress) => {
    setPending(prev => ({ ...prev, [itemId]: state }));
    if (user) void saveUserPreferences(user.uid, { conjugation: { [itemId]: state } }).catch(() => {});
  }, [user]);

  const setEnrolment = useCallback((next: ConjugationEnrolment) => {
    setPendingEnrolment(next);
    if (user) void saveUserPreferences(user.uid, { conjugationEnrolment: next }).catch(() => {});
  }, [user]);

  return { spec, progress, enrolment, loading: conjugation === undefined, rate, setEnrolment };
}
