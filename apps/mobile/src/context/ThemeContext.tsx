import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { modeForTheme } from '@amgi/core';
import type { AppMode, TranslationKey } from '@amgi/core';
import {
  type ThemePreference, type ThemeId, type Palette,
  PALETTES, THEME_STORAGE_KEYS, parseThemePreference, resolveTheme, themeSet,
} from '../theme';

/**
 * The palette in force, and the picker rows that belong to it.
 *
 * ⚠️ **Which themes exist is a function of the mode, and the mode is the
 * route** — `modes.ts` explains why nothing stores it. So this context holds no
 * mode of its own either: it reads the path on every render and follows it.
 * Crossing into `munli/` repaints to whatever Munli was left on, and crossing
 * back repaints to Amgi's.
 *
 * **Settings is the exception the `mode` param exists for.** It is pushed from
 * every mode's Progress header and sits at `/settings`, outside every mode's
 * tree, yet it is where the theme picker lives — so `ProgressHeader` puts the
 * mode it was tapped in into the route. `modeForTheme` only consults it where
 * the path itself says nothing.
 *
 * ⚠️ **Each mode's choice is stored under its own key.** Picking Godspeed here
 * must not move Amgi off Paper; the repaint on switching is the feature.
 */
interface ThemeContextType {
  /** What the user picked for the mode they are in — may be 'system'. */
  theme: ThemePreference;
  /** The concrete palette in force. Use for anything that branches on light/dark. */
  resolvedTheme: ThemeId;
  setTheme: (t: ThemePreference) => Promise<void>;
  /** The current mode's picker rows, in order. */
  themes: { value: ThemePreference; labelKey: TranslationKey }[];
  C: Palette;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'paper',
  resolvedTheme: 'paper',
  setTheme: async () => {},
  themes: themeSet('amgi').options,
  C: PALETTES.paper,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = modeForTheme(usePathname(), useGlobalSearchParams<{ mode?: string }>().mode);
  // Re-renders on OS light/dark changes, so 'system' tracks them live.
  const scheme = useColorScheme();

  // One entry per mode, filled as each mode is first visited. `undefined` means
  // "not read yet", which is not the same as "no preference" — falling back to
  // the default while the read is in flight is what would make a Suisei user
  // watch Shoko paint and then vanish.
  const [prefs, setPrefs] = useState<Partial<Record<AppMode, ThemePreference>>>({});

  // Which modes have been read already. A ref rather than a dependency, so a
  // theme the user picks does not re-trigger the read that would race its write.
  const loaded = useRef<Partial<Record<AppMode, true>>>({});

  useEffect(() => {
    if (loaded.current[mode]) return;
    loaded.current[mode] = true;
    let cancelled = false;
    (async () => {
      let stored: string | null = null;
      try {
        stored = await AsyncStorage.getItem(THEME_STORAGE_KEYS[mode].native);
      } catch {
        // Storage failing costs this mode's default palette. Never a reason to
        // block a render.
      }
      if (!cancelled) {
        setPrefs(p => ({ ...p, [mode]: parseThemePreference(stored, mode) }));
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const theme = prefs[mode] ?? themeSet(mode).fallback;

  const setTheme = useCallback(async (next: ThemePreference) => {
    setPrefs(p => ({ ...p, [mode]: next }));
    await AsyncStorage.setItem(THEME_STORAGE_KEYS[mode].native, next);
  }, [mode]);

  const resolvedTheme = resolveTheme(theme, scheme === 'dark', mode);

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    resolvedTheme,
    setTheme,
    themes: themeSet(mode).options,
    C: PALETTES[resolvedTheme],
  }), [theme, resolvedTheme, setTheme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
