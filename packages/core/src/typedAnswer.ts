import type { CardSides, TermCore } from './types';
import { getStudyLangSide } from './types';
import type { ReviewDirection } from './sm2';

/**
 * Typing the answer instead of flipping the card.
 *
 * Everything here is pure and local — **no model call, by design**. Review
 * happens on a commute, so a grader that needs a network is a grader that
 * silently stops working exactly where the feature is used. It is also the
 * cheaper answer twice over: no round trip per card, and no grading variance
 * to appeal.
 *
 * The folding rules below are not new. They come from the cloze grader in
 * `grammar.ts`, which paid for them against a real model, and they live here
 * now so they survive that module's deletion — `grammar.ts` imports them back.
 *
 * **What makes strictness acceptable is the rating row.** A miss reveals the
 * expected answer beside what the learner typed and preselects `again`; all
 * four rating buttons stay live. So a learner whose answer was right in a way
 * the card could not know is not appealing a judgement they cannot see — they
 * are reading two strings and picking the rating themselves. That is the same
 * argument the removed cloze override rested on, and here it costs no extra
 * control at all, because the buttons were already on screen.
 */

/**
 * Case, composition, whitespace and typographic marks neutralized.
 *
 * The typographic folding is measured, not anticipated: asked for a French
 * elision cloze the model returned `d’` with a curly apostrophe, which no
 * learner types. Phone keyboards do the same substitution in the other
 * direction, so an answer typed on iOS and a card written by the model can
 * disagree on a character neither party chose.
 *
 * Deliberately does **not** strip punctuation, and deliberately does **not**
 * strip diacritics. The backlog item that asked for typed responses named
 * accents as a case where exact matching is too harsh; the codebase disagrees
 * and wins. Kikuyu's `ĩ`/`ũ` are the two vowels that distinguish words —
 * `STUDY_LANGUAGE_CONFIGS` refuses a Swahili TTS voice for exactly that reason
 * — and French `ou`/`où` and `sur`/`sûr` are different words. Folding them
 * together would teach the learner that the distinction does not matter, which
 * is a worse outcome than a false miss they can correct with one tap.
 */
export function foldText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑‒–—]/g, '-')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Two strings that say the same thing, ignoring spacing.
 *
 * Spacing is ignored for two independent reasons that happen to want the same
 * rule: Korean word spacing varies legitimately between writers and is not
 * what a vocabulary card tests, and an elision attaches with no space where a
 * template has one either side of it.
 */
export function sameFoldedText(a: string, b: string): boolean {
  const x = foldText(a);
  const y = foldText(b);
  return x === y || x.replace(/\s/g, '') === y.replace(/\s/g, '');
}

/** A card, as much of one as grading a typed answer needs. */
export type TypedAnswerCard = CardSides & Pick<TermCore, 'gender'>;

/**
 * Every spelling of the study-language side this card will accept.
 *
 * The study side itself, plus the same word behind its own article where the
 * card declares one — `gender` holds French `le`/`la` and Swedish `en`/`ett`
 * in a field of its own, so the study side is the bare noun and a learner who
 * has learned the word *with* its article types something the card never
 * stored. Only the article the card itself names is accepted; there is no
 * per-language article list to keep in step with the registry.
 *
 * Readings are **not** accepted. Typing `かんじ` for 漢字 answers a different
 * question than the card asked, and a kana or kanji pack exists precisely to
 * teach the script — so that one is left to the learner to claim on the rating
 * row rather than granted silently.
 */
export function acceptedAnswers(card: TypedAnswerCard): string[] {
  const study = getStudyLangSide(card);
  if (!study) return [];
  const answers = [study];
  if (card.gender) answers.push(`${card.gender} ${study}`);
  return answers;
}

export interface TypedAnswerGrade {
  correct: boolean;
  /**
   * The rating this answer earns.
   *
   * **A hit is `easy`, and it is applied rather than offered** — _the user's
   * call, 2026-08-25._ The reasoning is asymmetry: producing the word from
   * memory, spelled correctly, is not a judgement the learner can improve on,
   * so asking them to rate it is asking a question with one honest answer.
   * A miss is the opposite — the grader may simply not know the spelling was
   * also right — so that one keeps the full rating row, which is where the
   * override lives.
   *
   * This reverses an earlier call that capped a hit at `good`, on the ground
   * that emitting `easy` every time ratchets ease across the deck. That effect
   * is real and unbounded — `getNextReviewData` has no ceiling on `ease` — and
   * was accepted deliberately: a word typed correctly on sight is a word whose
   * interval should be growing quickly.
   */
  suggested: 'again' | 'easy';
  /** What the card expected, to show beside what was typed. */
  expected: string;
}

/**
 * Grades a typed answer against the card's study side.
 *
 * A hit is any accepted spelling under `sameFoldedText`. Callers apply a hit
 * straight to the scheduler and move on; only a miss reveals and asks. There is no partial
 * credit and no "close enough" tier: an edit-distance band needs a threshold
 * per writing system, because one character of a two-character Korean word is
 * a different word where one character of `anniversaire` is a slip of the
 * thumb. The rating row absorbs both cases at no cost.
 */
export function gradeTypedAnswer(typed: string, card: TypedAnswerCard): TypedAnswerGrade {
  const expected = getStudyLangSide(card);
  const answer = typed.trim();
  const correct = answer.length > 0
    && acceptedAnswers(card).some(candidate => sameFoldedText(answer, candidate));
  return { correct, suggested: correct ? 'easy' : 'again', expected };
}

/**
 * Whether this queue entry is asked by typing.
 *
 * Only ever `backToFront` — producing the study-language word from its gloss.
 * The other way round would have the learner type the gloss, and a back is
 * allowed up to two translations where the study side is one word, so the
 * expected answer is genuinely ambiguous in a direction the target never is.
 * A mixed session is therefore mixed on screen: gloss→word cards get the
 * input, word→gloss cards stay flip-and-rate.
 */
export function promptsForTyping(typingEnabled: boolean, direction: ReviewDirection): boolean {
  return typingEnabled && direction === 'backToFront';
}
