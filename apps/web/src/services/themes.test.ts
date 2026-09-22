import { describe, it, expect } from 'vitest';
import {
  ALL_THEME_IDS, MODES, THEME_SCHEME, THEME_SETS, THEME_STORAGE_KEYS,
  modeForTheme, parseThemePreference, resolveTheme, themeSet,
} from '@amgi/core';
import type { AppMode, ThemeId } from '@amgi/core';

const ids = (mode: AppMode): ThemeId[] =>
  THEME_SETS[mode].options.map(o => o.value).filter((v): v is ThemeId => v !== 'system');

describe('THEME_SETS', () => {
  it('gives every mode a set', () => {
    for (const mode of MODES) expect(THEME_SETS[mode.id]).toBeDefined();
  });

  /**
   * The whole point of the split: the palette says which mode you are in before
   * any label does. A theme offered by two modes would make the switch
   * something you check rather than see — and worse, would make one mode's
   * stored preference silently valid in the other.
   */
  it('shares no theme between modes', () => {
    const seen = new Set<ThemeId>();
    for (const mode of MODES) {
      for (const id of ids(mode.id)) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it('ends every picker with system, and nowhere else', () => {
    for (const mode of MODES) {
      const values = THEME_SETS[mode.id].options.map(o => o.value);
      expect(values.filter(v => v === 'system')).toEqual(['system']);
      expect(values[values.length - 1]).toBe('system');
    }
  });

  it('only ever falls back to, and resolves to, a theme the mode offers', () => {
    for (const mode of MODES) {
      const set = THEME_SETS[mode.id];
      const offered = set.options.map(o => o.value);
      expect(offered).toContain(set.fallback);
      expect(offered).toContain(set.systemDark);
      expect(offered).toContain(set.systemLight);
    }
  });

  /** A shared key would make picking a theme in one mode change the other's. */
  it("keeps every mode's storage keys to itself, on both platforms", () => {
    const web = MODES.map(m => THEME_STORAGE_KEYS[m.id].web);
    const native = MODES.map(m => THEME_STORAGE_KEYS[m.id].native);
    expect(new Set(web).size).toBe(web.length);
    expect(new Set(native).size).toBe(native.length);
  });

  /**
   * The web app clears `theme-<id>` for every id in this list before applying
   * the next one. An id missing from it would leave two palettes on <html>,
   * with source order in globals.css deciding which wins.
   */
  it('lists every offered id in ALL_THEME_IDS', () => {
    for (const mode of MODES) {
      for (const id of ids(mode.id)) expect(ALL_THEME_IDS).toContain(id);
    }
    expect(ALL_THEME_IDS).not.toContain('system');
  });
});

describe('THEME_SCHEME', () => {
  it('answers for every theme any mode offers', () => {
    for (const id of ALL_THEME_IDS) expect(THEME_SCHEME[id]).toMatch(/^(light|dark)$/);
  });

  /**
   * The bug this rules out, which shipped once: the native tab bar picked its
   * blur tint with `resolvedTheme === 'paper'`, true while Paper was the only
   * light theme and wrong the moment Shoko and Godspeed arrived — both light,
   * both handed a dark frosted slab over a pale background. Chrome asks
   * THEME_SCHEME now, so this is what keeps the answer honest as themes are
   * added.
   */
  it('agrees with what each mode calls its dark and its light', () => {
    for (const mode of MODES) {
      const set = themeSet(mode.id);
      expect(THEME_SCHEME[set.systemDark]).toBe('dark');
      expect(THEME_SCHEME[set.systemLight]).toBe('light');
    }
  });

  /** A mode whose themes were all one lightness would make System meaningless. */
  it('gives every mode at least one of each', () => {
    for (const mode of MODES) {
      const schemes = THEME_SETS[mode.id].options
        .filter(o => o.value !== 'system')
        .map(o => THEME_SCHEME[o.value as Exclude<typeof o.value, 'system'>]);
      expect(schemes).toContain('light');
      expect(schemes).toContain('dark');
    }
  });
});

describe('parseThemePreference', () => {
  it('accepts every theme its own mode offers', () => {
    for (const mode of MODES) {
      for (const o of THEME_SETS[mode.id].options) {
        expect(parseThemePreference(o.value, mode.id)).toBe(o.value);
      }
    }
  });

  /**
   * A stored value outlives the set that wrote it — a build with different
   * themes, a key from before the sets split, a hand-edited entry. None of
   * those may throw or paint nothing.
   */
  it("reads anything the mode does not offer as that mode's fallback", () => {
    for (const value of ['forest', 'hwasul', '', 'SHOKO', null, undefined]) {
      expect(parseThemePreference(value, 'munli')).toBe(THEME_SETS.munli.fallback);
    }
    expect(parseThemePreference('shoko', 'amgi')).toBe(THEME_SETS.amgi.fallback);
  });
});

describe('resolveTheme', () => {
  it('passes a concrete theme through untouched', () => {
    expect(resolveTheme('shoko', true, 'munli')).toBe('shoko');
    expect(resolveTheme('paper', true, 'amgi')).toBe('paper');
  });

  it("sends system to the mode's own dark and light", () => {
    for (const mode of MODES) {
      const set = themeSet(mode.id);
      expect(resolveTheme('system', true, mode.id)).toBe(set.systemDark);
      expect(resolveTheme('system', false, mode.id)).toBe(set.systemLight);
    }
  });
});

describe('modeForTheme', () => {
  it('reads the mode off the path wherever the path has one', () => {
    expect(modeForTheme('/munli')).toBe('munli');
    expect(modeForTheme('/munli/writing')).toBe('munli');
    expect(modeForTheme('/review')).toBe('amgi');
  });

  /** Settings, pushed from a mode's Progress header, carries the mode with it. */
  it('falls back to the param on a path that belongs to no mode', () => {
    expect(modeForTheme('/settings', 'munli')).toBe('munli');
    expect(modeForTheme('/settings', 'amgi')).toBe('amgi');
    expect(modeForTheme('/settings')).toBe('amgi');
    expect(modeForTheme('/settings', ['munli'])).toBe('munli');
  });

  /**
   * The path wins. A stale or hand-written `?mode=` must not be able to drag
   * the palette out from under a screen that plainly belongs to a mode.
   */
  it('never lets the param override a path that has a mode', () => {
    expect(modeForTheme('/munli/saved', 'amgi')).toBe('munli');
  });

  it('reads an unrecognised param as the default', () => {
    for (const value of ['hwasul', '', 'MUNLI', null, undefined]) {
      expect(modeForTheme('/settings', value)).toBe('amgi');
    }
  });
});
