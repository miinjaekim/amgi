import { describe, it, expect } from 'vitest';
import { resolveNativeLanguage, resolveStudyLanguage } from '@amgi/core';

describe('resolveStudyLanguage', () => {
  it('leaves the study language alone when there is no collision', () => {
    expect(resolveStudyLanguage('Korean', 'Swedish', 'English')).toBe('Swedish');
    expect(resolveStudyLanguage('English', 'Japanese', 'Korean')).toBe('Japanese');
  });

  it('swaps to the previous native language on a collision', () => {
    // The demo case: an English speaker studying Korean switches native to
    // Korean, and should end up studying English rather than their own language.
    expect(resolveStudyLanguage('Korean', 'Korean', 'English')).toBe('English');
    expect(resolveStudyLanguage('English', 'English', 'Korean')).toBe('Korean');
  });

  it('falls back to another study language when the previous native is unusable', () => {
    // Previous native === new native: nothing to swap to, so pick anything else.
    expect(resolveStudyLanguage('Korean', 'Korean', 'Korean')).not.toBe('Korean');
  });

  it('does not fire during first-time setup', () => {
    // The setup modal sets native then study, and already excludes the native
    // from the study options — stepping in here would fight the choice and
    // write a throwaway study language before the real one lands.
    expect(resolveStudyLanguage('Korean', 'Korean', null)).toBe('Korean');
    expect(resolveStudyLanguage('Korean', 'Korean', undefined)).toBe('Korean');
  });
});

describe('resolveNativeLanguage', () => {
  it('leaves the native language alone when there is no collision', () => {
    expect(resolveNativeLanguage('Korean', 'English', 'Swedish')).toBe('English');
    expect(resolveNativeLanguage('Japanese', 'Korean', 'English')).toBe('Korean');
  });

  it('swaps to the previous study language on a collision', () => {
    // A native English speaker who switches to studying English is telling us
    // they are not a native English speaker — they are the Korean learner.
    expect(resolveNativeLanguage('English', 'English', 'Korean')).toBe('Korean');
    expect(resolveNativeLanguage('Korean', 'Korean', 'English')).toBe('English');
  });

  it('falls back to another native when the previous study language is not one', () => {
    // Swedish/French/Japanese are study-only, so they cannot become the native
    // language — the only remaining native is the one that is not being studied.
    for (const previous of ['Swedish', 'French', 'Japanese'] as const) {
      expect(resolveNativeLanguage('English', 'English', previous)).toBe('Korean');
    }
  });

  it('does not fire before the native language has been chosen', () => {
    // First run: the setup modal owns this, and null is not a collision.
    expect(resolveNativeLanguage('Korean', null, 'English')).toBeNull();
    expect(resolveNativeLanguage('Korean', undefined, 'English')).toBeUndefined();
  });

  it('round-trips with resolveStudyLanguage without oscillating', () => {
    // Switching study to English moves native to Korean; the resulting pair
    // must then be stable rather than bouncing the study language back.
    const native = resolveNativeLanguage('English', 'English', 'Korean');
    expect(native).toBe('Korean');
    expect(resolveStudyLanguage(native!, 'English', 'English')).toBe('English');
  });
});
