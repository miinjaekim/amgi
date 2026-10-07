import { describe, it, expect } from 'vitest';
import {
  acceptedAnswers,
  foldText,
  gradeTypedAnswer,
  promptsForTyping,
  sameFoldedText,
} from '@amgi/core';
import type { TypedAnswerCard } from '@amgi/core';

const korean: TypedAnswerCard = { studyLanguage: 'Korean', korean: '어색하다', english: 'awkward' };
const french: TypedAnswerCard = { studyLanguage: 'French', french: 'délai', english: 'deadline', gender: 'le' };
const japanese: TypedAnswerCard = { studyLanguage: 'Japanese', japanese: '漢字', english: 'kanji' };

describe('foldText', () => {
  it('folds the typographic marks a phone keyboard substitutes', () => {
    expect(foldText('d’accord')).toBe(foldText("d'accord"));
    expect(foldText('long—dash')).toBe(foldText('long-dash'));
    expect(foldText('“quoted”')).toBe(foldText('"quoted"'));
  });

  it('leaves diacritics alone, because they distinguish words', () => {
    // Kikuyu's ĩ/ũ and French ou/où are the whole point of the letter.
    expect(foldText('où')).not.toBe(foldText('ou'));
    expect(foldText('mũtĩ')).not.toBe(foldText('muti'));
  });

  it('does not strip punctuation, so an elision is not an accent-free word', () => {
    expect(foldText("d'")).not.toBe(foldText('d'));
  });
});

describe('sameFoldedText', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(sameFoldedText('  Délai ', 'délai')).toBe(true);
  });

  it('ignores spacing, which varies legitimately in Korean', () => {
    expect(sameFoldedText('할 수 있다', '할수있다')).toBe(true);
  });

  it('does not equate different words', () => {
    expect(sameFoldedText('가다', '오다')).toBe(false);
  });
});

describe('acceptedAnswers', () => {
  it('is the study side alone when the card declares no gender', () => {
    expect(acceptedAnswers(korean)).toEqual(['어색하다']);
  });

  it('also accepts the word behind the article the card itself names', () => {
    expect(acceptedAnswers(french)).toEqual(['délai', 'le délai']);
  });

  it('is empty when the card has no study side to ask for', () => {
    expect(acceptedAnswers({ studyLanguage: 'Korean' })).toEqual([]);
  });
});

describe('gradeTypedAnswer, the word', () => {
  const word = (typed: string, card: TypedAnswerCard) =>
    gradeTypedAnswer(typed, card, 'backToFront', 'English');

  it('accepts an exact answer and earns easy, which the caller applies', () => {
    expect(word('어색하다', korean)).toEqual({
      outcome: 'exact',
      correct: true,
      suggested: 'easy',
      expected: '어색하다',
    });
  });

  it('accepts the article a learner learned the noun with', () => {
    expect(word('le délai', french).outcome).toBe('exact');
  });

  it('rejects a wrong answer and returns what to show beside it', () => {
    expect(word('오다', korean)).toEqual({
      outcome: 'miss',
      correct: false,
      suggested: 'again',
      expected: '어색하다',
    });
  });

  it('does not accept a reading in place of the script the card teaches', () => {
    expect(word('かんじ', japanese).correct).toBe(false);
  });

  it('never grades an empty answer correct', () => {
    expect(word('   ', korean).correct).toBe(false);
    expect(word('', { studyLanguage: 'Korean' }).correct).toBe(false);
  });

  it('has no near tier: the leniency rules belong to meanings', () => {
    const card: TypedAnswerCard = { studyLanguage: 'French', french: 'the', english: 'tea' };
    expect(word('a the', card).outcome).toBe('miss');
  });
});

