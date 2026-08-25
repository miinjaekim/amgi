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

describe('gradeTypedAnswer', () => {
  it('accepts an exact answer and earns easy, which the caller applies', () => {
    expect(gradeTypedAnswer('어색하다', korean)).toEqual({
      correct: true,
      suggested: 'easy',
      expected: '어색하다',
    });
  });

  it('accepts the article a learner learned the noun with', () => {
    expect(gradeTypedAnswer('le délai', french).correct).toBe(true);
  });

  it('rejects a wrong answer and returns what to show beside it', () => {
    expect(gradeTypedAnswer('오다', korean)).toEqual({
      correct: false,
      suggested: 'again',
      expected: '어색하다',
    });
  });

  it('does not accept a reading in place of the script the card teaches', () => {
    expect(gradeTypedAnswer('かんじ', japanese).correct).toBe(false);
  });

  it('never grades an empty answer correct', () => {
    expect(gradeTypedAnswer('   ', korean).correct).toBe(false);
    expect(gradeTypedAnswer('', { studyLanguage: 'Korean' }).correct).toBe(false);
  });
});

describe('promptsForTyping', () => {
  it('types only the direction that produces the study word', () => {
    expect(promptsForTyping(true, 'backToFront')).toBe(true);
    expect(promptsForTyping(true, 'frontToBack')).toBe(false);
  });

  it('is off for both directions when typing is off', () => {
    expect(promptsForTyping(false, 'backToFront')).toBe(false);
  });
});
