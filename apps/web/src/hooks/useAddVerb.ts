'use client';
import { useCallback, useState } from 'react';
import { conjugationSpec, conjugationVerbKey, withUserVerbs } from '@amgi/core';
import type { UserVerbOutcome } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { lookUpUserVerb } from '@/services/gemini';
import { saveUserPreferences } from '@/services/userPreferences';

export type AddVerbState =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'failed' }
  | { phase: 'done'; outcome: UserVerbOutcome };

/**
 * Adding a verb to Munli, from either door: the field on Topics and the action
 * on a French verb card.
 *
 * Reads `UserContext` rather than Munli's own conjugation state, because the
 * card is in Amgi, outside it. Nothing is held here once a verb is written: the
 * write lands on `users/{uid}`, the live snapshot carries it back, and every
 * Munli surface builds its spec from that.
 *
 * ⚠️ **The verb goes onto the learner's own document and nowhere else.** That
 * is half of what `docs/packs/README.md` allows model-made forms on.
 */
export function useAddVerb() {
  const { user, studyLanguage, deckNativeLanguage, conjugationVerbs } = useUser();
  const [state, setState] = useState<AddVerbState>({ phase: 'idle' });
  const base = conjugationSpec(studyLanguage);

  const add = useCallback(async (term: string, gloss?: string) => {
    if (!base || !user) return;
    setState({ phase: 'working' });
    try {
      const outcome = await lookUpUserVerb(withUserVerbs(base, conjugationVerbs), term, {
        nativeLanguage: deckNativeLanguage,
        gloss,
      });
      if (outcome.status === 'added') {
        // Fire and forget, like a rating: the snapshot shows it at once.
        void saveUserPreferences(user.uid, {
          conjugationVerbs: { [conjugationVerbKey(base.language, outcome.verb.infinitive)]: outcome.verb },
        }).catch(() => {});
      }
      setState({ phase: 'done', outcome });
    } catch {
      setState({ phase: 'failed' });
    }
  }, [base, user, conjugationVerbs, deckNativeLanguage]);

  /** The spec the outcome's copy is read against, or nothing for this language. */
  return { state, add, spec: base };
}
