import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  buildTable,
  conjugationSpec,
  dueBoxes,
  isCorrectForm,
  normalizeProgress,
  parseConjugationForms,
  rateBox,
  tensePersons,
} from '@amgi/core';
import type { ConjugationIrregularVerb, ConjugationSpec } from '@amgi/core';

const base = conjugationSpec('French')!;
const NOW = new Date('2026-10-16T12:00:00Z');

/**
 * The shipped spec with a compound tense and the impératif on `aller`, built by
 * hand: what these tests are about is the grammar, not how a tense is added.
 */
const aller: ConjugationIrregularVerb = {
  kind: 'verb', id: 'aller', infinitive: 'aller',
  forms: {
    'passe-compose': { s1: 'suis allé', s2: 'es allé', s3: 'est allé', p1: 'sommes allés', p2: 'êtes allé', p3: 'sont allés' },
    imperatif: { s2: 'va', p1: 'allons', p2: 'allez' },
  },
};
const parler: ConjugationIrregularVerb = {
  kind: 'verb', id: 'parler', infinitive: 'parler',
  forms: {
    'passe-compose': { s1: 'ai parlé', s2: 'as parlé', s3: 'a parlé', p1: 'avons parlé', p2: 'avez parlé', p3: 'ont parlé' },
  },
};
const spec: ConjugationSpec = {
  ...base,
  tenses: [
    ...base.tenses,
    { id: 'passe-compose', label: 'passé composé', compound: true },
    { id: 'imperatif', label: 'impératif', personIds: ['s2', 'p1', 'p2'], noPronoun: true },
  ],
  subjects: [aller, parler],
};

describe('a tense with fewer persons', () => {
  it('has the persons it names, in the spec order', () => {
    expect(tensePersons(spec, 'imperatif').map(p => p.label)).toEqual(['tu', 'nous', 'vous']);
    expect(tensePersons(spec, 'present')).toHaveLength(6);
  });

  it('schedules only those boxes', () => {
    const table = buildTable(spec, aller, 'imperatif');
    expect(dueBoxes(spec, table, {}, NOW)).toEqual(['s2', 'p1', 'p2']);
  });

  it('drops progress for a person the tense lacks', () => {
    const state = rateBox(undefined, 'good');
    const kept = normalizeProgress(spec, {
      'French:verb:aller:imperatif:s2': state,
      'French:verb:aller:imperatif:s1': state,
    });
    expect(Object.keys(kept)).toEqual(['French:verb:aller:imperatif:s2']);
  });

  it('reads three forms in person order', () => {
    expect(parseConjugationForms(spec, { imperatif: ['va', 'allons', 'allez'] }))
      .toEqual({ imperatif: { s2: 'va', p1: 'allons', p2: 'allez' } });
    expect(parseConjugationForms(spec, { imperatif: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'] }))
      .toBeUndefined();
  });

  it('accepts no pronoun in front of an impératif', () => {
    const table = buildTable(spec, aller, 'imperatif');
    expect(acceptedForms(spec, table, 's2')).toEqual(['va']);
    expect(isCorrectForm(spec, table, 's2', 'tu va')).toBe(false);
  });
});

describe('compound forms', () => {
  it('stores two words in a compound tense, pronoun or not', () => {
    expect(parseConjugationForms(spec, {
      'passe-compose': ["j'ai parlé", 'tu as parlé', 'il a parlé', 'nous avons parlé', 'vous avez parlé', 'ils ont parlé'],
    })).toEqual({ 'passe-compose': parler.forms['passe-compose'] });
  });

  it('refuses two words in a simple tense, and one in a compound one', () => {
    expect(parseConjugationForms(spec, {
      present: ['vais parler', 'vas', 'va', 'allons', 'allez', 'vont'],
    })).toBeUndefined();
    expect(parseConjugationForms(spec, {
      'passe-compose': ['parlé', 'as parlé', 'a parlé', 'avons parlé', 'avez parlé', 'ont parlé'],
    })).toBeUndefined();
  });

  it('takes the subjonctif particle off', () => {
    const subj: ConjugationSpec = { ...spec, tenses: [{ id: 'subjonctif', label: 'subjonctif présent' }] };
    expect(parseConjugationForms(subj, {
      subjonctif: ['que je parle', 'que tu parles', "qu'il parle", 'que nous parlions', 'que vous parliez', "qu'ils parlent"],
    })).toEqual({ subjonctif: { s1: 'parle', s2: 'parles', s3: 'parle', p1: 'parlions', p2: 'parliez', p3: 'parlent' } });
  });

  it('accepts the elided subject on a compound form', () => {
    const table = buildTable(spec, parler, 'passe-compose');
    expect(isCorrectForm(spec, table, 's1', "j'ai parlé")).toBe(true);
  });
});

describe('agreement after être', () => {
  const table = buildTable(spec, aller, 'passe-compose');

  it('accepts either gender in the singular', () => {
    expect(isCorrectForm(spec, table, 's1', 'suis allée')).toBe(true);
    expect(isCorrectForm(spec, table, 's1', 'je suis allée')).toBe(true);
    expect(isCorrectForm(spec, table, 's1', 'suis allés')).toBe(false);
  });

  it('accepts either gender in the plural, and no singular', () => {
    expect(isCorrectForm(spec, table, 'p1', 'sommes allées')).toBe(true);
    expect(isCorrectForm(spec, table, 'p3', 'sont allés')).toBe(true);
    expect(isCorrectForm(spec, table, 'p3', 'sont allé')).toBe(false);
  });

  it('accepts all four after vous, the polite singular included', () => {
    for (const typed of ['êtes allé', 'êtes allée', 'êtes allés', 'êtes allées']) {
      expect(isCorrectForm(spec, table, 'p2', typed)).toBe(true);
    }
  });

  it('reads a vous form stored plural the same way', () => {
    const plural = { ...table, forms: { ...table.forms, p2: 'êtes allés' } };
    expect(isCorrectForm(spec, plural, 'p2', 'êtes allé')).toBe(true);
    expect(isCorrectForm(spec, plural, 'p2', 'êtes allées')).toBe(true);
  });

  it('accepts no agreement after avoir', () => {
    const avoir = buildTable(spec, parler, 'passe-compose');
    expect(isCorrectForm(spec, avoir, 's1', 'ai parlée')).toBe(false);
    expect(isCorrectForm(spec, avoir, 'p1', 'avons parlés')).toBe(false);
  });
});
