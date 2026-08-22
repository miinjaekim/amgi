import { db } from '../config/firebase';
import { doc, getDoc, getDocFromServer, onSnapshot, setDoc } from 'firebase/firestore';
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

/**
 * The preferences document, and every later change to it.
 *
 * Web subscribes to this to replace a local counter; mobile's reason is
 * narrower. The device already keeps an offline-first copy of the streak that
 * survives a killed app, so nothing here is broken — but a review done on the
 * laptop reached the phone only on a cold launch, which is why the badge could
 * sit at yesterday's number all evening. This is what tells it.
 *
 * **Display only.** The caller merges what arrives into what the device holds
 * and never writes back from here. Mobile's streak write is offline-first by
 * design and a listener must not become a second writer — see `UserContext`.
 *
 * `onError` is required rather than optional, as on web: a listener that dies
 * silently leaves the UI frozen on its last value with nothing to say so.
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
