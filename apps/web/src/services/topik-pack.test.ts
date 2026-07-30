import { describe, it, expect } from 'vitest';
import { TOPIK_ADVANCED_PACK, getPackTerms, getVocabPack, getVocabPacks } from '@amgi/core';

describe('TOPIK pack', () => {
  it('is the Korean deck, and a lookup pack', () => {
    const packs = getVocabPacks('Korean');
    expect(packs.map(p => p.id)).toEqual(['topik-advanced']);
    expect(getVocabPack('Korean', 'topik-advanced')?.kind).toBe('lookup');
    // Korean words don't belong to another language's deck, and the deck route
    // resolves its pack from a URL id — so this is the check that a Korean pack
    // existing didn't make it reachable from the Japanese or English registry.
    expect(getVocabPack('Japanese', 'topik-advanced')).toBeUndefined();
    expect(getVocabPack('English', 'topik-advanced')).toBeUndefined();
  });

  it('has no duplicate entries', () => {
    const words = getPackTerms(TOPIK_ADVANCED_PACK);
    expect(new Set(words).size).toBe(words.length);
  });

  // The pack is hand-assembled across six sections, so a word pasted with a
  // stray latin character or a trailing space is the realistic typo — and it
  // would reach /api/explain as a different word than the one intended.
  it('writes every entry in hangul', () => {
    for (const { word } of TOPIK_ADVANCED_PACK.words) {
      expect(word, `${word} is not clean hangul`).toMatch(/^[가-힣]+( [가-힣]+)*$/);
    }
  });

  // A multi-word entry is a phrase, and a phrase read compositionally is the
  // wrong answer twice over: 발이 넓다 becomes a sentence about feet, 이에 따라
  // becomes two grammar particles. Both need the hint, for different reasons.
  it('gives every phrase entry a context hint', () => {
    const phrases = TOPIK_ADVANCED_PACK.words.filter(w => w.word.includes(' '));
    expect(phrases.length).toBeGreaterThan(0);
    for (const { word, context } of phrases) {
      expect(context, `${word} has no context hint`).toBeTruthy();
    }
  });

  // 관용 표현 and 사자성어 are the entries that must say what kind of thing
  // they are — a 사자성어 is four hanja with no space in it, so nothing about
  // the entry itself tells the model not to gloss it character by character.
  it('marks its idioms as idioms', () => {
    const idioms = TOPIK_ADVANCED_PACK.words.filter(w => /idiom/.test(w.context ?? ''));
    expect(idioms.length).toBe(20);
    for (const word of ['발이 넓다', '눈코 뜰 새 없다', '어부지리', '설상가상']) {
      expect(idioms.map(w => w.word), `${word} is not marked as an idiom`).toContain(word);
    }
  });

  // Korean homographs are one form with unrelated senses, and the everyday
  // sense is the one a model reaches for first — 경기 as a sports match, 미치다
  // as "to go crazy". These are the entries the context field exists for.
  it('pins the sense of the homographs it includes', () => {
    const byWord = new Map(TOPIK_ADVANCED_PACK.words.map(w => [w.word, w.context]));
    for (const word of ['경기', '미치다', '지나치다', '자원']) {
      expect(byWord.get(word), `${word} needs a sense hint`).toBeTruthy();
    }
  });
});
