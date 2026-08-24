import { describe, it, expect } from 'vitest';
import {
  KANJI_GRADE_1_2_PACK,
  buildPackCardDraft,
  getPackEntries,
  getPackTerms,
  getVocabPack,
  getVocabPacks,
  resolvePackBack,
} from '@amgi/core';

const entries = getPackEntries(KANJI_GRADE_1_2_PACK);

/**
 * 文部科学省's 学年別漢字配当表, grades 1 and 2, verbatim. The pack claims to be
 * this list and nothing else, and that claim is the one thing a reader cannot
 * check by eye across eleven sections — a character quietly dropped while
 * re-theming a section, or a grade-3 character drifting in, would look exactly
 * like the pack working.
 */
const GRADE_1 =
  '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六';
const GRADE_2 =
  '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';

const sectionsOf = (prefix: string) =>
  KANJI_GRADE_1_2_PACK.sections.filter(section => section.id.startsWith(prefix));

const charactersIn = (prefix: string) =>
  sectionsOf(prefix).flatMap(section => section.entries.map(entry => entry.study));

describe('kanji pack', () => {
  it('is exactly 教育漢字 grades 1 and 2, each character in its own grade', () => {
    expect(entries).toHaveLength(240);
    expect([...charactersIn('g1-')].sort()).toEqual([...GRADE_1].sort());
    expect([...charactersIn('g2-')].sort()).toEqual([...GRADE_2].sort());
  });

  it('has no duplicate characters', () => {
    const terms = getPackTerms(KANJI_GRADE_1_2_PACK);
    expect(new Set(terms).size).toBe(terms.length);
  });

  // The study side reaches /api/explain as written. A two-character compound
  // slipped in here would be a vocabulary word in a character pack, and would
  // also break the promise the count above makes.
  it('studies one Han character at a time', () => {
    for (const { study } of entries) {
      expect(study, `${study} is not a single kanji`).toMatch(/^\p{Script=Han}$/u);
    }
  });

  // Japanese is the first study language where both back slots are readable —
  // neither one is the front of the card — so unlike TOEIC and TOPIK, an entry
  // missing a side would go blank for half the readers rather than being
  // harmlessly overwritten.
  it('authors both backs on every entry', () => {
    for (const { study, back } of entries) {
      expect(back.English, `${study} has no English back`).toBeTruthy();
      expect(back.Korean, `${study} has no Korean back`).toBeTruthy();
    }
  });

  /**
   * The readings are authored once on a `KanjiRow` and assembled into two
   * strings. This is the check that buys: the two backs may differ in meaning
   * — they are different languages — but the half after the em dash is the same
   * character's readings and must be identical in both.
   */
  it('keeps the readings identical across the two backs', () => {
    const readings = ({ English = '', Korean = '' }) => [
      English.split(' — ')[1],
      Korean.split(' — ')[1],
    ];
    for (const { study, back } of entries) {
      const [fromEnglish, fromKorean] = readings(back);
      expect(fromKorean, `${study}: readings drifted between its two backs`).toBe(fromEnglish);
    }
  });

  /**
   * Script is what tells the two kinds of reading apart — nothing labels them —
   * so a kun'yomi written in katakana is not a cosmetic slip, it is the back
   * saying the wrong thing. Okurigana in parentheses is the other half of that
   * notation: み(る) is a verb stem, みる would be a word.
   */
  it('writes kun readings in hiragana and on readings in katakana', () => {
    const withKun = entries.filter(entry => entry.back.English!.includes(' / '));
    // Most characters have both; a handful (百, 番, 茶) are on-only by design.
    expect(withKun.length).toBeGreaterThan(200);
    for (const { study, back } of withKun) {
      const [kun, on] = back.English!.split(' — ')[1].split(' / ');
      expect(kun, `${study}: kun reading is not hiragana`).toMatch(/^[\p{Script=Hiragana}()·]+$/u);
      expect(on, `${study}: on reading is not katakana`).toMatch(/^[\p{Script=Katakana}·]+$/u);
    }
  });

  it('is registered for Japanese only, laid out as a list', () => {
    expect(getVocabPack('Japanese', 'kanji-grade-1-2')?.id).toBe('kanji-grade-1-2');
    expect(getVocabPack('English', 'kanji-grade-1-2')).toBeUndefined();
    expect(getVocabPack('Korean', 'kanji-grade-1-2')).toBeUndefined();
    // Single glyphs, but not a grid: the back is `meaning — readings`, which is
    // the whole reason this pack breaks the kana packs' layout.
    expect(KANJI_GRADE_1_2_PACK.layout).toBe('list');
    // A lone kanji has no single reading to speak, so there is nothing for the
    // pronounce button to say.
    expect(KANJI_GRADE_1_2_PACK.pronounceable).toBeUndefined();
    expect(getVocabPacks('Japanese').at(-1)?.id).toBe('kanji-grade-1-2');
  });

  // The draft is what actually reaches Firestore, and this pack is the first to
  // rely on both back slots surviving it.
  it('saves the study side into the japanese slot with both backs intact', () => {
    const water = entries.find(entry => entry.study === '水')!;
    const draft = buildPackCardDraft(water, KANJI_GRADE_1_2_PACK.id, 'uid-1', 'Japanese');
    expect(draft).toMatchObject({
      term: '水',
      japanese: '水',
      termLanguage: 'Japanese',
      packId: 'kanji-grade-1-2',
      english: 'water — みず / スイ',
      korean: '물 — みず / スイ',
    });
  });

  // The two readers this pack was authored for, both getting a whole back.
  it('resolves a Korean back for a Korean native and an English one otherwise', () => {
    const water = entries.find(entry => entry.study === '水')!;
    expect(resolvePackBack(water.back, 'Japanese', 'Korean')).toBe('물 — みず / スイ');
    expect(resolvePackBack(water.back, 'Japanese', 'English')).toBe('water — みず / スイ');
  });
});
