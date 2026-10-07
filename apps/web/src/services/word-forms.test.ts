import { describe, it, expect } from 'vitest';
import { FORMS_NOTE_MAX_LENGTH, buildLookupCardDraft, formsTable, normalizeFormsNote, normalizeWordForms } from '@amgi/core';
import type { TermCore } from '@amgi/core';
import { formsRule } from '@/lib/formsRule';

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

describe('normalizeWordForms', () => {
  const bok = { indefiniteSingular: 'bok', definiteSingular: 'boken', indefinitePlural: 'böcker', definitePlural: 'böckerna' };

  it("keeps a noun's four forms", () => {
    expect(normalizeWordForms(bok, 'noun')).toEqual({ kind: 'noun', ...bok });
  });

  // The article is the card's `gender`; stored twice it would show twice.
  it('takes off an article the model wrote anyway', () => {
    expect(normalizeWordForms({ ...bok, indefiniteSingular: 'en bok' }, 'noun'))
      .toMatchObject({ indefiniteSingular: 'bok' });
  });

  // mjölk. The keys are absent, not undefined: Firestore rejects undefined.
  it('leaves a missing plural out rather than inventing one', () => {
    const forms = normalizeWordForms(
      { indefiniteSingular: 'mjölk', definiteSingular: 'mjölken', indefinitePlural: null, definitePlural: '-' },
      'noun',
    );
    expect(forms).toEqual({ kind: 'noun', indefiniteSingular: 'mjölk', definiteSingular: 'mjölken' });
    expect(Object.keys(forms!)).not.toContain('indefinitePlural');
  });

  it('drops a noun missing either singular form', () => {
    expect(normalizeWordForms({ ...bok, definiteSingular: null }, 'noun')).toBeUndefined();
    expect(normalizeWordForms({ ...bok, indefiniteSingular: ' ' }, 'noun')).toBeUndefined();
  });

  // The model is asked for every adjective's forms and to judge none of them:
  // asked to judge, it called gammal, röd and vacker regular.
  it('keeps an adjective only when its forms are not word plus -t and -a', () => {
    expect(normalizeWordForms({ common: 'stor', neuter: 'stort', plural: 'stora' }, 'adjective')).toBeUndefined();
    expect(normalizeWordForms({ common: 'fin', neuter: 'fint', plural: 'fina' }, 'adjective')).toBeUndefined();
    for (const [common, neuter, plural] of [
      ['gammal', 'gammalt', 'gamla'],
      ['röd', 'rött', 'röda'],
      ['vacker', 'vackert', 'vackra'],
      ['liten', 'litet', 'små'],
      ['bra', 'bra', 'bra'],
    ]) {
      expect(normalizeWordForms({ common, neuter, plural }, 'adjective')).toEqual({ kind: 'adjective', common, neuter, plural });
    }
  });

  it('drops a shape that does not match the part of speech, and anything else', () => {
    expect(normalizeWordForms(bok, 'adjective')).toBeUndefined();
    expect(normalizeWordForms({ common: 'röd', neuter: 'rött', plural: 'röda' }, 'noun')).toBeUndefined();
    expect(normalizeWordForms(bok, 'verb')).toBeUndefined();
    expect(normalizeWordForms('böcker', 'noun')).toBeUndefined();
    expect(normalizeWordForms(null, 'noun')).toBeUndefined();
    expect(normalizeWordForms({ ...bok, definiteSingular: 'a'.repeat(41) }, 'noun')).toBeUndefined();
  });

  it('carries no key the prompt did not ask for', () => {
    expect(normalizeWordForms({ ...bok, genitive: 'boks' }, 'noun')).toEqual({ kind: 'noun', ...bok });
  });
});

