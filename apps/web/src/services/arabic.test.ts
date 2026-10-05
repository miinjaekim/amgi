import { describe, it, expect } from 'vitest';
import {
  UNVERIFIED_TAG,
  arabicReading,
  getReading,
  getStudyLanguageConfig,
  isRtlText,
  pronunciationNote,
  pronunciationNoteCredit,
  sameFoldedText,
  stripArabicMarks,
  t,
} from '@amgi/core';

describe('stripArabicMarks', () => {
  it('leaves the word as it is written day to day', () => {
    expect(stripArabicMarks('كِتَاب')).toBe('كتاب');
    expect(stripArabicMarks('مُعَلِّم')).toBe('معلم');
    expect(stripArabicMarks('مُسْتَشْفًى')).toBe('مستشفى');
  });

  it('keeps hamza and madda, which are letters', () => {
    expect(stripArabicMarks('أَرَادَ')).toBe('أراد');
    expect(stripArabicMarks('سُؤَال')).toBe('سؤال');
    expect(stripArabicMarks('آخِر')).toBe('آخر');
  });

  it('does nothing to text in another script', () => {
    expect(stripArabicMarks('dépaysement')).toBe('dépaysement');
    expect(stripArabicMarks('눈치')).toBe('눈치');
  });
});

describe('arabicReading', () => {
  it('keeps a reading that is the word on the card', () => {
    expect(arabicReading('كتاب', 'كِتَاب')).toBe('كِتَاب');
    expect(arabicReading('ملك', 'مَلَكَ')).toBe('مَلَكَ');
  });

  it('keeps any of the vowellings a spelling has: it checks letters, not which word', () => {
    for (const reading of ['عِلْم', 'عَلَم', 'عَلِمَ', 'عَلَّمَ']) {
      expect(arabicReading('علم', reading)).toBe(reading);
    }
  });

  it('drops a reading that is a different word, as the model has answered', () => {
    expect(arabicReading('ملك', 'مَلَاك')).toBeUndefined();
    expect(arabicReading('حسب', 'حِسَاب')).toBeUndefined();
    expect(arabicReading('سافر', 'كَاتِب')).toBeUndefined();
  });

  it('drops a reading with no marks, which says nothing the front does not', () => {
    expect(arabicReading('كتاب', 'كتاب')).toBeUndefined();
  });

  it('drops anything that is not a string, or is empty', () => {
    expect(arabicReading('كتاب', undefined)).toBeUndefined();
    expect(arabicReading('كتاب', null)).toBeUndefined();
    expect(arabicReading('كتاب', '  ')).toBeUndefined();
    expect(arabicReading('كتاب', 42)).toBeUndefined();
  });

  it('compares against the front whether or not it arrived with marks', () => {
    expect(arabicReading('كُتُب', 'كُتُب')).toBe('كُتُب');
  });
});

describe('the Arabic reading as shown', () => {
  it('never leaves getReading without saying it is not checked', () => {
    expect(getReading({ vowelled: 'كِتَاب' }, 'Arabic', 'English')).toBe('كِتَاب · not checked');
    expect(getReading({ vowelled: 'كِتَاب' }, 'Arabic', 'Korean')).toBe('كِتَاب · 검토 안 됨');
  });

  it('shows nothing when the card has no reading', () => {
    expect(getReading({}, 'Arabic', 'English')).toBeUndefined();
  });

  it('uses the same tag Munli puts on a verb the model conjugated', () => {
    expect(t('English', 'verbUnverifiedTag')).toBe(UNVERIFIED_TAG.English);
    expect(t('Korean', 'verbUnverifiedTag')).toBe(UNVERIFIED_TAG.Korean);
  });

  it('says once, on Learn, where the vowel marks come from', () => {
    expect(pronunciationNote('English', 'Arabic')).toContain('not checked');
    expect(pronunciationNote('Korean', 'Arabic')).toContain('검토');
    // No dictionary stands behind it, so there is nobody to credit.
    expect(pronunciationNoteCredit('Arabic')).toBeUndefined();
  });
});

describe('isRtlText', () => {
  it('is true for Arabic, with or without marks or leading punctuation', () => {
    expect(isRtlText('كتاب')).toBe(true);
    expect(isRtlText('كِتَاب')).toBe(true);
    expect(isRtlText('«أين المحطة؟»')).toBe(true);
    expect(isRtlText('3 كتب')).toBe(true);
  });

  it('is false for everything the other decks hold, and for nothing at all', () => {
    for (const text of ['awkward', '눈치', '木漏れ日', '緣分', 'ũhoro', 'dépaysement', '', null, undefined, '123', '?']) {
      expect(isRtlText(text)).toBe(false);
    }
  });

  it('goes by the first letter of a mixed line', () => {
    expect(isRtlText('book — كتاب')).toBe(false);
    expect(isRtlText('كتاب — book')).toBe(true);
  });
});

describe('the Arabic registry entry', () => {
  it('is right to left, with its own collection', () => {
    const config = getStudyLanguageConfig('Arabic');
    expect(config.rtl).toBe(true);
    expect(config.collection).toBe('cards_arabic');
    expect(config.studyField).toBe('arabic');
  });

  it('sends words of up to two letters to the voice that does not go silent', () => {
    const config = getStudyLanguageConfig('Arabic');
    expect(config.ttsShortVoiceName).toBe('ar-XA-Wavenet-B');
    expect(config.ttsShortMaxLetters).toBe(2);
  });
});

describe('a typed Arabic answer', () => {
  it('matches the unvowelled front whether or not it was typed with marks', () => {
    expect(sameFoldedText('كِتَاب', 'كتاب')).toBe(true);
    expect(sameFoldedText('كتاب', 'كتاب')).toBe(true);
  });

  it('still tells different words apart, and leaves other languages\' accents alone', () => {
    expect(sameFoldedText('كتاب', 'كاتب')).toBe(false);
    expect(sameFoldedText('ou', 'où')).toBe(false);
  });
});
