import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_STUDY_LANGUAGES,
  getBackSide,
  getBackSideConfig,
  getTermBackSide,
  getStudyLanguageConfig,
  directionLabel,
  directionPrompt,
} from '@amgi/core';
import type { CardSides } from '@amgi/core';

describe('getBackSideConfig', () => {
  it('gives a learner the back in their own language', () => {
    expect(getBackSideConfig('Japanese', 'Korean').backField).toBe('korean');
    expect(getBackSideConfig('Japanese', 'English').backField).toBe('english');
    expect(getBackSideConfig('Swedish', 'Korean').backField).toBe('korean');
  });

  // Studying the language you already speak is the one case where "your own
  // language" collides with the front of the card. The back falls to the other
  // side rather than duplicating the term.
  it('falls to the other side when the back would be the study side', () => {
    const koreanStudy = getBackSideConfig('Korean', 'Korean');
    expect(koreanStudy.backField).toBe('english');
    const englishStudy = getBackSideConfig('English', 'English');
    expect(englishStudy.backField).toBe('korean');
  });

  it('never puts the back on the same field as the front', () => {
    for (const { code } of SUPPORTED_STUDY_LANGUAGES) {
      for (const native of ['English', 'Korean', undefined]) {
        const { studyField } = getStudyLanguageConfig(code);
        const { backField } = getBackSideConfig(code, native);
        expect(backField, `${code}/${native}`).not.toBe(studyField);
      }
    }
  });

  // The rule replaced a hardcoded per-language table. For an English native it
  // has to still say exactly what that table said, or every existing card
  // silently changes which field it reads from.
  it('reproduces the old table for an English native', () => {
    const expected: Record<string, string> = {
      Korean: 'english',
      Swedish: 'english',
      French: 'english',
      Japanese: 'english',
      TraditionalChinese: 'english',
      English: 'korean',
      // Registered after the table was replaced, so this line extends it rather
      // than reproducing it — there are no pre-rule Spanish cards to protect.
      // It stays listed so the loop below is exhaustive over the registry: a
      // language added with no entry here fails rather than being skipped.
      Spanish: 'english',
      Kikuyu: 'english',
      Swahili: 'english',
    };
    for (const { code } of SUPPORTED_STUDY_LANGUAGES) {
      expect(getBackSideConfig(code, 'English').backField, code).toBe(expected[code]);
    }
  });

  it('labels the back with the language it is actually in', () => {
    expect(getBackSideConfig('Japanese', 'Korean').backLabelKey).toBe('labelKorean');
    expect(getBackSideConfig('Japanese', 'Korean').backLanguage).toBe('Korean');
    expect(getBackSideConfig('Japanese', 'English').backLabelKey).toBe('labelEnglish');
  });
});

describe('getBackSide', () => {
  const bilingual: CardSides = {
    studyLanguage: 'Japanese',
    japanese: '食べる',
    english: 'to eat',
    korean: '먹다',
  };

  it('follows the reader between languages on a card that carries both', () => {
    expect(getBackSide(bilingual, 'Korean')).toBe('먹다');
    expect(getBackSide(bilingual, 'English')).toBe('to eat');
  });

  // The compatibility guarantee the whole design rests on: cards saved before
  // backs were native-aware carry `english` and nothing else, and a Korean
  // reader must see that rather than an empty card.
  it('falls back to english on a card saved before this existed', () => {
    const legacy: CardSides = { studyLanguage: 'Japanese', japanese: '食べる', english: 'to eat' };
    expect(getBackSide(legacy, 'Korean')).toBe('to eat');
    expect(getBackSide(legacy, 'English')).toBe('to eat');
  });

  it('still honours the loose translation field', () => {
    const loose: CardSides = { studyLanguage: 'Japanese', japanese: '食べる', translation: 'to eat' };
    expect(getBackSide(loose, 'Korean')).toBe('to eat');
  });

  it('returns empty rather than throwing on a card with no back at all', () => {
    expect(getBackSide({ studyLanguage: 'Japanese', japanese: '食べる' }, 'Korean')).toBe('');
  });
});

// A looked-up term is not a card: it carries `termLanguage`, and it comes from
// whatever /api/explain is deployed rather than from our own writes. Both of
// those cost a bug — the Learn screen rendered "번역이 없습니다" for a Korean
// native studying Japanese, because production still returned `english` only.
describe('getTermBackSide', () => {
  const fromCurrentApi = {
    term: '食べる',
    japanese: '食べる',
    english: 'to eat',
    korean: '먹다',
  };

  it('prefers the native side when the model returned one', () => {
    expect(getTermBackSide(fromCurrentApi, 'Japanese', 'Korean')).toBe('먹다');
    expect(getTermBackSide(fromCurrentApi, 'Japanese', 'English')).toBe('to eat');
  });

  // The regression. An API older than this code returns no `korean` field at
  // all, and a term with no translation shown is worse than one shown in
  // English.
  it('shows english when the deployed API has no native side', () => {
    const fromOlderApi = { term: '食べる', japanese: '食べる', english: 'to eat' };
    expect(getTermBackSide(fromOlderApi, 'Japanese', 'Korean')).toBe('to eat');
  });

  it('is empty only when the term genuinely has no back', () => {
    expect(getTermBackSide({ term: '食べる', japanese: '食べる' }, 'Japanese', 'Korean')).toBe('');
  });
});

describe('composed direction strings', () => {
  // These replaced 20 hardcoded keys. The pairs that already existed have to
  // come out byte-identical, or the change is a silent copy rewrite.
  it('matches the strings the old keys held', () => {
    expect(directionLabel('English', 'Japanese', 'frontToBack')).toBe('Japanese → English');
    expect(directionLabel('English', 'Japanese', 'backToFront')).toBe('English → Japanese');
    expect(directionLabel('Korean', 'Japanese', 'frontToBack')).toBe('일본어 → 한국어');
    expect(directionPrompt('English', 'Japanese', 'frontToBack')).toBe('What does this mean in English?');
    expect(directionPrompt('English', 'Japanese', 'backToFront')).toBe('How do you say this in Japanese?');
  });

  it('names the back language a Korean learner actually sees', () => {
    expect(directionLabel('Korean', 'Swedish', 'frontToBack')).toBe('스웨덴어 → 한국어');
    expect(directionPrompt('Korean', 'Swedish', 'frontToBack')).toBe('이 단어는 한국어로 무슨 뜻인가요?');
    expect(directionPrompt('Korean', 'Swedish', 'backToFront')).toBe('이것을 스웨덴어로 어떻게 말하나요?');
  });
});
