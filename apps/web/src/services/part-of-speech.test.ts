import { describe, it, expect } from 'vitest';
import {
  PART_OF_SPEECH_CODES,
  SUPPORTED_NATIVE_LANGUAGES,
  VERB_GROUP_CODES,
  normalizePartOfSpeech,
  normalizeVerbGroup,
  partOfSpeechLabel,
  wordOfTheDayCore,
} from '@amgi/core';
import type { PartOfSpeech, VerbGroup, WordOfTheDay } from '@amgi/core';

describe('normalizePartOfSpeech', () => {
  it('accepts every code it publishes', () => {
    for (const code of PART_OF_SPEECH_CODES) {
      expect(normalizePartOfSpeech(code)).toBe(code);
    }
  });

  it('tolerates the shapes a model reaches for around a closed list', () => {
    expect(normalizePartOfSpeech('Noun')).toBe('noun');
    expect(normalizePartOfSpeech('  VERB ')).toBe('verb');
    expect(normalizePartOfSpeech('noun (countable)')).toBe('noun');
    expect(normalizePartOfSpeech('adjective/adverb')).toBe('adjective');
  });

  // A code this build doesn't know renders no badge anywhere, so it is dropped
  // at the boundary rather than stored and silently invisible forever after.
  it('drops anything that is not a code', () => {
    expect(normalizePartOfSpeech('gerund')).toBeUndefined();
    expect(normalizePartOfSpeech('명사')).toBeUndefined();
    expect(normalizePartOfSpeech('')).toBeUndefined();
    expect(normalizePartOfSpeech(null)).toBeUndefined();
    expect(normalizePartOfSpeech(7)).toBeUndefined();
  });
});

describe('partOfSpeechLabel', () => {
  // The point of storing a code: the same card reads 명사 or Noun depending on
  // who is looking, with nothing per-reader written to Firestore.
  it('labels one stored code in each supported native language', () => {
    const card = { partOfSpeech: 'noun' as PartOfSpeech };
    expect(partOfSpeechLabel('English', card)).toBe('Noun');
    expect(partOfSpeechLabel('Korean', card)).toBe('명사');
  });

  it('has a label in every native language for every code', () => {
    for (const { code } of SUPPORTED_NATIVE_LANGUAGES) {
      for (const pos of PART_OF_SPEECH_CODES) {
        const label = partOfSpeechLabel(code, { partOfSpeech: pos });
        expect(label, `${pos} in ${code}`).toBeTruthy();
      }
    }
  });

  // Korean labels must not fall through to the English ones — a missing key
  // would still return a string, just the wrong-language one.
  it('never shows an English label to a Korean reader', () => {
    for (const pos of PART_OF_SPEECH_CODES) {
      expect(partOfSpeechLabel('Korean', { partOfSpeech: pos })).not.toMatch(/[a-z]/i);
    }
  });

  it('renders nothing for a card without one, or with an unknown code', () => {
    expect(partOfSpeechLabel('English', {})).toBeUndefined();
    expect(
      partOfSpeechLabel('English', { partOfSpeech: 'gerund' as PartOfSpeech })
    ).toBeUndefined();
  });
});

describe('wordOfTheDayCore', () => {
  it('carries the part of speech onto the card a tapped word saves', () => {
    const wotd: WordOfTheDay = {
      term: '눈치',
      english: 'social awareness',
      partOfSpeech: 'noun',
    };
    expect(wordOfTheDayCore(wotd, 'Korean', 'English').partOfSpeech).toBe('noun');
  });

  // Firestore rejects explicit undefined, and this object is written to it.
  it('drops the field entirely when the word of the day has none', () => {
    const wotd: WordOfTheDay = { term: '눈치', english: 'social awareness' };
    expect('partOfSpeech' in wordOfTheDayCore(wotd, 'Korean', 'English')).toBe(false);
  });
});

describe('normalizeVerbGroup', () => {
  it('takes the four classes the model is asked for, checked against the ending', () => {
    expect(normalizeVerbGroup('er', 'appeler')).toBe('er');
    expect(normalizeVerbGroup('ir', 'bâtir')).toBe('ir');
    expect(normalizeVerbGroup('re', 'perdre')).toBe('re');
    expect(normalizeVerbGroup('irregular', 'partir')).toBe('irregular');
  });

  it('tolerates the shapes a model reaches for', () => {
    expect(normalizeVerbGroup('-er', 'appeler')).toBe('er');
    expect(normalizeVerbGroup(' IR ', 'bâtir')).toBe('ir');
    expect(normalizeVerbGroup('Irregular verb', 'prendre')).toBe('irregular');
  });

  // Munli practises these as their own groups, so a card calling manger an
  // -er verb would disagree with the Verbs surface about the same word.
  it('splits -cer and -ger out by spelling, whatever the model said', () => {
    expect(normalizeVerbGroup('er', 'effacer')).toBe('cer');
    expect(normalizeVerbGroup('er', 'nager')).toBe('ger');
    expect(normalizeVerbGroup('ger', 'nager')).toBe('ger');
  });

  it('gives Munli\'s answer for a verb Munli carries, even over the model', () => {
    expect(normalizeVerbGroup('er', 'aller')).toBe('irregular');
    expect(normalizeVerbGroup('irregular', 'finir')).toBe('ir');
    expect(normalizeVerbGroup(null, 'être')).toBe('irregular');
    expect(normalizeVerbGroup(undefined, 'manger')).toBe('ger');
  });

  it('judges a pronominal verb by its bare infinitive', () => {
    expect(normalizeVerbGroup('er', 'se lever')).toBe('er');
    expect(normalizeVerbGroup('er', "s'appeler")).toBe('er');
    expect(normalizeVerbGroup('er', 's’engager')).toBe('ger');
  });

  // No tag is better than a wrong one.
  it('drops a regular group that contradicts the ending, and anything unknown', () => {
    expect(normalizeVerbGroup('ir', 'perdre')).toBeUndefined();
    expect(normalizeVerbGroup('er', 'partir')).toBeUndefined();
    expect(normalizeVerbGroup('third group', 'prendre')).toBeUndefined();
    expect(normalizeVerbGroup(null, 'appeler')).toBeUndefined();
  });
});

describe('partOfSpeechLabel on a French verb', () => {
  it('names the group in place of "Verb", in the reader\'s language', () => {
    const card = { partOfSpeech: 'verb' as PartOfSpeech, verbGroup: 'ir' as VerbGroup };
    expect(partOfSpeechLabel('English', card)).toBe('-ir verb');
    expect(partOfSpeechLabel('Korean', card)).toBe('-ir 동사');
    expect(partOfSpeechLabel('Korean', { ...card, verbGroup: 'irregular' as VerbGroup })).toBe('불규칙 동사');
  });

  it('has a label for every group it can store', () => {
    for (const verbGroup of VERB_GROUP_CODES) {
      const label = partOfSpeechLabel('English', { partOfSpeech: 'verb', verbGroup });
      expect(label).toMatch(/verb$/);
      expect(label).not.toBe('Verb');
    }
  });

  it('is plain "Verb" without a group, and ignores a group on anything else', () => {
    expect(partOfSpeechLabel('English', { partOfSpeech: 'verb' })).toBe('Verb');
    expect(partOfSpeechLabel('English', { partOfSpeech: 'noun', verbGroup: 'er' })).toBe('Noun');
  });
});
