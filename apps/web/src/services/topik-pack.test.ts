import { describe, it, expect } from 'vitest';
import { TOPIK_ADVANCED_PACK, getPackEntries, getPackTerms, getVocabPack, getVocabPacks } from '@amgi/core';

const entries = getPackEntries(TOPIK_ADVANCED_PACK);

describe('TOPIK pack', () => {
  it('leads the Korean registry, laid out as a list', () => {
    const packs = getVocabPacks('Korean');
    // The military packs joined this registry and are listed after it — TOPIK is
    // what most Korean learners came for, so it stays first.
    expect(packs.map(p => p.id)).toEqual([
      'topik-advanced',
      'military-unit-ko',
      'military-affairs-ko',
    ]);
    // Words, not glyphs — 뒷받침하다 does not fit in a kana tile.
    expect(getVocabPack('Korean', 'topik-advanced')?.layout).toBe('list');
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
    for (const { study } of entries) {
      expect(study, `${study} is not clean hangul`).toMatch(/^[가-힣]+( [가-힣]+)*$/);
    }
  });

  // A multi-word entry is a phrase, and a phrase read compositionally is the
  // wrong answer twice over: 발이 넓다 becomes a sentence about feet, 이에 따라
  // becomes two grammar particles. Both need the hint, for different reasons.
  it('gives every phrase entry a context hint', () => {
    const phrases = entries.filter(e => e.study.includes(' '));
    expect(phrases.length).toBeGreaterThan(0);
    for (const { study, context } of phrases) {
      expect(context, `${study} has no context hint`).toBeTruthy();
    }
  });

  // 관용 표현 and 사자성어 are the entries that must say what kind of thing
  // they are — a 사자성어 is four hanja with no space in it, so nothing about
  // the entry itself tells the model not to gloss it character by character.
  it('marks its idioms as idioms', () => {
    const idioms = entries.filter(e => /idiom/.test(e.context ?? ''));
    expect(idioms.length).toBe(20);
    for (const word of ['발이 넓다', '눈코 뜰 새 없다', '어부지리', '설상가상']) {
      expect(idioms.map(e => e.study), `${word} is not marked as an idiom`).toContain(word);
    }
  });

  // Korean homographs are one form with unrelated senses, and the everyday
  // sense is the one a model reaches for first — 경기 as a sports match, 미치다
  // as "to go crazy". These are the entries the context field exists for.
  it('pins the sense of the homographs it includes', () => {
    const byWord = new Map(entries.map(e => [e.study, e.context]));
    for (const word of ['경기', '미치다', '지나치다', '자원']) {
      expect(byWord.get(word), `${word} needs a sense hint`).toBeTruthy();
    }
  });

  // The six sections are the enrolment unit, so they have to be real data with
  // stable ids rather than the comments they used to be.
  it('splits into six named sections that account for every word', () => {
    const sections = TOPIK_ADVANCED_PACK.sections;
    expect(sections).toHaveLength(6);
    expect(new Set(sections.map(s => s.id)).size).toBe(6);
    for (const section of sections) {
      expect(section.entries.length, `${section.id} is empty`).toBeGreaterThan(0);
      expect(section.name.Korean, `${section.id} has no Korean name`).toBeTruthy();
    }
    expect(entries).toHaveLength(160);
    expect(getPackTerms(TOPIK_ADVANCED_PACK)).toHaveLength(160);
  });

  // English backs only: the study side is the `korean` slot, so an authored
  // Korean back would be overwritten at save time and could never be read.
  it('authors an English back for every entry and no Korean one', () => {
    for (const { study, back } of entries) {
      expect(back.English, `${study} has no English back`).toBeTruthy();
      expect(back.Korean, `${study} authored a Korean back that cannot be stored`).toBeUndefined();
    }
  });
});
