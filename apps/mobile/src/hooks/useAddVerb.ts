import { useCallback, useState } from 'react';
import {
  conjugationSpec, conjugationVerbKey, findSubject, normalizeEnrolment, setEnrolled, withUserVerbs,
} from '@amgi/core';
import type { UserPreferences, UserVerbOutcome } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { lookUpUserVerb } from '../services/gemini';
import { saveUserPreferences } from '../services/userPreferences';

export type AddVerbState =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'failed' }
  /** `savedTense` is the tense put into practice with the verb, when one was. */
  | { phase: 'done'; outcome: UserVerbOutcome; savedTense?: string };

/**
 * Adding a verb to Munli, from either door: the button on the Verbs topic and
 * "Add to Munli" on a French verb in Amgi.
 *
 * Reads `UserContext` rather than Munli's own conjugation state, because Amgi
 * is outside it. Nothing is held here once a verb is written: the write lands
 * on `users/{uid}`, the live snapshot carries it back, and every Munli surface
 * builds its spec from that.
 *
 * ⚠️ **The verb goes onto the learner's own document and nowhere else.** That
 * is half of what `docs/packs/README.md` allows model-made forms on.
 */
export function useAddVerb() {
  const { user, studyLanguage, deckNativeLanguage, conjugation, conjugationEnrolment, conjugationVerbs } = useUser();
  const [state, setState] = useState<AddVerbState>({ phase: 'idle' });
  const base = conjugationSpec(studyLanguage);

  /**
   * `practise` also saves a new irregular verb in the language's first tense.
   *
   * Amgi passes it and the Verbs topic does not. On the topic the tense pills
   * are right under the new table; from Amgi they are a mode away, and a verb
   * added from there that nothing ever asks would not be what the button said.
   * A regular verb needs none of this: its group is already being practised.
   */
  const add = useCallback(async (term: string, options: { gloss?: string; practise?: boolean } = {}) => {
    if (!base || !user) return undefined;
    setState({ phase: 'working' });
    try {
      const outcome = await lookUpUserVerb(withUserVerbs(base, conjugationVerbs), term, {
        nativeLanguage: deckNativeLanguage,
        gloss: options.gloss,
      });
      let savedTense: string | undefined;
      if (outcome.status === 'added') {
        const added = { [conjugationVerbKey(base.language, outcome.verb.infinitive)]: outcome.verb };
        const update: Partial<UserPreferences> = { conjugationVerbs: added };
        // ⚠️ Only once the snapshot has landed. Before it, an absent enrolment
        // normalises to the default set, and writing that would replace the
        // learner's real one.
        if (options.practise && outcome.verb.group === 'irregular' && conjugation !== undefined) {
          const mine = withUserVerbs(base, { ...conjugationVerbs, ...added });
          const subject = findSubject(mine, outcome.subjectKey);
          const tense = mine.tenses[0];
          if (subject) {
            update.conjugationEnrolment = setEnrolled(
              normalizeEnrolment(mine, conjugationEnrolment), subject, [tense.id], true,
            );
            savedTense = tense.label;
          }
        }
        // Fire and forget, like a rating: the snapshot shows it at once.
        void saveUserPreferences(user.uid, update).catch(() => {});
      }
      setState({ phase: 'done', outcome, savedTense });
      return outcome;
    } catch {
      setState({ phase: 'failed' });
      return undefined;
    }
  }, [base, user, conjugation, conjugationEnrolment, conjugationVerbs, deckNativeLanguage]);

  /** `spec` is the language's own, for reading an outcome's copy against. */
  return { state, add, spec: base };
}
