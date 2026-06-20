import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserPreferences {
  nativeLanguage: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Korean', label: '한국어' },
];

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserPreferences) : null;
}

export async function saveUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true });
}
