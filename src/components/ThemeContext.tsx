'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'forest' | 'slate' | 'paper';

const STORAGE_KEY = 'amgi-theme';
const THEMES: { value: Theme; label: string }[] = [
  { value: 'forest', label: 'Forest' },
  { value: 'slate', label: 'Slate' },
  { value: 'paper', label: 'Paper' },
];

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  themes: typeof THEMES;
}>({ theme: 'forest', setTheme: () => {}, themes: THEMES });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('forest');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && ['forest', 'slate', 'paper'].includes(saved)) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-forest', 'theme-slate', 'theme-paper');
    html.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
