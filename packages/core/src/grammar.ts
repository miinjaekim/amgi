import type { ReviewTracking, StudyLanguage } from './types';
import { getWritingReview } from './writing';
import type { WritingPatternCandidate, WritingReview } from './writing';

/**
 * Grammar patterns: the thing you exercise, as opposed to the card you flip.
 *
 * The argument is in `.scratchpad/vision.md` and is worth reading before
 * changing anything here — vocabulary is a lookup table and grammar is a
 * function, so a fixed prompt-answer pair runs that function on no arguments.
 * Every review is a fresh act of production instead: a situation in the
 * learner's own language, a sentence they write, a verdict from grading it.
 *
 * Four shape decisions are load-bearing.
 *
 * **Practice runs controlled → free, so there are two exercises and the
 * learner's *stage* picks between them.** A cloze — one sentence with the
 * pattern blanked, typed into — until the pattern sticks, then free production
 * from a situation. The first cut of this file opened at production for
 * everything, which is rung three, and the ambiguity and grading variance that
 * came back from the trial were both symptoms of that. See
 * `docs/grammar-research.md`; it is where this design comes from.
 *
 * **One `ReviewTracking`, not two.** A card carries `frontToBack` and
 * `backToFront` because both are real skills. A pattern has one direction that
 * matters — meaning → form. Recognising `-다가` in running text is
 * comprehension of the *sentence* and comes free from reading; there is no
 * second rung to schedule.
 *
 * **Exercises are not stored; patterns are.** The sentence or situation is
 * generated per review, the way depth and examples are generated on demand.
 * Same rule as writing review's ephemeral submissions: the pattern is the
 * durable artifact. A cloze sentence that came back unchanged would be recalled
 * as a sentence, which is the flashcard failure this feature exists to escape.
 *
 * **A cloze turn is one model call; a production turn is two.** Generation
 * supplies the expected answer for a cloze, so grading is a local string
 * comparison with no round trip and no variance. Production cannot collapse
 * that way — the exercise has to exist before there is anything to respond to,
 * and only a model can judge free text. A session therefore costs
 * `n_cloze + 2·n_production`, weighted toward the cheap end because every
 * pattern starts at cloze. Grading production is `/api/writing` unchanged.
 */

/**
 * Whether a pattern ever graduates from cloze to free production.
 *
 * - `choice` — a meaning maps to a form and the skill is picking it (`-다가`,
 *   `-는데`, passé composé). Free production has something to test, so these
 *   graduate.
 * - `form` — a rule that applies to something the learner was going to write
 *   anyway (`de` → `d'`, 을/를 by batchim). There is no meaning being chosen, so
 *   free production adds nothing and these stay at cloze permanently.
 *
 * **This describes the learner's error, not the pattern.** 은/는 has both
 * aspects — choosing topic over subject, and picking the allomorph by batchim —
 * so "which kind is 은/는" has no answer while "which did this writer just get
 * wrong" always does. The writing finding knows, which is why the classifier
 * reads the finding rather than a grammar reference, and why the same pattern
 * can legitimately be `form` for one learner and `choice` for another.
 */
export type PatternKind = 'choice' | 'form';

export const PATTERN_KINDS: readonly PatternKind[] = ['choice', 'form'];

export interface GrammarPattern {
  id?: string;
  uid: string;
  studyLanguage: StudyLanguage;
  /** Citation form — `-다가`, `passé composé`. In the study language. */
  pattern: string;
  /** Whether this one ever graduates to free production. */
  kind: PatternKind;
  /**
   * What it does, in a few words. Optional on *both* sides — see
   * `WritingPatternCandidate`, whose reasoning this inherits: the gloss is a
   * caption beside an exercise generated in the reader's language, not the
   * substance of the object. Don't tighten these to required.
   */
  gloss: { English?: string; Korean?: string };
  /** One or two sentences on when to reach for it, in the native language. */
  note?: string;
  /** Provenance only, never identity — mirrors `packId`'s rule. */
  source?: 'writing' | 'lookup' | 'manual';
  createdAt: Date;
  archived?: boolean;
  /** One tracking, not two. */
  production?: ReviewTracking;
}

