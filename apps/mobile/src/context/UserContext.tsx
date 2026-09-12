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
import { countUserFlashcards } from '../services/firestore';
import { refreshReminders } from '../services/reminders';
import {
  markStreakSynced, readCachedStreak, writeCachedStreak,
} from '../services/offlineReview';
import { recordProgress } from '../services/progress';
import {
  CARD_COLLECTIONS, DEFAULT_HANJA_PARTITION,
  addLanguagePair, advanceStreak, hourKey, isHanjaPartition, isNativeLanguage,
  isStudyLanguage, mergeStreakState, nativeForStudy,
  negateDelta, parseLanguagePairs, removeLanguagePair, reviewDelta, seedLanguagePairs,
  type RatingContext, type RecordedReview, type ReviewVerdict, type StreakState,
  type HanjaPartition, type StudyLanguage, type StudyLanguagePair,
  type UserPreferences,
} from '@amgi/core';

WebBrowser.maybeCompleteAuthSession();

/**
 * ⚠️ **`amgi_native_language` is deliberately still read and written.**
 *
 * It is what every device that has ever run Amgi has in it, and it is the seed
 * the interface language migrates from — so dropping it would put a returning
 * user back through first run. New writes keep it in step with the interface
 * language, which also means a TestFlight build older than this change keeps
 * working against the same account. There is no OTA here, so that is not a
 * hypothetical.
 */
const LANG_CACHE_KEY = 'amgi_native_language';
const INTERFACE_LANG_CACHE_KEY = 'amgi_interface_language';
const LANGUAGES_CACHE_KEY = 'amgi_languages';
const STUDY_LANG_CACHE_KEY = 'amgi_study_language';
const HANJA_PARTITION_CACHE_KEY = 'amgi_hanja_partition';

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

/** Language pairs out of AsyncStorage, or `[]` if there is nothing usable. */
async function readCachedLanguages(): Promise<StudyLanguagePair[]> {
  try {
    return parseLanguagePairs(JSON.parse(await AsyncStorage.getItem(LANGUAGES_CACHE_KEY) ?? 'null'));
  } catch {
    // Half-written or unparseable. An empty list reads as "not set up yet",
    // which every caller already handles.
    return [];
  }
}

