import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import {
  GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged,
  deleteUser, reauthenticateWithCredential, User,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import {
  getUserPreferencesFromServer, saveUserPreferences, subscribeToUserPreferences,
} from '../services/userPreferences';
import { refreshReminders } from '../services/reminders';
import {
  markStreakSynced, readCachedStreak, writeCachedStreak,
} from '../services/offlineReview';
import { recordProgress } from '../services/progress';
import {
  advanceStreak, isStudyLanguage, mergeStreakState, resolveNativeLanguage, resolveStudyLanguage,
  reviewDelta, type ReviewVerdict, type StreakState, type StudyLanguage, type UserPreferences,
} from '@amgi/core';

WebBrowser.maybeCompleteAuthSession();

const LANG_CACHE_KEY = 'amgi_native_language';
const STUDY_LANG_CACHE_KEY = 'amgi_study_language';

const EMPTY_STREAK: StreakState = {
  streak: 0, longestStreak: 0, lastReviewDate: null, reviewedToday: 0, dirty: false,
};

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

function yesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-CA');
}

/** The four streak fields as the preferences document carries them. */
function streakFromPreferences(prefs: UserPreferences | null): StreakState {
  return {
    streak: prefs?.streak ?? 0,
    longestStreak: prefs?.longestStreak ?? 0,
    lastReviewDate: prefs?.lastReviewDate ?? null,
    reviewedToday: prefs?.reviewedToday ?? 0,
    dirty: false,
  };
}

// In Expo Go, makeRedirectUri always returns exp://... which Google rejects.
// Passing redirectUri explicitly bypasses that override.
// ASWebAuthenticationSession intercepts custom schemes without Info.plist registration.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/**
 * Left `undefined` when unset rather than defaulting to `''`.
 *
 * `expo-auth-session` invariants on `typeof value === 'undefined'` only
 * (`providers/ProviderUtils.js`), so an empty string sails past the check and
 * fails later at Google as an unexplained `invalid_client`. Undefined throws
 * "Client Id property `androidClientId` must be defined", which names the
 * missing env var.
 */
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

/**
 * The redirect Google hands the code back to, per platform.
 *
 * **iOS** uses the reversed client id (`com.googleusercontent.apps.<id>`) —
 * see the note above on why that needs no Info.plist entry.
 *
 * **Android has no equivalent escape hatch.** A Chrome Custom Tab redirect goes
 * through the OS, which will only route a scheme some app has actually
 * registered, so the scheme here must also appear in `app.json`'s `scheme`
 * array or the browser lands on a dead URL and the flow hangs with no error.
 * That is why this is the *package name* rather than the reversed client id:
 * both are accepted by Google for an Android client, and the package name is
 * a value `app.json` can state statically, whereas the reversed client id is
 * only known once the env var is read.
 *
 * Keep the two in sync — changing one alone breaks sign-in on the build and
 * not in Expo Go.
 */
