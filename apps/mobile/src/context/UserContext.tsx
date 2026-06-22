import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged, User } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { getUserPreferences, saveUserPreferences } from '../services/userPreferences';

WebBrowser.maybeCompleteAuthSession();

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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nativeLanguage, setNativeLanguageState] = useState<string | null | undefined>(undefined);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Sign into Firebase once Google OAuth completes
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch(console.error);
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
      } else {
        const cached = await AsyncStorage.getItem(LANG_CACHE_KEY);
        setNativeLanguageState(cached ?? 'Korean');
        if (!cached) await AsyncStorage.setItem(LANG_CACHE_KEY, 'Korean');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setNativeLanguage = async (lang: string) => {
    setNativeLanguageState(lang);
    await AsyncStorage.setItem(LANG_CACHE_KEY, lang);
    if (user) await saveUserPreferences(user.uid, { nativeLanguage: lang });
  };

  const handleSignIn = async () => {
    await promptAsync();
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <UserContext.Provider value={{ user, authLoading, nativeLanguage, setNativeLanguage, handleSignIn, handleSignOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
