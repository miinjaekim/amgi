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

  // Both authored backs are stored, not just the one the saver happened to be
  // reading — this is what lets `getBackSide` switch with native language on a
  // card that is already saved.
  it('fills the study side and both backs', () => {
    const draft = buildPackCardDraft(
      { study: 'あ', back: { English: 'a', Korean: '아' } },
      'kana-hiragana', 'uid-1', 'Japanese',
    );
    expect(draft.japanese).toBe('あ');
    expect(draft.english).toBe('a');
    expect(draft.korean).toBe('아');
  });

  // `english` is required on every card, and is also the fallback `getBackSide`
  // reaches for on documents written before backs were native-aware.
  it('always populates english, whichever side it lands on', () => {
    for (const { code: lang } of SUPPORTED_STUDY_LANGUAGES) {
      const draft = buildPackCardDraft(
        { study: 'x', back: { English: 'y', Korean: 'ㅇ' } }, 'p', 'uid-1', lang,
      );
      expect(draft.english, `${lang} left english empty`).toBeTruthy();
    }
  });

  // The study side is one of the two back slots on an English or Korean deck,
  // so it has to be written last — a back overwriting the front would leave the
  // card unmatched against the deck it came from.
  it('never lets a back overwrite the study side', () => {
    const draft = buildPackCardDraft(
      { study: 'comply', back: { English: 'to obey a rule', Korean: '따르다' } },
      'toeic-core', 'uid-1', 'English',
    );
    expect(draft.english).toBe('comply');
    expect(draft.korean).toBe('따르다');

    const ko = buildPackCardDraft(
      { study: '갈등', back: { English: 'conflict', Korean: '충돌' } }, 'p', 'uid-1', 'Korean',
    );
    expect(ko.korean).toBe('갈등');
    expect(ko.english).toBe('conflict');
  });
});
