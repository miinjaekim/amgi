import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MODE_STORAGE_KEY, getMode, parseMode } from '@amgi/core';
import type { AppMode } from '@amgi/core';

/**
 * Which mode a cold open lands in — and nothing else.
 *
 * ⚠️ **This context does not hold "the current mode".** The current mode is the
 * route: `/munli/...` is Munli, everything else is Amgi. Read it with
 * `modeFromPath(usePathname())` wherever it is needed. A stored copy would be a
 * second answer to a question the router already answers, and the two would
 * eventually disagree.
 *
 * What is stored is the *landing* mode, written when the user switches and read
 * exactly once at startup. `booted` is what the root layout waits on: the
 * navigator must not mount before the answer is known, or a user who left in
 * Munli watches Amgi's tabs paint and then vanish.
 */
interface ModeContextType {
  /** The mode a cold open should land in. `undefined` until storage answers. */
  landingMode: AppMode | undefined;
  /** Switch modes: remember it, then go there. */
  switchMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextType>({ landingMode: undefined, switchMode: () => {} });

export function ModeProvider({ children }: { children: ReactNode }) {
  const [landingMode, setLandingMode] = useState<AppMode | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      } catch {
        // Storage failing costs a cold open landing in Amgi, which is where a
        // first run lands anyway. Never a reason to block boot.
      }
      if (!cancelled) setLandingMode(parseMode(stored));
    })();
    return () => { cancelled = true; };
  }, []);

  const switchMode = useCallback((mode: AppMode) => {
    setLandingMode(mode);
    // Not awaited: the navigation is what the user asked for and must not wait
    // on a disk write. A write that loses the race costs one cold open.
    void AsyncStorage.setItem(MODE_STORAGE_KEY, mode).catch(() => {});
    // `replace`, not `push`: modes are places you are in, not places you went
    // to from somewhere. A back stack that walks you out of a mode into the one
    // you left is the account-switcher bug every app with tabs has had once.
    router.replace(getMode(mode).home as never);
  }, [router]);

  return (
    <ModeContext.Provider value={{ landingMode, switchMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
