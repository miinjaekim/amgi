'use client';
import { createContext, useContext, useEffect, useState } from 'react';

/** What the user picked. 'system' follows the OS light/dark setting. */
export type ThemePreference = 'forest' | 'slate' | 'paper' | 'system';
/** A concrete palette that maps to a CSS class. */
export type ResolvedTheme = 'forest' | 'slate' | 'paper';

const STORAGE_KEY = 'amgi-theme';
const DEFAULT_THEME: ThemePreference = 'paper';
const VALID: ThemePreference[] = ['forest', 'slate', 'paper', 'system'];

// The 'slate' value keeps its id for stored prefs / the system dark mapping,
// but its palette is Sonokai — hence the label.
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'forest', label: 'Forest' },
  { value: 'slate', label: 'Sonokai' },
  { value: 'paper', label: 'Paper' },
  { value: 'system', label: 'System' },
];

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
  return saved && VALID.includes(saved) ? saved : DEFAULT_THEME;
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a preference to a concrete palette. 'system' → slate (dark) or paper (light). */
function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return prefersDark() ? 'slate' : 'paper';
  return pref;
}

function applyTheme(resolved: ResolvedTheme) {
  const html = document.documentElement;
  html.classList.remove('theme-forest', 'theme-slate', 'theme-paper');
  html.classList.add(`theme-${resolved}`);
}

const ThemeContext = createContext<{
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  themes: typeof THEMES;
}>({ theme: DEFAULT_THEME, setTheme: () => {}, themes: THEMES });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize straight from localStorage so the first apply-effect writes the
  // correct class. Starting from a fixed default would make this effect slam
  // `theme-forest` onto <html> for one render, undoing the inline script in
  // layout.tsx and flashing Forest before the real theme.
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);

  // Persist + apply the resolved palette; when on 'system', track OS changes live.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(resolveTheme(theme));

    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
