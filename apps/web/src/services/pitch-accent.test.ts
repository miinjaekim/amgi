/**
 * @vitest-environment node
 *
 * `lookupPitchAccent` reads the table with `node:fs`, which the suite's default
 * jsdom environment does not serve. The pure half of the feature would pass
 * either way; the lookup silently returns undefined for everything.
 */
import { describe, it, expect } from 'vitest';
import {
  getReading, markPitchAccent, splitMorae, isAllKana,
  pronunciationNote, pronunciationNoteNeedsCredit,
} from '@amgi/core';
import { lookupPitchAccent } from '@/lib/pitchAccentLookup';

describe('splitMorae', () => {
  it('binds small kana leftwards, because a mora is not a character', () => {
    // The reason the whole function exists: 今日 is [1], and counting
    // characters would drop the pitch inside きょ instead of after it.
    expect(splitMorae('きょう')).toEqual(['きょ', 'う']);
    expect(splitMorae('しゅっぱつ')).toEqual(['しゅ', 'っ', 'ぱ', 'つ']);
  });

  it('counts ん, っ and ー as morae of their own', () => {
    expect(splitMorae('せんせい')).toEqual(['せ', 'ん', 'せ', 'い']);
    expect(splitMorae('がっこう')).toEqual(['が', 'っ', 'こ', 'う']);
    expect(splitMorae('コーヒー')).toEqual(['コ', 'ー', 'ヒ', 'ー']);
  });
});

describe('markPitchAccent', () => {
  it('marks the drop at the accent position', () => {
    expect(markPitchAccent('はし', 1)).toBe('は＼し'); // 箸 頭高
    expect(markPitchAccent('はし', 2)).toBe('はし＼'); // 橋 尾高
    expect(markPitchAccent('せんせい', 3)).toBe('せんせ＼い');
    expect(markPitchAccent('きょう', 1)).toBe('きょ＼う');
  });

  it('leaves 平板 unmarked, which is the notation rather than a gap', () => {
    expect(markPitchAccent('はし', 0)).toBe('はし'); // 端
    expect(markPitchAccent('がっこう', 0)).toBe('がっこう');
  });

  it('returns the bare reading when there is no accent to show', () => {
    expect(markPitchAccent('はし', undefined)).toBe('はし');
    expect(markPitchAccent('はし', -1)).toBe('はし');
    expect(markPitchAccent('はし', 1.5)).toBe('はし');
  });

  it('does not invent a mora for an accent past the end of the word', () => {
    // 尾高 on a two-mora word: the fall lands on the following particle, so
    // there is nothing inside the word to mark.
    expect(markPitchAccent('はな', 3)).toBe('はな');
  });
});

describe('isAllKana', () => {
  it('recognises a term that is already its own reading', () => {
    expect(isAllKana('ありがとう')).toBe(true);
    expect(isAllKana('コーヒー')).toBe(true);
    expect(isAllKana('日本')).toBe(false);
    expect(isAllKana('')).toBe(false);
  });
});

describe('getReading', () => {
  it('folds pitch accent into the furigana badge rather than beside it', () => {
    expect(getReading({ furigana: 'はし', pitchAccent: 1 })).toBe('は＼し');
  });

  it('falls back to bare furigana for a card with no accent', () => {
    // Every Japanese card saved before this field existed takes this path.
    expect(getReading({ furigana: 'はし' })).toBe('はし');
  });

  it('reads a kana-only term as its own reading, since it has no furigana', () => {
    expect(getReading({ japanese: 'ありがとう', pitchAccent: 2 })).toBe('あり＼がとう');
  });

  it('leaves pinyin alone', () => {
    expect(getReading({ pinyin: 'yuánfèn' })).toBe('yuánfèn');
    expect(getReading({})).toBeUndefined();
  });
});

