import { getStudyLanguageConfig } from './types';
import type { StudyLanguage } from './types';

/**
 * Writing review: you submit a passage, and get back how a native would have
 * written it plus an ordered list of what to notice.
 *
 * Two shape decisions are load-bearing and easy to undo by accident.
 *
 * **The findings are one ordered list, not fixed sections.** Amgi meets a
 * learner at whatever level they are at, and the passage itself is the level
 * signal — a beginner's writing yields mostly `grammar`, an advanced writer's
 * mostly `register` and `naturalness`. Ordering by what *this* writer needs is
 * what makes that adaptive without a level setting, a placement test, or any
 * per-level content. Split this back into fixed sections and a beginner gets an
 * empty register heading while an advanced writer gets an empty grammar one,
 * and the adaptivity has to be rebuilt as configuration.
 *
 * **Nothing here mentions writing.** Conversation practice is the same job on a
 * different capture — per-utterance "here's what you were reaching for" — so it
 * reuses these types rather than growing a parallel copy. `reviewQueue`,
 * `drill` and `reminders` all live in core because they existed twice and
 * drifted; this starts on the right side of that.
 */

/**
 * What kind of thing a finding is. This is the *only* per-finding
 * classification — deliberately not a severity, because "how wrong" is a
 * judgement the ordering already encodes, and a severity label invites a
 * correctness-grading UI this feature is not.
 */
export type FindingKind = 'grammar' | 'naturalness' | 'register' | 'vocabulary';

export const FINDING_KINDS: readonly FindingKind[] = [
  'grammar',
  'naturalness',
  'register',
  'vocabulary',
];

/**
 * A teachable unit lifted out of a finding, ready to become a flashcard.
 *
 * Both backs are carried for the same reason pack cards carry both: which side
 * gets *shown* is `getBackSide`'s decision at render time, so a card storing
 * only the side its owner happened to be reading would go blank on them the day
 * they switched native language. `english` is also what CSV/Anki export reads.
 */
export interface WritingCardCandidate {
  /** The study-language text — the card front. A word, a phrase, or a pattern. */
  study: string;
  back: { English: string; Korean: string };
}

export interface WritingFinding {
  kind: FindingKind;
  /** The span as the user wrote it. Absent when nothing was wrong to quote. */
  original?: string;
  /** How a native would put that span. Absent on a finding that only observes. */
  suggested?: string;
  /** Why, in the user's native language. */
  note: string;
  /**
   * Present only when the finding has something worth remembering. A one-off
   * typo teaches nothing and gets no card; a word, a set phrase and a grammar
   * pattern all do — `-다가` with a back of "while doing X, then Y" is a good
   * card, and for a beginner it is the *most* valuable one on the page.
   */
  card?: WritingCardCandidate;
}

export interface WritingReview {
  /** The whole passage as a native would have written it. */
  rewrite: string;
  /**
   * `rewrite`, rendered in the user's native language.
   *
   * This is a correctness check, not a convenience. The rewrite is the one text
   * on the screen the user did *not* write, so it is the one text whose meaning
   * they cannot verify — and a correction that quietly changes what they were
   * trying to say is worse than no correction, because they will learn the
   * changed version. Reading it back in their own language is how they catch
   * that the model misread their intent.
   *
   * Optional because a malformed one should cost this line, not the review.
   */
  rewriteNative?: string;
  /** Ordered by what this writer most needs to see. May be empty. */
  findings: WritingFinding[];
}

/**
 * Soft ceiling on a submission, in characters.
 *
 * Not a model limit — Gemini would take far more. It is the point past which
 * the *feedback* stops being read: a page of prose returns thirty findings and
 * gets skimmed, which teaches nothing. A paragraph returns a handful you
 * actually act on. Raise it if that turns out to be wrong; it is one constant
 * and a counter.
 */
export const WRITING_MAX_CHARS = 1000;

/**
 * Fetches a review of `text` from /api/writing.
 *
 * Shared rather than left as a `fetch` in each app for the reason the queue
 * modules are shared: mobile passes a `baseUrl` and web passes none, and that
 * is the *only* difference between the two call sites. A copy on each side is
 * a copy that drifts.
 */
export async function getWritingReview(
  text: string,
  nativeLanguage = 'English',
  studyLanguage: StudyLanguage = 'Korean',
  baseUrl = '',
): Promise<WritingReview> {
  const res = await fetch(`${baseUrl}/api/writing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, nativeLanguage, studyLanguage }),
  });
  if (!res.ok) throw new Error('Failed to review writing');
  return res.json();
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseCandidate(raw: unknown): WritingCardCandidate | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const back = (r.back ?? {}) as Record<string, unknown>;
  // Both backs or no card. A candidate missing one would save a card that goes
  // blank on a native-language switch, which is the failure the two-back rule
  // above exists to prevent — better to drop the offer than to make a bad card.
  if (!isNonEmptyString(r.study) || !isNonEmptyString(back.English) || !isNonEmptyString(back.Korean)) {
    return undefined;
  }
  return {
    study: r.study.trim(),
    back: { English: back.English.trim(), Korean: back.Korean.trim() },
  };
}

/**
 * Parses a model response into a `WritingReview`, dropping anything malformed
 * rather than throwing.
 *
 * Tolerant on purpose, in the same spirit as `parseStreamedExamples`: one
 * finding with a missing note should cost that finding, not the whole review
 * the user waited on. Returns null only when there is no usable rewrite, since
 * a review with no rewrite has nothing to show.
 */
export function parseWritingReview(raw: unknown): WritingReview | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.rewrite)) return null;

  const findings = Array.isArray(r.findings) ? r.findings : [];
  return {
    rewrite: r.rewrite.trim(),
    ...(isNonEmptyString(r.rewriteNative) ? { rewriteNative: r.rewriteNative.trim() } : {}),
    findings: findings.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const f = item as Record<string, unknown>;
      if (!isNonEmptyString(f.note)) return [];
      // An unrecognized kind is a prompt drift, not a reason to lose the
      // finding — the note is the substance. Fall back rather than drop.
      const kind = FINDING_KINDS.includes(f.kind as FindingKind)
        ? (f.kind as FindingKind)
        : 'naturalness';
      const finding: WritingFinding = { kind, note: f.note.trim() };
      if (isNonEmptyString(f.original)) finding.original = f.original.trim();
      if (isNonEmptyString(f.suggested)) finding.suggested = f.suggested.trim();
      const card = parseCandidate(f.card);
      if (card) finding.card = card;
      return [finding];
    }),
  };
}

/**
 * Turns a card candidate into a Firestore card draft.
 *
 * Mirrors `buildPackCardDraft` in `packs.ts`, minus `packId` — there is no pack
 * to attribute a sentence you wrote to, and inventing one would break the rule
 * that `packId` is provenance and must never decide whether a term is saved.
 * (Whether cards should carry *some* provenance is open in the backlog, tied to
 * the Learn-from-a-pack stamping question; this deliberately doesn't pre-empt
 * that decision by adding a second provenance field first.)
 */
export function buildWritingCardDraft(
  candidate: WritingCardCandidate,
  uid: string,
  studyLanguage: StudyLanguage,
): Record<string, unknown> {
  const config = getStudyLanguageConfig(studyLanguage);
  return {
    uid,
    term: candidate.study,
    termLanguage: studyLanguage,
    english: candidate.back.English,
    korean: candidate.back.Korean,
    // Last, so that on an English or Korean deck the study side wins the slot
    // it shares with a back — a back never replaces the front.
    [config.studyField]: candidate.study,
  };
}