describe('formsTable', () => {
  const bok = { kind: 'noun', indefiniteSingular: 'bok', definiteSingular: 'boken', indefinitePlural: 'böcker', definitePlural: 'böckerna' } as const;

  it('lays a noun out two by two, with its article on the indefinite singular', () => {
    expect(formsTable('English', { forms: bok, gender: 'en' })).toEqual({
      columns: ['Singular', 'Plural'],
      rows: [
        { label: 'Indefinite', cells: ['en bok', 'böcker'] },
        { label: 'Definite', cells: ['boken', 'böckerna'] },
      ],
      caption: 'not checked',
    });
  });

  it("labels it in the reader's language", () => {
    const table = formsTable('Korean', { forms: bok, gender: 'en' })!;
    expect(table.columns).toEqual(['단수', '복수']);
    expect(table.rows.map(row => row.label)).toEqual(['비한정형', '한정형']);
    expect(table.caption).toBe('검토 안 됨');
  });

  it('drops the plural column for a noun with no plural', () => {
    const table = formsTable('English', {
      forms: { kind: 'noun', indefiniteSingular: 'mjölk', definiteSingular: 'mjölken' },
      gender: 'en',
    })!;
    expect(table.columns).toEqual(['Singular']);
    expect(table.rows.map(row => row.cells)).toEqual([['en mjölk'], ['mjölken']]);
  });

  it('shows the bare noun when the card has no article', () => {
    expect(formsTable('English', { forms: bok })!.rows[0].cells[0]).toBe('bok');
  });

  it('lays an adjective out as one unlabelled row', () => {
    expect(formsTable('English', { forms: { kind: 'adjective', common: 'röd', neuter: 'rött', plural: 'röda' } })).toEqual({
      columns: ['en', 'ett', 'Plural'],
      rows: [{ cells: ['röd', 'rött', 'röda'] }],
      caption: 'not checked',
    });
  });

  it('is nothing for a card with no forms', () => {
    expect(formsTable('English', { gender: 'en' })).toBeUndefined();
  });
});

describe('formsRule', () => {
  it('asks Swedish for the forms as fields and French for a sentence', () => {
    expect(formsRule('Swedish', 'English').rule).toContain('"forms"');
    expect(formsRule('Swedish', 'English').rule).not.toContain('"formsNote"');
    expect(formsRule('French', 'English').json).toContain('"formsNote"');
    for (const language of ['Korean', 'Spanish', 'Japanese', 'Arabic', 'Hanja']) {
      expect(formsRule(language, 'English')).toEqual({ rule: '', json: '' });
    }
  });

  // The note is read in the definition's language, so its examples are too.
  it("words the French examples in the reader's language", () => {
    expect(formsRule('French', 'English').rule).toContain('Irregular plural: chevaux');
    expect(formsRule('French', 'Korean').rule).toContain('불규칙 복수형: chevaux');
  });
});

describe('a looked-up card', () => {
  const core: TermCore = {
    term: 'cheval',
    termLanguage: 'French',
    french: 'cheval',
    english: 'horse',
    gender: 'le',
    partOfSpeech: 'noun',
    briefDefinition: 'A large four-legged animal that people ride.',
    formsNote: 'Irregular plural: chevaux.',
  };

  it('carries the note from the lookup onto the card', () => {
    expect(buildLookupCardDraft(core, 'French', 'English').formsNote).toBe(core.formsNote);
  });

  it('carries the forms table from the lookup onto the card', () => {
    const bok: TermCore = {
      term: 'bok', termLanguage: 'Swedish', swedish: 'bok', english: 'book', gender: 'en', partOfSpeech: 'noun',
      forms: { kind: 'noun', indefiniteSingular: 'bok', definiteSingular: 'boken', indefinitePlural: 'böcker', definitePlural: 'böckerna' },
    };
    expect(buildLookupCardDraft(bok, 'Swedish', 'English').forms).toEqual(bok.forms);
  });

  it('carries neither when the lookup gave neither', () => {
    const plain: TermCore = { ...core, term: 'table', french: 'table', english: 'table', gender: 'la' };
    delete plain.formsNote;
    const draft = buildLookupCardDraft(plain, 'French', 'English');
    expect('formsNote' in draft).toBe(false);
    expect('forms' in draft).toBe(false);
  });
});
