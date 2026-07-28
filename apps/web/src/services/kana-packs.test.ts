import { describe, it, expect } from 'vitest';
import { HIRAGANA_PACK, KATAKANA_PACK, getPackTerms, getVocabPacks } from '@amgi/core';

// 46 gojūon + 20 dakuten + 5 handakuten. Yōon and the obsolete ゐ/ゑ are out
// of scope, so this number is the whole pack, not a subset of a longer list.
const KANA_COUNT = 71;

describe('kana packs', () => {
  it('covers every single-character sound in both scripts', () => {
    expect(HIRAGANA_PACK.cards).toHaveLength(KANA_COUNT);
    expect(KATAKANA_PACK.cards).toHaveLength(KANA_COUNT);
  });

  // Both packs are generated from one table, so this is what would catch the
  // table itself being wrong — a row that lost a script or repeated a sound.
  it('pairs each hiragana with the katakana of the same sound', () => {
    const hira = HIRAGANA_PACK.cards;
    const kata = KATAKANA_PACK.cards;
    for (let i = 0; i < KANA_COUNT; i++) {
      expect(kata[i].back).toEqual(hira[i].back);
      expect(kata[i].study).not.toBe(hira[i].study);
    }
  });

  it('has no duplicate characters within a pack', () => {
    for (const pack of [HIRAGANA_PACK, KATAKANA_PACK]) {
      const studies = pack.cards.map(c => c.study);
      expect(new Set(studies).size).toBe(studies.length);
    }
  });

  it('writes each pack in its own script', () => {
    for (const { study } of HIRAGANA_PACK.cards) expect(study).toMatch(/^[ぁ-ゟ]$/);
    for (const { study } of KATAKANA_PACK.cards) expect(study).toMatch(/^[ァ-ヿ]$/);
  });

  it('gives every card a romaji back', () => {
    for (const pack of [HIRAGANA_PACK, KATAKANA_PACK]) {
      for (const { study, back } of pack.cards) {
        expect(back.English, `${study} has no reading`).toMatch(/^[a-z]+( \([a-z]+\))?$/);
      }
    }
  });

  // The hangul column is hand-written per row rather than derived, so this is
  // what catches a row that was added to the table without one.
  it('gives every card a hangul back', () => {
    for (const pack of [HIRAGANA_PACK, KATAKANA_PACK]) {
      for (const { study, back } of pack.cards) {
        expect(back.Korean, `${study} has no hangul reading`).toMatch(/^[가-힣]+( \([가-힣]+\))?$/);
      }
    }
  });

  // 청음 and 탁음 are the distinction these packs teach, so the two columns
  // must keep them apart — か/が collapsing to 가 is the specific failure the
  // word-initial 외래어 표기법 column would have produced.
  it('keeps voiced and voiceless rows distinct in both columns', () => {
    const byStudy = new Map(HIRAGANA_PACK.cards.map(c => [c.study, c.back]));
    for (const [voiceless, voiced] of [['か', 'が'], ['た', 'だ'], ['さ', 'ざ'], ['は', 'ば']]) {
      expect(byStudy.get(voiceless)!.Korean).not.toBe(byStudy.get(voiced)!.Korean);
      expect(byStudy.get(voiceless)!.English).not.toBe(byStudy.get(voiced)!.English);
    }
  });

  it('is registered for Japanese and marked pronounceable', () => {
    const packs = getVocabPacks('Japanese');
    expect(packs.map(p => p.id)).toEqual(['kana-hiragana', 'kana-katakana']);
    for (const pack of packs) {
      expect(pack.kind).toBe('cards');
      expect(pack.kind === 'cards' && pack.pronounceable).toBe(true);
    }
  });
});

describe('getPackTerms', () => {
  it('reads the study side of a card pack', () => {
    expect(getPackTerms(HIRAGANA_PACK)).toContain('あ');
    expect(getPackTerms(HIRAGANA_PACK)).toHaveLength(KANA_COUNT);
  });

  it('reads the word of a lookup pack', () => {
    const [toeic] = getVocabPacks('English');
    expect(toeic.kind).toBe('lookup');
    expect(getPackTerms(toeic)).toContain('comply');
  });
});
