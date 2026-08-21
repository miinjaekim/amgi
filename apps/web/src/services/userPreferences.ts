import { db } from '@/config/firebase';
import { doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { advanceStreak, type StoredStreak, type UserPreferences } from '@amgi/core';

export type { UserPreferences } from '@amgi/core';
export { SUPPORTED_LANGUAGES, SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@amgi/core';

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserPreferences) : null;
}

/**
 * The preferences document, and every later change to it.
 *
 * This exists because the streak was a *local counter*: the document was read
 * once at sign-in and thereafter only written, so a second tab or a second
 * device silently disagreed. `reviewedToday` was the visible casualty — two
 * tabs both load 0, one writes 10, the other writes 1, and eleven reviews
 * display as one. Reading the document live means there is only ever one
 * number, and nothing has to decide *when* to go looking for it.
 *
 * `onError` is required rather than optional: a listener that dies silently
 * leaves the UI frozen on its last value with no indication, which is the
 * failure mode this whole change exists to remove.
 *
 * Returns the unsubscribe function — call it when the user changes or the
 * provider unmounts, or the listener outlives its account.
 */
export function subscribeToUserPreferences(
  uid: string,
  onChange: (prefs: UserPreferences | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    snap => onChange(snap.exists() ? (snap.data() as UserPreferences) : null),
    onError,
  );
}

export async function saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true });
}

/**
 * Advance the streak by one review, reading and writing under a transaction.
 *
 * Subscribing fixes *displaying* a stale streak; it does not fix two writers
 * computing from the same starting value. Two tabs each loading `reviewedToday:
 * 0` and reviewing 10 and 1 times used to store `1`. A transaction re-reads
 * inside the write, so the second one sees the first and Firestore retries it
 * on contention.
 *
 * Fire-and-forget at the call site, like the progress rollup beside it: a lost
 * tally mark must never cost a card its scheduling.
 */
export async function recordReviewStreak(
  uid: string,
  today: string,
  yesterday: string,
): Promise<StoredStreak> {
  const ref = doc(db, 'users', uid);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const data = snap.data() as UserPreferences | undefined;
    const next = advanceStreak(
      {
        streak: data?.streak ?? 0,
        longestStreak: data?.longestStreak ?? 0,
        lastReviewDate: data?.lastReviewDate ?? null,
        reviewedToday: data?.reviewedToday ?? 0,
      },
      today,
      yesterday,
    );
    tx.set(ref, next, { merge: true });
    return next;
  });
}
