import { db } from '../config/firebase';
import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import type { UserPreferences } from '@amgi/core';

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserPreferences) : null;
}

/**
 * Preferences, or a rejection if the server could not be reached.
 *
 * `getDoc` offline falls back to Firestore's cache, which is memory-only on
 * React Native and therefore empty on a cold start — so it reports "this user
 * has no preferences" when the truth is "we couldn't ask". The caller then
 * cleared the cached language and reset the streak to zero. Distinguishing the
 * two is the whole point of this variant.
 */
export async function getUserPreferencesFromServer(uid: string): Promise<UserPreferences | null> {
  const snap = await getDocFromServer(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserPreferences) : null;
}

export async function saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true });
}
