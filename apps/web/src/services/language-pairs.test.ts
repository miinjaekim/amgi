import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_STUDY_LANGUAGES,
  addLanguagePair,
  availableStudyLanguages,
  getBackSideConfig,
  getStudyLanguageConfig,
  nativeForStudy,
  nativeOptionsFor,
  parseLanguagePairs,
  removeLanguagePair,
  seedLanguagePairs,
} from '@amgi/core';
import type { StudyLanguagePair } from '@amgi/core';

/**
 * These replace `resolve-study-language.test.ts`, which pinned the two
 * collision resolvers deleted alongside it. The invariant those functions
 * repaired after the fact is now asserted at the point of choosing instead —
 * see the first block below, which is the direct descendant of that file.
 */
describe('nativeOptionsFor', () => {
  // The whole reason the resolvers could go. A pair that cannot be built does
  // not need moving off a collision later.
  it('never offers the study language as its own explanation language', () => {
    for (const { code } of SUPPORTED_STUDY_LANGUAGES) {
      expect(nativeOptionsFor(code).map(option => option.code), code).not.toContain(code);
    }
  });

  it('still leaves something to choose on every deck', () => {
    for (const { code } of SUPPORTED_STUDY_LANGUAGES) {
      expect(nativeOptionsFor(code).length, code).toBeGreaterThan(0);
    }
  });

  /**
   * The end-to-end version of the same claim: a pair built through the options
   * this offers can never put the back on the field the front already occupies.
   * `getBackSideConfig` has its own escape hatch for that case, and this asserts
   * the hatch is unreachable rather than merely present.
   */
  it('produces pairs whose back never lands on the front', () => {
    for (const { code } of SUPPORTED_STUDY_LANGUAGES) {
      for (const { code: native } of nativeOptionsFor(code)) {
        const { studyField } = getStudyLanguageConfig(code);
        const { backField } = getBackSideConfig(code, native);
        expect(backField, `${code}/${native}`).not.toBe(studyField);
      }
    }
  });
});

describe('nativeForStudy', () => {
  const pairs: StudyLanguagePair[] = [
    { study: 'Japanese', native: 'Korean' },
    { study: 'Spanish', native: 'English' },
  ];

  it('gives each deck its own explanation language', () => {
    expect(nativeForStudy(pairs, 'Japanese')).toBe('Korean');
    expect(nativeForStudy(pairs, 'Spanish')).toBe('English');
  });

  // A deck removed on another device while this one was sitting on it. English
  // is what `getBackSideConfig` reads a missing value as, so the back slot and
  // the explanation agree rather than drifting apart.
  it('falls back to English on a deck that is not in the list', () => {
    expect(nativeForStudy(pairs, 'Korean')).toBe('English');
    expect(nativeForStudy([], 'Japanese')).toBe('English');
  });
});

describe('addLanguagePair', () => {
  it('adds a language that is not there yet', () => {
    const pairs = addLanguagePair([], { study: 'Japanese', native: 'Korean' });
    expect(pairs).toEqual([{ study: 'Japanese', native: 'Korean' }]);
  });

  // Cards shard one collection per study language, so two entries for Japanese
  // would point at the same cards through different back slots.
  it('replaces rather than appends for a language already added', () => {
    const pairs = addLanguagePair(
      [{ study: 'Japanese', native: 'Korean' }, { study: 'Spanish', native: 'English' }],
      { study: 'Japanese', native: 'English' },
    );
    expect(pairs.filter(pair => pair.study === 'Japanese')).toHaveLength(1);
    expect(nativeForStudy(pairs, 'Japanese')).toBe('English');
    expect(nativeForStudy(pairs, 'Spanish')).toBe('English');
  });
});

describe('removeLanguagePair', () => {
  it('drops only the language named', () => {
    const pairs = removeLanguagePair(
      [{ study: 'Japanese', native: 'Korean' }, { study: 'Spanish', native: 'English' }],
      'Japanese',
    );
    expect(pairs).toEqual([{ study: 'Spanish', native: 'English' }]);
  });
});

