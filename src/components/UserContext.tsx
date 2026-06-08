'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getUserPreferences, saveUserPreferences } from '@/services/userPreferences';

interface UserContextType {
  user: User | null;
  nativeLanguage: string | null;
  setNativeLanguage: (lang: string) => Promise<void>;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const prefs = await getUserPreferences(firebaseUser.uid);
        setNativeLanguageState(prefs?.nativeLanguage ?? null);
      } else {
        setNativeLanguageState(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const setNativeLanguage = async (lang: string) => {
    if (!user) return;
    await saveUserPreferences(user.uid, { nativeLanguage: lang });
    setNativeLanguageState(lang);
  };

  const handleSignIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, nativeLanguage, setNativeLanguage, handleSignIn, handleSignOut }}>
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
