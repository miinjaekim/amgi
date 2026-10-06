import { isStudyLanguage } from './types';
import type { StudyLanguage } from './types';
import { parseWritingReview } from './writing';
import type { WritingReview } from './writing';

/**
 * A piece of writing the learner chose to keep, with the feedback it got.
 *
 * ⚠️ **Nothing is saved unless the learner asks.** A review is otherwise gone
 * with the request, which is what `/privacy` says; this is the one path that
 * stores a passage, and it runs on a button.
 *
 * ⚠️ **The whole review is stored, not a summary of it** (the user's call,
 * 2026-10-06). Statistics over old writing are wanted later (which mistakes,
 * how often, whether they fall over time), and a record that kept only what
 * the first screen shows would need a backfill nobody can run: the review is a
 * model's answer and cannot be had again. Findings keep their `kind` for that
 * reason.
 *
 * Stored at `users/{uid}/writings/{id}`. A subcollection of the user document
 * for the reason `progress` is one: the Delete User Data extension is set to
 * `users/{UID}`, recursive, so account deletion takes these with no console
 * change.
 */
export interface SavedWriting {
  id: string;
  /**
   * The passage **as submitted**, which is what the review was made against.
   * Not the field's current text: that stays editable after a review returns.
   */
  passage: string;
  review: WritingReview;
  studyLanguage: StudyLanguage;
  /**
   * The language the notes were written in and the card backs are read in.
   * Kept so an old review reads as it did after the deck's language changes.
   */
  nativeLanguage?: string;
  /** Milliseconds since the epoch, set when it was saved. */
  createdAt: number;
}

export const SAVED_WRITINGS_SUBCOLLECTION = 'writings';

/**
 * The document to write.
 *
 * Round-tripped through JSON so no key is `undefined`: Firestore rejects a
 * document that carries one, and a review is built by a tolerant parser whose
 * optional fields are easy to leave that way.
 */
export function buildSavedWriting(
  passage: string,
  review: WritingReview,
  studyLanguage: StudyLanguage,
  nativeLanguage: string | null | undefined,
  now: number = Date.now(),
): Omit<SavedWriting, 'id'> {
  return JSON.parse(JSON.stringify({
    passage,
    review,
    studyLanguage,
    ...(nativeLanguage ? { nativeLanguage } : {}),
    createdAt: now,
  }));
}

/**
 * Reads a stored document back, or `null` if it is not one.
 *
 * The review goes through `parseWritingReview` again, so a record written by an
 * older build, or by hand, costs a malformed finding rather than the screen.
 */
export function parseSavedWriting(id: string, raw: unknown): SavedWriting | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.passage !== 'string' || !r.passage.trim()) return null;
  if (!isStudyLanguage(r.studyLanguage)) return null;
  if (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt)) return null;
  const review = parseWritingReview(r.review);
  if (!review) return null;
  return {
    id,
    passage: r.passage,
    review,
    studyLanguage: r.studyLanguage,
    ...(typeof r.nativeLanguage === 'string' && r.nativeLanguage ? { nativeLanguage: r.nativeLanguage } : {}),
    createdAt: r.createdAt,
  };
}

/** What a saved writing is listed by: the first line that has anything on it. */
export function writingFirstLine(passage: string): string {
  return passage.split('\n').map(line => line.trim()).find(Boolean) ?? '';
}

/** One study language's writings, newest first. */
export function savedWritingsFor(writings: SavedWriting[], studyLanguage: StudyLanguage): SavedWriting[] {
  return writings
    .filter(w => w.studyLanguage === studyLanguage)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** The day a writing was saved, as the interface language writes dates. */
export function savedWritingDate(createdAt: number, interfaceLanguage: string | null | undefined): string {
  return new Date(createdAt).toLocaleDateString(
    interfaceLanguage === 'Korean' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  );
}
