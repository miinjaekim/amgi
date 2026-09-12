'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getUserPreferences, recordReviewStreak, saveUserPreferences, subscribeToUserPreferences } from '@/services/userPreferences';
import { countUserFlashcards } from '@/services/firestore';
import { recordProgress } from '@/services/progress';
import { CARD_COLLECTIONS, DEFAULT_HANJA_PARTITION, addLanguagePair, hourKey, isHanjaPartition, isNativeLanguage, isStudyLanguage, nativeForStudy, negateDelta, parseLanguagePairs, removeLanguagePair, reviewDelta, seedLanguagePairs, type HanjaPartition, type RatingContext, type RecordedReview, type ReviewVerdict, type StudyLanguage, type StudyLanguagePair } from '@amgi/core';

/**
 * ⚠️ **`amgi_native_language` is deliberately still read and written.**
 *
 * It is what every browser that has ever run Amgi has in it, and it is the seed
 * the interface language migrates from — so dropping it would ask a returning
 * user the first-run questions again. New writes keep it in step with the
 * interface language so an older build sharing this browser still works.
 */
const LANG_CACHE_KEY = 'amgi_native_language';
const INTERFACE_LANG_CACHE_KEY = 'amgi_interface_language';
const LANGUAGES_CACHE_KEY = 'amgi_languages';
const STUDY_LANG_CACHE_KEY = 'amgi_study_language';
const HANJA_PARTITION_CACHE_KEY = 'amgi_hanja_partition';

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Language pairs out of `localStorage`, or `[]` if there is nothing usable. */
function readCachedLanguages(): StudyLanguagePair[] {
  try {
    return parseLanguagePairs(JSON.parse(localStorage.getItem(LANGUAGES_CACHE_KEY) ?? 'null'));
  } catch {
    // Hand-edited, half-written, or storage disabled. An empty list is read as
    // "not set up yet", which the caller already handles.
    return [];
  }
}

