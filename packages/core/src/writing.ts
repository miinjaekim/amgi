import { getStudyLanguageConfig } from './types';
import type { StudyLanguage } from './types';

/**
 * **RETAINED FOR OLD BUILDS. DO NOT DELETE AS DEAD CODE.**
 *
 * Writing review was removed from Amgi in 2026-08 — every surface that called
 * this module is gone, so it has no callers in this tree and looks exactly like
 * something safe to drop. It is not. `/api/writing/route.ts` imports
 * `parseWritingReview` and `WRITING_MAX_CHARS`, and that route exists to keep
 * TestFlight builds shipped before the removal working: mobile has no OTA, so an
 * installed build carries its own frozen copy of the writing UI and calls the
 * deployed route at runtime. Deleting this breaks the route, and the route
 * breaking is a tester's Writing tab erroring out.
 *
 * `getWritingReview` below is the client half and genuinely has no caller — it
 * is kept with the parser only so the module stays readable as one piece.
 *
 * **When this can go:** once no build predating the removal is still in use.
 * See the removal entry in `.scratchpad/status.md`.
 *
 * ---
 *
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
  /**
   * True when this card fills a word the learner **did not have** — they wrote
   * it in their native language, or talked around it, because they could not
   * reach the study-language word.
   *
   * Worth a flag rather than being folded in with every other card offer,
   * because it is a different kind of evidence. Most cards are "this is worth
   * remembering", which is a judgement. This one is a *demonstrated* gap: the
   * learner tried to say something and the word was not there. That is the
   * highest-confidence signal a passage can produce about what to learn next,
   * and the UI says so rather than letting it look like any other suggestion.
   */
  gap?: boolean;
}

/**
 * A grammar pattern lifted out of a finding, ready to be practised.
 *
 * Sibling to `card`, not a variant of it, because a pattern is not a card: a
 * card is a lookup-table row and a pattern is a function from stem + context +
 * meaning to a form. The full argument is in `.scratchpad/vision.md`; the type
 * it becomes once saved is `GrammarPattern` in `grammar.ts`.
 *
 * `gloss` is optional on both sides where `WritingCardCandidate.back` is
 * required on both, and the difference is deliberate. A card's back is *shown*
 * — a card missing one side goes blank the day its owner switches native
 * language. A pattern's gloss is a label beside an exercise whose substance is
 * generated fresh in the reader's language every time, so a missing side costs
 * a caption rather than the object. Don't tighten these to required.
 */
export interface WritingPatternCandidate {
  /** Citation form, in the study language — `-다가`, `passé composé`. */
  pattern: string;
  /**
   * Whether the learner's error was about *choosing* this pattern or about
   * *applying* it — which decides whether practice ever graduates from a cloze
   * to free production. `PatternKind` in `grammar.ts` carries the full
   * reasoning, including why this describes the error and not the pattern.
   *
   * Optional here because the model may omit it and a missing classification
   * must not cost the offer; `buildPatternDraft` defaults it.
   */
  kind?: 'choice' | 'form';
  gloss: { English?: string; Korean?: string };
  /** One or two sentences on when to reach for it, in the native language. */
  note?: string;
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
  /**
   * Present when the finding's take-away is a reusable pattern, which is the
   * door into pattern practice.
   *
   * **Not gated on `kind`, and that is a correction to the design rather than
   * an oversight.** The design said a `kind === 'grammar'` finding offers this,
   * and measurement said otherwise: asked to review a passage using `-고 있었어요`
   * where a native would use `-는데`, the model returns `naturalness` — quite
   * correctly, since no rule was broken — and `-는데` is exactly the pattern
   * worth practising. Gating on `grammar` would have hidden the most valuable
   * offers behind the one kind that means "you made an error". What a pattern
   * *is* belongs in the prompt, which defines it; the kind describes the
   * finding, not the take-away.
   *
   * A finding may carry both this and `card`: web prefers this one, and mobile
   * — which has no pattern practice until parity ships — keeps offering the
   * card rather than losing the take-away to a field it cannot read.
   */
  pattern?: WritingPatternCandidate;
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
  // The status is in the message on purpose. Mobile points at a deployed
  // `baseUrl`, so the first failure of a *new* route is normally a 404 from an
  // app version that predates it — indistinguishable from a real bug unless the
  // code is visible. The sibling fetches in `gemini.ts` still swallow theirs.
  if (!res.ok) throw new Error(`Failed to review writing (${res.status})`);
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
    ...(r.gap === true ? { gap: true } : {}),
  };
}

