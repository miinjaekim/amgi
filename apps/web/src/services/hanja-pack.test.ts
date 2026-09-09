import { describe, it, expect } from 'vitest';
import {
  HANJA_GEUPSU_PACK,
  buildPackCardDraft,
  getPackEntries,
  getPackTerms,
  getVocabPack,
  getVocabPacks,
  hanjaFaces,
  hunEum,
  resolvePackBack,
} from '@amgi/core';

const entries = getPackEntries(HANJA_GEUPSU_PACK);

/**
 * 한국어문회's 배정한자, newly assigned at each level, verbatim.
 *
 * Pinned as strings for the reason the kanji pack pins its two grades: the
 * pack's whole claim is that it is this list and nothing else, and that is the
 * one claim a reader cannot check by eye across five sections. A character
 * quietly dropped while editing a gloss, or a 5급 character drifting in, would
 * look exactly like the pack working.
 */
const GEUP_8 =
  '校敎九國軍金南女年大東六萬母木門民白父北四山三生西先小水室十五王外月二人一日長弟中靑寸七土八學韓兄火';
const GEUP_7II =
  '家間江車工空氣記男內農答道動力立每名物方不事上姓世手時市食安午右子自場電前全正足左直平下漢海話活孝後';
const GEUP_7 =
  '歌口旗同洞冬登來老里林面命文問百夫算色夕少所數植心語然有育邑入字祖住主重紙地千天川草村秋春出便夏花休';
const GEUP_6II =
  '各角界計高公共功果科光球今急短堂代對圖讀童等樂利理明聞半反班發放部分社書線雪成省消術始身神信新弱藥業勇用運音飮意作昨才戰庭第題注集窓淸體表風幸現形和會';
const GEUP_6 =
  '感強開京古苦交區郡根近級多待度頭例禮路綠李目美米朴番別病服本使死席石速孫樹習勝式失愛夜野陽洋言英永溫園遠由油銀醫衣者章在定朝族晝親太通特合行向號畫黃訓';

const charactersIn = (id: string) =>
  HANJA_GEUPSU_PACK.sections.find(s => s.id === id)!.entries.map(e => e.study);

describe('hanja 급수 pack', () => {
  it('is exactly the 어문회 list, each character at the level it is assigned', () => {
    expect(entries).toHaveLength(300);
    expect(charactersIn('geup8').join('')).toBe(GEUP_8);
    expect(charactersIn('geup7ii').join('')).toBe(GEUP_7II);
    expect(charactersIn('geup7').join('')).toBe(GEUP_7);
    expect(charactersIn('geup6ii').join('')).toBe(GEUP_6II);
    expect(charactersIn('geup6').join('')).toBe(GEUP_6);
  });

  // Levels are cumulative — a 8급 character is on the 7급 exam too — but
  // sections are not: each holds only what is newly assigned. That is what
  // keeps a term in exactly one section, which `remap-pack-subpacks.ts` derives
  // a card's subpack from.
  it('puts each character in exactly one section', () => {
    const terms = getPackTerms(HANJA_GEUPSU_PACK);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('runs 50 / 50 / 50 / 75 / 75, cumulative to 300', () => {
    expect(HANJA_GEUPSU_PACK.sections.map(s => s.entries.length)).toEqual([50, 50, 50, 75, 75]);
  });

  /**
   * ⚠️ **The guard that matters most, and the bug it is named for.**
   *
   * Four characters arrived from the source as CJK Compatibility Ideographs —
   * 金 as U+F90A rather than U+91D1, and 車 不 樂 likewise. They render
   * identically and they are not the same character, so a card front stored
   * that way silently fails to match typed input, the kanji pack, and the
   * pack's own saved-marking. They are exactly the four carrying two Korean
   * readings, which is what that Unicode block exists to encode, so the next
   * source will have them too.
   */
  it('stores every character as its unified codepoint', () => {
    for (const entry of entries) {
      expect(entry.study.normalize('NFC'), entry.study).toBe(entry.study);
      expect([...entry.study], entry.study).toHaveLength(1);
    }
  });

  it('authors 훈, 음 and both backs on every entry', () => {
    for (const entry of entries) {
      expect(entry.hun, entry.study).toBeTruthy();
      expect(entry.eum, entry.study).toBeTruthy();
      expect(entry.back.English, entry.study).toBeTruthy();
      expect(entry.back.Korean, entry.study).toBeTruthy();
    }
  });

  // `back.Korean` is derived rather than typed, so it cannot disagree with the
  // two fields it comes from — the drift a pre-assembled 훈음 would invite.
  it('derives the Korean back from 훈 and 음, never a third copy', () => {
    for (const entry of entries) {
      expect(entry.back.Korean, entry.study).toBe(hunEum({ hun: entry.hun, eum: entry.eum }));
    }
  });

  // The eleven characters 어문회 assigns more than one 훈음. The card teaches the
  // 대표훈음 and the rest ride in `context`, which reaches the card as
  // `briefDefinition`.
  it('carries the secondary 훈음 in context, and only there', () => {
    const withContext = entries.filter(e => e.context);
    expect(withContext.map(e => e.study).join('')).toBe('金北車洞便讀樂省度行畫');
    const rak = entries.find(e => e.study === '樂')!;
    expect(rak.hun).toBe('즐길');
    expect(rak.eum).toBe('락');
    expect(rak.context).toContain('노래 악');
    expect(rak.context).toContain('좋아할 요');
  });

  it('asks the exam question when a card is built from an entry', () => {
    const su = entries.find(e => e.study === '水')!;
    const draft = buildPackCardDraft(su, 'hanja-geupsu/geup8', 'uid', 'Hanja');
    expect(draft.hanja).toBe('水');
    expect(draft.hun).toBe('물');
    expect(draft.eum).toBe('수');
    expect(draft.korean).toBe('물 수');
    expect(draft.english).toBe('water');
    expect(hanjaFaces(draft as never, 'character')).toEqual({ front: '水', back: '물 수' });
    expect(hanjaFaces(draft as never, 'hun')).toEqual({ front: '물', back: '水 수' });
  });

  it('is registered under Hanja and reachable by id', () => {
    expect(getVocabPacks('Hanja')).toContain(HANJA_GEUPSU_PACK);
    expect(getVocabPack('Hanja', 'hanja-geupsu')).toBe(HANJA_GEUPSU_PACK);
  });

  // 훈음 is Korean for every reader, so the deck page shows it to a Korean
  // native; an English one gets the gloss, which is a different fact about the
  // character rather than a translation of 물 수.
  it('shows 훈음 to a Korean native and the gloss to an English one', () => {
    const su = entries.find(e => e.study === '水')!;
    expect(resolvePackBack(su.back, 'Hanja', 'Korean')).toBe('물 수');
    expect(resolvePackBack(su.back, 'Hanja', 'English')).toBe('water');
  });
});
