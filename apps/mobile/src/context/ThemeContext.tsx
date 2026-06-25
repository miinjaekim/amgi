import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Theme, type Palette, PALETTES } from '../theme';

const THEME_CACHE_KEY = 'amgi_theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => Promise<void>;
  C: Palette;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'paper',
  setTheme: async () => {},
  C: PALETTES.paper,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('paper');

  useEffect(() => {
    AsyncStorage.getItem(THEME_CACHE_KEY).then(saved => {
      if (saved && saved in PALETTES) setThemeState(saved as Theme);
    });
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_CACHE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, C: PALETTES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