/**
 * Reviews a `choice` pattern spends at cloze before free production opens.
 *
 * Not a round number picked for feel. Read at the top of a turn, a stored
 * `repetitions` of 2 means the *next* success is the first that stops setting a
 * fixed interval (1 day, then 6) and starts multiplying by ease
 * (`sm2.ts:71-75`). So production begins exactly where the scheduler itself
 * starts treating the item as known, and the codebase keeps one definition of
 * "learned" rather than growing a second.
 */
export const CLOZE_REPETITIONS = 2;

export type ExerciseFormat = 'cloze' | 'production';

/**
 * Which rung this pattern is on right now.
 *
 * **Derived, never stored**, and that buys more than tidiness: there is no
 * field to migrate and no way for stage and schedule to drift apart — but
 * mostly it means a lapse demotes for free. `getNextReviewData` resets
 * `repetitions` to 0 on `again` (`sm2.ts:68`), so failing a production turn
 * drops the pattern back to controlled practice on its own, which is exactly
 * what controlled → free prescribes and would otherwise have been a rule
 * someone had to remember to write.
 *
 * Consequence, recorded rather than solved: `hard` is quality 3, so it
 * *increments* repetitions and does not demote. A shaky production turn keeps
 * you at production. That reads right — `hard` means the skill is there and
 * wobbling, not that the rung was wrong — but it is a reading, and this is the
 * line to change if demotion should trigger more widely.
 */
export function exerciseFormat(
  pattern: Pick<GrammarPattern, 'kind' | 'production'>,
): ExerciseFormat {
  if (pattern.kind === 'form') return 'cloze';
  return (pattern.production?.repetitions ?? 0) >= CLOZE_REPETITIONS
    ? 'production'
    : 'cloze';
}

/** The gap in a cloze sentence. Everything is normalized to this on parse. */
export const CLOZE_GAP = '___';

/**
 * A controlled turn: one sentence with the pattern blanked, typed into.
 *
 * The learner still *produces* the form — nothing is offered to pick from — so
 * this does not breach the no-multiple-choice rule. It is cued recall, which
 * beats recognition for retention; what the sentence changes is how much of the
 * search space is already fenced off, which is the same trade the hint tiers
 * make deliberately.
 *
 * **Carries no hint fields.** A cloze's two tiers are the pattern's own stored
 * `gloss` and citation form, so they cost nothing to produce and nothing to
 * send. Only a production turn needs generated hints.
 */
export interface ClozeExercise {
  format: 'cloze';
  /** One sentence in the study language, containing exactly one `CLOZE_GAP`. */
  sentence: string;
  /**
   * The same sentence complete, with nothing removed.
   *
   * Carried rather than derived, for two reasons. It is what the round-trip
   * check below validates against — and because `getPatternExercise` parses the
   * *route's* response a second time (mobile can point at a deployed route of a
   * different vintage), a field the route dropped would fail that second parse
   * on every turn. It also saves the graded view reassembling a string it can
   * simply be handed.
   */
  full: string;
  /**
   * The whole sentence in the learner's native language — **always shown, and
   * not a hint.**
   *
   * This is what makes the cloze *meaningful* practice rather than mechanical,
   * which is the distinction the literature is sharpest about: a gap filled
   * without understanding the sentence is the one drill type nothing supports.
   * It also mirrors what a production turn already does — there the meaning is
   * handed over as a situation and the learner supplies the form. A cloze hands
   * over the meaning *and* most of the sentence, which is precisely what "one
   * rung more scaffolded" means.
   *
   * So yes, it gives away the relation being expressed. That was never the part
   * being tested.
   */
  meaning: string;
  /**
   * The base form to transform, when the gap needs one — `가다` for a `-다가`
   * gap, `de` for an elision gap. Absent where the slot is bare, as for a
   * particle choice, and there the sentence and the hints carry it alone.
   */
  input?: string;
  /** Exactly what belongs in the gap. */
  expected: string;
  /** Other answers that are also right. See the false-negative note below. */
  alternates: string[];
}

