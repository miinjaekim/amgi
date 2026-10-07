import { describe, it, expect } from 'vitest';
import { FORMS_NOTE_MAX_LENGTH, buildLookupCardDraft, normalizeFormsNote } from '@amgi/core';
import type { TermCore } from '@amgi/core';
import { formsNoteRule } from '@/lib/formsNoteRule';

describe('normalizeFormsNote', () => {
  it('keeps a note on a noun or an adjective', () => {
    expect(normalizeFormsNote('Irregular plural: chevaux.', 'noun')).toBe('Irregular plural: chevaux.');
    expect(normalizeFormsNote('  bel before a vowel sound;\n feminine belle, plural beaux. ', 'adjective'))
      .toBe('bel before a vowel sound; feminine belle, plural beaux.');
  });

  // The scope it was asked for. A note that arrives on anything else is the
  // model answering a question the prompt did not put.
  it('drops a note on any other part of speech', () => {
    expect(normalizeFormsNote('Irregular: vais, vas, va.', 'verb')).toBeUndefined();
    expect(normalizeFormsNote('Irregular plural: chevaux.', 'phrase')).toBeUndefined();
    expect(normalizeFormsNote('Irregular plural: chevaux.', undefined)).toBeUndefined();
  });

  // table has no note, and "None." under its definition is not the same thing.
  it('reads a spelled-out null as no note', () => {
    for (const empty of ['', '   ', 'null', 'None.', 'N/A', '-', '없음', null, undefined, 7]) {
      expect(normalizeFormsNote(empty, 'noun')).toBeUndefined();
    }
  });

  // Dropped whole rather than cut: half a sentence about a plural is worse
  // than none, and a paragraph is the grammar lesson the note is not.
  it('drops an answer that ran past one sentence', () => {
    expect(normalizeFormsNote('a'.repeat(FORMS_NOTE_MAX_LENGTH), 'noun')).toHaveLength(FORMS_NOTE_MAX_LENGTH);
    expect(normalizeFormsNote('a'.repeat(FORMS_NOTE_MAX_LENGTH + 1), 'noun')).toBeUndefined();
  });
});

describe('formsNoteRule', () => {
  it('asks only on Swedish and French', () => {
    expect(formsNoteRule('Swedish', 'English').rule).toContain('"formsNote"');
    expect(formsNoteRule('French', 'English').json).toContain('"formsNote"');
    for (const language of ['Korean', 'Spanish', 'Japanese', 'Arabic', 'Hanja']) {
      expect(formsNoteRule(language, 'English')).toEqual({ rule: '', json: '' });
    }
  });

  // The note is read in the definition's language, so its examples are too.
  it("words its examples in the reader's language", () => {
    expect(formsNoteRule('Swedish', 'English').rule).toContain('Plural böcker');
    expect(formsNoteRule('Swedish', 'Korean').rule).toContain('한정형은 boken');
    expect(formsNoteRule('French', 'Korean').rule).toContain('불규칙 복수형: chevaux');
  });
});

describe('a looked-up card', () => {
  const core: TermCore = {
    term: 'bok',
    termLanguage: 'Swedish',
    swedish: 'bok',
    english: 'book',
    gender: 'en',
    partOfSpeech: 'noun',
    briefDefinition: 'A set of written pages bound together.',
    formsNote: 'Plural böcker, with a vowel change; definite boken.',
  };

  it('carries the note from the lookup onto the card', () => {
    expect(buildLookupCardDraft(core, 'Swedish', 'English').formsNote).toBe(core.formsNote);
  });

  it('carries none when the lookup gave none', () => {
    const plain: TermCore = { ...core, term: 'stol', swedish: 'stol', english: 'chair' };
    delete plain.formsNote;
    expect('formsNote' in buildLookupCardDraft(plain, 'Swedish', 'English')).toBe(false);
  });
});
