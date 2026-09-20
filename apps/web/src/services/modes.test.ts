import { describe, it, expect } from 'vitest';
import { MODES, DEFAULT_MODE, getMode, parseMode, modeFromPath } from '@amgi/core';

describe('parseMode', () => {
  it('accepts every declared mode', () => {
    for (const mode of MODES) expect(parseMode(mode.id)).toBe(mode.id);
  });

  /**
   * A stored value outlives the build that wrote it — a mode that was removed,
   * a hand-edited cookie, a key that never existed. None of those may throw or
   * strand the user somewhere that does not render.
   */
  it('reads anything unrecognised as the default', () => {
    for (const value of ['hwasul', '', 'MUNLI', null, undefined, '../../etc']) {
      expect(parseMode(value)).toBe(DEFAULT_MODE);
    }
  });
});

describe('modeFromPath', () => {
  it('reads a mode off its own paths', () => {
    expect(modeFromPath('/munli')).toBe('munli');
    expect(modeFromPath('/munli/writing')).toBe('munli');
    expect(modeFromPath('/munli/conjugation/prendre')).toBe('munli');
  });

  it('leaves every Amgi path in Amgi', () => {
    for (const path of ['/', '/review', '/cards', '/decks', '/decks/toeic', '/progress']) {
      expect(modeFromPath(path)).toBe('amgi');
    }
  });

  /**
   * The bug this rules out: a mode whose home is `/` matching by prefix, which
   * would make every path in the app belong to whichever mode was checked
   * first. Amgi's `/` is a fallback, never a prefix.
   */
  it('does not let the mode rooted at / swallow another mode', () => {
    expect(modeFromPath('/munli')).not.toBe('amgi');
  });

  /**
   * `/munlixyz` is not `/munli`. Prefix matching has to respect the segment
   * boundary or a future route could be captured by a mode it has nothing to
   * do with.
   */
  it('matches whole segments, not string prefixes', () => {
    expect(modeFromPath('/munlifest')).toBe('amgi');
    expect(modeFromPath('/munli-notes')).toBe('amgi');
  });

  it('survives a missing path', () => {
    expect(modeFromPath(null)).toBe('amgi');
    expect(modeFromPath(undefined)).toBe('amgi');
  });
});

describe('MODES', () => {
  it('has a unique id and a unique home per mode', () => {
    expect(new Set(MODES.map(m => m.id)).size).toBe(MODES.length);
    expect(new Set(MODES.map(m => m.home)).size).toBe(MODES.length);
  });

  /**
   * Exactly one mode may own `/`, since that is what the root resolves to when
   * storage says nothing.
   */
  it('roots exactly one mode at /', () => {
    expect(MODES.filter(m => m.home === '/')).toHaveLength(1);
    expect(getMode(DEFAULT_MODE).home).toBe('/');
  });

  /** Every other mode's home must be a real path this can round-trip. */
  it('round-trips every mode through its own home path', () => {
    for (const mode of MODES) {
      if (mode.home === '/') continue;
      expect(modeFromPath(mode.home)).toBe(mode.id);
    }
  });

  it('falls back to the first mode for an unknown id', () => {
    expect(getMode('nope' as never)).toBe(MODES[0]);
  });
});
