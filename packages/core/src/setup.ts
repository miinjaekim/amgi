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
 * 執生 for Cantonese is the user's choice, checked the same way. طرب for Arabic
 * is the first of the five chips the user approved on 2026-10-05.
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
  Cantonese: '執生',
  Arabic: 'طرب',
  Hanja: '水',
};

/**
 * How long first run waits on its lookup before offering a retry.
 *
 * The setup screen has no dismiss, and a request on a dead connection does not
 * fail, it just never answers. Real lookups measured 3 to 9 seconds.
 */
export const SETUP_LOOKUP_TIMEOUT_MS = 15_000;

/** The day a card comes back, as first run says it: today, tomorrow, or a date. */
export function setupReturnDay(date: Date, lang: string | null | undefined, now: Date = new Date()): string {
  const korean = lang === 'Korean';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return korean ? '오늘' : 'today';
  if (date.toDateString() === tomorrow.toDateString()) return korean ? '내일' : 'tomorrow';
  return date.toLocaleDateString(korean ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
}
