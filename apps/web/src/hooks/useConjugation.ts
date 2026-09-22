'use client';
import { useCallback, useMemo, useState } from 'react';
import { conjugationSpec, normalizeEnrolment, normalizeProgress } from '@amgi/core';
import type { ConjugationEnrolment, ConjugationProgressMap } from '@amgi/core';
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
    if (!spec) return {};
    const server = conjugation ?? {};
    // Drop anything the server has confirmed, so this stays a write buffer
    // rather than growing into a cache.
    const stillPending: ConjugationProgressMap = {};
    for (const [id, state] of Object.entries(pending)) {
      if (server[id]?.nextReview !== state.nextReview) stillPending[id] = state;
    }
    // ⚠️ `normalizeProgress` is what performs the 2026-09-22 reset: the
    // table-grained entries a user document may still carry are dropped on
    // read rather than migrated. See its comment in core.
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
  const enrolment = useMemo(
    () => (spec && conjugation !== undefined
      ? normalizeEnrolment(spec, pendingEnrolment ?? conjugationEnrolment)
      : undefined),
    [spec, conjugation, pendingEnrolment, conjugationEnrolment],
  );

  /**
   * Write a round's ratings.
   *
   * ⚠️ **A map rather than one box**, since a round rates up to six of them at
   * once. One merge write per round rather than six is the point: the nested
   * map merges key by key, so this writes the boxes answered and not the set.
   */
  const rate = useCallback((updates: ConjugationProgressMap) => {
    setPending(prev => ({ ...prev, ...updates }));
    if (user) void saveUserPreferences(user.uid, { conjugation: updates }).catch(() => {});
  }, [user]);

  const setEnrolment = useCallback((next: ConjugationEnrolment) => {
    setPendingEnrolment(next);
    if (user) void saveUserPreferences(user.uid, { conjugationEnrolment: next }).catch(() => {});
  }, [user]);

  return { spec, progress, enrolment, loading: conjugation === undefined, rate, setEnrolment };
}
