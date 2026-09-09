import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HANJA_PARTITION,
  HANJA_PARTITIONS,
  directionLabel,
  directionPrompt,
  getBackSide,
  getSpokenText,
  getStudyLanguageConfig,
  getTermBackSide,
  hanjaFaces,
  hunEum,
  isHanjaPartition,
  promptsForTyping,
} from '@amgi/core';

/** 水 — the card every example in the backlog is written against. */
const SU = { hanja: '水', hun: '물', eum: '수', english: 'water' };

describe('hanjaFaces', () => {
  // The table from the backlog item, reproduced exactly. Three partitions ×
  // the two directions that already exist is what let `ReviewDirection` stay a
  // two-member union, so this table *is* the feature.
  it('splits the three parts the way each partition says', () => {
    expect(hanjaFaces(SU, 'character')).toEqual({ front: '水', back: '물 수' });
    expect(hanjaFaces(SU, 'hun')).toEqual({ front: '물', back: '水 수' });
    expect(hanjaFaces(SU, 'eum')).toEqual({ front: '수', back: '水 물' });
  });

  // Whichever part is lifted out, what remains stays in 한자 · 훈 · 음 order.
  // Otherwise 水 물 and 물 水 would be the same fact printed two ways.
  it('keeps the back in canonical order', () => {
    expect(hanjaFaces(SU, 'hun').back).toBe('水 수');
    expect(hanjaFaces(SU, 'eum').back).toBe('水 물');
  });

  it('defaults to the character — the question the exam asks', () => {
    expect(hanjaFaces(SU)).toEqual(hanjaFaces(SU, DEFAULT_HANJA_PARTITION));
    expect(DEFAULT_HANJA_PARTITION).toBe('character');
  });

  // Cards saved before 훈 and 음 were fields carry the 훈음 assembled in
  // `korean` and nothing to take apart. Asking one for the 훈 alone would show
  // a blank front, so it answers the question it did store.
  it('falls back to the character partition on a card that cannot be split', () => {
    const legacy = { hanja: '水', korean: '물 수' };
    for (const partition of HANJA_PARTITIONS) {
      expect(hanjaFaces(legacy, partition), partition).toEqual({ front: '水', back: '물 수' });
    }
  });

  it('never renders a blank front when a part is missing', () => {
    expect(hanjaFaces({ term: '水' }, 'hun').front).toBe('水');
    expect(hanjaFaces({ hanja: '水', hun: '물' }, 'eum').front).toBe('水');
  });
});

describe('hunEum', () => {
  it('joins the two parts for the surfaces that want one string', () => {
    expect(hunEum(SU)).toBe('물 수');
  });

  // It fills `korean` when a card is saved, so running it on a card that
  // already has one must not change it — a re-save would otherwise rewrite the
  // field from a card whose parts it just read back.
  it('is stable on a card that already carries the assembled 훈음', () => {
    expect(hunEum({ hanja: '水', korean: '물 수' })).toBe('물 수');
    expect(hunEum({ ...SU, korean: '물 수' })).toBe('물 수');
  });
});

describe('isHanjaPartition', () => {
  it('accepts the three partitions and nothing else', () => {
    for (const partition of HANJA_PARTITIONS) expect(isHanjaPartition(partition)).toBe(true);
    expect(isHanjaPartition('hunEum')).toBe(false);
    expect(isHanjaPartition(undefined)).toBe(false);
  });
});

describe('direction copy for Hanja', () => {
  // The chip names the parts, not a pair of languages: "Korean → Korean" is
  // what the language-pair version would have said, since 훈음 is Korean and
  // so is the deck's own locale.
  it('names the parts on both sides of the arrow', () => {
    expect(directionLabel('Korean', 'Hanja', 'frontToBack', 'character')).toBe('한자 → 훈 · 음');
    expect(directionLabel('Korean', 'Hanja', 'backToFront', 'character')).toBe('훈 · 음 → 한자');
    expect(directionLabel('Korean', 'Hanja', 'frontToBack', 'hun')).toBe('훈 → 한자 · 음');
    expect(directionLabel('English', 'Hanja', 'frontToBack', 'eum')).toBe('음 → character · 훈');
  });

  it('asks for whatever the direction hides', () => {
    expect(directionPrompt('Korean', 'Hanja', 'frontToBack', 'character')).toBe('훈 · 음, 무엇일까요?');
    expect(directionPrompt('Korean', 'Hanja', 'backToFront', 'character')).toBe('한자, 무엇일까요?');
    expect(directionPrompt('English', 'Hanja', 'frontToBack', 'hun')).toBe('Recall the character · 음.');
  });

  // Every other deck keeps the language-pair wording it has always had.
  it('leaves other languages alone', () => {
    expect(directionLabel('English', 'Japanese', 'frontToBack')).toBe('Japanese → English');
    expect(directionPrompt('English', 'Japanese', 'backToFront')).toBe('How do you say this in Japanese?');
  });
});

