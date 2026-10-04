import type { StudyLanguage } from './types';

/**
 * The word first run offers to look up, per study language.
 *
 * Each one is already an example chip on Learn, so this is a pick from a list
 * that exists rather than a second one. Three things decided which chip:
 *
 * - **In the study language.** Half of Learn's chips are native-language words
 *   ("longing", "awkward"), which show translation the other way round. The
 *   walkthrough ends on a card, and the card's front is the study side.
 * - **Not a starter word.** The audience is not beginners; 눈치 says what the
 *   app is for and 사랑 does not.
 * - **One meaning.** 배 and sobremesa are Learn's first Korean and Spanish
 *   chips and both come back as a disambiguation picker, which is a detour in
 *   a flow meant to take a minute. Checked against `/api/explain` on
 *   2026-10-04; re-check a word before swapping it in.
 *
 * `Record`, not `Partial`: a language added to the registry without a word here
 * should fail to compile rather than fall back to another language's.
 */
export const SETUP_WORDS: Record<StudyLanguage, string> = {
  Korean: '눈치',
  Swedish: 'lagom',
  English: 'serendipity',
  French: 'dépaysement',
  Spanish: 'madrugar',
  Kikuyu: 'ũhoro',
  Swahili: 'harambee',
  Japanese: '木漏れ日',
  TraditionalChinese: '緣分',
  Hanja: '水',
};
