import type { TranslationKey } from './i18n';

/**
 * Modes: Amgi hosts more than one of them, and Munli is the second.
 *
 * **A mode is a location, not a setting.** The current mode is always read off
 * the route — `/munli/...` on web, the `munli` segment on native — never off a
 * stored flag. Two things follow, and both are load-bearing.
 *
 * On web it means the server already knows which mode a request is for, so the
 * mode never joins the pre-paint script in `app/layout.tsx`. That script exists
 * because theme and sidebar-collapse are client-side state that would otherwise
 * paint wrong for a frame; a stored mode would have put the *wrong navigation*
 * in that same frame, which is far more visible than a wrong colour.
 *
 * And it means nothing has to keep two copies of the answer in step. There is
 * no `currentMode` state anywhere, so no surface can disagree with another
 * about which mode it is in.
 *
 * **Storage has exactly one job: which mode a cold open lands in.** One key per
 * platform, written on switch, read once at the root. Never consulted to decide
 * what to render.
 *
 * **The list is a list, deliberately.** Speaking is a plausible third mode and
 * nothing here may assume there are two — no booleans, no `isMunli`, no
 * `otherMode()`. Adding a row to `MODES` and a route is what adding a mode
 * should cost.
 */
export type AppMode = 'amgi' | 'munli';

export interface ModeDescriptor {
  id: AppMode;
  /** The product name. Not translated — see `nameKey`'s absence. */
  name: string;
  /** What the mode is for, one word, in the reader's language. */
  taglineKey: TranslationKey;
  /** Where this mode starts, as a web path. Native mirrors it segment for segment. */
  home: string;
}

/**
 * ⚠️ **The names are not translated, and that is the open question here.**
 * "Amgi" renders as "Amgi" in a Korean interface today (`SideNav`, and the
 * document title is `Amgi · 암기`), so "Munli" follows the precedent it set.
 * Whether a Korean interface should say 문리 instead is the user's call and is
 * recorded as open in `.scratchpad/backlog.md`.
 */
export const MODES: readonly ModeDescriptor[] = [
  { id: 'amgi',  name: 'Amgi',  taglineKey: 'modeAmgiTagline',  home: '/' },
  { id: 'munli', name: 'Munli', taglineKey: 'modeMunliTagline', home: '/munli' },
];

export const DEFAULT_MODE: AppMode = 'amgi';

/** The key a cold open reads. Native uses AsyncStorage, web a cookie. */
export const MODE_STORAGE_KEY = 'amgi_mode';
export const MODE_COOKIE_NAME = 'amgi-mode';

export function getMode(id: AppMode): ModeDescriptor {
  return MODES.find(m => m.id === id) ?? MODES[0];
}

/**
 * Anything unrecognised reads as the default rather than throwing.
 *
 * A stored value can outlive the mode that wrote it — a build that had a third
 * mode, a hand-edited cookie — and the cost of being wrong here is landing in
 * Amgi, which is where a first-time user lands anyway.
 */
export function parseMode(value: string | null | undefined): AppMode {
  return MODES.some(m => m.id === value) ? (value as AppMode) : DEFAULT_MODE;
}

/**
 * Which mode a path belongs to.
 *
 * Longest match wins, so a mode whose home is `/` cannot swallow every other
 * mode's routes. `/munli` and `/munli/writing` are both Munli; `/review` is
 * Amgi, and so is `/` itself.
 */
export function modeFromPath(pathname: string | null | undefined): AppMode {
  const path = pathname ?? '/';
  let best: ModeDescriptor = MODES[0];
  for (const mode of MODES) {
    if (mode.home === '/') continue;
    if (path === mode.home || path.startsWith(mode.home + '/')) {
      if (mode.home.length > (best.home === '/' ? 0 : best.home.length)) best = mode;
    }
  }
  return best.id;
}
