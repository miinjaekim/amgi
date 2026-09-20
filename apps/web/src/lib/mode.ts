'use client';
import { MODE_COOKIE_NAME, getMode, parseMode } from '@amgi/core';
import type { AppMode } from '@amgi/core';

/**
 * Remembering which mode a cold open lands in — a cookie, not localStorage.
 *
 * `modes.ts` explains why the *current* mode is never stored: it is read off
 * the route. This is the one thing that does need remembering, because `/` has
 * to resolve to something and the answer is "wherever you were".
 *
 * ⚠️ **A cookie rather than localStorage, and the reason is the frame.**
 * `middleware.ts` reads this server-side and redirects `/` before anything
 * renders. The same answer in localStorage could only be read after hydration,
 * which means painting Amgi's Learn page and then replacing it — the exact
 * flash the pre-paint script in `layout.tsx` exists to prevent for the theme.
 *
 * A year is arbitrary but long: the failure mode of expiry is landing in Amgi,
 * which is where everyone starts anyway. `SameSite=Lax` because this is only
 * ever read on a top-level navigation, and no `Secure` flag so it keeps
 * working on `localhost` over http.
 */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function rememberMode(mode: AppMode): void {
  try {
    document.cookie = `${MODE_COOKIE_NAME}=${mode}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  } catch {
    // A browser refusing cookies costs a cold open landing in Amgi. Not worth
    // failing a navigation over.
  }
}

/** Where a mode starts. Used by the switcher to navigate. */
export function modeHome(mode: AppMode): string {
  return getMode(mode).home;
}

export { parseMode };
