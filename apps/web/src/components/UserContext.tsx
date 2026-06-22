'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';

const LANG_CACHE_KEY = 'amgi_native_language';

interface UserContextType {
  user: User | null;
  authLoading: boolean;
  nativeLanguage: string | null | undefined;
  setNativeLanguage: (lang: string) => Promise<void>;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null | undefined>(undefined);

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
      } else {
        const cached = localStorage.getItem(LANG_CACHE_KEY);
        if (cached) {
          setNativeLanguageState(cached);
        } else {
          setNativeLanguageState('Korean');
          localStorage.setItem(LANG_CACHE_KEY, 'Korean');
        }
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

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, setNativeLanguage, handleSignIn, handleSignOut }}>
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
