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
 * Three shape decisions are load-bearing.
 *
 * **One `ReviewTracking`, not two.** A card carries `frontToBack` and
 * `backToFront` because both are real skills. A pattern has one direction that
 * matters — meaning → form. Recognising `-다가` in running text is
 * comprehension of the *sentence* and comes free from reading; there is no
 * second rung to schedule.
 *
 * **Exercises are not stored; patterns are.** The situation is generated per
 * review, the way depth and examples are generated on demand. Same rule as
 * writing review's ephemeral submissions: the pattern is the durable artifact.
 *
 * **A review is two model calls, not one.** Generating the situation and
 * grading the answer cannot collapse, because the exercise has to exist before
 * there is anything to respond to. A session of _n_ patterns is _2n_ calls
 * where a vocab session of any length is zero — that is the running cost of
 * this feature, and it belongs next to the design rather than on a bill. Only
 * generation is new; grading is `/api/writing` unchanged.
 */

export interface GrammarPattern {
  id?: string;
  uid: string;
  studyLanguage: StudyLanguage;
  /** Citation form — `-다가`, `passé composé`. In the study language. */
  pattern: string;
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
  source?: 'writing' | 'lookup';
  createdAt: Date;
  archived?: boolean;
  /** One tracking, not two. */
  production?: ReviewTracking;
}

/**
 * One generated turn. Transient — never written to Firestore.
 *
 * Both hint tiers ride along with the situation so that asking for a hint costs
 * no round trip, and so that nothing is revealed until it is asked for.
 */
export interface PatternExercise {
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

/**
 * Coarse on purpose, and `easy` is deliberately absent.
 *
 * A model-graded production turn is not a self-assessment, and a wrong harsh
 * verdict demoralises in a way a self-graded card never does — three buckets
 * are as fine a distinction as the grading can honestly support.
 *
 * ⚠️ **This makes ease a one-way ratchet.** In `getNextReviewData` (`sm2.ts`)
 * `good` is exactly ease-neutral and `hard` is −0.14; `easy` is the only
 * response that *raises* ease, and it is the one excluded. So a pattern's ease
 * falls and never climbs back, where a card's recovers. `sm2.ts` is untouched
 * as a file but not as behaviour. The two exits, neither taken here, are
 * emitting `easy` for a clean first-try answer or letting a learner override
 * produce it — which is what makes the open override question load-bearing
 * rather than cosmetic.
 */
export type PatternVerdict = 'again' | 'hard' | 'good';

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
 * Parses a generated exercise, or null when there is no situation to pose.
 *
 * Tolerant in the same spirit as `parseWritingReview`: a missing hint costs
 * that hint, not the turn the learner is waiting on. Only `situation` is
 * load-bearing — everything else degrades to something usable.
 */
export function parsePatternExercise(
  raw: unknown,
  pattern?: Pick<GrammarPattern, 'pattern'>,
): PatternExercise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.situation)) return null;

  const citation = pattern?.pattern.trim() ?? '';
  const forms = Array.isArray(r.targetForms)
    ? r.targetForms.filter(isNonEmptyString).map(f => f.trim())
    : [];

  return {
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
 * Fetches a situation to practise this pattern on.
 *
 * The pattern is sent, and the *prompt* is what guarantees the response never
 * names it: "use `-다가` in a sentence" teaches the label, where the reach is
 * the skill. See the route.
 */
export async function getPatternExercise(
  pattern: Pick<GrammarPattern, 'pattern' | 'gloss' | 'note' | 'studyLanguage'>,
  nativeLanguage = 'English',
  baseUrl = '',
): Promise<PatternExercise> {
  const res = await fetch(`${baseUrl}/api/grammar/exercise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
  const parsed = parsePatternExercise(await res.json(), pattern);
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

const VERDICT_ORDER: readonly PatternVerdict[] = ['again', 'hard', 'good'];

/**
 * The best verdict a learner can still earn after taking `tier` hints.
 *
 * Hints cost, which is what keeps "no multiple choice" from having a cliff
 * behind it: the learner who cannot start gets a way in, retrieval stays
 * theirs, and the scheduler is told the truth about how much of the search
 * space was handed over. No new scheduler work — just a ceiling.
 */
export function clampForHints(verdict: PatternVerdict, tier: HintTier): PatternVerdict {
  const ceiling: PatternVerdict = tier === 0 ? 'good' : tier === 1 ? 'hard' : 'again';
  return VERDICT_ORDER.indexOf(verdict) <= VERDICT_ORDER.indexOf(ceiling) ? verdict : ceiling;
}

export interface PatternGrade {
  verdict: PatternVerdict;
  /** False when the answer sidestepped the pattern — the UI says so plainly. */
  reached: boolean;
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
 * Then the hint clamp. Note this is only ever called on a review the model
 * actually produced: a grading failure writes no verdict at all.
 */
export function gradeFromReview(
  review: WritingReview,
  answer: string,
  exercise: Pick<PatternExercise, 'targetForms'>,
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
    gloss: candidate.gloss,
    source,
  };
  // Firestore rejects an explicit `undefined`, and the gloss is partial on
  // purpose — an absent side must be absent, not present and empty.
  if (candidate.note) draft.note = candidate.note;
  return draft;
}
