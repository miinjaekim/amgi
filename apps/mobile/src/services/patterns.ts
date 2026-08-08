import {
  collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { GrammarPattern, ReviewTracking, StudyLanguage } from '@amgi/core';

export type { GrammarPattern } from '@amgi/core';

/**
 * Grammar patterns live in **one** collection carrying `studyLanguage` on the
 * document, where cards shard per language. Patterns number in the tens, so six
 * near-empty collections buy nothing over one self-describing document.
 *
 * Mirrors `apps/web/src/services/patterns.ts`. Kept as a parallel file rather
 * than pushed into core because it is Firestore wiring, not domain logic — the
 * two apps build their SDK handles differently — and the same is already true
 * of `firestore.ts` beside it.
 */
const PATTERNS_COLLECTION = 'patterns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processTimestamp(ts: any): Date {
  return ts?.toDate?.() ?? (ts ? new Date(ts) : new Date());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoc(snap: any): GrammarPattern {
  const d = snap.data();
  return {
    id: snap.id,
    ...(d as Omit<GrammarPattern, 'id' | 'createdAt'>),
    gloss: d.gloss ?? {},
    createdAt: processTimestamp(d.createdAt),
    production: d.production
      ? { ...d.production, nextReview: processTimestamp(d.production.nextReview) }
      : undefined,
  };
}

function patternsQuery(uid: string, studyLanguage: StudyLanguage) {
  // Two equality filters and no `orderBy`, which Firestore serves by merging
  // single-field indexes — no composite index needed. `archived` is filtered
  // and `createdAt` sorted in JS because this is tens of documents.
  return query(
    collection(db, PATTERNS_COLLECTION),
    where('uid', '==', uid),
    where('studyLanguage', '==', studyLanguage),
  );
}

const byNewest = (a: GrammarPattern, b: GrammarPattern) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export async function savePattern(draft: Record<string, unknown>): Promise<string> {
  const ref = await addDoc(collection(db, PATTERNS_COLLECTION), {
    ...draft,
    createdAt: Timestamp.now(),
    archived: false,
  });
  return ref.id;
}

/**
 * Every pattern this user is practising in this study language.
 *
 * ⚠️ **Offline this resolves empty rather than throwing** — the same trap
 * `fetchUserFlashcardsFromServer` documents next door: `getDocs` offline
 * answers from Firestore's cache, which on React Native is memory-only and
 * usually empty, so "no connection" and "no patterns" are indistinguishable
 * here. Callers that would show the difference to the user must check network
 * status themselves rather than reading it off an empty array.
 */
export async function fetchUserPatterns(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<GrammarPattern[]> {
  const snap = await getDocs(patternsQuery(uid, studyLanguage));
  return snap.docs.map(mapDoc).filter(p => p.archived !== true).sort(byNewest);
}

/**
 * Every pattern including archived ones — what the management surface lists.
 *
 * Separate from `fetchUserPatterns` rather than a flag on it: review must never
 * serve an archived pattern, and a boolean argument is one call site away from
 * it doing exactly that.
 */
export async function fetchAllUserPatterns(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<GrammarPattern[]> {
  const snap = await getDocs(patternsQuery(uid, studyLanguage));
  return snap.docs.map(mapDoc).sort(byNewest);
}

/**
 * Writes the scheduling one graded turn produced.
 *
 * Only ever called with a verdict the learner earned or asserted. A turn that
 * failed grading, or that was skipped, writes nothing at all — the pattern
 * stays due, which is the honest result.
 */
export async function updatePatternTracking(
  patternId: string,
  production: ReviewTracking,
): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), { production });
}

export async function updatePatternFields(
  patternId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), fields);
}

export async function archivePattern(patternId: string): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), { archived: true });
}

export async function restorePattern(patternId: string): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), { archived: false });
}

export async function deletePattern(patternId: string): Promise<void> {
  await deleteDoc(doc(db, PATTERNS_COLLECTION, patternId));
}
