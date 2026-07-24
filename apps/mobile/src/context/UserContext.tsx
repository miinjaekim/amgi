import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged, User } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { getUserPreferences, saveUserPreferences } from '../services/userPreferences';
import { isStudyLanguage, resolveNativeLanguage, resolveStudyLanguage, type StudyLanguage } from '@amgi/core';

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
  recordReview: () => void;
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

  // Sign into Firebase once Google OAuth completes (after auto code exchange, id_token is in params)
  useEffect(() => {
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
        const prefs = await getUserPreferences(firebaseUser.uid);
        const lang = prefs?.nativeLanguage ?? null;
        setNativeLanguageState(lang);
        if (lang) {
          await AsyncStorage.setItem(LANG_CACHE_KEY, lang);
        } else {
          await AsyncStorage.removeItem(LANG_CACHE_KEY);
        }
        if (isStudyLanguage(prefs?.studyLanguage)) {
          setStudyLanguageState(prefs.studyLanguage);
          await AsyncStorage.setItem(STUDY_LANG_CACHE_KEY, prefs.studyLanguage);
        }
        const today = getTodayString();
        setStreak(prefs?.streak ?? 0);
        setLongestStreak(prefs?.longestStreak ?? 0);
        setLastReviewDate(prefs?.lastReviewDate ?? null);
        setReviewedToday(prefs?.lastReviewDate === today ? (prefs?.reviewedToday ?? 0) : 0);
      } else {
        const cached = await AsyncStorage.getItem(LANG_CACHE_KEY);
        setNativeLanguageState(cached ?? 'Korean');
        if (!cached) await AsyncStorage.setItem(LANG_CACHE_KEY, 'Korean');
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

    saveUserPreferences(user.uid, {
      streak: newStreak,
      longestStreak: newLongest,
      lastReviewDate: today,
      reviewedToday: newReviewedToday,
    }).catch(() => {});
  };

  const handleSignIn = async () => {
    await promptAsync();
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, studyLanguage, streak, reviewedToday, setNativeLanguage, setStudyLanguage, recordReview, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