describe('gradeTypedAnswer, the meaning', () => {
  const meaning = (typed: string, card: TypedAnswerCard, native = 'English') =>
    gradeTypedAnswer(typed, card, 'frontToBack', native);

  const mood: TypedAnswerCard = { studyLanguage: 'Korean', korean: '분위기', english: 'atmosphere, mood' };
  const lost: TypedAnswerCard = { studyLanguage: 'Korean', korean: '헤매다', english: 'to get lost; to be undecided' };
  const run: TypedAnswerCard = { studyLanguage: 'Korean', korean: '달리다', english: 'to run' };
  // A Korean native studying Japanese sees the Korean back; the card has both.
  const both: TypedAnswerCard = { studyLanguage: 'Japanese', japanese: '雰囲気', english: 'atmosphere', korean: '분위기' };

  it('is exact on the back as stored, under the folding a typed word gets', () => {
    expect(meaning('  Atmosphere,  mood ', mood)).toEqual({
      outcome: 'exact',
      correct: true,
      suggested: 'easy',
      expected: 'atmosphere, mood',
    });
    expect(meaning('to run', run).outcome).toBe('exact');
  });

  it('is near, on good, for either gloss when the back holds two', () => {
    expect(meaning('mood', mood)).toEqual({
      outcome: 'near',
      correct: true,
      suggested: 'good',
      expected: 'atmosphere, mood',
    });
    expect(meaning('atmosphere', mood).outcome).toBe('near');
    expect(meaning('to be undecided', lost).outcome).toBe('near');
  });

  it('is near for both glosses in the other order or around the other mark', () => {
    expect(meaning('mood, atmosphere', mood).outcome).toBe('near');
    expect(meaning('atmosphere; mood', mood).outcome).toBe('near');
  });

  it('is near when only a leading to, a, an or the differs', () => {
    expect(meaning('run', run).outcome).toBe('near');
    expect(meaning('to awkward', korean).outcome).toBe('near');
    expect(meaning('the mood', mood).outcome).toBe('near');
    expect(meaning('an atmosphere', mood).outcome).toBe('near');
    expect(meaning('get lost', lost).outcome).toBe('near');
  });

  it('strips a particle only from the front, and only a whole word', () => {
    expect(meaning('get to lost', lost).outcome).toBe('miss');
    expect(meaning('theme', { studyLanguage: 'Korean', korean: '나', english: 'me' }).outcome).toBe('miss');
    // "to" alone is an answer, not a particle with nothing behind it.
    expect(meaning('to', { studyLanguage: 'Korean', korean: '에', english: 'to' }).outcome).toBe('exact');
  });

  it('is exact on the back the learner is shown, near on the other one', () => {
    expect(meaning('분위기', both, 'Korean')).toMatchObject({ outcome: 'exact', expected: '분위기' });
    expect(meaning('atmosphere', both, 'Korean')).toMatchObject({ outcome: 'near', expected: '분위기' });
    expect(meaning('atmosphere', both, 'English').outcome).toBe('exact');
    expect(meaning('분위기', both, 'English').outcome).toBe('near');
  });

  it('never accepts the study word as its own meaning', () => {
    // On a Korean deck `korean` is the front, not a second back.
    expect(meaning('분위기', mood).outcome).toBe('miss');
  });

  it('is a miss for anything else, with the back to show beside it', () => {
    expect(meaning('weather', mood)).toEqual({
      outcome: 'miss',
      correct: false,
      suggested: 'again',
      expected: 'atmosphere, mood',
    });
    // One right gloss does not carry a wrong one.
    expect(meaning('mood, weather', mood).outcome).toBe('miss');
    expect(meaning('atmo', mood).outcome).toBe('miss');
  });

  it('never grades an empty answer correct', () => {
    expect(meaning('  ', mood).correct).toBe(false);
    expect(meaning(',', mood).correct).toBe(false);
    expect(meaning('x', { studyLanguage: 'Korean', korean: '분위기' }).correct).toBe(false);
  });
});

describe('promptsForTyping', () => {
  it('follows the toggle, whichever direction the card is asked in', () => {
    expect(promptsForTyping(true)).toBe(true);
    expect(promptsForTyping(true, 'Japanese')).toBe(true);
    expect(promptsForTyping(false, 'Japanese')).toBe(false);
  });
});
