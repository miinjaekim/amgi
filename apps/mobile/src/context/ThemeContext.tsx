import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ThemePreference, type ResolvedTheme, type Palette,
  PALETTES, VALID_THEMES, resolveTheme,
} from '../theme';

const THEME_CACHE_KEY = 'amgi_theme';

interface ThemeContextType {
  /** What the user picked — may be 'system'. Use for the settings selector. */
  theme: ThemePreference;
  /** The concrete palette in force. Use for anything that branches on light/dark. */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: ThemePreference) => Promise<void>;
  C: Palette;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'paper',
  resolvedTheme: 'paper',
  setTheme: async () => {},
  C: PALETTES.paper,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('paper');
  // Re-renders on OS light/dark changes, so 'system' tracks them live.
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(THEME_CACHE_KEY).then(saved => {
      if (saved && VALID_THEMES.includes(saved as ThemePreference)) {
        setThemeState(saved as ThemePreference);
      }
    });
  }, []);

  const setTheme = async (t: ThemePreference) => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_CACHE_KEY, t);
  };

  const resolvedTheme = resolveTheme(theme, scheme === 'dark');

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, C: PALETTES[resolvedTheme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