const nativeRedirectUri =
  Platform.OS === 'ios' && iosClientId
    ? `${iosClientId.split('.').reverse().join('.')}:/oauthredirect`
    : Platform.OS === 'android'
      ? 'com.miinjaekim.amgi:/oauthredirect'
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
  /**
   * The streak as one value, because every rule that touches it — merging a
   * server copy in, advancing it by a review — is a decision over all four
   * fields at once. Held as four `useState`s they could be updated out of step,
   * and a merge would have had to take its inputs from a render-old closure.
   *
   * The ref is not a cache of the state, it is the input to those rules: React
   * state does not update until the next render, so two ratings in quick
   * succession both computed from the same starting value and the second write
   * silently replaced the first. That is the local-counter bug web fixed with a
   * transaction, in its single-device form — and a transaction is not available
   * here, because it fails offline, which is the case this whole path exists
   * for. Write both through `commitStreak` and never one without the other.
   */
  const streakRef = useRef<StreakState>(EMPTY_STREAK);
  const [streakState, setStreakState] = useState<StreakState>(EMPTY_STREAK);
  const commitStreak = useCallback((next: StreakState) => {
    streakRef.current = next;
    setStreakState(next);
  }, []);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId,
    androidClientId,
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
          reachedServer ? streakFromPreferences(prefs) : null,
        );

        commitStreak(merged);

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
        commitStreak(EMPTY_STREAK);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Watch the preferences document so a review done elsewhere shows up here.
   *
   * Reading the streak once at sign-in is what left the badge on yesterday's
   * number all evening after a session on the laptop. This fixes *displaying*
   * that, and nothing else: mobile's write path is offline-first and stays
   * exactly as it was. Web's fix — a transaction — is the wrong answer here,
   * because a transaction fails offline, which is the case the cache exists for.
   *
   * Three rules keep the listener from becoming a second writer:
   *
   * - **Merge, never assign.** `mergeStreakState` is the same reconcile the
   *   launch path runs, so the device's unsent work outranks the server's older
   *   copy rather than being overwritten by it. Straight assignment would throw
   *   away a session reviewed underground the moment a snapshot arrived.
   * - **The cache is refreshed only when nothing is unsent.** While `dirty`,
   *   the AsyncStorage copy belongs to `recordReview` and its retry, and this
   *   must not step on it. Clean, the write is the same one the next launch
   *   would do anyway — worth doing now because reminders are planned from the
   *   cached `lastReviewDate`, so a laptop review also stops the phone nagging
   *   about work already done.
   * - **Streak fields only.** The document also carries the languages, and
   *   `nativeLanguage` going momentarily null is what the first-run modal
   *   watches for — a snapshot racing the setup flow would pop it over someone
   *   mid-answer. Languages are read at launch and changed on one device at a
   *   time; the streak is the field that genuinely moves elsewhere.
   *
   * Gated on `authLoading` so the launch reconcile settles first, otherwise the
   * server's copy would show for a frame before the device's own is even read.
   *
   * Worth knowing: once this device records a review, the in-memory copy stays
   * `dirty` for the rest of the session — only the cached copy is cleared, by
   * `markStreakSynced`, and only when it still says what was sent. So every
   * later snapshot merges by date and then by highest rather than simply taking
   * the server's value. That is deliberate: highest never loses a review, and a
   * genuinely newer day on the server still wins outright.
   */
  const signedInUid = user?.uid;
  useEffect(() => {
    if (!signedInUid || authLoading) return;
    return subscribeToUserPreferences(
      signedInUid,
      prefs => {
        // A missing document is a new account, not a streak of zero. Nothing to
        // merge, and assigning zeros here would wipe a first session that has
        // not been written yet.
        if (!prefs) return;
        const merged = mergeStreakState(streakRef.current, streakFromPreferences(prefs));
        commitStreak(merged);
        if (!merged.dirty) void writeCachedStreak(signedInUid, merged);
      },
      error => {
        // Not fatal: the launch reconcile and the local cache still drive the
        // session, so this degrades to the behaviour before the listener.
        console.warn('Streak subscription dropped:', error);
      },
    );
  }, [signedInUid, authLoading]);

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

    // `advanceStreak` is the same pure rule web runs inside its transaction —
    // including restarting `reviewedToday` on a new day rather than
    // incrementing yesterday's count. It reads from the ref rather than from
    // React state so that consecutive ratings compose instead of both starting
    // from the value the last render happened to see.
    const next: StreakState = {
      ...advanceStreak(streakRef.current, today, yesterdayString()),
      dirty: true,
    };
    commitStreak(next);

    // Local first, and marked unsent. The Firestore write below does not reject
    // when offline — it simply never settles — so without this the streak would
    // exist nowhere but React state until the app was killed.
    const uid = user.uid;
    void writeCachedStreak(uid, next);
    saveUserPreferences(uid, {
      streak: next.streak,
      longestStreak: next.longestStreak,
      lastReviewDate: today,
      reviewedToday: next.reviewedToday,
    })
      .then(() => markStreakSynced(uid, next))
      .catch(() => { /* Stays dirty; reconciled on the next launch that connects. */ });
  };

  const handleSignIn = async () => {
  /**
   * `showInRecents` is the Android workaround, not a preference.
   *
   * Android has no native AuthSession, so `expo-web-browser` polyfills one by
   * racing "the browser closed" against "the redirect arrived" — and the
   * redirect is *what closes the browser*, so both fire from one event. When
   * the browser-closed side wins, this resolves `dismiss`, the redirect
   * listener is torn down in a `finally`, and the authorization code is
   * dropped with nothing logged (expo/expo#23781). Keeping the tab in recents
   * changes how it is torn down and lets the redirect land first.
   *
   * It cannot be verified in a development build: debug timing does not lose
   * the race, which is why sign-in passed there against the same code that
   * failed on a release APK. Only a release build proves this.
   *
   * No-op on iOS, which has a real native implementation and never races.
   */
    await promptAsync({ showInRecents: true });
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

    const result = await promptAsync({ showInRecents: true });
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

  // Derived rather than stored: `reviewedToday` counts *for a day*, so a count
  // left over from a day that is over displays as zero without the stored value
  // — which is still what the streak is computed from — being rewritten.
  const reviewedToday =
    streakState.lastReviewDate === getTodayString() ? streakState.reviewedToday : 0;

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, studyLanguage, streak: streakState.streak, reviewedToday, setNativeLanguage, setStudyLanguage, recordReview, deleteAccount, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