function writeCachedLanguages(pairs: StudyLanguagePair[]): void {
  try {
    localStorage.setItem(LANGUAGES_CACHE_KEY, JSON.stringify(pairs));
  } catch {
    // Not being able to remember is no reason to refuse the change.
  }
}

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
   *
   * Always a real language rather than `null`: a deck with no entry falls back
   * to English, matching what `getBackSideConfig` reads a missing value as.
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
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interfaceLanguage, setInterfaceLanguageState] = useState<string | null | undefined>(undefined);
  const [languages, setLanguagesState] = useState<StudyLanguagePair[]>([]);
  const [studyLanguage, setStudyLanguageState] = useState<StudyLanguage>('Korean');
  const [hanjaPartition, setHanjaPartitionState] = useState<HanjaPartition>(DEFAULT_HANJA_PARTITION);
  const [streak, setStreak] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);

  useEffect(() => {
    // The interface language, preferring its own key and falling back to the
    // one every older visit wrote. That fallback is the whole migration for a
    // signed-out browser.
    const cachedInterface = localStorage.getItem(INTERFACE_LANG_CACHE_KEY)
      ?? localStorage.getItem(LANG_CACHE_KEY);
    if (cachedInterface) setInterfaceLanguageState(cachedInterface);
    const cachedLanguages = readCachedLanguages();
    if (cachedLanguages.length > 0) setLanguagesState(cachedLanguages);
    const cachedStudy = localStorage.getItem(STUDY_LANG_CACHE_KEY);
    if (isStudyLanguage(cachedStudy)) setStudyLanguageState(cachedStudy);
    const cachedPartition = localStorage.getItem(HANJA_PARTITION_CACHE_KEY);
    if (isHanjaPartition(cachedPartition)) setHanjaPartitionState(cachedPartition);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prefs = await getUserPreferences(firebaseUser.uid);
        const cachedInterface = localStorage.getItem(INTERFACE_LANG_CACHE_KEY)
          ?? localStorage.getItem(LANG_CACHE_KEY);
        const cachedStudy = localStorage.getItem(STUDY_LANG_CACHE_KEY);
        const cachedLanguages = readCachedLanguages();

        // A brand-new account inherits what this browser already answered. The
        // setup modal shows to signed-out visitors too, so without this every
        // sign-up is asked the same questions a second time. Gated on there
        // being no preferences document at all: a document that exists and
        // omits a field is a real "unset", not a gap to fill.
        const adopting = prefs === null && !!cachedInterface;

        const nextInterface = adopting
          ? cachedInterface
          : (prefs?.interfaceLanguage ?? prefs?.nativeLanguage ?? null);
        setInterfaceLanguageState(nextInterface);
        if (nextInterface) {
          localStorage.setItem(INTERFACE_LANG_CACHE_KEY, nextInterface);
          localStorage.setItem(LANG_CACHE_KEY, nextInterface);
        } else {
          localStorage.removeItem(INTERFACE_LANG_CACHE_KEY);
          localStorage.removeItem(LANG_CACHE_KEY);
        }

        const study = adopting ? cachedStudy : prefs?.studyLanguage;
        const nextStudy = isStudyLanguage(study) ? study : undefined;
        if (nextStudy) {
          setStudyLanguageState(nextStudy);
          localStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
        }

        /**
         * The language list, migrating an account that predates it.
         *
         * ⚠️ **The seed reads which collections hold cards**, which is ten
         * aggregation queries — affordable only because it runs once per
         * account and is written straight back. The alternative, seeding from
         * `studyLanguage` alone, would hide every other deck the user has been
         * studying behind an Add flow they have no reason to open. See
         * `seedLanguagePairs`.
         */
        let nextLanguages = adopting ? cachedLanguages : parseLanguagePairs(prefs?.languages);
        const migrating = !adopting && prefs !== null && nextLanguages.length === 0;
        if (migrating) {
          const withCards: StudyLanguage[] = [];
          try {
            const counts = await Promise.all(CARD_COLLECTIONS.map(
              async ({ code }) => [code, await countUserFlashcards(firebaseUser.uid, code)] as const,
            ));
            for (const [code, count] of counts) if (count > 0) withCards.push(code);
          } catch {
            // Offline, or a collection the rules refuse. Seeding from the
            // current deck alone is a narrower answer than the right one, and
            // still better than an empty switcher — and because nothing is
            // written back below on failure, the next load tries again.
          }
          nextLanguages = seedLanguagePairs(
            { nativeLanguage: prefs?.nativeLanguage ?? 'English', studyLanguage: nextStudy },
            withCards,
          );
        }
        setLanguagesState(nextLanguages);
        writeCachedLanguages(nextLanguages);

        if ((adopting && cachedInterface) || migrating) {
          saveUserPreferences(firebaseUser.uid, {
            ...(nextInterface ? { nativeLanguage: nextInterface, interfaceLanguage: nextInterface } : {}),
            ...(nextStudy ? { studyLanguage: nextStudy } : {}),
            languages: nextLanguages,
          }).catch(() => { /* Retried on the next load; harmless. */ });
        }

        // The streak fields are *not* seeded here — the subscription below owns
        // them, and seeding would only race it to set the same values.
      } else {
        const cached = localStorage.getItem(INTERFACE_LANG_CACHE_KEY)
          ?? localStorage.getItem(LANG_CACHE_KEY);
        setInterfaceLanguageState(cached ?? null);
        setLanguagesState(readCachedLanguages());
        const cachedStudy = localStorage.getItem(STUDY_LANG_CACHE_KEY);
        if (isStudyLanguage(cachedStudy)) {
          setStudyLanguageState(cachedStudy);
        }
        setStreak(0);
        setReviewedToday(0);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  /**
   * The streak, read live rather than counted locally.
   *
   * This is the whole point of the change: the four streak fields used to be
   * read once at sign-in and thereafter only written, so a second tab or a
   * second device disagreed and nothing ever noticed. Now the document is the
   * only copy, and every writer's result arrives here.
   *
   * `reviewedToday` is zeroed when the stored date isn't today — the field
   * counts a day, and a stale one belongs to a day that is over. The rollover
   * lands on the next review rather than at midnight, which is what the stored
   * counter has always done.
   */
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserPreferences(
      user.uid,
      prefs => {
        const today = getTodayString();
        setStreak(prefs?.streak ?? 0);
        setReviewedToday(prefs?.lastReviewDate === today ? (prefs?.reviewedToday ?? 0) : 0);
        // Read live like the streak beside it, and for the same reason: this is
        // a durable choice a learner makes once, so the copy in the document is
        // the only copy. A document with no field means unset, which is the
        // default rather than whatever this tab last cached.
        const partition = prefs?.hanjaPartition;
        setHanjaPartitionState(isHanjaPartition(partition) ? partition : DEFAULT_HANJA_PARTITION);

        // Languages added on another device, so a deck started on the phone is
        // reachable here without a reload.
        //
        // ⚠️ **Only ever applied when the document actually carries some.** An
        // empty or missing list is what a mid-setup account looks like, and
        // assigning it here would empty the switcher underneath someone — or,
        // during the migration above, race it and undo what it just wrote.
        const incoming = parseLanguagePairs(prefs?.languages);
        if (incoming.length > 0) {
          setLanguagesState(incoming);
          writeCachedLanguages(incoming);
        }
      },
      error => console.error('[UserContext] preferences subscription failed:', error),
    );
    return unsubscribe;
  }, [user]);

  /**
   * The interface language. Writes `nativeLanguage` too, so an older build —
   * or a phone that has not been updated — still finds the field it reads.
   */
  const setInterfaceLanguage = async (lang: string) => {
    if (!isNativeLanguage(lang)) return;
    setInterfaceLanguageState(lang);
    localStorage.setItem(INTERFACE_LANG_CACHE_KEY, lang);
    localStorage.setItem(LANG_CACHE_KEY, lang);
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
    localStorage.setItem(STUDY_LANG_CACHE_KEY, lang);
    if (user) await saveUserPreferences(user.uid, { studyLanguage: lang });
  };

  /**
   * Add a deck, or change the language an existing one is explained in.
   *
   * Switching to it is part of adding it: someone who has just said what they
   * want to learn wants to be looking at it, and the alternative is a silent
   * success that leaves the screen unchanged.
   */
  const addLanguage = async (pair: StudyLanguagePair) => {
    const next = addLanguagePair(languages, pair);
    setLanguagesState(next);
    writeCachedLanguages(next);
    setStudyLanguageState(pair.study);
    localStorage.setItem(STUDY_LANG_CACHE_KEY, pair.study);
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
    writeCachedLanguages(next);

    const nextStudy = study === studyLanguage ? next[0].study : studyLanguage;
    if (nextStudy !== studyLanguage) {
      setStudyLanguageState(nextStudy);
      localStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
    }
    if (user) {
      await saveUserPreferences(user.uid, { languages: next, studyLanguage: nextStudy });
    }
  };

  const setHanjaPartition = async (partition: HanjaPartition) => {
    setHanjaPartitionState(partition);
    localStorage.setItem(HANJA_PARTITION_CACHE_KEY, partition);
    if (user) await saveUserPreferences(user.uid, { hanjaPartition: partition });
  };

  const recordReview = (verdict: ReviewVerdict, context: RatingContext = {}): RecordedReview => {
    const today = getTodayString();
    if (!user) return { date: today, delta: {} };

    // Built once and handed back rather than rebuilt by undo: `context` carries
    // think time and a maturity crossing, neither of which the verdict alone
    // could reconstruct.
    const delta = reviewDelta(studyLanguage, verdict, { hour: hourKey(), ...context });

    // The day rollup, which is what the progress dashboard reads. Kept separate
    // from the streak fields below rather than folded into them: this one is an
    // atomic increment on its own document, so two devices reviewing the same
    // day add up instead of overwriting each other. Fire-and-forget — a lost
    // tally mark must never cost a card its scheduling.
    recordProgress(user.uid, delta, today).catch(() => {});
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    // No local increment. The transaction computes from what the server holds
    // and the subscription brings the result back, so the number on screen is
    // the number in the document — including whatever another tab just wrote.
    // Fire-and-forget for the same reason as the rollup above.
    recordReviewStreak(user.uid, today, yesterdayStr).catch(() => {});
    return { date: today, delta };
  };

  /**
   * Walk back the counters for a rating the user has undone.
   *
   * The day rollup is reversed, because it is what the dashboard reports and a
   * negative `increment()` is exactly as atomic as a positive one. The streak
   * fields deliberately are not: `advanceStreak` cannot be inverted — it has no
   * way to know whether the rating being undone was the one that started today
   * — and more to the point a review did happen. Correcting which button it
   * landed on is no reason to put a streak at risk. The cost is that
   * `reviewedToday` reads one high per undo, for the rest of the day.
   *
   * The `date` on the receipt is the day `recordReview` counted the rating on
   * rather than today, so a session carried across midnight takes the tally
   * mark off the day it was actually put on. The `delta` is the one that was
   * written, not one rebuilt from the verdict — see `RecordedReview`.
   */
  const undoReview = ({ date, delta }: RecordedReview) => {
    if (!user) return;
    recordProgress(user.uid, negateDelta(delta), date).catch(() => {});
  };

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const deckNativeLanguage = nativeForStudy(languages, studyLanguage);

  return (
    <UserContext.Provider value={{ user, authLoading, interfaceLanguage, deckNativeLanguage, languages, studyLanguage, hanjaPartition, streak, reviewedToday, setInterfaceLanguage, setStudyLanguage, addLanguage, removeLanguage, setHanjaPartition, recordReview, undoReview, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
