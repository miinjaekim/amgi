'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ALL_THEME_IDS, THEME_STORAGE_KEYS, modeFromPath, parseThemePreference,
  resolveTheme, themeSet,
} from '@amgi/core';
import type { AppMode, ThemeId, ThemePreference } from '@amgi/core';

export type { ThemeId, ThemePreference };
/** @deprecated The old name for a concrete palette. Use `ThemeId`. */
export type ResolvedTheme = ThemeId;

/**
 * The palette in force — derived from the route, never stored as "the theme".
 *
 * Which *set* of themes applies is the mode, and the mode is the path (see
 * `modes.ts`). Which theme within that set is the user's, read from a key of
 * that mode's own. So crossing `/munli` repaints, and crossing back repaints to
 * whatever Amgi was left on.
 *
 * ⚠️ **The apply runs in a layout effect, not a passive one.** A client-side
 * navigation into or out of a mode changes the palette, and an effect that runs
 * after paint would show one frame of the mode you just left — the same flash
 * the inline script in `layout.tsx` exists to prevent on a cold load, arriving
 * by a different door.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function readStored(mode: AppMode): ThemePreference {
  if (typeof window === 'undefined') return themeSet(mode).fallback;
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEYS[mode].web), mode);
  } catch {
    return themeSet(mode).fallback;
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(resolved: ThemeId) {
  const html = document.documentElement;
  // Clear every id any mode offers, not just this mode's — a switch that left
  // the previous mode's class behind would leave two palettes fighting over
  // the same variables, decided by source order in globals.css.
  html.classList.remove(...ALL_THEME_IDS.map(id => `theme-${id}`));
  html.classList.add(`theme-${resolved}`);
}

interface ThemeContextValue {
  /** What the user picked for the mode they are in — may be 'system'. */
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  /** The current mode's picker rows, already labelled. */
  themes: { value: ThemePreference; label: string }[];
}

const AMGI = themeSet('amgi');

const ThemeContext = createContext<ThemeContextValue>({
  theme: AMGI.fallback,
  setTheme: () => {},
  themes: [],
});

/** The picker's visible names. Not translated — they are product names, the way
 *  "Sonokai" always has been. Mobile reads the same list through i18n keys
 *  because its settings screen already had the interface language to hand. */
const LABELS: Record<ThemePreference, string> = {
  forest: 'Forest',
  slate: 'Sonokai',
  paper: 'Paper',
  suisei: 'Suisei',
  shoko: 'Shoko',
  godspeed: 'Godspeed',
  system: 'System',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = modeFromPath(usePathname());

  // What the user has picked *this session*, per mode. Anything absent is read
  // straight from localStorage during render — it is synchronous, so there is
  // nothing to wait for and nothing to mirror into state. Holding "the theme"
  // in state would mean two answers to keep in step across a mode change, which
  // is the bug `modes.ts` avoids by never storing the mode either.
  const [picked, setPicked] = useState<Partial<Record<AppMode, ThemePreference>>>({});
  const theme = picked[mode] ?? readStored(mode);

  useIsomorphicLayoutEffect(() => {
    applyTheme(resolveTheme(theme, prefersDark(), mode));

    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(resolveTheme('system', mq.matches, mode));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, mode]);

  // No useCallback/useMemo here: the React Compiler memoizes this component,
  // and hand-written deps on a closure over `mode` only fight it.
  const setTheme = (next: ThemePreference) => {
    setPicked(p => ({ ...p, [mode]: next }));
    try {
      localStorage.setItem(THEME_STORAGE_KEYS[mode].web, next);
    } catch {
      // A browser refusing storage costs the theme on the next cold load.
      // Never a reason to skip painting the one the user just picked.
    }
  };

  const value: ThemeContextValue = {
    theme,
    setTheme,
    themes: themeSet(mode).options.map(o => ({ value: o.value, label: LABELS[o.value] })),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
