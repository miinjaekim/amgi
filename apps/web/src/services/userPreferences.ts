import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserPreferences } from '@amgi/core';

export type { UserPreferences } from '@amgi/core';
export { SUPPORTED_LANGUAGES } from '@amgi/core';

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserPreferences) : null;
}

export async function saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true });
}
