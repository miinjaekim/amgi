'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getUserPreferences, recordReviewStreak, saveUserPreferences, subscribeToUserPreferences } from '@/services/userPreferences';
import { recordProgress } from '@/services/progress';
import { isStudyLanguage, negateDelta, resolveNativeLanguage, resolveStudyLanguage, reviewDelta, type ReviewVerdict, type StudyLanguage } from '@amgi/core';

const LANG_CACHE_KEY = 'amgi_native_language';
const STUDY_LANG_CACHE_KEY = 'amgi_study_language';

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA');
}

interface UserContextType {
  user: User | null;
  authLoading: boolean;
  nativeLanguage: string | null | undefined;
  studyLanguage: StudyLanguage;
  streak: number;
  reviewedToday: number;
  setNativeLanguage: (lang: string) => Promise<void>;
  setStudyLanguage: (lang: StudyLanguage) => Promise<void>;
  /** Returns the day the rating was counted against, for `undoReview`. */
  recordReview: (verdict: ReviewVerdict) => string;
  undoReview: (verdict: ReviewVerdict, date: string) => void;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null | undefined>(undefined);
  const [studyLanguage, setStudyLanguageState] = useState<StudyLanguage>('Korean');
  const [streak, setStreak] = useState(0);
  const [reviewedToday, setReviewedToday] = useState(0);

  useEffect(() => {
    const cached = localStorage.getItem(LANG_CACHE_KEY);
    if (cached) setNativeLanguageState(cached);
    const cachedStudy = localStorage.getItem(STUDY_LANG_CACHE_KEY);
    if (isStudyLanguage(cachedStudy)) setStudyLanguageState(cachedStudy);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prefs = await getUserPreferences(firebaseUser.uid);
        const cachedLang = localStorage.getItem(LANG_CACHE_KEY);
        const cachedStudy = localStorage.getItem(STUDY_LANG_CACHE_KEY);

        // A brand-new account inherits what this browser already answered. The
        // setup modal shows to signed-out visitors too, so without this every
        // sign-up is asked the same two questions a second time. Gated on
        // there being no preferences document at all: a document that exists
        // and omits the field is a real "unset", not a gap to fill.
        const adopting = prefs === null && !!cachedLang;

        const lang = adopting ? cachedLang : (prefs?.nativeLanguage ?? null);
        setNativeLanguageState(lang);
        if (lang) {
          localStorage.setItem(LANG_CACHE_KEY, lang);
        } else {
          localStorage.removeItem(LANG_CACHE_KEY);
        }

        const study = adopting ? cachedStudy : prefs?.studyLanguage;
        if (isStudyLanguage(study)) {
          setStudyLanguageState(study);
          localStorage.setItem(STUDY_LANG_CACHE_KEY, study);
        }

        if (adopting && cachedLang) {
          saveUserPreferences(firebaseUser.uid, {
            nativeLanguage: cachedLang,
            ...(isStudyLanguage(study) ? { studyLanguage: study } : {}),
          }).catch(() => { /* Asked again next visit; harmless. */ });
        }

        // The streak fields are *not* seeded here — the subscription below owns
        // them, and seeding would only race it to set the same values.
      } else {
        const cached = localStorage.getItem(LANG_CACHE_KEY);
        if (cached) {
          setNativeLanguageState(cached);
        } else {
          setNativeLanguageState(null);
        }
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
      },
      error => console.error('[UserContext] preferences subscription failed:', error),
    );
    return unsubscribe;
  }, [user]);

  const setNativeLanguage = async (lang: string) => {
    setNativeLanguageState(lang);
    localStorage.setItem(LANG_CACHE_KEY, lang);

    // Switching native language can leave the study language set to the user's
    // own language; move it off silently rather than making them fix it.
    const nextStudy = resolveStudyLanguage(lang, studyLanguage, nativeLanguage);
    const studyChanged = nextStudy !== studyLanguage;
    if (studyChanged) {
      setStudyLanguageState(nextStudy);
      localStorage.setItem(STUDY_LANG_CACHE_KEY, nextStudy);
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
    localStorage.setItem(STUDY_LANG_CACHE_KEY, lang);

    // Choosing to study your own language says the native language is wrong;
    // move it to the language just being studied. This also switches the UI.
    const nextNative = resolveNativeLanguage(lang, nativeLanguage, studyLanguage);
    const nativeChanged = !!nextNative && nextNative !== nativeLanguage;
    if (nativeChanged) {
      setNativeLanguageState(nextNative);
      localStorage.setItem(LANG_CACHE_KEY, nextNative);
    }

    if (user) {
      await saveUserPreferences(user.uid, {
        studyLanguage: lang,
        ...(nativeChanged ? { nativeLanguage: nextNative } : {}),
      });
    }
  };

  const recordReview = (verdict: ReviewVerdict): string => {
    const today = getTodayString();
    if (!user) return today;

    // The day rollup, which is what the progress dashboard reads. Kept separate
    // from the streak fields below rather than folded into them: this one is an
    // atomic increment on its own document, so two devices reviewing the same
    // day add up instead of overwriting each other. Fire-and-forget — a lost
    // tally mark must never cost a card its scheduling.
    recordProgress(user.uid, reviewDelta(studyLanguage, verdict), today).catch(() => {});
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    // No local increment. The transaction computes from what the server holds
    // and the subscription brings the result back, so the number on screen is
    // the number in the document — including whatever another tab just wrote.
    // Fire-and-forget for the same reason as the rollup above.
    recordReviewStreak(user.uid, today, yesterdayStr).catch(() => {});
    return today;
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
   * `date` is the day `recordReview` handed back rather than today, so a
   * session carried across midnight takes the tally mark off the day it was
   * actually put on.
   */
  const undoReview = (verdict: ReviewVerdict, date: string) => {
    if (!user) return;
    recordProgress(user.uid, negateDelta(reviewDelta(studyLanguage, verdict)), date)
      .catch(() => {});
  };

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, setNativeLanguage, setStudyLanguage, recordReview, undoReview, handleSignIn, handleSignOut }}>
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
