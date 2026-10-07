/**
 * Saved writings: `users/{uid}/writings/{id}`.
 *
 * The record and its parsing are in `@amgi/core`'s `savedWriting.ts`; this is
 * only the part that talks to Firestore. Mobile has a mirror of this file.
 *
 * ⚠️ **The security rule is manual**, like every other collection: until
 * `users/{uid}/writings/{id}` has its own `match` in the console, every read
 * and write here fails `permission-denied`. See `.scratchpad/tech-stack.md`.
 */
import { collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { parseSavedWriting, SAVED_WRITINGS_SUBCOLLECTION } from '@amgi/core';
import type { SavedWriting } from '@amgi/core';

function writingsRef(uid: string) {
  return collection(db, 'users', uid, SAVED_WRITINGS_SUBCOLLECTION);
}

/**
 * Every saved writing, newest first, live.
 *
 * ⚠️ **Not filtered by study language here.** `where` on the language plus an
 * order on the date is a composite index, which is console state someone has
 * to remember; ordering alone is a single-field query and needs none. Callers
 * narrow with `savedWritingsFor`.
 */
export function subscribeToSavedWritings(
  uid: string,
  onChange: (writings: SavedWriting[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(writingsRef(uid), orderBy('createdAt', 'desc')),
    snapshot => onChange(snapshot.docs.flatMap(d => parseSavedWriting(d.id, d.data()) ?? [])),
    onError,
  );
}

/** Every saved writing in every language, once — for the export in Settings. */
export async function fetchAllSavedWritings(uid: string): Promise<SavedWriting[]> {
  const snapshot = await getDocs(query(writingsRef(uid), orderBy('createdAt', 'desc')));
  return snapshot.docs.flatMap(d => parseSavedWriting(d.id, d.data()) ?? []);
}

/** An id for a writing about to be saved — see `saveWriting`. */
export function newSavedWritingId(uid: string): string {
  return doc(writingsRef(uid)).id;
}

/**
 * Save one writing under an id the caller chose.
 *
 * A `setDoc` on a known id rather than an `addDoc`, so a retry after a failed
 * or timed-out save writes the same document again instead of a second copy.
 */
export async function saveWriting(uid: string, id: string, record: Omit<SavedWriting, 'id'>): Promise<void> {
  await setDoc(doc(writingsRef(uid), id), record);
}

export async function deleteSavedWriting(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(writingsRef(uid), id));
}
