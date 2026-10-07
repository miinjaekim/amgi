import type { CardSides, StudyLanguage, TermCore } from './types';
import { getBackSide, getStudyLangSide, getStudyLanguageConfig, stripArabicMarks } from './types';
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
 *
 * **Both directions are typed** — _the user's call, 2026-10-07_, reversing the
 * first cut, which typed only the word. A typed word is still all or nothing.
 * A typed meaning has a middle outcome, because a back is not one string the
 * way a word is: see `gradeTypedAnswer`.
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
 *
 * Arabic vowel marks are the exception, and they are not diacritics in that
 * sense: they are an optional layer of the spelling, left off in ordinary
 * writing, and كتاب and كِتَاب are one word written two ways. The front of an
 * Arabic card is unvowelled by decision (2026-10-05), so an answer typed with
 * its marks must still match it.
 */
export function foldText(text: string): string {
  return stripArabicMarks(text)
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

/**
 * The glosses a back holds: one, or two around the single comma or semicolon
 * the gloss rule allows (`GLOSS_RULE`, web's `lib/glossRule.ts`).
 */
function splitGlosses(back: string): string[] {
  return back.split(/[,;]/).map(gloss => gloss.trim()).filter(Boolean);
}

/**
 * A gloss without the particle English puts in front of it. "to run" and
 * "run", "a deadline" and "deadline" are one answer; which of them the card
 * stored is the model's habit, not something the learner was asked.
 *
 * Runs on folded text, and on Korean backs too, where it matches nothing.
 */
function stripLeadingParticle(folded: string): string {
  return folded.replace(/^(?:to|an|a|the) (?=\S)/, '');
}

function sameGloss(a: string, b: string): boolean {
  return sameFoldedText(stripLeadingParticle(foldText(a)), stripLeadingParticle(foldText(b)));
}

/**
 * Every back this card has, the one on screen first.
 *
 * A card can carry an English back and a Korean one — a Korean native studying
 * Japanese has both — and shows only the learner's own. The other is still a
 * correct meaning. Never the study field: on a Korean deck `korean` is the
 * word being asked about.
 */
function meaningBacks(card: TypedAnswerCard, nativeLanguage: string | null | undefined): string[] {
  const { studyField } = getStudyLanguageConfig(card.studyLanguage);
  const others = (['english', 'korean'] as const)
    .filter(field => field !== studyField)
    .map(field => card[field] ?? '');
  return [getBackSide(card, nativeLanguage), ...others]
    .filter((back, i, all) => back && all.indexOf(back) === i);
}

/**
 * Whether a typed meaning is right under the leniency rules, for some back:
 * every gloss typed is one of that back's glosses, particles aside. So either
 * gloss of two passes, and so do both in the other order or around the other
 * separator.
 */
function nearMeaning(answer: string, backs: string[]): boolean {
  const typed = splitGlosses(answer);
  return typed.length > 0 && backs.some(back => {
    const glosses = splitGlosses(back);
    return typed.every(part => glosses.some(gloss => sameGloss(part, gloss)));
  });
}

export interface TypedAnswerGrade {
  /**
   * `exact` is applied by the caller and the card is gone; `near` and `miss`
   * both reveal and ask. Only a typed meaning is ever `near`.
   */
  outcome: 'exact' | 'near' | 'miss';
  /** Anything but a miss — what the verdict line on the revealed card reads. */
  correct: boolean;
  /**
   * The rating this answer earns.
   *
   * **An exact hit is `easy`, and it is applied rather than offered** — _the
   * user's call, 2026-08-25._ The reasoning is asymmetry: producing the word from
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
   *
   * **A near match is `good`, and it is offered rather than applied** — _the
   * user's call, 2026-10-07._ The grader bent a rule to accept it, so the
   * learner is the one who says whether "mood" for "atmosphere, mood" was
   * knowing the word.
   */
  suggested: 'again' | 'good' | 'easy';
  /** What the card expected, to show beside what was typed. */
  expected: string;
}

/**
 * Grades a typed answer against the side the direction hides.
 *
 * **`backToFront`, the word.** A hit is any accepted spelling under
 * `sameFoldedText`, and there is nothing between a hit and a miss: an
 * edit-distance band needs a threshold per writing system, because one
 * character of a two-character Korean word is a different word where one
 * character of `anniversaire` is a slip of the thumb. The rating row absorbs
 * both cases at no cost.
 *
 * **`frontToBack`, the meaning.** Three outcomes, _the user's call,
 * 2026-10-07_:
 * - **exact** — the back on screen, as stored, under the same folding.
 * - **near** — right only under the leniency rules: either gloss when the back
 *   holds two, a leading `to`/`a`/`an`/`the` ignored, and the card's other
 *   back (English beside Korean) accepted. On "atmosphere, mood", "mood" is
 *   near, not exact.
 * - **miss** — anything else, exactly as for a word.
 *
 * Still no edit distance and still no model: the leniency is three rules a
 * learner could recite, which is what keeps a miss legible.
 */
export function gradeTypedAnswer(
  typed: string,
  card: TypedAnswerCard,
  direction: ReviewDirection,
  nativeLanguage: string | null | undefined,
): TypedAnswerGrade {
  const answer = typed.trim();
  const grade = (outcome: TypedAnswerGrade['outcome'], expected: string): TypedAnswerGrade => ({
    outcome,
    correct: outcome !== 'miss',
    suggested: outcome === 'exact' ? 'easy' : outcome === 'near' ? 'good' : 'again',
    expected,
  });

  if (direction === 'backToFront') {
    const hit = answer.length > 0
      && acceptedAnswers(card).some(candidate => sameFoldedText(answer, candidate));
    return grade(hit ? 'exact' : 'miss', getStudyLangSide(card));
  }

  const [expected = '', ...otherBacks] = meaningBacks(card, nativeLanguage);
  if (!answer || !expected) return grade('miss', expected);
  if (sameFoldedText(answer, expected)) return grade('exact', expected);
  return grade(nearMeaning(answer, [expected, ...otherBacks]) ? 'near' : 'miss', expected);
}

/**
 * Whether this session's cards are asked by typing — both directions, on one
 * toggle.
 *
 * **Never on Hanja**, whichever direction. `gradeTypedAnswer` grades input
 * against *a* side, and a hanja card's back is two parts: with 물 and 수 both
 * behind the character, a typed 물 is neither right nor wrong until someone
 * decides whether both parts are required — and on the `character` partition
 * the expected answer is a glyph most learners cannot type at all. Left off
 * rather than guessed at; it is additive if someone asks for it.
 */
export function promptsForTyping(
  typingEnabled: boolean,
  studyLanguage?: StudyLanguage | string,
): boolean {
  return typingEnabled && studyLanguage !== 'Hanja';
}