/**
 * A free turn. Transient, like the cloze — never written to Firestore.
 *
 * Both hint tiers ride along with the situation so that asking for a hint costs
 * no round trip, and so that nothing is revealed until it is asked for.
 */
export interface ProductionExercise {
  format: 'production';
  /** The situation to express, in the learner's native language. */
  situation: string;
  /** Tier 1: the shape, without naming the pattern. */
  hintShape: string;
  /** Tier 2: the citation form itself. */
  hintName: string;
  /**
   * Surface forms that count as having reached for the pattern.
   *
   * This is the one part of the design that came out of building rather than
   * out of the design doc, and the gap it fills is not cosmetic. `/api/writing`
   * grades a sentence without knowing which pattern was being practised, so a
   * learner who sidesteps `-다가` entirely and writes something else, correctly,
   * gets a clean review and a `good`. That schedules out the exact pattern they
   * avoided — and "when to reach for it" is the first of the three things this
   * feature exists to teach.
   *
   * Generation knows the pattern and the expected answer, so it lists the forms
   * for free in a call already being paid for. Grading stays `/api/writing`
   * unchanged and the check stays local.
   */
  targetForms: string[];
}

export type PatternExercise = ClozeExercise | ProductionExercise;

/**
 * Coarse on purpose, and `easy` is reachable by exactly one path.
 *
 * A model-graded production turn is not a self-assessment, and a wrong harsh
 * verdict demoralises in a way a self-graded card never does — so production
 * grades no higher than `good`, because there the verdict is derived from a
 * model's reading of free text and a false `easy` inflates the interval on the
 * strength of a guess.
 *
 * **A hint-free exact cloze match grades `easy`**, and the reasoning is
 * specific to cloze: a string comparison is not a judgement that could be
 * wrong, so a clean hit is precisely the signal `easy` exists for.
 *
 * That one path is what un-sticks the ease ratchet. In `getNextReviewData`
 * `good` is exactly ease-neutral and `hard` is −0.14, so with `easy` excluded a
 * pattern's ease could only ever fall. Now it can climb for something the
 * learner reliably knows — and the trivial-rule case this most helps is the one
 * that prompted the redesign: `de` → `d'` climbs out to long intervals fast,
 * which is the scheduler answering "does this really need practising" without
 * anyone having to decide it.
 */
export type PatternVerdict = 'again' | 'hard' | 'good' | 'easy';

/** How many hint tiers were taken before answering. */
export type HintTier = 0 | 1 | 2;

/**
 * Soft ceiling on one answer, in characters.
 *
 * A third of `WRITING_MAX_CHARS`, because the ask is one sentence and a
 * paragraph is a different exercise — the pattern gets lost in it and the
 * grading spreads across everything else the learner wrote.
 */
export const PATTERN_MAX_CHARS = 300;