describe('typed answers on Hanja', () => {
  // `gradeTypedAnswer` grades against *a* side, and a hanja card's back is two
  // parts — a typed 물 is neither right nor wrong until someone decides whether
  // both are required. On the default partition the expected answer is also a
  // glyph most learners cannot type.
  it('never prompts for typing, in either direction', () => {
    expect(promptsForTyping(true, 'backToFront', 'Hanja')).toBe(false);
    expect(promptsForTyping(true, 'frontToBack', 'Hanja')).toBe(false);
  });

  it('leaves every other deck as it was', () => {
    expect(promptsForTyping(true, 'backToFront', 'Japanese')).toBe(true);
    expect(promptsForTyping(true, 'backToFront')).toBe(true);
    expect(promptsForTyping(true, 'frontToBack', 'Japanese')).toBe(false);
    expect(promptsForTyping(false, 'backToFront', 'Japanese')).toBe(false);
  });
});

// The pronunciation button, which on this deck says the 음 and not the glyph.
describe('what a hanja card says out loud', () => {
  // 水 handed to a Korean voice does return audio — 6720 bytes, well clear of
  // the silence floor, measured 2026-09-09 — but nothing in the response says
  // what it read. The 음 is a string the card already holds, so there is
  // nothing to infer.
  it('speaks the 음, not the character', () => {
    expect(getSpokenText('水', undefined, '수')).toBe('수');
  });

  // The two never share a card — a hanja has no furigana and a kanji has no 음
  // — so the order between them only has to be defined, not negotiated.
  it('leaves every other deck on the reading it already used', () => {
    expect(getSpokenText('生物', 'せいぶつ')).toBe('せいぶつ');
    expect(getSpokenText('사랑')).toBe('사랑');
    expect(getSpokenText('水', undefined, '   ')).toBe('水');
  });

  // Single syllables every time, which is the case `ttsShortVoiceName` exists
  // for: Chirp 3: HD intermittently returns silence on a lone character where
  // Neural2 did not, 0/91 times.
  it('routes Hanja to the short-text voice', () => {
    const config = getStudyLanguageConfig('Hanja');
    expect(config.ttsLanguageCode).toBe('ko-KR');
    expect(config.ttsShortVoiceName).toBe('ko-KR-Neural2-C');
  });
});

/**
 * The Korean side of a hanja, before a card exists.
 *
 * `/api/explain` returns 훈 and 음 as two fields and never as one string,
 * because either half can be the front. `buildFlashcardDoc` assembles them at
 * save time — so without the same assembly on the read path, every surface
 * *before* the save was the one place a hanja had no Korean back at all, and
 * fell through to the English gloss. Learn showed a Korean native "water".
 */
describe('the Korean side of a looked-up hanja', () => {
  const looked = { term: '水', hanja: '水', hun: '물', eum: '수', english: 'water' } as const;

  it('assembles the 훈음 for a Korean native', () => {
    expect(getTermBackSide(looked, 'Hanja', 'Korean')).toBe('물 수');
    expect(getBackSide({ ...looked, studyLanguage: 'Hanja' }, 'Korean')).toBe('물 수');
  });

  it('still gives an English native the gloss', () => {
    expect(getTermBackSide(looked, 'Hanja', 'English')).toBe('water');
  });

  // A card saved before 훈 and 음 were fields carries only the assembled string;
  // `hunEum` falls back to it, so those cards keep reading correctly.
  it('reads a card that carries only the assembled 훈음', () => {
    expect(getBackSide({ studyLanguage: 'Hanja', hanja: '水', korean: '물 수' }, 'Korean')).toBe('물 수');
  });

  it('leaves every other deck\'s Korean side alone', () => {
    expect(getBackSide({ studyLanguage: 'Japanese', japanese: '水', korean: '물' }, 'Korean')).toBe('물');
  });
});
