import { describe, it, expect } from 'vitest';
import {
  HIRAGANA_PACK,
  buildPackCardDraft,
  collectSavedTerms,
  countSavedPackTerms,
  getVocabPack,
  getVocabPacks,
  SUPPORTED_STUDY_LANGUAGES,
} from '@amgi/core';
import type { CardSides } from '@amgi/core';

describe('getVocabPack', () => {
  it('finds a pack by id within the study language', () => {
    expect(getVocabPack('Japanese', 'kana-hiragana')?.id).toBe('kana-hiragana');
    expect(getVocabPack('English', 'toeic-core')?.id).toBe('toeic-core');
  });

  // The deck route reads its id from the URL, so a stale bookmark or a study
  // language switched mid-browse must resolve to nothing rather than to another
  // language's pack.
  it('does not reach across study languages', () => {
    expect(getVocabPack('English', 'kana-hiragana')).toBeUndefined();
    expect(getVocabPack('Korean', 'toeic-core')).toBeUndefined();
    expect(getVocabPack('Japanese', 'nonsense')).toBeUndefined();
  });
});

describe('collectSavedTerms', () => {
  it('lowercases both the study side and the original term', () => {
    const cards: CardSides[] = [
      { studyLanguage: 'Japanese', japanese: 'あ', term: 'あ' },
      { studyLanguage: 'English', english: 'Comply', term: 'comply' },
    ];
    const terms = collectSavedTerms(cards);
    expect(terms.has('あ')).toBe(true);
    expect(terms.has('comply')).toBe(true);
  });

  // Progress deliberately matches on text, not packId — a word looked up on
  // your own counts, and every card saved before packId existed carries none.
  it('credits a card that never came from a pack', () => {
    const looked: CardSides[] = [{ studyLanguage: 'English', english: 'comply' }];
    const saved = collectSavedTerms(looked);
    expect(countSavedPackTerms(getVocabPacks('English')[0], saved)).toBe(1);
  });

  it('reads the study side per card, not per collection', () => {
    const mixed: CardSides[] = [
      { studyLanguage: 'Japanese', japanese: 'か' },
      { studyLanguage: 'Korean', korean: '갈등' },
    ];
    const terms = collectSavedTerms(mixed);
    expect(terms.has('か')).toBe(true);
    expect(terms.has('갈등')).toBe(true);
  });
});

describe('buildPackCardDraft', () => {
  it('stamps the pack it came from', () => {
    const draft = buildPackCardDraft(HIRAGANA_PACK.cards[0], 'hiragana', 'uid-1', 'Japanese');
    expect(draft.packId).toBe('hiragana');
    expect(draft.uid).toBe('uid-1');
    expect(draft.termLanguage).toBe('Japanese');
  });

  it('fills the study and back sides for the language', () => {
    const draft = buildPackCardDraft({ study: 'あ', back: 'a' }, 'kana-hiragana', 'uid-1', 'Japanese');
    expect(draft.japanese).toBe('あ');
    expect(draft.english).toBe('a');
  });

  // `english` is required on every card. Every current config puts english on
  // one side or the other, so the fallback in buildPackCardDraft is dead today
  // — this asserts the requirement it exists to guarantee, which is what would
  // actually break if a language were added with neither side English.
  it('always populates english, whichever side it lands on', () => {
    for (const { code: lang } of SUPPORTED_STUDY_LANGUAGES) {
      const draft = buildPackCardDraft({ study: 'x', back: 'y' }, 'p', 'uid-1', lang);
      expect(draft.english, `${lang} left english empty`).toBeTruthy();
    }
  });

  it('puts the back on the native side when studying English', () => {
    const draft = buildPackCardDraft({ study: 'comply', back: '따르다' }, 'toeic-core', 'uid-1', 'English');
    expect(draft.english).toBe('comply');
    expect(draft.korean).toBe('따르다');
  });
});
