'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';

const LANG_CACHE_KEY = 'amgi_native_language';

function getTodayString(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
}

interface UserContextType {
  user: User | null;
  authLoading: boolean;
  nativeLanguage: string | null | undefined;
  streak: number;
  reviewedToday: number;
  setNativeLanguage: (lang: string) => Promise<void>;
  recordReview: () => void;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastReviewDate, setLastReviewDate] = useState<string | null>(null);
  const [reviewedToday, setReviewedToday] = useState(0);

  useEffect(() => {
    const cached = localStorage.getItem(LANG_CACHE_KEY);
    if (cached) setNativeLanguageState(cached);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prefs = await getUserPreferences(firebaseUser.uid);
        const lang = prefs?.nativeLanguage ?? null;
        setNativeLanguageState(lang);
        if (lang) {
          localStorage.setItem(LANG_CACHE_KEY, lang);
        } else {
          localStorage.removeItem(LANG_CACHE_KEY);
        }

        const today = getTodayString();
        setStreak(prefs?.streak ?? 0);
        setLongestStreak(prefs?.longestStreak ?? 0);
        setLastReviewDate(prefs?.lastReviewDate ?? null);
        // Reset reviewedToday if the stored date isn't today
        setReviewedToday(prefs?.lastReviewDate === today ? (prefs?.reviewedToday ?? 0) : 0);
      } else {
        const cached = localStorage.getItem(LANG_CACHE_KEY);
        if (cached) {
          setNativeLanguageState(cached);
        } else {
          setNativeLanguageState(null);
        }
        setStreak(0);
        setLongestStreak(0);
        setLastReviewDate(null);
        setReviewedToday(0);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setNativeLanguage = async (lang: string) => {
    setNativeLanguageState(lang);
    localStorage.setItem(LANG_CACHE_KEY, lang);
    if (user) {
      await saveUserPreferences(user.uid, { nativeLanguage: lang });
    }
  };

  const recordReview = () => {
    if (!user) return;
    const today = getTodayString();
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

    // Fire-and-forget — don't block the review flow
    saveUserPreferences(user.uid, {
      streak: newStreak,
      longestStreak: newLongest,
      lastReviewDate: today,
      reviewedToday: newReviewedToday,
    }).catch(() => {});
  };

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, streak, reviewedToday, setNativeLanguage, recordReview, handleSignIn, handleSignOut }}>
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
