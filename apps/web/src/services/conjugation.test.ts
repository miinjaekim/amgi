import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  buildTable,
  buildTables,
  conjugationHints,
  conjugationItemId,
  conjugationSpec,
  dueTables,
  freshProgress,
  hasConjugation,
  hintedVerdict,
  isCorrectForm,
  pickPerson,
  rateTable,
} from '@amgi/core';
import type { ConjugationProgressMap, ConjugationSpec } from '@amgi/core';

const spec = conjugationSpec('French') as ConjugationSpec;
const verb = (id: string) => spec.verbs.find(v => v.id === id)!;
const table = (id: string, tense: string) => buildTable(spec, verb(id), tense);
/** A table's six forms in person order, which is how a learner reads one. */
const row = (id: string, tense: string) => spec.persons.map(p => table(id, tense).forms[p.id]);

/**
 * The engine's whole job, pinned against forms that are not in dispute.
 *
 * These are the assertions that make "computed, not authored" safe: a rule
 * engine that is wrong is wrong for every verb in its class at once, so a
 * handful of tables per class catches it.
 */
describe('French regular conjugation', () => {
  it('conjugates -er verbs in the present', () => {
    expect(row('parler', 'present')).toEqual(['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']);
  });

  it('conjugates -ir verbs in the present', () => {
    expect(row('finir', 'present')).toEqual(['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent']);
  });

  it('conjugates -re verbs in the present', () => {
    expect(row('vendre', 'present')).toEqual(['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent']);
  });

  it('builds the imperfect off the present nous stem', () => {
    expect(row('parler', 'imparfait')).toEqual(['parlais', 'parlais', 'parlait', 'parlions', 'parliez', 'parlaient']);
    expect(row('finir', 'imparfait')).toEqual(['finissais', 'finissais', 'finissait', 'finissions', 'finissiez', 'finissaient']);
    expect(row('vendre', 'imparfait')).toEqual(['vendais', 'vendais', 'vendait', 'vendions', 'vendiez', 'vendaient']);
  });

  it('builds the future on the infinitive, less a final -e', () => {
    expect(row('parler', 'futur')).toEqual(['parlerai', 'parleras', 'parlera', 'parlerons', 'parlerez', 'parleront']);
    expect(row('finir', 'futur')).toEqual(['finirai', 'finiras', 'finira', 'finirons', 'finirez', 'finiront']);
    expect(row('vendre', 'futur')).toEqual(['vendrai', 'vendras', 'vendra', 'vendrons', 'vendrez', 'vendront']);
  });

  /**
   * The rule most likely to be got wrong, and the reason it is applied per
   * ending rather than baked into a stem: the softening happens before `a` and
   * `o` and nowhere else, so `nous mangeons` but `nous mangions`.
   */
  it('softens -ger and -cer before a and o, and only there', () => {
    expect(row('manger', 'present')).toEqual(['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent']);
    expect(row('manger', 'imparfait')).toEqual(['mangeais', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient']);
    expect(row('commencer', 'present')).toEqual(['commence', 'commences', 'commence', 'commençons', 'commencez', 'commencent']);
    expect(row('commencer', 'imparfait')).toEqual(['commençais', 'commençais', 'commençait', 'commencions', 'commenciez', 'commençaient']);
  });

  /** The future is built on the infinitive, whose own e already softens. */
  it('leaves the future of -ger and -cer verbs alone', () => {
    expect(row('manger', 'futur')[0]).toBe('mangerai');
    expect(row('commencer', 'futur')[0]).toBe('commencerai');
  });

  it('keeps accents in the stem', () => {
    expect(row('reussir', 'present')[0]).toBe('réussis');
    expect(row('ecouter', 'present')[0]).toBe('écoute');
  });

  it('gives every verb a form for every person in every tense', () => {
    for (const t of buildTables(spec, spec.tenses.map(x => x.id))) {
      for (const person of spec.persons) {
        // `il vend` is the one legitimately empty ending, and it still produces
        // a form — the stem alone.
        expect(t.forms[person.id]).toBeTruthy();
      }
    }
  });
});

describe('answers', () => {
  it('accepts the bare form', () => {
    expect(isCorrectForm(spec, table('parler', 'present'), 'p1', 'parlons')).toBe(true);
  });

  /** Folding is `typedAnswer`'s, and case and spacing are already handled. */
  it('accepts the form however it was capitalised or spaced', () => {
    expect(isCorrectForm(spec, table('parler', 'present'), 'p1', '  Parlons ')).toBe(true);
  });

  /**
   * ⚠️ The accent is the content here. A grader that folded it would teach that
   * it is optional, which for a conjugation table is the whole lesson.
   */
  it('rejects a form missing its accent', () => {
    expect(isCorrectForm(spec, table('reussir', 'present'), 's1', 'reussis')).toBe(false);
    expect(isCorrectForm(spec, table('commencer', 'present'), 'p1', 'commencons')).toBe(false);
  });

  it('accepts the form behind its subject pronoun', () => {
    expect(isCorrectForm(spec, table('parler', 'present'), 's1', 'je parle')).toBe(true);
    expect(isCorrectForm(spec, table('aimer', 'present'), 's1', "j'aime")).toBe(true);
  });

  it('elides je only before a vowel or h', () => {
    expect(acceptedForms(spec, table('aimer', 'present'), 's1')).toContain("j'aime");
    expect(acceptedForms(spec, table('habiter', 'present'), 's1')).toContain("j'habite");
    expect(acceptedForms(spec, table('parler', 'present'), 's1')).toContain('je parle');
  });

  it('rejects another person\'s form', () => {
    expect(isCorrectForm(spec, table('parler', 'present'), 'p1', 'parlez')).toBe(false);
  });
});

describe('scheduling', () => {
  const NOW = new Date('2026-09-21T12:00:00Z');
  const id = (v: string, t: string) => conjugationItemId('French', v, t);

  it('treats a table that has never been asked as due', () => {
    const tables = buildTables(spec, ['present']);
    expect(dueTables(spec, tables, {}, NOW)).toHaveLength(tables.length);
  });

  it('withholds a table scheduled for later', () => {
    const later = new Date('2026-10-01T12:00:00Z').toISOString();
    const progress: ConjugationProgressMap = {
      [id('parler', 'present')]: { ...freshProgress(NOW), nextReview: later },
    };
    const due = dueTables(spec, buildTables(spec, ['present']), progress, NOW);
    expect(due.find(t => t.verbId === 'parler')).toBeUndefined();
  });

  /**
   * The decision this module is shaped by: one schedule per table, so a miss on
   * one box moves the whole table and leaves no box with a schedule of its own.
   */
  it('moves the whole table when one box is missed', () => {
    const after = rateTable(undefined, 'p1', 'again');
    expect(new Date(after.nextReview).getTime()).toBeLessThanOrEqual(Date.now());
    expect(after.repetitions).toBe(0);
    expect(after.misses).toEqual({ p1: 1 });
  });

  it('counts misses per box and clears one that is answered', () => {
    let state = rateTable(undefined, 'p1', 'again');
    state = rateTable(state, 'p1', 'again');
    expect(state.misses.p1).toBe(2);
    state = rateTable(state, 'p1', 'good');
    expect(state.misses.p1).toBeUndefined();
  });

  /** A hinted-to-death answer is a miss, or the weak box stops being offered. */
  it('counts a two-hint answer as a miss', () => {
    const state = rateTable(undefined, 's3', hintedVerdict(2, true));
    expect(state.misses.s3).toBe(1);
  });

  it('asks the box that has been missed most', () => {
    const state = { ...freshProgress(NOW), misses: { p2: 3, s1: 1 } };
    expect(pickPerson(spec, state, () => 0).id).toBe('p2');
  });

  /**
   * With nothing missed, every box is a candidate — a stable pick would drill
   * one sixth of the table forever.
   */
  it('spreads across the table when nothing has been missed', () => {
    const picked = new Set<string>();
    for (let i = 0; i < 6; i++) picked.add(pickPerson(spec, undefined, () => i / 6).id);
    expect(picked.size).toBe(6);
  });

  it('never runs off the end of the person list', () => {
    expect(pickPerson(spec, undefined, () => 1).id).toBe('p3');
  });
});

describe('hints', () => {
  it('splits the form into two halves that reassemble into it', () => {
    const [stem, ending] = conjugationHints(table('parler', 'present'), 'p1');
    expect(stem.replace('…', '') + ending.replace('…', '')).toBe('parlons');
  });

  /** The verdict falls as the search space narrows — that is the whole cost. */
  it('lowers the best available verdict per hint taken', () => {
    expect(hintedVerdict(0, true)).toBe('good');
    expect(hintedVerdict(1, true)).toBe('hard');
    expect(hintedVerdict(2, true)).toBe('again');
    expect(hintedVerdict(0, false)).toBe('again');
  });
});

describe('languages', () => {
  it('has French and says so', () => {
    expect(hasConjugation('French')).toBe(true);
  });

  /** Every other language answers honestly rather than throwing. */
  it('has nothing for a language with no spec yet', () => {
    expect(hasConjugation('Korean')).toBe(false);
    expect(conjugationSpec('Korean')).toBeUndefined();
  });
});
