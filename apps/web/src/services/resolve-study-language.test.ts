import { describe, it, expect } from 'vitest';
import { resolveStudyLanguage } from '@amgi/core';

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

  it('falls back to any other study language when there is no usable previous native', () => {
    for (const previous of [null, undefined, 'Korean']) {
      const result = resolveStudyLanguage('Korean', 'Korean', previous);
      expect(result).not.toBe('Korean');
    }
  });
});
