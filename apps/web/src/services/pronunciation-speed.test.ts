import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRONUNCIATION_SPEED,
  PRONUNCIATION_SPEEDS,
  parsePronunciationSpeed,
  pronunciationRate,
  resolvePronunciationSpeeds,
} from '@amgi/core';

describe('parsePronunciationSpeed', () => {
  it('reads back every speed it can store', () => {
    for (const { value } of PRONUNCIATION_SPEEDS) {
      expect(parsePronunciationSpeed(value)).toBe(value);
    }
  });

  // The preference is device-local, so the stored value is whatever happens to
  // be in localStorage/AsyncStorage — absent on a first run, and stale or
  // hand-edited after that. None of those may play audio at a surprise speed.
  it('falls back to the default on anything unrecognized', () => {
    for (const raw of [null, undefined, '', 'sluggish', '0.7', 'Slow']) {
      expect(parsePronunciationSpeed(raw)).toBe(DEFAULT_PRONUNCIATION_SPEED);
    }
  });
});

describe('pronunciationRate', () => {
  // 'normal' is a multiplier on a clip already synthesized at 0.85, so it must
  // be exactly 1 — anything else silently re-paces every existing user.
  it('leaves the stored clip alone at the default speed', () => {
    expect(DEFAULT_PRONUNCIATION_SPEED).toBe('normal');
    expect(pronunciationRate('normal')).toBe(1);
  });

  it('orders slow below normal below fast', () => {
    expect(pronunciationRate('slow')).toBeLessThan(pronunciationRate('normal'));
    expect(pronunciationRate('normal')).toBeLessThan(pronunciationRate('fast'));
  });

  // Both players reject or clamp a non-positive rate, and Safari caps the top
  // end; keeping the offered set well inside the sane range is the guard.
  it('keeps every offered rate in a range both players accept', () => {
    for (const { rate } of PRONUNCIATION_SPEEDS) {
      expect(rate).toBeGreaterThan(0.5);
      expect(rate).toBeLessThanOrEqual(2);
    }
  });
});

describe('resolvePronunciationSpeeds', () => {
  it('reads each kind from its own key', () => {
    expect(resolvePronunciationSpeeds('fast', 'slow')).toEqual({ term: 'fast', sentence: 'slow' });
  });

  // Everyone who set a speed before the split set it for every button, so
  // their example sentences must not jump back to normal on update.
  it('gives an unset sentence speed the old single speed, not the default', () => {
    expect(resolvePronunciationSpeeds('slow', null)).toEqual({ term: 'slow', sentence: 'slow' });
    expect(resolvePronunciationSpeeds('slow', undefined)).toEqual({ term: 'slow', sentence: 'slow' });
  });

  it('falls back to the default for anything unset or unrecognized', () => {
    expect(resolvePronunciationSpeeds(null, null)).toEqual({
      term: DEFAULT_PRONUNCIATION_SPEED, sentence: DEFAULT_PRONUNCIATION_SPEED,
    });
    expect(resolvePronunciationSpeeds('turbo', 'slow')).toEqual({ term: DEFAULT_PRONUNCIATION_SPEED, sentence: 'slow' });
    expect(resolvePronunciationSpeeds('fast', 'turbo').sentence).toBe(DEFAULT_PRONUNCIATION_SPEED);
  });
});
