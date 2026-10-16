'use client';
import { useCallback, useMemo, useState } from 'react';
import {
  conjugationSpec, conjugationTenseKey, enrolAddedTense, learnerSpec, normalizeEnrolment, removeAddedTense,
} from '@amgi/core';
import type { UserTenseOutcome } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { addUserTense } from '@/services/gemini';
import { removeUserTense, saveUserPreferences } from '@/services/userPreferences';

export type AddTenseState =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'failed' }
  | { phase: 'done'; outcome: UserTenseOutcome };

/**
 * Adding a tense to Munli, and taking one away — `useAddVerb`'s shape.
 *
 * ⚠️ **The tense goes onto the learner's own document and nowhere else**, with
 * the forms the model generated for every verb they have: half of what the
 * 2026-10-14 decision allows model-made forms on. The other half is the label,
 * which every surface reads off the spec.
 *
 * An added tense is saved for practice in every regular pattern at once
 * (`enrolAddedTense`), so it is something to do rather than a row to go and
 * find. Only once the snapshot has landed, for the reason `useAddVerb` gives.
 */
export function useAddTense() {
  const { user, studyLanguage, conjugation, conjugationEnrolment, conjugationVerbs, conjugationTenses } = useUser();
  const [state, setState] = useState<AddTenseState>({ phase: 'idle' });
  const base = conjugationSpec(studyLanguage);
  const spec = useMemo(
    () => base && learnerSpec(base, conjugationVerbs, conjugationTenses),
    [base, conjugationVerbs, conjugationTenses],
  );

  const add = useCallback(async (typed: string) => {
    if (!base || !spec || !user) return undefined;
    setState({ phase: 'working' });
    try {
      const outcome = await addUserTense(spec, typed);
      if (outcome.status === 'added') {
        const added = { [conjugationTenseKey(base.language, outcome.tense.tenseId)]: outcome.tense };
        const mine = learnerSpec(base, conjugationVerbs, { ...conjugationTenses, ...added });
        void saveUserPreferences(user.uid, {
          conjugationTenses: added,
          ...(conjugation !== undefined
            ? { conjugationEnrolment: enrolAddedTense(mine, normalizeEnrolment(mine, conjugationEnrolment), outcome.tense.tenseId) }
            : {}),
        }).catch(() => {});
      }
      setState({ phase: 'done', outcome });
      return outcome;
    } catch {
      setState({ phase: 'failed' });
      return undefined;
    }
  }, [base, spec, user, conjugation, conjugationEnrolment, conjugationVerbs, conjugationTenses]);

  const remove = useCallback((tenseId: string) => {
    if (!base || !spec || !user || conjugation === undefined) return;
    const { enrolment, boxIds } = removeAddedTense(
      spec, normalizeEnrolment(spec, conjugationEnrolment), conjugation, tenseId,
    );
    setState({ phase: 'idle' });
    void removeUserTense(user.uid, conjugationTenseKey(base.language, tenseId), enrolment, boxIds).catch(() => {});
  }, [base, spec, user, conjugation, conjugationEnrolment]);

  return { state, add, remove, spec };
}
