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
import { kanaToRomaji, kanaToHangul, kikuyuToEnglish, kikuyuToHangul, splitKikuyuSyllables } from '@amgi/core';
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
  const ja = (card: Parameters<typeof getReading>[0], native: string) =>
    getReading(card, 'Japanese', native);

  it('shows the reading first, then the transliteration', () => {
    expect(ja({ furigana: 'はし', pitchAccent: 1 }, 'English')).toBe('は＼し · hashi');
    expect(ja({ furigana: 'はし', pitchAccent: 1 }, 'Korean')).toBe('は＼し · 하시');
  });

  it('gives each native language its own script off the same card', () => {
    expect(ja({ furigana: 'すし' }, 'English')).toBe('すし · sushi');
    expect(ja({ furigana: 'すし' }, 'Korean')).toBe('すし · 스시');
  });

  it('falls back to bare furigana plus a transliteration when there is no accent', () => {
    // Every Japanese card saved before pitchAccent existed takes this path —
    // and still gains the transliteration, which is derived rather than stored.
    expect(ja({ furigana: 'はし' }, 'English')).toBe('はし · hashi');
  });

  it('reads a kana-only term as its own reading, since it has no furigana', () => {
    expect(ja({ japanese: 'ありがとう', pitchAccent: 2 }, 'English')).toBe('あり＼がとう · arigatō');
  });

  it('gives Kikuyu a badge it never had, which is the whole aid for that deck', () => {
    // No furigana, no pinyin, and no TTS voice exists for the language.
    expect(getReading({ kikuyu: 'rũciũ' }, 'Kikuyu', 'English')).toBe('ro-shee-o');
    expect(getReading({ kikuyu: 'rũciũ' }, 'Kikuyu', 'Korean')).toBe('로시오');
  });

  it('leaves pinyin alone', () => {
    expect(getReading({ pinyin: 'yuánfèn' }, 'TraditionalChinese', 'English')).toBe('yuánfèn');
    expect(getReading({}, 'Korean', 'English')).toBeUndefined();
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

describe('kanaToRomaji', () => {
  it('uses Hepburn, which is what an English reader will sound out', () => {
    expect(kanaToRomaji('すし')).toBe('sushi');   // not "susi"
    expect(kanaToRomaji('ちず')).toBe('chizu');   // not "tizu"
  });

  it('doubles the consonant after っ', () => {
    expect(kanaToRomaji('さっぽろ')).toBe('sapporo');
    expect(kanaToRomaji('がっこう')).toBe('gakkō');
  });

  it('writes ん as m before a labial, the one place Hepburn is not letter-for-letter', () => {
    expect(kanaToRomaji('てんぷら')).toBe('tempura');
    expect(kanaToRomaji('しんかんせん')).toBe('shinkansen');
  });

  it('macrons a long vowel, including the ou spelling Japanese actually uses', () => {
    expect(kanaToRomaji('とうきょう')).toBe('tōkyō');
    expect(kanaToRomaji('ラーメン')).toBe('rāmen');
  });

  it('leaves ei alone, because sensei is not written sensē', () => {
    expect(kanaToRomaji('せんせい')).toBe('sensei');
  });

  it('reads katakana through the same table', () => {
    expect(kanaToRomaji('コーヒー')).toBe('kōhī');
  });
});

describe('kanaToHangul', () => {
  it('does not write long vowels, per 국립국어원', () => {
    // The rule a letter-for-letter mapping misses most visibly: 도우쿄우 is wrong.
    expect(kanaToHangul('とうきょう')).toBe('도쿄');
    expect(kanaToHangul('がっこう')).toBe('갓코');
  });

  it('keeps えい, which is not a long vowel for this purpose', () => {
    expect(kanaToHangul('せんせい')).toBe('센세이');
  });

  it('is plain word-initially and aspirated inside', () => {
    // 京都: ㄱ at the front, ㅌ in the middle, off the same か/た rows.
    expect(kanaToHangul('きょうと')).toBe('교토');
    expect(kanaToHangul('とうきょう')).toBe('도쿄');
  });

  it('writes ん as a ㄴ 받침 and っ as a ㅅ 받침', () => {
    expect(kanaToHangul('しんかんせん')).toBe('신칸센');
    expect(kanaToHangul('さっぽろ')).toBe('삿포로');
  });
});

describe('Kikuyu respelling', () => {
  it('respells cũcũ as sho-sho — the word a speaker caught both errors with', () => {
    // Reported wrong on 2026-08-30: it came out `choo-choo`, two mistakes in
    // one four-letter word. `c` is [ʃ] and not [tʃ], and `ũ` is the close-mid
    // [o] rather than a lax [ʊ] — *shosho*, not *shoosho*. Kept as the
    // regression guard because no other single term catches both.
    expect(kikuyuToEnglish('cũcũ')).toBe('sho-sho');
    expect(kikuyuToHangul('cũcũ')).toBe('쇼쇼');
  });

  it('reads c as sh, never ch and never k', () => {
    expect(kikuyuToEnglish('rũciũ')).toBe('ro-shee-o');
  });

  it('separates ũ from u, which a speaker confirmed', () => {
    expect(kikuyuToEnglish('ũhoro')).toBe('o-ho-ro');
    expect(kikuyuToEnglish('mũgũnda')).toBe('mo-go-nda');
  });

  it('leaves ĩ merged with i on purpose, pending a source', () => {
    // Sources put ĩ at [e], which by symmetry with ũ would make it `ay` — but
    // that renders gĩkũyũ as `gay-ko-yo`, against the familiar "gee-koo-yoo",
    // and no speaker has ruled on it. Held at `ee`: imprecise beats
    // confidently wrong, which is what put `choo-choo` on a card.
    expect(kikuyuToEnglish('gĩkũyũ')).toBe('gee-ko-yo');
    expect(kikuyuToEnglish('kĩrĩma')).toBe('kee-ree-ma');
    expect(kikuyuToEnglish('irio')).toBe('ee-ree-o');
  });

  it('treats a prenasalized stop as one onset, so the hyphens mark real syllables', () => {
    expect(splitKikuyuSyllables('mũgũnda')).toHaveLength(3);
  });

  it('keeps the y glide in Hangul, which a bare consonant mapping drops', () => {
    expect(kikuyuToHangul('gĩkũyũ')).toBe('기코요'); // not 기코오
  });

  it('hangs a prenasalized nasal on the previous syllable', () => {
    expect(kikuyuToHangul('mũgũnda')).toBe('모곤다');
    expect(kikuyuToHangul('nyũmba')).toBe('뇸바');
  });

  it('opens a 으 for a word-initial prenasal rather than inventing an onset', () => {
    expect(kikuyuToHangul('ndoto')).toBe('은도토'); // not 느도토
  });
});