describe('availableStudyLanguages', () => {
  it('offers only what has not been added', () => {
    const available = availableStudyLanguages([{ study: 'Japanese', native: 'Korean' }]);
    expect(available.map(lang => lang.code)).not.toContain('Japanese');
    expect(available).toHaveLength(SUPPORTED_STUDY_LANGUAGES.length - 1);
  });

  it('is empty once every language is added', () => {
    const all = SUPPORTED_STUDY_LANGUAGES.map(
      lang => ({ study: lang.code, native: 'English' }),
    );
    expect(availableStudyLanguages(all)).toHaveLength(0);
  });
});

describe('parseLanguagePairs', () => {
  it('reads back what was written', () => {
    const stored = [{ study: 'Japanese', native: 'Korean' }];
    expect(parseLanguagePairs(stored)).toEqual(stored);
  });

  // One unrecognisable row must not cost the user every other deck.
  it('drops junk without dropping its neighbours', () => {
    const parsed = parseLanguagePairs([
      { study: 'Japanese', native: 'Korean' },
      { study: 'Klingon', native: 'English' },
      { study: 'Spanish', native: 'Klingon' },
      null,
      'Spanish',
      { study: 'Spanish' },
      { study: 'Spanish', native: 'English' },
    ]);
    expect(parsed).toEqual([
      { study: 'Japanese', native: 'Korean' },
      { study: 'Spanish', native: 'English' },
    ]);
  });

  it('keeps the first of a duplicated study language', () => {
    expect(parseLanguagePairs([
      { study: 'Japanese', native: 'Korean' },
      { study: 'Japanese', native: 'English' },
    ])).toEqual([{ study: 'Japanese', native: 'Korean' }]);
  });

  it('reads a missing or malformed field as no languages at all', () => {
    expect(parseLanguagePairs(undefined)).toEqual([]);
    expect(parseLanguagePairs(null)).toEqual([]);
    expect(parseLanguagePairs('Japanese')).toEqual([]);
  });
});

describe('seedLanguagePairs', () => {
  /**
   * The migration's whole point. The switcher shows only added languages, so an
   * account seeded from `studyLanguage` alone would hide every other deck it
   * has cards in behind an Add flow the user has no reason to look for.
   */
  it('seeds every deck the account has cards in', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'Korean', studyLanguage: 'Japanese' },
      ['Japanese', 'Spanish', 'Hanja'],
    );
    expect(pairs.map(pair => pair.study).sort())
      .toEqual(['Hanja', 'Japanese', 'Spanish']);
  });

  // It is the language those decks have in fact been explained in until now.
  it('gives every seeded deck the old global native language', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'Korean', studyLanguage: 'Japanese' },
      ['Japanese', 'Spanish'],
    );
    expect(pairs.every(pair => pair.native === 'Korean')).toBe(true);
  });

  // Someone who just switched to a deck and has not saved anything into it yet.
  it('includes the current study language even with no cards in it', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'English', studyLanguage: 'Swedish' },
      ['Korean'],
    );
    expect(pairs.map(pair => pair.study).sort()).toEqual(['Korean', 'Swedish']);
  });

  it('does not list a language twice when it is both current and has cards', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'English', studyLanguage: 'Korean' },
      ['Korean'],
    );
    expect(pairs).toEqual([{ study: 'Korean', native: 'English' }]);
  });

  it('never leaves the switcher empty', () => {
    expect(seedLanguagePairs({ nativeLanguage: 'English' }, [])).toHaveLength(1);
  });

  // A native language the registry does not recognise reads as English, which
  // is the same default every other read of this value takes.
  it('falls back to English on an unrecognised native language', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'Klingon', studyLanguage: 'Japanese' },
      [],
    );
    expect(pairs).toEqual([{ study: 'Japanese', native: 'English' }]);
  });

  it('produces pairs that parse back unchanged', () => {
    const pairs = seedLanguagePairs(
      { nativeLanguage: 'Korean', studyLanguage: 'Japanese' },
      ['Japanese', 'Spanish'],
    );
    expect(parseLanguagePairs(pairs)).toEqual(pairs);
  });
});
