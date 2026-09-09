import { describe, it, expect } from 'vitest';
import { buildLookupCardDraft, type TermCore } from '@amgi/core';

/** What `/api/explain` returns for 물 on the Hanja deck — all three parts. */
const su: TermCore = {
  term: '물', termLanguage: 'Korean', hanja: '水', hun: '물', eum: '수', english: 'water',
};

describe('buildLookupCardDraft on Hanja', () => {
  /**
   * The bug: typing the 훈 filed a card with the 훈 and the character, and the
   * 음 nowhere. The back-language shortcut — "if you typed the back-language
   * term, the back *is* what you typed" — is right everywhere else and wrong
   * here, because a hanja's Korean back is 훈 *and* 음 and 물 is only half of
   * it.
   */
  it('keeps all three parts when the 훈 is what was typed', () => {
    const draft = buildLookupCardDraft(su, 'Hanja', 'Korean');
    expect(draft.hanja).toBe('水');
    expect(draft.hun).toBe('물');
    expect(draft.eum).toBe('수');
    expect(draft.korean).toBe('물 수');
  });

  // The character goes on the study side even though the user typed Korean.
  it('puts the character on the study side, not the term', () => {
    expect(buildLookupCardDraft(su, 'Hanja', 'Korean').hanja).toBe('水');
    expect(buildLookupCardDraft({ ...su, term: '水', termLanguage: 'Hanja' }, 'Hanja', 'Korean').hanja)
      .toBe('水');
  });

  it('still gives an English native the gloss', () => {
    const draft = buildLookupCardDraft(su, 'Hanja', 'English');
    expect(draft.english).toBe('water');
    expect(draft.korean).toBe('물 수');
  });
});

describe('buildLookupCardDraft everywhere else', () => {
  // The shortcut this deliberately keeps: the word you typed survives the
  // model rewording it.
  it('keeps the typed back-language term over the model’s wording', () => {
    const core: TermCore = {
      term: 'water', termLanguage: 'English', japanese: '水', english: 'water, liquid',
    };
    expect(buildLookupCardDraft(core, 'Japanese', 'English').english).toBe('water');
  });

  it('puts the term on the study side when the study language was typed', () => {
    const core: TermCore = {
      term: '눈치', termLanguage: 'Korean', korean: '눈치', english: 'social awareness',
    };
    const draft = buildLookupCardDraft(core, 'Korean', 'English');
    expect(draft.korean).toBe('눈치');
    expect(draft.english).toBe('social awareness');
  });

  it('folds in the depth and examples already on screen', () => {
    const core: TermCore = { term: '눈치', termLanguage: 'Korean', korean: '눈치', english: 'tact' };
    const draft = buildLookupCardDraft(core, 'Korean', 'English', {
      depth: { definition: 'Reading the room.' },
      examples: [{ korean: '눈치가 빠르다', english: 'quick on the uptake' }],
    });
    expect(draft.definition).toBe('Reading the room.');
    expect(draft.examples).toHaveLength(1);
  });

  it('defaults examples to an empty list rather than undefined', () => {
    const core: TermCore = { term: '눈치', termLanguage: 'Korean', korean: '눈치', english: 'tact' };
    expect(buildLookupCardDraft(core, 'Korean', 'English').examples).toEqual([]);
  });
});
