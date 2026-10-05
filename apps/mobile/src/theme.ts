import {
  ALL_THEME_IDS, THEME_SETS, THEME_STORAGE_KEYS, parseThemePreference,
  resolveTheme, themeSet,
} from '@amgi/core';
import type { ThemeId, ThemePreference, ThemeSet } from '@amgi/core';

/**
 * The native palettes, one per id in `THEME_SETS`.
 *
 * ⚠️ **Which mode offers which theme is not decided here** — that lives in
 * core's `themes.ts`, so web and native cannot drift on it. This file holds
 * only the colours, and they are the same colours the web app's `globals.css`
 * carries as CSS variables. Change one, change both.
 */
export {
  ALL_THEME_IDS, THEME_SETS, THEME_STORAGE_KEYS, parseThemePreference,
  resolveTheme, themeSet,
};
export type { ThemeId, ThemePreference, ThemeSet };

/** @deprecated The old name for a concrete palette. Use `ThemeId`. */
export type ResolvedTheme = ThemeId;

export type Palette = {
  bg: string;
  surface: string;
  text: string;
  highlight: string;
  muted: string;
  border: string;
  error: string;
  /**
   * The calendar ramp, indexed by `HeatmapCell.level`: `heat[0]` is a day with
   * no reviews, `heat[4]` the busiest.
   *
   * Generated in OKLCH and checked with the data-viz palette validator rather
   * than picked by eye — one hue, monotone lightness, adjacent ΔL >= 0.06, the
   * faintest studied step clearing 2.35:1 against `bg`. `heat[0]` is a
   * *categorical* break rather than a step on that scale (no data is not a
   * small amount of data), so it sits ΔE 20 from `heat[1]` in normal vision and
   * >= 17 under protanopia and deuteranopia.
   *
   * It replaces alpha-blending `highlight` over `bg`, which measured wrong two
   * ways: on forest a rest day rendered *lighter* than a studied one, and empty
   * versus level 1 were ΔE 1.4 apart under deuteranopia — one colour to a
   * red-green colourblind reader. Web carries the identical values as
   * `--heat-0`…`--heat-4` in globals.css.
   */
  heat: [string, string, string, string, string];
};

export const PALETTES: Record<ThemeId, Palette> = {
  forest: {
    bg: '#173F35',
    surface: '#1E5246',
    text: '#E9E0D2',
    highlight: '#EAA09C',
    muted: '#418E7B',
    border: '#2D6355',
    error: '#EAA09C',
    heat: ['#453a39', '#956462', '#b17874', '#cd8c88', '#eaa09c'],
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
    heat: ['#30352d', '#507032', '#698f47', '#83af5c', '#9ed072'],
  },
  paper: {
    bg: '#F5F4F0',
    surface: '#FFFFFF',
    text: '#1E2235',
    highlight: '#2D6A4F',
    muted: '#94A3B8',
    border: '#D0D9D0',
    error: '#C0392B',
    heat: ['#d6e1db', '#7faa94', '#64947c', '#497f65', '#2d6a4f'],
  },
  /* ---------------------------------------------------------------------
     Munli's three. Identical to html.theme-suisei / -shoko / -godspeed in the
     web app's globals.css, which carries the full derivation. They began as
     Monkeytype palettes and keep their names, ids and hues, but not the
     source backgrounds: those read as "looking at the screen from underwater"
     (2026-10-05), so each ground moved to the end of its range, cards went
     white on the light two, and text went near black or near white.
     --------------------------------------------------------------------- */

  // Suisei — the set's only dark palette, and Munli's system-dark.
  suisei: {
    bg: '#1E2530',
    surface: '#293241',
    text: '#E8EBF2',
    highlight: '#9EE3F7',
    muted: '#8591A3',
    border: '#364152',
    error: '#FF9E99',
    heat: ['#343d3f', '#477784', '#6399a9', '#80becf', '#9ee3f7'],
  },
  // Shoko — Munli's default and its system-light.
  shoko: {
    bg: '#EEF2F6',
    surface: '#FFFFFF',
    text: '#1B2630',
    highlight: '#07566C',
    muted: '#6B7C8A',
    border: '#D5DDE5',
    error: '#993F4A',
    heat: ['#d9e3e7', '#76a5b7', '#558a9e', '#347084', '#07566c'],
  },
  // Godspeed — warm cream, cool slate accent.
  godspeed: {
    bg: '#F4F0E2',
    surface: '#FFFDF5',
    text: '#2B2D30',
    highlight: '#2F5568',
    muted: '#7F7C6E',
    border: '#DDD7C4',
    error: '#B83645',
    heat: ['#d8e1e6', '#84a2b2', '#678798', '#4b6e80', '#2f5568'],
  },
};

// Static default — used only before ThemeContext is available
export const C = PALETTES.paper;
