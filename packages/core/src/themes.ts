import type { AppMode } from './modes';
import { DEFAULT_MODE, modeFromPath, parseMode } from './modes';
import type { TranslationKey } from './i18n';

/**
 * Themes, and the fact that each mode has its own set of them.
 *
 * **A theme belongs to a mode, not to the app.** Amgi offers Forest / Sonokai /
 * Paper; Munli offers Suisei / Shoko / Godspeed. The sets do not overlap by a
 * single id, and that is the whole point: the palette is the fastest possible
 * answer to "which mode am I in", faster than reading a tab label, and it lands
 * in the frame the navigation does. Two modes sharing a palette would make the
 * switch something you have to verify rather than see.
 *
 * **Each mode remembers its own choice.** Picking Godspeed in Munli must not
 * move Amgi off Paper — switching modes is meant to repaint, and a shared
 * preference would either forbid that or throw one mode's choice away on every
 * switch. Hence one storage key per mode per platform.
 *
 * **What is *not* here is a current theme.** Like the mode itself (see
 * `modes.ts`), the palette in force is derived — from the route, and from that
 * mode's stored preference. Nothing holds "the theme" for the app.
 *
 * The palettes themselves live per platform, because their forms differ:
 * `html.theme-*` blocks in the web app's `globals.css`, `PALETTES` in the mobile
 * app's `theme.ts`. They carry identical values and each says so.
 */

/** A concrete palette. Every id here has a block in both platforms' palettes. */
export type ThemeId = 'forest' | 'slate' | 'paper' | 'suisei' | 'shoko' | 'godspeed';

/** What the user picked. 'system' follows the OS light/dark setting. */
export type ThemePreference = ThemeId | 'system';

export interface ThemeSet {
  /** In picker order. `system` is last, because it is a deferral, not a colour. */
  options: { value: ThemePreference; labelKey: TranslationKey }[];
  /** What someone who has never opened the picker gets. */
  fallback: ThemePreference;
  /** What `system` resolves to, per OS preference. */
  systemDark: ThemeId;
  systemLight: ThemeId;
}

/**
 * ⚠️ **The `slate` id is Sonokai.** It kept the id of the indigo palette it
 * replaced so stored preferences and the system-dark mapping still resolve;
 * only the label moved. Renaming it would silently reset every user who had
 * chosen dark mode.
 */
export const THEME_SETS: Record<AppMode, ThemeSet> = {
  amgi: {
    options: [
      { value: 'forest', labelKey: 'themeForest' },
      { value: 'slate',  labelKey: 'themeSonokai' },
      { value: 'paper',  labelKey: 'themePaper' },
      { value: 'system', labelKey: 'themeSystem' },
    ],
    fallback: 'paper',
    systemDark: 'slate',
    systemLight: 'paper',
  },
  munli: {
    options: [
      { value: 'suisei',   labelKey: 'themeSuisei' },
      { value: 'shoko',    labelKey: 'themeShoko' },
      { value: 'godspeed', labelKey: 'themeGodspeed' },
      { value: 'system',   labelKey: 'themeSystem' },
    ],
    // Light by default, matching Amgi's Paper: switching modes should change
    // the hue, not the brightness of the room. Suisei is the one dark palette
    // in the set, so it is what `system` reaches for after dark.
    fallback: 'shoko',
    systemDark: 'suisei',
    systemLight: 'shoko',
  },
};

/**
 * Every id any set offers, deduplicated.
 *
 * Used where a platform has to clear whatever is currently applied before
 * applying the next one — the web's `<html>` class list. Derived rather than
 * typed out, so adding a theme to a set cannot leave a stale class behind.
 */
export const ALL_THEME_IDS: readonly ThemeId[] = Array.from(
  new Set(
    Object.values(THEME_SETS).flatMap(set =>
      set.options.map(o => o.value).filter((v): v is ThemeId => v !== 'system'),
    ),
  ),
);

/**
 * Where each mode's choice is remembered.
 *
 * Two platforms, two separator conventions, and neither is worth migrating: the
 * web app has been writing `amgi-theme` to localStorage and the native app
 * `amgi_theme` to AsyncStorage since before there was a second mode. What
 * matters — that no two modes share a key — is the thing this table exists to
 * make checkable.
 */
export const THEME_STORAGE_KEYS: Record<AppMode, { web: string; native: string }> = {
  amgi:  { web: 'amgi-theme',  native: 'amgi_theme'  },
  munli: { web: 'munli-theme', native: 'munli_theme' },
};

export function themeSet(mode: AppMode): ThemeSet {
  return THEME_SETS[mode] ?? THEME_SETS[DEFAULT_MODE];
}

/**
 * Anything a mode does not offer reads as that mode's fallback.
 *
 * Stored values outlive the set that wrote them — a theme that was removed, a
 * key carried over from before the sets split, a hand-edited localStorage entry.
 * The cost of being wrong is landing on the default palette, which is where a
 * first-time user lands anyway, so this never throws.
 */
export function parseThemePreference(
  value: string | null | undefined,
  mode: AppMode,
): ThemePreference {
  const set = themeSet(mode);
  return set.options.some(o => o.value === value)
    ? (value as ThemePreference)
    : set.fallback;
}

/** Resolve a preference to the palette actually painted. */
export function resolveTheme(
  pref: ThemePreference,
  prefersDark: boolean,
  mode: AppMode,
): ThemeId {
  if (pref !== 'system') return pref;
  const set = themeSet(mode);
  return prefersDark ? set.systemDark : set.systemLight;
}

/**
 * Which mode a screen should be *painted* as, including the ones that sit
 * outside every mode's tree.
 *
 * Settings is the only such screen today: it is pushed from every mode's
 * Progress header, lives at `/settings` on native, and has a theme picker in it
 * — so it has to know whose themes to offer. The answer travels in the route,
 * as a `mode` param the header sets, which keeps the rule in `modes.ts` intact:
 * the mode is read off the route, never off a stored flag.
 *
 * ⚠️ **The path wins.** The param is consulted only where the path itself says
 * nothing — that is, where `modeFromPath` has fallen back to Amgi. A stale or
 * hand-written `?mode=` on a Munli path cannot drag the palette out from under
 * it.
 */
export function modeForTheme(
  pathname: string | null | undefined,
  modeParam?: string | string[] | null,
): AppMode {
  const fromPath = modeFromPath(pathname);
  if (fromPath !== DEFAULT_MODE) return fromPath;
  const param = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  return parseMode(param);
}
