import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import {
  GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged,
  deleteUser, reauthenticateWithCredential, User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { getUserPreferencesFromServer, saveUserPreferences } from '../services/userPreferences';
import { refreshReminders } from '../services/reminders';
import {
  markStreakSynced, readCachedStreak, writeCachedStreak,
} from '../services/offlineReview';
import { recordProgress } from '../services/progress';
import {
  isStudyLanguage, mergeStreakState, resolveNativeLanguage, resolveStudyLanguage,
  reviewDelta, type ReviewVerdict, type StreakState, type StudyLanguage,
} from '@amgi/core';

WebBrowser.maybeCompleteAuthSession();

const LANG_CACHE_KEY = 'amgi_native_language';
const STUDY_LANG_CACHE_KEY = 'amgi_study_language';

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

// In Expo Go, makeRedirectUri always returns exp://... which Google rejects.
// Passing redirectUri explicitly bypasses that override.
// ASWebAuthenticationSession intercepts custom schemes without Info.plist registration.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const nativeRedirectUri =
  Platform.OS === 'ios' && iosClientId
    ? `${iosClientId.split('.').reverse().join('.')}:/oauthredirect`
    : undefined;

interface UserContextType {
  user: User | null;
  authLoading: boolean;
  nativeLanguage: string | null | undefined;
  studyLanguage: StudyLanguage;
  streak: number;
  reviewedToday: number;
  setNativeLanguage: (lang: string) => Promise<void>;
  setStudyLanguage: (lang: StudyLanguage) => Promise<void>;
  recordReview: (verdict: ReviewVerdict) => void;
  deleteAccount: () => Promise<void>;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null | undefined>(undefined);
  const [studyLanguage, setStudyLanguageState] = useState<StudyLanguage>('Korean');
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastReviewDate, setLastReviewDate] = useState<string | null>(null);
  const [reviewedToday, setReviewedToday] = useState(0);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId,
    ...(nativeRedirectUri ? { redirectUri: nativeRedirectUri } : {}),
  });

  /**
   * OAuth responses already consumed by `reauthenticate` below.
   *
   * That flow drives the same `promptAsync`, so its response also reaches the
   * sign-in effect. Letting it through after an account deletion would sign the
   * user straight back in — and since the old account no longer exists, Firebase
   * would create a brand new one from the same Google identity.
   */
  const handledResponse = useRef<unknown>(null);

  // Sign into Firebase once Google OAuth completes (after auto code exchange, id_token is in params)
  useEffect(() => {
    if (response && response === handledResponse.current) return;
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch(console.error);
      }
    }
  }, [response]);

  // Keep user + nativeLanguage in sync with Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const uid = firebaseUser.uid;

        // A failed read here means offline, not "no preferences". Treating the
        // two alike is what used to wipe the cached language and zero a streak
        // on any launch without a signal.
        let prefs = null;
        let reachedServer = false;
        try {
          prefs = await getUserPreferencesFromServer(uid);
          reachedServer = true;
        } catch {
          // Fall through to whatever this device already knows.
        }

        const cachedLang = await AsyncStorage.getItem(LANG_CACHE_KEY);
        const cachedStudy = await AsyncStorage.getItem(STUDY_LANG_CACHE_KEY);

        // A brand-new account inherits what this device already answered.
        // Without this, anyone who completes first run signed out is asked the
        // same two questions again the instant they sign up — the account is
        // new, the person and the device are not. Gated on there being no
        // preferences document at all: a document that exists and omits the
        // field is a real "unset", not a gap to fill. Account deletion wipes
        // every `amgi_` key, so a fresh start stays a fresh start.
        const adopting = reachedServer && prefs === null && !!cachedLang;

        const lang = reachedServer
          ? (adopting ? cachedLang : (prefs?.nativeLanguage ?? null))
          : cachedLang;
        setNativeLanguageState(lang);
        if (lang) {
          await AsyncStorage.setItem(LANG_CACHE_KEY, lang);
        } else if (reachedServer) {
          // Only the server may say the preference is genuinely unset.
          await AsyncStorage.removeItem(LANG_CACHE_KEY);
        }

        const study = reachedServer && !adopting ? prefs?.studyLanguage : cachedStudy;
        if (isStudyLanguage(study)) {
          setStudyLanguageState(study);
          await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, study);
        }

        if (adopting && cachedLang) {
          // Not awaited: this is a convenience write, and nothing below it
          // depends on the round trip.
          saveUserPreferences(uid, {
            nativeLanguage: cachedLang,
            ...(isStudyLanguage(study) ? { studyLanguage: study } : {}),
          }).catch(() => { /* Asked again next launch; harmless. */ });
        }

        const merged = mergeStreakState(
          await readCachedStreak(uid),
          reachedServer
            ? {
                streak: prefs?.streak ?? 0,
                longestStreak: prefs?.longestStreak ?? 0,
                lastReviewDate: prefs?.lastReviewDate ?? null,
                reviewedToday: prefs?.reviewedToday ?? 0,
                dirty: false,
              }
            : null,
        );

        const today = getTodayString();
        setStreak(merged.streak);
        setLongestStreak(merged.longestStreak);
        setLastReviewDate(merged.lastReviewDate);
        setReviewedToday(merged.lastReviewDate === today ? merged.reviewedToday : 0);

        // Offline reviews that outlived their session; push them now that we
        // know the server is reachable and the numbers have been reconciled.
        if (merged.dirty && reachedServer) {
          saveUserPreferences(uid, {
            streak: merged.streak,
            longestStreak: merged.longestStreak,
            lastReviewDate: merged.lastReviewDate ?? undefined,
            reviewedToday: merged.reviewedToday,
          })
            .then(() => markStreakSynced(uid, merged))
            .catch(() => { /* Still unsent; the next launch tries again. */ });
        } else {
          await writeCachedStreak(uid, merged);
        }
      } else {
        // `null`, not a default: an unanswered native language is what the
        // first-run modal watches for. Defaulting to 'Korean' here, against a
        // `studyLanguage` whose initial state was independently also 'Korean',
        // is how a new user ended up natively speaking the language they were
        // studying — the collision the setup modal exists to prevent.
        const cached = await AsyncStorage.getItem(LANG_CACHE_KEY);
        setNativeLanguageState(cached ?? null);
        const cachedStudy = await AsyncStorage.getItem(STUDY_LANG_CACHE_KEY);
        if (isStudyLanguage(cachedStudy)) setStudyLanguageState(cachedStudy);
        setStreak(0);
        setLongestStreak(0);
        setLastReviewDate(null);
        setReviewedToday(0);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Reminders are planned from local state, so they need re-planning whenever
   * that state may have moved underneath them: a different user, a changed
   * language for the copy, or simply returning to the app after enough time
   * that yesterday's plan is stale. Signing out passes no uid, which cancels
   * everything rather than leaving a stranger's reminders on the device.
   */
  useEffect(() => {
    void refreshReminders(user?.uid, nativeLanguage);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshReminders(user?.uid, nativeLanguage);
    });
    return () => subscription.remove();
  }, [user, nativeLanguage]);

  const setNativeLanguage = async (lang: string) => {
    setNativeLanguageState(lang);
    await AsyncStorage.setItem(LANG_CACHE_KEY, lang);

    // Switching native language can leave the study language set to the user's
    // own language; move it off silently rather than making them fix it.
    const nextStudy = resolveStudyLanguage(lang, studyLanguage, nativeLanguage);
    const studyChanged = nextStudy !== studyLanguage;
    if (studyChanged) {
      setStudyLanguageState(nextStudy);
      await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
    }

    if (user) {
      await saveUserPreferences(user.uid, {
        nativeLanguage: lang,
        ...(studyChanged ? { studyLanguage: nextStudy } : {}),
      });
    }
  };

  const setStudyLanguage = async (lang: StudyLanguage) => {
    setStudyLanguageState(lang);
    await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, lang);

    // Choosing to study your own language says the native language is wrong;
    // move it to the language just being studied. This also switches the UI.
    const nextNative = resolveNativeLanguage(lang, nativeLanguage, studyLanguage);
    const nativeChanged = !!nextNative && nextNative !== nativeLanguage;
    if (nativeChanged) {
      setNativeLanguageState(nextNative);
      await AsyncStorage.setItem(LANG_CACHE_KEY, nextNative);
    }

    if (user) {
      await saveUserPreferences(user.uid, {
        studyLanguage: lang,
        ...(nativeChanged ? { nativeLanguage: nextNative } : {}),
      });
    }
  };

  const recordReview = (verdict: ReviewVerdict) => {
    if (!user) return;
    const today = getTodayString();

    // The day rollup the progress dashboard reads. It has its own AsyncStorage
    // queue rather than riding on the streak's `dirty` flag, because the two
    // fail differently: the streak can be reconstructed from the server's copy
    // on the next launch, where an uncounted day is uncounted forever.
    void recordProgress(user.uid, reviewDelta(studyLanguage, verdict), today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    let newStreak = streak;
    let newLongest = longestStreak;
    const newReviewedToday = reviewedToday + 1;

    if (lastReviewDate !== today) {
      newStreak = lastReviewDate === yesterdayStr ? streak + 1 : 1;
      newLongest = Math.max(longestStreak, newStreak);
      setStreak(newStreak);
      setLongestStreak(newLongest);
      setLastReviewDate(today);
    }

    setReviewedToday(newReviewedToday);

    const next: StreakState = {
      streak: newStreak,
      longestStreak: newLongest,
      lastReviewDate: today,
      reviewedToday: newReviewedToday,
      dirty: true,
    };

    // Local first, and marked unsent. The Firestore write below does not reject
    // when offline — it simply never settles — so without this the streak would
    // exist nowhere but React state until the app was killed.
    const uid = user.uid;
    void writeCachedStreak(uid, next);
    saveUserPreferences(uid, {
      streak: newStreak,
      longestStreak: newLongest,
      lastReviewDate: today,
      reviewedToday: newReviewedToday,
    })
      .then(() => markStreakSynced(uid, next))
      .catch(() => { /* Stays dirty; reconciled on the next launch that connects. */ });
  };

  const handleSignIn = async () => {
    await promptAsync();
  };

  /**
   * Delete the account and everything in it. Irreversible.
   *
   * The Firestore data is not touched here: the Delete User Data extension
   * triggers on the deletion below and sweeps it server-side, so it finishes
   * whether or not the app stays open — which a client-side sweep could not
   * promise on a phone.
   *
   * Firebase refuses this unless the sign-in is recent (about five minutes),
   * so an older session is sent back through Google and retried. Proving it is
   * the same person is a fair ask for something that cannot be undone.
   */
  const deleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in.');
    try {
      await deleteUser(current);
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/requires-recent-login') throw error;
    }

    const result = await promptAsync();
    handledResponse.current = result;
    if (result?.type !== 'success' || !result.params?.id_token) {
      throw new Error('Reauthentication cancelled.');
    }
    await reauthenticateWithCredential(
      auth.currentUser ?? current,
      GoogleAuthProvider.credential(result.params.id_token),
    );
    await deleteUser(auth.currentUser ?? current);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, setNativeLanguage, setStudyLanguage, recordReview, deleteAccount, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