/** The gloss to show a reader, or empty when neither side was generated. */
export function patternGloss(
  pattern: Pick<GrammarPattern, 'gloss'>,
  nativeLanguage?: string | null,
): string {
  const { English, Korean } = pattern.gloss;
  return (nativeLanguage === 'Korean' ? Korean ?? English : English ?? Korean) ?? '';
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Normalizes whatever the model wrote for the gap to a single `CLOZE_GAP`.
 *
 * Models are inconsistent about blank length and bracket style even under a
 * precise instruction, and a sentence whose gap the UI cannot find is a turn
 * the learner cannot answer. Cheaper to accept the variants than to retry.
 */
function normalizeGap(sentence: string): string {
  return sentence
    .replace(/(_{2,}|\[\s*\.{2,}\s*\]|\[\s*_+\s*\]|\(\s*_+\s*\)|＿{2,})/g, CLOZE_GAP)
    .trim();
}

/**
 * Parses a generated exercise, or null when there is nothing usable to pose.
 *
 * Tolerant in the same spirit as `parseWritingReview`: a missing hint costs
 * that hint, not the turn the learner is waiting on. The load-bearing fields
 * are per format — a cloze needs a gapped sentence and an expected answer,
 * because without either there is nothing to answer or to grade against; a
 * production turn needs only its situation.
 */
export function parsePatternExercise(
  raw: unknown,
  pattern?: Pick<GrammarPattern, 'pattern'>,
  format: ExerciseFormat = 'production',
): PatternExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const citation = pattern?.pattern.trim() ?? '';

  if (format === 'cloze') {
    if (!isNonEmptyString(r.sentence) || !isNonEmptyString(r.expected)) return null;
    const sentence = normalizeGap(r.sentence);
    // No gap means no exercise: the learner would be shown a complete sentence
    // and asked to fill nothing. Better to fail the turn into the retry path
    // than to render something unanswerable.
    if (!sentence.includes(CLOZE_GAP)) return null;

    // **The gap and the answer must agree, and this is checked rather than
    // trusted.** Observed in a trial: asked for `jouer à + jeu`, the model
    // produced "Mon frère adore ___ football", meaning "loves *playing*
    // football", and `expected: "au"` — so it had silently deleted "jouer"
    // along with the gap. Filling in the answer gave "Mon frère adore au
    // football", which is not French, and a learner who correctly wrote
    // "jouer au" was marked wrong by their own app.
    //
    // Prompt wording cannot make that impossible; a redundant field can.
    // Generation returns the complete sentence separately, and the exercise is
    // only usable if filling the gap reproduces it exactly. A model that
    // deletes a word it did not put in `expected` now fails this check and the
    // turn regenerates. Teaching wrong grammar is the worst thing this feature
    // can do, so a visible retry is the right side to fail on.
    // Whitespace-insensitive, for a reason the strict version got wrong on its
    // first run: an elision attaches with no space, so a model writing
    // "J'ai besoin ___ eau." with `expected: "d'"` rebuilds to "d' eau" where
    // `full` has "d'eau". That is a correct exercise and must not be thrown
    // away. Ignoring spacing still catches the failure this check exists for —
    // a missing "jouer" is a missing word, not a missing space.
    if (!isNonEmptyString(r.full)) return null;
    if (!sameSentence(sentence.split(CLOZE_GAP).join(r.expected), r.full)) return null;

    const alternates = Array.isArray(r.alternates)
      ? r.alternates.filter(isNonEmptyString).map(a => a.trim())
      : [];
    return {
      format: 'cloze',
      sentence,
      full: r.full.trim(),
      // An absent meaning costs the scaffolding, not the turn — but it does
      // make this turn mechanical rather than meaningful, which is worth
      // knowing if these start showing up.
      meaning: isNonEmptyString(r.meaning) ? r.meaning.trim() : '',
      ...(isNonEmptyString(r.input) ? { input: r.input.trim() } : {}),
      expected: r.expected.trim(),
      alternates,
    };
  }

  if (!isNonEmptyString(r.situation)) return null;
  const forms = Array.isArray(r.targetForms)
    ? r.targetForms.filter(isNonEmptyString).map(f => f.trim())
    : [];

  return {
    format: 'production',
    situation: r.situation.trim(),
    // A missing tier-1 hint falls back to tier 2 rather than to nothing. The
    // blank textbox is the failure mode this whole tier exists for, so a
    // learner who asks for help and is handed an empty string is exactly who it
    // was meant to catch. Falling back costs them the gentler tier, not the way
    // out — and the verdict clamp is by tier taken, so they are not overcharged
    // for the tier the model failed to write.
    hintShape: isNonEmptyString(r.hintShape) ? r.hintShape.trim() : citation,
    hintName: isNonEmptyString(r.hintName) ? r.hintName.trim() : citation,
    // The citation form is a usable last resort on a suffixal pattern and no
    // worse than nothing elsewhere — `reachedForPattern` is what decides how
    // much weight it carries.
    targetForms: forms.length > 0 ? forms : citation ? [citation] : [],
  };
}

/**
 * Fetches an exercise for this pattern, at whichever rung it is on.
 *
 * The pattern is sent, and the *prompt* is what guarantees a production
 * response never names it: "use `-다가` in a sentence" teaches the label, where
 * the reach is the skill. A cloze does not name it either — the sentence is
 * what disambiguates. See the route.
 */