/**
 * A pattern offer survives a missing gloss where a card offer does not.
 *
 * The asymmetry is the one documented on `WritingPatternCandidate`: a card with
 * one back renders blank on a native-language switch, so the offer is dropped;
 * a pattern with one gloss loses a caption beside an exercise that is generated
 * in the reader's language anyway. Only the citation form is load-bearing.
 */
function parsePatternCandidate(raw: unknown): WritingPatternCandidate | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.pattern)) return undefined;
  const gloss = (r.gloss ?? {}) as Record<string, unknown>;
  const candidate: WritingPatternCandidate = { pattern: r.pattern.trim(), gloss: {} };
  if (r.kind === 'choice' || r.kind === 'form') candidate.kind = r.kind;
  if (isNonEmptyString(gloss.English)) candidate.gloss.English = gloss.English.trim();
  if (isNonEmptyString(gloss.Korean)) candidate.gloss.Korean = gloss.Korean.trim();
  if (isNonEmptyString(r.note)) candidate.note = r.note.trim();
  return candidate;
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
      const pattern = parsePatternCandidate(f.pattern);
      if (pattern) finding.pattern = pattern;
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
/**
 * Whether a finding's card offer is worth showing.
 *
 * ⚠️ **Re-derived 2026-09-21, because the rule it replaces depended on
 * patterns.** The 2026-08-08 decision had a card give way to a *pattern* offer
 * unless it was a gap card, and the reason was measured rather than guessed: on
 * a grammar finding the model often emits a card whose front is a
 * *description* — `accord du participe passé avec être` is a heading, not
 * something anyone wants in a deck. Pattern offers no longer exist, so there is
 * nothing for such a card to give way to, and restoring the naive
 * `!!finding.card` would put those headings straight into the deck.
 *
 * So the rule keeps what was measured and drops what depended on patterns: a
 * **grammar** finding offers its card only when the card is a `gap` — a word
 * the learner demonstrably reached for and did not have, which is the
 * highest-confidence signal a passage produces. Every other kind of finding is
 * about a word or a phrasing to begin with, and offers its card as it always
 * did.
 *
 * In core rather than in each panel because both platforms need the identical
 * answer, and a rule written twice is a rule that drifts — the same reason
 * `reviewQueue`, `drill` and `reminders` live here.
 */
export function offersCard(finding: WritingFinding): boolean {
  if (!finding.card) return false;
  return finding.kind !== 'grammar' || finding.card.gap === true;
}

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

/* ── The worked example ─────────────────────────────────────────────────── */

/**
 * One demonstration of what the tab does, shown while the passage box is empty.
 *
 * ⚠️ **Sourced, because it is a sentence in the study language.** A worked
 * example asserts "this is what a native would write", which is exactly the
 * claim `docs/packs/README.md` forbids the model from being the source of. The
 * French one is **Larousse's own example sentence** under `marché`, quoted
 * rather than composed; the citations are in
 * `docs/packs/writing-worked-example-draft.md`.
 *
 * ⚠️ **It demonstrates the gap, deliberately.** The help sheet says in words
 * that a word you cannot reach can go in in your own language; this shows the
 * route catching exactly that, which is the one thing about Writing a learner
 * will not guess.
 */
export interface WritingExample {
  /** The passage as the learner wrote it, with `{gap}` where the word was missing. */
  written: string;
  /** The passage as a native would write it. */
  rewrite: string;
  /** The study-language word that was missing — the card's front. */
  study: string;
  /** The missing word in the learner's own language, and the card's back. */
  gap: { English: string; Korean: string };
}

/**
 * ⚠️ **Per language, and most languages have none.** Writing works in every
 * study language and an example needs a *sourced* sentence in each, so this is
 * deliberately sparse: a learner of Japanese sees no example rather than a
 * French one, and certainly rather than an invented Japanese one. Adding a
 * language is a draft row with its citation, then an entry here.
 */
const WRITING_EXAMPLES: Partial<Record<StudyLanguage, WritingExample>> = {
  French: {
    written: "Je l'ai acheté au {gap}.",
    rewrite: "Je l'ai acheté au marché.",
    study: 'le marché',
    gap: { English: 'market', Korean: '시장' },
  },
};

export function writingExample(language: StudyLanguage): WritingExample | undefined {
  return WRITING_EXAMPLES[language];
}
