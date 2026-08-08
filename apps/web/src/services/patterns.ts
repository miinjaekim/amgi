import { db } from '@/config/firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { GrammarPattern, ReviewTracking, StudyLanguage } from '@amgi/core';

export type { GrammarPattern } from '@amgi/core';

/**
 * Grammar patterns live in **one** collection carrying `studyLanguage` on the
 * document, where cards shard per language into `cards_swedish` and friends.
 *
 * Cards shard because there are hundreds of them and the collection name routes
 * the query. Patterns will number in the tens, so six near-empty collections
 * buy nothing over one self-describing document — which is already the rule the
 * rest of the data model follows. Reversible if it turns out wrong.
 */
const PATTERNS_COLLECTION = 'patterns';

function mapDocToPattern(snapshot: QueryDocumentSnapshot<DocumentData>): GrammarPattern {
  const data = snapshot.data();
  // Same boundary as `mapDocToFlashcard`: the stored value is a `Timestamp`, a
  // raw Date or an ISO string depending on when the document was written.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTimestamp = (timestamp: any) => timestamp?.toDate?.() || timestamp;

  return {
    id: snapshot.id,
    ...(data as Omit<GrammarPattern, 'id' | 'createdAt'>),
    gloss: data.gloss ?? {},
    createdAt: processTimestamp(data.createdAt) || new Date(),
    production: data.production
      ? { ...data.production, nextReview: processTimestamp(data.production.nextReview) }
      : undefined,
  };
}

export async function savePattern(
  draft: Record<string, unknown>,
): Promise<string> {
  const docRef = await addDoc(collection(db, PATTERNS_COLLECTION), {
    ...draft,
    createdAt: Timestamp.now(),
    archived: false,
  });
  return docRef.id;
}

/**
 * Every pattern this user is practising in this study language.
 *
 * Two equality filters and no `orderBy`, which Firestore serves by merging
 * single-field indexes — the composite index the design budgeted for is only
 * needed once something here sorts or ranges server-side. `archived` is
 * filtered and `createdAt` sorted in JS for the same reason the collection is
 * not sharded: this is tens of documents, not hundreds. When it stops being
 * tens, the console step is `uid + studyLanguage` and the sort moves back.
 */
export async function fetchUserPatterns(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<GrammarPattern[]> {
  try {
    const q = query(
      collection(db, PATTERNS_COLLECTION),
      where('uid', '==', uid),
      where('studyLanguage', '==', studyLanguage),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(mapDocToPattern)
      .filter(pattern => pattern.archived !== true)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('[Firestore] Error in fetchUserPatterns:', error);
    throw error;
  }
}

/**
 * Writes the scheduling produced by one graded turn.
 *
 * Only ever called with a verdict the model produced. A turn that failed
 * grading, or that the learner skipped, writes nothing at all — the pattern
 * stays due, which is the honest result.
 */
export async function updatePatternTracking(
  patternId: string,
  production: ReviewTracking,
): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), { production });
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

/** Merge arbitrary fields into a pattern — what the management surface edits. */
export async function updatePatternFields(
  patternId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, PATTERNS_COLLECTION, patternId), fields);
}

/**
 * Every pattern including archived ones — the management surface, where the
 * archived ones are the point of having the tab.
 *
 * `fetchUserPatterns` stays separate rather than growing a flag: review must
 * never serve an archived pattern, and a boolean argument is one call site away
 * from it doing exactly that.
 */
export async function fetchAllUserPatterns(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<GrammarPattern[]> {
  try {
    const q = query(
      collection(db, PATTERNS_COLLECTION),
      where('uid', '==', uid),
      where('studyLanguage', '==', studyLanguage),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(mapDocToPattern)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('[Firestore] Error in fetchAllUserPatterns:', error);
    throw error;
  }
}