async function writeCachedLanguages(pairs: StudyLanguagePair[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGES_CACHE_KEY, JSON.stringify(pairs));
  } catch {
    // Not being able to remember is no reason to refuse the change.
  }
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
  /**
   * What Amgi speaks to the user in — every `t()` call takes this.
   *
   * `undefined` means preferences are still loading and `null` means they are
   * loaded and unanswered, which is what the first-run modal gates on.
   */
  interfaceLanguage: string | null | undefined;
  /**
   * The language the *current deck* is explained in — its card backs, its
   * depth, its examples. Never used for chrome.
   */
  deckNativeLanguage: string;
  /** Every language added, in the order they should be offered. */
  languages: StudyLanguagePair[];
  studyLanguage: StudyLanguage;
  /** Which part of a hanja card is on the front. Meaningless on other decks. */
  hanjaPartition: HanjaPartition;
  streak: number;
  reviewedToday: number;
  setInterfaceLanguage: (lang: string) => Promise<void>;
  /** Switches decks. Only ever called with a language already added. */
  setStudyLanguage: (lang: StudyLanguage) => Promise<void>;
  /** Adds a deck, or changes the language an existing deck is explained in. */
  addLanguage: (pair: StudyLanguagePair) => Promise<void>;
  removeLanguage: (study: StudyLanguage) => Promise<void>;
  setHanjaPartition: (partition: HanjaPartition) => Promise<void>;
  /** Returns the receipt `undoReview` needs — the day counted and what was written. */
  recordReview: (verdict: ReviewVerdict, context?: RatingContext) => RecordedReview;
  undoReview: (recorded: RecordedReview) => void;
  deleteAccount: () => Promise<void>;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interfaceLanguage, setInterfaceLanguageState] = useState<string | null | undefined>(undefined);
  const [languages, setLanguagesState] = useState<StudyLanguagePair[]>([]);
  const [studyLanguage, setStudyLanguageState] = useState<StudyLanguage>('Korean');
  const [hanjaPartition, setHanjaPartitionState] = useState<HanjaPartition>(DEFAULT_HANJA_PARTITION);
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

  // Keep user + languages in sync with Firebase auth state
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

        // Preferring the interface key and falling back to the one every older
        // launch wrote — that fallback is the whole migration on this device.
        const cachedInterface = (await AsyncStorage.getItem(INTERFACE_LANG_CACHE_KEY))
          ?? (await AsyncStorage.getItem(LANG_CACHE_KEY));
        const cachedStudy = await AsyncStorage.getItem(STUDY_LANG_CACHE_KEY);
        const cachedPartition = await AsyncStorage.getItem(HANJA_PARTITION_CACHE_KEY);
        const cachedLanguages = await readCachedLanguages();

        // A brand-new account inherits what this device already answered.
        // Without this, anyone who completes first run signed out is asked the
        // same questions again the instant they sign up — the account is new,
        // the person and the device are not. Gated on there being no
        // preferences document at all: a document that exists and omits a
        // field is a real "unset", not a gap to fill. Account deletion wipes
        // every `amgi_` key, so a fresh start stays a fresh start.
        const adopting = reachedServer && prefs === null && !!cachedInterface;

        const nextInterface = reachedServer
          ? (adopting
              ? cachedInterface
              : (prefs?.interfaceLanguage ?? prefs?.nativeLanguage ?? null))
          : cachedInterface;
        setInterfaceLanguageState(nextInterface);
        if (nextInterface) {
          await AsyncStorage.setItem(INTERFACE_LANG_CACHE_KEY, nextInterface);
          await AsyncStorage.setItem(LANG_CACHE_KEY, nextInterface);
        } else if (reachedServer) {
          // Only the server may say the preference is genuinely unset.
          await AsyncStorage.removeItem(INTERFACE_LANG_CACHE_KEY);
          await AsyncStorage.removeItem(LANG_CACHE_KEY);
        }

        const study = reachedServer && !adopting ? prefs?.studyLanguage : cachedStudy;
        const nextStudy = isStudyLanguage(study) ? study : undefined;
        if (nextStudy) {
          setStudyLanguageState(nextStudy);
          await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
        }

        // Same server-or-cache rule as the study language above, for the same
        // reason: a launch that never reached the server must not read the
        // absence of a field as the user unsetting it.
        const partition = reachedServer && !adopting ? prefs?.hanjaPartition : cachedPartition;
        if (isHanjaPartition(partition)) {
          setHanjaPartitionState(partition);
          await AsyncStorage.setItem(HANJA_PARTITION_CACHE_KEY, partition);
        }

        /**
         * The language list, migrating an account that predates it.
         *
         * ⚠️ **Only ever migrated on a launch that reached the server.** The
         * seed reads which collections hold cards, and `getCountFromServer`
         * has no offline answer — an underground launch would seed from the
         * current deck alone and then write that narrow list down as if it
         * were the truth, quietly hiding every other deck. Offline we keep
         * what the device already holds and try again next launch.
         */
        let nextLanguages = adopting
          ? cachedLanguages
          : (reachedServer ? parseLanguagePairs(prefs?.languages) : cachedLanguages);
        const migrating = reachedServer && !adopting && prefs !== null && nextLanguages.length === 0;
        if (migrating) {
          const withCards: StudyLanguage[] = [];
          try {
            const counts = await Promise.all(CARD_COLLECTIONS.map(
              async ({ code }) => [code, await countUserFlashcards(uid, code)] as const,
            ));
            for (const [code, count] of counts) if (count > 0) withCards.push(code);
          } catch {
            // Counted nothing; `seedLanguagePairs` still returns the current
            // deck so the switcher is never empty, and nothing is written
            // below on a throw, so the next launch tries again.
          }
          nextLanguages = seedLanguagePairs(
            { nativeLanguage: prefs?.nativeLanguage ?? 'English', studyLanguage: nextStudy },
            withCards,
          );
        }
        setLanguagesState(nextLanguages);
        await writeCachedLanguages(nextLanguages);

        if ((adopting && cachedInterface) || migrating) {
          // Not awaited: this is a convenience write, and nothing below it
          // depends on the round trip.
          saveUserPreferences(uid, {
            ...(nextInterface ? { nativeLanguage: nextInterface, interfaceLanguage: nextInterface } : {}),
            ...(nextStudy ? { studyLanguage: nextStudy } : {}),
            languages: nextLanguages,
          }).catch(() => { /* Retried on the next launch; harmless. */ });
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
        // `null`, not a default: an unanswered interface language is what the
        // first-run modal watches for.
        const cached = (await AsyncStorage.getItem(INTERFACE_LANG_CACHE_KEY))
          ?? (await AsyncStorage.getItem(LANG_CACHE_KEY));
        setInterfaceLanguageState(cached ?? null);
        setLanguagesState(await readCachedLanguages());
        const cachedStudy = await AsyncStorage.getItem(STUDY_LANG_CACHE_KEY);
        if (isStudyLanguage(cachedStudy)) setStudyLanguageState(cachedStudy);
        const cachedPartition = await AsyncStorage.getItem(HANJA_PARTITION_CACHE_KEY);
        if (isHanjaPartition(cachedPartition)) setHanjaPartitionState(cachedPartition);
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
   * - **Never the interface language.** It going momentarily null is what the
   *   first-run modal watches for, and a snapshot racing the setup flow would
   *   pop it over someone mid-answer. Languages *are* taken, but only when the
   *   document actually carries some — see below.
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
        // Picked up here as well as at launch, so choosing the partition on one
        // device reaches the other without a restart.
        setHanjaPartitionState(
          isHanjaPartition(prefs.hanjaPartition) ? prefs.hanjaPartition : DEFAULT_HANJA_PARTITION,
        );

        // A language added on the laptop, reaching the phone without a restart.
        //
        // ⚠️ **Only applied when the document actually carries some.** An empty
        // or missing list is what a mid-setup account looks like, and assigning
        // it here would empty the switcher underneath someone — or race the
        // migration above and undo what it just wrote.
        const incoming = parseLanguagePairs(prefs.languages);
        if (incoming.length > 0) {
          setLanguagesState(incoming);
          void writeCachedLanguages(incoming);
        }

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
   *
   * The copy is chrome, so it takes the interface language — a notification is
   * Amgi speaking to you, not a card explaining itself.
   */
  useEffect(() => {
    void refreshReminders(user?.uid, interfaceLanguage);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshReminders(user?.uid, interfaceLanguage);
    });
    return () => subscription.remove();
  }, [user, interfaceLanguage]);

  /**
   * The interface language. Writes `nativeLanguage` too, so a TestFlight build
   * older than this change still finds the field it reads.
   */
  const setInterfaceLanguage = async (lang: string) => {
    if (!isNativeLanguage(lang)) return;
    setInterfaceLanguageState(lang);
    await AsyncStorage.setItem(INTERFACE_LANG_CACHE_KEY, lang);
    await AsyncStorage.setItem(LANG_CACHE_KEY, lang);
    if (user) {
      await saveUserPreferences(user.uid, { interfaceLanguage: lang, nativeLanguage: lang });
    }
  };

  /**
   * Switch decks. Nothing is resolved or corrected on the way through: the
   * language being switched to already carries its own explanation language,
   * and the interface is not a deck's business any more.
   */
  const setStudyLanguage = async (lang: StudyLanguage) => {
    setStudyLanguageState(lang);
    await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, lang);
    if (user) await saveUserPreferences(user.uid, { studyLanguage: lang });
  };

  /**
   * Add a deck, or change the language an existing one is explained in.
   *
   * Switching to it is part of adding it: someone who has just said what they
   * want to learn wants to be looking at it.
   */
  const addLanguage = async (pair: StudyLanguagePair) => {
    const next = addLanguagePair(languages, pair);
    setLanguagesState(next);
    await writeCachedLanguages(next);
    setStudyLanguageState(pair.study);
    await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, pair.study);
    if (user) {
      await saveUserPreferences(user.uid, { languages: next, studyLanguage: pair.study });
    }
  };

  /**
   * Drop a deck from the switcher. The cards are left exactly where they are —
   * removing the last one is refused rather than leaving nothing to study.
   */
  const removeLanguage = async (study: StudyLanguage) => {
    const next = removeLanguagePair(languages, study);
    if (next.length === 0) return;
    setLanguagesState(next);
    await writeCachedLanguages(next);

    const nextStudy = study === studyLanguage ? next[0].study : studyLanguage;
    if (nextStudy !== studyLanguage) {
      setStudyLanguageState(nextStudy);
      await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
    }
    if (user) {
      await saveUserPreferences(user.uid, { languages: next, studyLanguage: nextStudy });
    }
  };

  const setHanjaPartition = async (partition: HanjaPartition) => {
    setHanjaPartitionState(partition);
    await AsyncStorage.setItem(HANJA_PARTITION_CACHE_KEY, partition);
    if (user) await saveUserPreferences(user.uid, { hanjaPartition: partition });
  };

  const recordReview = (verdict: ReviewVerdict, context: RatingContext = {}): RecordedReview => {
    const today = getTodayString();
    if (!user) return { date: today, delta: {} };

    // Built once and handed back rather than rebuilt by undo: `context` carries
    // think time and a maturity crossing, neither of which the verdict alone
    // could reconstruct.
    const delta = reviewDelta(studyLanguage, verdict, { hour: hourKey(), ...context });

    // The day rollup the progress dashboard reads. It has its own AsyncStorage
    // queue rather than riding on the streak's `dirty` flag, because the two
    // fail differently: the streak can be reconstructed from the server's copy
    // on the next launch, where an uncounted day is uncounted forever.
    void recordProgress(user.uid, delta, today);

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
    return { date: today, delta };
  };

  /**
   * Walk back the counters for a rating the user has undone.
   *
   * The day rollup is reversed — it rides the same AsyncStorage queue as the
   * rating it cancels, so an undo made underground survives being killed just
   * as the rating did, and the two collapse into one write on reconnect.
   *
   * The streak fields deliberately are not reversed: `advanceStreak` has no
   * inverse — it cannot know whether the rating being undone was the one that
   * started today — and a review did genuinely happen. Correcting which button
   * it landed on is no reason to put a streak at risk. The cost is that
   * `reviewedToday` reads one high per undo, for the rest of the day.
   *
   * The `date` on the receipt is the day `recordReview` counted the rating on
   * rather than today, so a session carried across midnight takes the tally
   * mark off the day it was actually put on. The `delta` is the one that was
   * written, not one rebuilt from the verdict — see `RecordedReview`.
   */
  const undoReview = ({ date, delta }: RecordedReview) => {
    if (!user) return;
    void recordProgress(user.uid, negateDelta(delta), date);
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

  const deckNativeLanguage = nativeForStudy(languages, studyLanguage);

  return (
    <UserContext.Provider value={{ user, authLoading, interfaceLanguage, deckNativeLanguage, languages, studyLanguage, hanjaPartition, streak: streakState.streak, reviewedToday, setInterfaceLanguage, setStudyLanguage, addLanguage, removeLanguage, setHanjaPartition, recordReview, undoReview, deleteAccount, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