describe('lookupPitchAccent', () => {
  // The ground truth this feature was decided on: 27 terms with known NHK
  // values, on which gemini-2.5-flash scored 6/27 and this table 27/27. Kept
  // as a test so a future data refresh has to keep clearing the same bar.
  // Written as (term, furigana, accent) because that is the real call: a
  // Japanese card always carries the reading, and seven of these surfaces are
  // ambiguous without it — 橋 is [1] as きょう and [2] as はし.
  const NHK: [string, string, number][] = [
    ['箸', 'はし', 1], ['橋', 'はし', 2], ['端', 'はし', 0], ['雨', 'あめ', 1],
    ['飴', 'あめ', 0], ['花', 'はな', 2], ['鼻', 'はな', 0], ['神', 'かみ', 1],
    ['紙', 'かみ', 2], ['髪', 'かみ', 2], ['酒', 'さけ', 0], ['鮭', 'さけ', 1],
    ['日本', 'にほん', 2], ['先生', 'せんせい', 3], ['学生', 'がくせい', 0],
    ['学校', 'がっこう', 0], ['私', 'わたし', 0], ['友達', 'ともだち', 0],
    ['電話', 'でんわ', 0], ['元気', 'げんき', 1], ['猫', 'ねこ', 1], ['犬', 'いぬ', 2],
    ['山', 'やま', 2], ['車', 'くるま', 0], ['時間', 'じかん', 0], ['水', 'みず', 0],
    ['本', 'ほん', 1],
  ];

  it.each(NHK)('%s (%s) is [%i]', (term, furigana, accent) => {
    expect(lookupPitchAccent(term, furigana)).toBe(accent);
  });

  it('resolves a surface whose readings agree on the accent, with no furigana', () => {
    expect(lookupPitchAccent('神')).toBe(1); // かみ/かむ/しん all [1]
    expect(lookupPitchAccent('山')).toBe(2); // むれ/やま both [2]
  });

  it('refuses to guess when the readings disagree', () => {
    expect(lookupPitchAccent('橋')).toBeUndefined(); // きょう [1] vs はし [2]
    expect(lookupPitchAccent('水')).toBeUndefined(); // すい [1] vs みず [0]
  });

  it('keeps the minimal pairs apart — the reason the model was refused', () => {
    // Gemini returned [1] for all four of these.
    expect(lookupPitchAccent('雨', 'あめ')).not.toBe(lookupPitchAccent('飴', 'あめ'));
    expect(lookupPitchAccent('花', 'はな')).not.toBe(lookupPitchAccent('鼻', 'はな'));
  });

  it('disambiguates a surface with several readings by its furigana', () => {
    expect(lookupPitchAccent('橋', 'はし')).toBe(2);
    expect(lookupPitchAccent('橋', 'きょう')).toBe(1);
  });

  it('recovers a kana-written term the table keys by kanji', () => {
    // ありがとう is stored under 有り難う, so the surface index misses it. This
    // fallback is the difference between 94.5% and ~99% coverage.
    expect(lookupPitchAccent('ありがとう')).toBe(2);
    expect(lookupPitchAccent('こんにちは')).toBe(5);
  });

  it('returns undefined for a word the dictionary does not carry', () => {
    // A miss must not look like 平板 — 0 is a real accent.
    expect(lookupPitchAccent('侘寂')).toBeUndefined();
  });
});

describe('pronunciationNote', () => {
  it('states the Kikuyu vowel rule, which is the only aid that language can get', () => {
    // No TTS voice exists for Kikuyu and tone measured unusable, so this note
    // is the whole of its pronunciation support.
    expect(pronunciationNote('English', 'Kikuyu')).toContain('ĩ');
    expect(pronunciationNote('Korean', 'Kikuyu')).toContain('별개의 모음');
  });

  it('teaches the Japanese drop mark, since an unexplained notation is not an aid', () => {
    expect(pronunciationNote('English', 'Japanese')).toContain('は＼し');
    expect(pronunciationNote('Korean', 'Japanese')).toContain('は＼し');
  });

  it('has nothing to say for a language with no rule worth stating once', () => {
    expect(pronunciationNote('English', 'Korean')).toBeUndefined();
    expect(pronunciationNote('English', 'French')).toBeUndefined();
  });

  it('carries the licence credit exactly where the accent table is used', () => {
    // CC BY-SA 4.0 makes this required, not decorative.
    expect(pronunciationNoteNeedsCredit('Japanese')).toBe(true);
    expect(pronunciationNoteNeedsCredit('Kikuyu')).toBe(false);
  });
});