export async function getPatternExercise(
  pattern: Pick<GrammarPattern, 'pattern' | 'kind' | 'gloss' | 'note' | 'studyLanguage' | 'production'>,
  nativeLanguage = 'English',
  baseUrl = '',
): Promise<PatternExercise> {
  const format = exerciseFormat(pattern);
  const res = await fetch(`${baseUrl}/api/grammar/exercise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format,
      pattern: pattern.pattern,
      gloss: pattern.gloss,
      note: pattern.note,
      nativeLanguage,
      studyLanguage: pattern.studyLanguage,
    }),
  });
  // Status in the message, for the reason `getWritingReview` gives: mobile
  // points at a deployed `baseUrl`, so the first failure of a new route is
  // normally a 404 from an app version that predates it.
  if (!res.ok) throw new Error(`Failed to generate an exercise (${res.status})`);
  const parsed = parsePatternExercise(await res.json(), pattern, format);
  if (!parsed) throw new Error('Failed to generate an exercise (unusable response)');
  return parsed;
}

/**
 * Grades one answer.
 *
 * Deliberately `getWritingReview` and nothing else. A pattern review *is* a
 * one-sentence writing review with a target: `/api/writing` already returns the
 * native rewrite plus what to notice, pitched at the level the writing shows,
 * and a second grading prompt would be the parallel-endpoint drift that this
 * codebase has paid for before. Nothing new is invented here.
 */
export function gradePatternAnswer(
  answer: string,
  nativeLanguage = 'English',
  studyLanguage: StudyLanguage = 'Korean',
  baseUrl = '',
): Promise<WritingReview> {
  return getWritingReview(answer, nativeLanguage, studyLanguage, baseUrl);
}

/**
 * Strips everything that inflection and typing habits vary, so a surface-form
 * comparison is about the morpheme rather than about spacing and punctuation.
 * The leading hyphen of a citation form (`-다가`) goes too — it is notation for
 * "this attaches", not a character anybody types.
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

/**
 * Whether the answer reached for the pattern at all.
 *
 * A substring test, which is exact for the suffixal patterns that dominate
 * Korean and Japanese and approximate elsewhere — "passé composé" is a name for
 * a construction, not a string that appears in the sentence, which is why
 * `targetForms` carries conjugated candidates rather than the citation form
 * alone. When the model gave no forms and the citation form does not appear as
 * text, this returns true rather than false: an unmeasurable reach must not be
 * scored as a miss, because a wrong `again` on a correct sentence is the
 * outcome this design most wants to avoid.
 */
export function reachedForPattern(answer: string, targetForms: readonly string[]): boolean {
  const haystack = normalizeForMatch(answer);
  if (!haystack) return false;
  const needles = targetForms.map(normalizeForMatch).filter(Boolean);
  if (needles.length === 0) return true;
  return needles.some(needle => haystack.includes(needle));
}

const VERDICT_ORDER: readonly PatternVerdict[] = ['again', 'hard', 'good', 'easy'];

/**
 * The best verdict a learner can still earn after taking `tier` hints.
 *
 * Hints cost, which is what keeps "no multiple choice" from having a cliff
 * behind it: the learner who cannot start gets a way in, retrieval stays
 * theirs, and the scheduler is told the truth about how much of the search
 * space was handed over. No new scheduler work — just a ceiling.
 *
 * Tier 0 has no ceiling, which is how a clean cloze reaches `easy`; one hint
 * caps at `hard` and two at `again`.
 */
export function clampForHints(verdict: PatternVerdict, tier: HintTier): PatternVerdict {
  const ceiling: PatternVerdict = tier === 0 ? 'easy' : tier === 1 ? 'hard' : 'again';
  return VERDICT_ORDER.indexOf(verdict) <= VERDICT_ORDER.indexOf(ceiling) ? verdict : ceiling;
}

export interface PatternGrade {
  verdict: PatternVerdict;
  /**
   * False when the answer sidestepped the pattern, or missed the cloze — the UI
   * says so plainly rather than leaving the verdict to speak for itself.
   */
  reached: boolean;
  /** True when the learner asserted the grader was wrong. */
  overridden?: boolean;
}

/**
 * Re-grades a turn as if the answer had been right.
 *
 * The escape hatch for a wrong verdict, and cloze is what makes it legitimate
 * rather than merely kind: the expected answer sits on screen beside what the
 * learner typed, so they are not appealing a judgement they cannot see — they
 * are reading two strings and reporting that `alternates` was short. That is a
 * question they can answer better than the generator can.
 *
 * **It re-grades correctness, not effort.** The hint clamp still applies, so at
 * tier 1 this yields `hard` and at tier 2 it yields `again` — i.e. it does
 * nothing at tier 2, where the answer had already been shown. That is the
 * honest result rather than a gap.
 *
 * Note it tops out at `good`, never `easy`: the learner is telling us they were
 * right, which is not the same as telling us it was effortless.
 */
export function overrideGrade(hintTier: HintTier = 0): PatternGrade {
  return { verdict: clampForHints('good', hintTier), reached: true, overridden: true };
}

/**
 * Compares a cloze answer to what was expected.
 *
 * Deliberately gentler than `normalizeForMatch`, which strips punctuation
 * wholesale — that would be wrong here, because on an elision cloze the
 * apostrophe *is* the answer and `d'` would compare equal to `d`. So only case,
 * Unicode composition and whitespace are neutralized. Whitespace is then also
 * compared with all of it removed, because Korean spacing varies legitimately
 * between writers and is not what a grammar cloze is testing.
 */
/**
 * Case, composition, whitespace and typographic marks neutralized.
 *
 * The typographic folding is measured, not anticipated: asked for a French
 * elision cloze the model returned `d’` with a curly apostrophe, which no
 * learner types — so the one rule that prompted the cloze redesign would have
 * been ungradeable. The same applies to the quotes and dashes a generated
 * sentence picks up.
 *
 * Deliberately does NOT strip punctuation the way `normalizeForMatch` does:
 * on an elision cloze the apostrophe *is* the answer, and `d'` must not
 * compare equal to `d`.
 */
function foldText(text: string): string {
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
 * rule: Korean word spacing varies legitimately between writers and is not what
 * a grammar cloze tests, and an elision attaches with no space where a gap in
 * the template has one either side of it.
 */
function sameSentence(a: string, b: string): boolean {
  const x = foldText(a);
  const y = foldText(b);
  return x === y || x.replace(/\s/g, '') === y.replace(/\s/g, '');
}

function clozeMatches(answer: string, candidate: string): boolean {
  return sameSentence(answer, candidate);
}

/**
 * Grades a cloze turn locally — no model call, and so no grading variance.
 *
 * A hit with no hints taken is `easy`, which is the one path to that verdict
 * and the thing that un-sticks the ease ratchet; see `PatternVerdict`. A miss
 * is `again`, with no partial credit: `hard` is reachable here only through the
 * hint clamp, which is the same binary-plus-clamp shape `drill.ts` already uses.
 *
 * The false-negative risk is `alternates` being short — a right answer the
 * generator did not think of. Smaller than the equivalent risk on a production
 * turn, because a gap with a supplied base form has few plausible fillers, but
 * real, which is what `overrideGrade` is for.
 */
export function gradeCloze(
  answer: string,
  exercise: Pick<ClozeExercise, 'expected' | 'alternates'>,
  hintTier: HintTier = 0,
): PatternGrade {
  const candidates = [exercise.expected, ...exercise.alternates];
  const reached = candidates.some(candidate => clozeMatches(answer, candidate));
  return { verdict: clampForHints(reached ? 'easy' : 'again', hintTier), reached };
}

/**
 * Turns a writing review of one sentence into a verdict on one pattern.
 *
 * Derived rather than asked for, because `/api/writing` is reused unchanged and
 * it grades prose, not patterns. The mapping:
 *
 * - Didn't reach for the pattern → `again`. Correct prose that avoids the
 *   pattern is not practice of the pattern.
 * - Reached, but a `grammar` finding came back → `hard`. They went for it and
 *   the form came out wrong, which is the case spaced repetition exists for.
 * - Reached, and anything else came back (naturalness, register, vocabulary) →
 *   `good`. Those are worth reading — the rewrite is shown on every verdict for
 *   exactly that reason — but they are not the pattern failing.
 *
 * Then the hint clamp, which cannot raise anything here: production tops out at
 * `good` by construction, because the verdict is derived from a model's reading
 * of free text and a false `easy` would inflate the interval on a guess. Only a
 * cloze earns `easy`.
 *
 * Note this is only ever called on a review the model actually produced: a
 * grading failure writes no verdict at all.
 */
export function gradeFromReview(
  review: WritingReview,
  answer: string,
  exercise: Pick<ProductionExercise, 'targetForms'>,
  hintTier: HintTier = 0,
): PatternGrade {
  const reached = reachedForPattern(answer, exercise.targetForms);
  const brokeTheForm = review.findings.some(finding => finding.kind === 'grammar');
  const earned: PatternVerdict = !reached ? 'again' : brokeTheForm ? 'hard' : 'good';
  return { verdict: clampForHints(earned, hintTier), reached };
}

/**
 * Whether a pattern is due to be practised.
 *
 * Untracked is due, which is what puts a pattern you just saved at the front of
 * the queue — the same rule `isDue` applies to a freshly saved card.
 */
export function isPatternDue(
  pattern: Pick<GrammarPattern, 'production'>,
  now: Date = new Date(),
): boolean {
  if (!pattern.production) return true;
  return new Date(pattern.production.nextReview) <= now;
}

/** The patterns due right now, in the order given. */
export function duePatterns<T extends Pick<GrammarPattern, 'production'>>(
  patterns: readonly T[],
  now: Date = new Date(),
): T[] {
  return patterns.filter(pattern => isPatternDue(pattern, now));
}

/**
 * A session queue: what is due, shuffled.
 *
 * Shuffled for the reason `buildReviewQueue` shuffles, plus one specific to
 * grammar. Interleaving beats blocking for grammar on delayed tests, and the
 * finding comes with a trap worth writing down: **blocked practice reliably
 * scores better during training and worse a week later.** So a session that
 * feels smoother is not evidence this is wrong — feel is precisely the signal
 * that inverts here.
 */
export function buildPatternQueue<T extends Pick<GrammarPattern, 'production'>>(
  patterns: readonly T[],
  now: Date = new Date(),
): T[] {
  const queue = duePatterns(patterns, now);
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

/** The soonest practice still ahead, for the caught-up message. */
export function nextPatternReviewDate(
  patterns: readonly Pick<GrammarPattern, 'production'>[],
  now: Date = new Date(),
): Date | null {
  let earliest: number | null = null;
  for (const pattern of patterns) {
    if (!pattern.production) continue;
    const time = new Date(pattern.production.nextReview).getTime();
    if (time > now.getTime() && (earliest === null || time < earliest)) earliest = time;
  }
  return earliest === null ? null : new Date(earliest);
}

/**
 * Turns a pattern offered by a writing finding into a Firestore draft.
 *
 * Mirrors `buildWritingCardDraft`, and stamps no `packId` for the same reason:
 * there is no pack to attribute a sentence you wrote to. `source` is
 * provenance, which is a different thing — it records which door the pattern
 * came through and must never decide whether a pattern is already saved.
 */
export function buildPatternDraft(
  candidate: WritingPatternCandidate,
  uid: string,
  studyLanguage: StudyLanguage,
  source: GrammarPattern['source'] = 'writing',
): Record<string, unknown> {
  const draft: Record<string, unknown> = {
    uid,
    studyLanguage,
    pattern: candidate.pattern,
    // Defaulted rather than required, and `choice` is the safer default of the
    // two: a form rule miscast as choice merely gets a production turn it does
    // not need, where a choice pattern miscast as form never graduates at all
    // and silently loses the rung that carries the transfer claim.
    kind: candidate.kind ?? 'choice',
    gloss: candidate.gloss,
    source,
  };
  // Firestore rejects an explicit `undefined`, and the gloss is partial on
  // purpose — an absent side must be absent, not present and empty.
  if (candidate.note) draft.note = candidate.note;
  return draft;
}
