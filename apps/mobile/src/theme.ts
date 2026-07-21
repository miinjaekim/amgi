import type { TranslationKey } from '@amgi/core';

/** What the user picked. 'system' follows the OS light/dark setting. */
export type ThemePreference = 'forest' | 'slate' | 'paper' | 'system';
/** A concrete palette. */
export type ResolvedTheme = 'forest' | 'slate' | 'paper';

export const VALID_THEMES: ThemePreference[] = ['forest', 'slate', 'paper', 'system'];

/** Resolve a preference to a concrete palette. 'system' → slate (dark) or paper (light). */
export function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return prefersDark ? 'slate' : 'paper';
  return pref;
}

export type Palette = {
  bg: string;
  surface: string;
  text: string;
  highlight: string;
  muted: string;
  border: string;
  error: string;
};

// Mirrors the web theme list. The 'slate' value keeps its id for stored prefs
// and the system dark mapping, but its palette is Sonokai — hence the label.
export const THEMES: { value: ThemePreference; labelKey: TranslationKey }[] = [
  { value: 'forest', labelKey: 'themeForest' },
  { value: 'slate', labelKey: 'themeSonokai' },
  { value: 'paper', labelKey: 'themePaper' },
  { value: 'system', labelKey: 'themeSystem' },
];

export const PALETTES: Record<ResolvedTheme, Palette> = {
  forest: {
    bg: '#173F35',
    surface: '#1E5246',
    text: '#E9E0D2',
    highlight: '#EAA09C',
    muted: '#418E7B',
    border: '#2D6355',
    error: '#EAA09C',
  },
  // Sonokai — matches html.theme-slate in the web app's globals.css
  slate: {
    bg: '#2C2E34',
    surface: '#363944',
    text: '#E2E2E3',
    highlight: '#9ED072',
    muted: '#595F6F',
    border: '#414550',
    error: '#FC5D7C',
  },
  paper: {
    bg: '#F5F4F0',
    surface: '#FFFFFF',
    text: '#1E2235',
    highlight: '#2D6A4F',
    muted: '#94A3B8',
    border: '#D0D9D0',
    error: '#C0392B',
  },
};

// Static default — used only before ThemeContext is available
export const C = PALETTES.paper;
