import { describe, it, expect } from 'vitest';
import { wordOfTheDayCore, type WordOfTheDay } from '@amgi/core';

describe('wordOfTheDayCore', () => {
  it('prefers the stored explanation when the document has one', () => {
    const stored = { term: '눈치', termLanguage: 'Korean' as const, korean: '눈치', english: 'social awareness' };
    const wotd: WordOfTheDay = { term: '눈치', english: 'tact', core: stored };
    expect(wordOfTheDayCore(wotd, 'Korean')).toBe(stored);
  });

  it('reconstructs a core for documents written before core was stored', () => {
    const wotd: WordOfTheDay = {
      term: '눈치',
      english: 'social awareness',
      briefDefinition: 'Reading the room.',
      formality: 'Standard',
    };
    expect(wordOfTheDayCore(wotd, 'Korean')).toEqual({
      term: '눈치',
      termLanguage: 'Korean',
      korean: '눈치',
      english: 'social awareness',
      briefDefinition: 'Reading the room.',
      formality: 'Standard',
    });
  });

  it('puts the term on the study-language side for each language', () => {
    expect(wordOfTheDayCore({ term: 'lagom', english: 'just right' }, 'Swedish')).toMatchObject({
      swedish: 'lagom', english: 'just right', termLanguage: 'Swedish',
    });
    expect(wordOfTheDayCore({ term: 'flâner', english: 'to stroll' }, 'French')).toMatchObject({
      french: 'flâner', english: 'to stroll',
    });
    expect(wordOfTheDayCore({ term: '木漏れ日', english: 'sunlight through leaves' }, 'Japanese')).toMatchObject({
      japanese: '木漏れ日', english: 'sunlight through leaves',
    });
    expect(
      wordOfTheDayCore({ term: '緣分', english: 'fated connection', pinyin: 'yuánfèn' }, 'TraditionalChinese')
    ).toMatchObject({
      traditionalChinese: '緣分', english: 'fated connection', pinyin: 'yuánfèn',
    });
  });

  it('uses the Korean side as the back for English study', () => {
    // English study is for native-Korean learners, so the card back is Korean
    // and the term itself is the English side.
    expect(wordOfTheDayCore({ term: 'tact', english: 'tact', korean: '눈치' }, 'English')).toMatchObject({
      english: 'tact', korean: '눈치', termLanguage: 'English',
    });
  });

  it('omits optional fields that the word of the day did not carry', () => {
    const core = wordOfTheDayCore({ term: 'lagom', english: 'just right' }, 'Swedish');
    expect(core).not.toHaveProperty('gender');
    expect(core).not.toHaveProperty('briefDefinition');
  });
});
