import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  buildConjugationQueue,
  buildParadigm,
  buildTable,
  buildTables,
  conjugationHints,
  conjugationSpec,
  daysUntil,
  defaultEnrolment,
  dueTables,
  findSubject,
  freshProgress,
  hasConjugation,
  hintedVerdict,
  isCorrectForm,
  listPracticeTables,
  normalizeEnrolment,
  pickPerson,
  rateTable,
  subjectKey,
  summarizeConjugation,
  tableItemId,
} from '@amgi/core';
import type {
  ConjugationEnrolment, ConjugationGroup, ConjugationProgressMap, ConjugationSpec,
} from '@amgi/core';

const spec = conjugationSpec('French') as ConjugationSpec;
const group = (id: string) => findSubject(spec, `group:${id}`) as ConjugationGroup;
/** A table's six forms in person order, which is how a learner reads one. */
const row = (groupId: string, tense: string, vehicle?: string) => {
  const table = buildTable(spec, group(groupId), tense, vehicle);
  return spec.persons.map(p => table.forms[p.id]);
};
const all = defaultEnrolment(spec);
const everything: ConjugationEnrolment = { ...all, tenses: spec.tenses.map(t => t.id) };

/**
 * The engine's whole job, pinned against forms that are not in dispute.
 *
 * A rule that is wrong is wrong for its entire group at once, so a handful of
 * tables per pattern catches it.
 */
describe('French regular conjugation', () => {
  it('conjugates -er verbs in the present', () => {
    expect(row('er', 'present', 'parler')).toEqual(['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']);
  });

  it('conjugates -ir verbs in the present', () => {
    expect(row('ir', 'present', 'finir')).toEqual(['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent']);
  });

  it('conjugates -re verbs in the present', () => {
    expect(row('re', 'present', 'vendre')).toEqual(['vends', 'vends', 'vend', 'vendons', 'vendez', 'vendent']);
  });

  it('builds the imperfect off the present nous stem', () => {
    expect(row('er', 'imparfait', 'parler')).toEqual(['parlais', 'parlais', 'parlait', 'parlions', 'parliez', 'parlaient']);
    expect(row('ir', 'imparfait', 'finir')).toEqual(['finissais', 'finissais', 'finissait', 'finissions', 'finissiez', 'finissaient']);
    expect(row('re', 'imparfait', 'vendre')).toEqual(['vendais', 'vendais', 'vendait', 'vendions', 'vendiez', 'vendaient']);
  });

  it('builds the future on the infinitive, less a final -e', () => {
    expect(row('er', 'futur', 'parler')).toEqual(['parlerai', 'parleras', 'parlera', 'parlerons', 'parlerez', 'parleront']);
    expect(row('ir', 'futur', 'finir')).toEqual(['finirai', 'finiras', 'finira', 'finirons', 'finirez', 'finiront']);
    expect(row('re', 'futur', 'vendre')).toEqual(['vendrai', 'vendras', 'vendra', 'vendrons', 'vendrez', 'vendront']);
  });

  /**
   * Why `-cer` and `-ger` are groups of their own: the softening happens before
   * `a` and `o` and nowhere else, so `nous mangeons` but `nous mangions`.
   */
  it('softens -ger and -cer before a and o, and only there', () => {
    expect(row('ger', 'present', 'manger')).toEqual(['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent']);
    expect(row('ger', 'imparfait', 'manger')).toEqual(['mangeais', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient']);
    expect(row('cer', 'present', 'commencer')).toEqual(['commence', 'commences', 'commence', 'commençons', 'commencez', 'commencent']);
    expect(row('cer', 'imparfait', 'commencer')).toEqual(['commençais', 'commençais', 'commençait', 'commencions', 'commenciez', 'commençaient']);
  });

  it('leaves the future of -ger and -cer verbs alone', () => {
    expect(row('ger', 'futur', 'manger')[0]).toBe('mangerai');
    expect(row('cer', 'futur', 'commencer')[0]).toBe('commencerai');
  });

  it('keeps accents in the stem', () => {
    expect(row('ir', 'present', 'réussir')[0]).toBe('réussis');
    expect(row('er', 'present', 'écouter')[0]).toBe('écoute');
  });

  /**
   * ⚠️ The constraint that makes a group a group: every vehicle must be
   * conjugated correctly by *its own* rule. A verb filed under `-er` that needs
   * the `-ger` spelling would mark a learner wrong for knowing the pattern.
   */
  it('files every vehicle under a group whose rule actually fits it', () => {
    for (const subject of spec.subjects) {
      if (subject.kind !== 'group') continue;
      for (const vehicle of subject.vehicles) {
        if (subject.id === 'cer') expect(vehicle.endsWith('cer')).toBe(true);
        else if (subject.id === 'ger') expect(vehicle.endsWith('ger')).toBe(true);
        else {
          expect(vehicle.endsWith(subject.id)).toBe(true);
          // and must not need another group's spelling rule
          expect(vehicle.endsWith('cer') || vehicle.endsWith('ger')).toBe(false);
        }
      }
    }
  });

  it('gives every vehicle a form for every person in every tense', () => {
    for (const subject of spec.subjects) {
      if (subject.kind !== 'group') continue;
      for (const vehicle of subject.vehicles) {
        for (const tense of spec.tenses) {
          const table = buildTable(spec, subject, tense.id, vehicle);
          // `il vend` is the one legitimately empty ending, and it still
          // produces a form — the stem alone.
          for (const person of spec.persons) expect(table.forms[person.id]).toBeTruthy();
        }
      }
    }
  });
});

/**
 * The rework's whole point: a group is one fact, practised through whichever
 * verb turns up.
 */
describe('groups as the scheduled subject', () => {
  it('schedules one item per group and tense, not one per verb', () => {
    const tables = buildTables(spec, { tenses: ['present'], subjects: all.subjects });
    expect(tables).toHaveLength(all.subjects.length);
    expect(new Set(tables.map(t => t.subjectId)).size).toBe(all.subjects.length);
  });

  it('names the group as the subject and the vehicle as the verb', () => {
    const table = buildTable(spec, group('er'), 'present', 'donner');
    expect(table.subjectLabel).toBe('-er');
    expect(table.infinitive).toBe('donner');
    expect(table.forms.p1).toBe('donnons');
  });

  it('gives every vehicle of a group the same item id', () => {
    const a = buildTable(spec, group('er'), 'present', 'parler');
    const b = buildTable(spec, group('er'), 'present', 'donner');
    expect(tableItemId(spec, a)).toBe(tableItemId(spec, b));
  });

  it('keeps different groups and tenses apart', () => {
    const ids = new Set(
      buildTables(spec, everything).map(t => tableItemId(spec, t)),
    );
    expect(ids.size).toBe(all.subjects.length * spec.tenses.length);
  });

  it('falls back to a real vehicle when handed one that is not in the group', () => {
    const table = buildTable(spec, group('er'), 'present', 'vendre');
    expect(group('er').vehicles).toContain(table.infinitive);
  });
});

describe('enrolment', () => {
  it('starts with every group and the first tense only', () => {
    expect(all.tenses).toEqual([spec.tenses[0].id]);
    expect(all.subjects).toHaveLength(spec.subjects.filter(s => s.kind === 'group').length);
  });

  it('drops anything it no longer recognises', () => {
    const cleaned = normalizeEnrolment(spec, { tenses: ['present', 'ghost'], subjects: ['group:er', 'verb:nope'] });
    expect(cleaned.tenses).toEqual(['present']);
    expect(cleaned.subjects).toEqual(['group:er']);
  });

  /** An empty practice set looks broken rather than empty, so it never happens. */
  it('falls back to the default rather than leaving nothing enrolled', () => {
    expect(normalizeEnrolment(spec, { tenses: [], subjects: [] })).toEqual(all);
    expect(normalizeEnrolment(spec, undefined)).toEqual(all);
    expect(normalizeEnrolment(spec, { tenses: ['ghost'], subjects: ['verb:nope'] })).toEqual(all);
  });

  /** Enrolment is the outer bound; a session can only narrow it. */
  it('cannot practise a tense that is not enrolled', () => {
    const tables = buildTables(spec, { tenses: ['present'], subjects: all.subjects }, { tenses: ['futur'] });
    expect(tables).toEqual([]);
  });

  it('narrows to the chosen subjects', () => {
    const tables = buildTables(spec, everything, { subjects: ['group:er'] });
    expect(new Set(tables.map(t => t.subjectId))).toEqual(new Set(['er']));
    expect(tables).toHaveLength(spec.tenses.length);
  });
});

describe('answers', () => {
  const table = buildTable(spec, group('er'), 'present', 'parler');

  it('accepts the bare form', () => {
    expect(isCorrectForm(spec, table, 'p1', 'parlons')).toBe(true);
  });

  it('accepts the form however it was capitalised or spaced', () => {
    expect(isCorrectForm(spec, table, 'p1', '  Parlons ')).toBe(true);
  });

  /**
   * ⚠️ The accent is the content here. A grader that folded it would teach that
   * it is optional, which for a conjugation table is the whole lesson.
   */
  it('rejects a form missing its accent', () => {
    expect(isCorrectForm(spec, buildTable(spec, group('ir'), 'present', 'réussir'), 's1', 'reussis')).toBe(false);
    expect(isCorrectForm(spec, buildTable(spec, group('cer'), 'present', 'commencer'), 'p1', 'commencons')).toBe(false);
  });

  it('accepts the form behind its subject pronoun', () => {
    expect(isCorrectForm(spec, table, 's1', 'je parle')).toBe(true);
    expect(isCorrectForm(spec, buildTable(spec, group('er'), 'present', 'aimer'), 's1', "j'aime")).toBe(true);
  });

  it('elides je only before a vowel or h', () => {
    expect(acceptedForms(spec, buildTable(spec, group('er'), 'present', 'aimer'), 's1')).toContain("j'aime");
    expect(acceptedForms(spec, buildTable(spec, group('er'), 'present', 'habiter'), 's1')).toContain("j'habite");
    expect(acceptedForms(spec, table, 's1')).toContain('je parle');
  });

  it("rejects another person's form", () => {
    expect(isCorrectForm(spec, table, 'p1', 'parlez')).toBe(false);
  });
});

describe('scheduling', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');
  const LATER = new Date('2026-10-01T12:00:00Z').toISOString();
  const tables = buildTables(spec, all);
  const itemId = tableItemId(spec, tables[0]);

  it('treats a table that has never been asked as due', () => {
    expect(dueTables(spec, tables, {}, NOW)).toHaveLength(tables.length);
  });

  it('withholds a table scheduled for later', () => {
    const progress: ConjugationProgressMap = { [itemId]: { ...freshProgress(NOW), nextReview: LATER } };
    expect(dueTables(spec, tables, progress, NOW)).toHaveLength(tables.length - 1);
  });

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

  it('counts a two-hint answer as a miss', () => {
    expect(rateTable(undefined, 's3', hintedVerdict(2, true)).misses.s3).toBe(1);
  });

  it('asks the box that has been missed most', () => {
    const state = { ...freshProgress(NOW), misses: { p2: 3, s1: 1 } };
    expect(pickPerson(spec, state, () => 0).id).toBe('p2');
  });

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
    const table = buildTable(spec, group('er'), 'present', 'parler');
    const [stem, ending] = conjugationHints(table, 'p1');
    expect(stem.replace('…', '') + ending.replace('…', '')).toBe('parlons');
  });

  it('lowers the best available verdict per hint taken', () => {
    expect(hintedVerdict(0, true)).toBe('good');
    expect(hintedVerdict(1, true)).toBe('hard');
    expect(hintedVerdict(2, true)).toBe('again');
    expect(hintedVerdict(0, false)).toBe('again');
  });
});

describe('summarizeConjugation', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');

  it('counts every enrolled table as due when none has been practised', () => {
    const summary = summarizeConjugation(spec, all, {}, 5, NOW);
    expect(summary.practised).toBe(0);
    expect(summary.total).toBe(all.subjects.length);
    expect(summary.due).toBe(summary.total);
  });

  it('only counts what is enrolled', () => {
    expect(summarizeConjugation(spec, everything, {}, 5, NOW).total)
      .toBe(all.subjects.length * spec.tenses.length);
  });

  it('counts a practised table and takes it out of due when scheduled ahead', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, tables[0])]: {
        ...freshProgress(NOW),
        nextReview: new Date('2026-10-01T12:00:00Z').toISOString(),
      },
    };
    const summary = summarizeConjugation(spec, all, progress, 5, NOW);
    expect(summary.practised).toBe(1);
    expect(summary.due).toBe(summary.total - 1);
  });

  /** The payoff for the tally — and after the rework it names an ending. */
  it('names the weakest boxes by group, most-missed first', () => {
    const erPresent = buildTable(spec, group('er'), 'present');
    const irPresent = buildTable(spec, group('ir'), 'present');
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, erPresent)]: { ...freshProgress(NOW), misses: { p1: 3 } },
      [tableItemId(spec, irPresent)]: { ...freshProgress(NOW), misses: { s2: 5 } },
    };
    const { weakest } = summarizeConjugation(spec, all, progress, 5, NOW);
    expect(weakest[0]).toMatchObject({ subjectLabel: '-ir', personLabel: 'tu', misses: 5 });
    expect(weakest[1]).toMatchObject({ subjectLabel: '-er', personLabel: 'nous', misses: 3 });
  });

  it('reports nothing weak when nothing has been missed', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = { [tableItemId(spec, tables[0])]: freshProgress(NOW) };
    expect(summarizeConjugation(spec, all, progress, 5, NOW).weakest).toEqual([]);
  });
});

describe('buildConjugationQueue', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');
  const LATER = new Date('2026-10-01T12:00:00Z').toISOString();
  const tables = buildTables(spec, all);
  const fixed = () => 0;

  it('asks every due table exactly once', () => {
    const queue = buildConjugationQueue(spec, tables, {}, {}, NOW, fixed);
    expect(queue).toHaveLength(tables.length);
    expect(new Set(queue.map(q => q.table.subjectId)).size).toBe(tables.length);
  });

  it('is empty when nothing is due', () => {
    const progress: ConjugationProgressMap = Object.fromEntries(
      tables.map(t => [tableItemId(spec, t), { ...freshProgress(NOW), nextReview: LATER }]),
    );
    expect(buildConjugationQueue(spec, tables, progress, {}, NOW, fixed)).toEqual([]);
  });

  it('includes tables that are not due when asked to', () => {
    const progress: ConjugationProgressMap = Object.fromEntries(
      tables.map(t => [tableItemId(spec, t), { ...freshProgress(NOW), nextReview: LATER }]),
    );
    expect(buildConjugationQueue(spec, tables, progress, { includeNotDue: true }, NOW, fixed)).toHaveLength(tables.length);
  });

  it('asks the box that has been missed most', () => {
    const er = buildTable(spec, group('er'), 'present');
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, er)]: { ...freshProgress(NOW), misses: { p2: 4 } },
    };
    const queue = buildConjugationQueue(spec, tables, progress, {}, NOW, fixed);
    expect(queue.find(q => q.table.subjectId === 'er')!.personId).toBe('p2');
  });

  /**
   * ⚠️ The rework's point: the same item asked through different verbs. A queue
   * that always used one vehicle would test the word, not the ending.
   */
  it('varies the vehicle a group is asked through', () => {
    const seen = new Set<string>();
    for (const r of [0, 0.3, 0.6, 0.9]) {
      const queue = buildConjugationQueue(spec, tables, {}, {}, NOW, () => r);
      const er = queue.find(q => q.table.subjectId === 'er');
      if (er) seen.add(er.table.infinitive);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('only ever uses a vehicle from the group it is asking about', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      for (const q of buildConjugationQueue(spec, tables, {}, {}, NOW, () => r)) {
        const subject = findSubject(spec, `group:${q.table.subjectId}`) as ConjugationGroup;
        expect(subject.vehicles).toContain(q.table.infinitive);
      }
    }
  });

  it('shuffles rather than running in subject order', () => {
    const queue = buildConjugationQueue(spec, tables, {}, {}, NOW, () => 0.7);
    expect(queue.map(q => q.table.subjectId)).not.toEqual(tables.map(t => t.subjectId));
  });
});

describe('languages', () => {
  it('has French and says so', () => {
    expect(hasConjugation('French')).toBe(true);
  });

  it('has nothing for a language with no spec yet', () => {
    expect(hasConjugation('Korean')).toBe(false);
    expect(conjugationSpec('Korean')).toBeUndefined();
  });

  it('keys every subject uniquely', () => {
    expect(new Set(spec.subjects.map(subjectKey)).size).toBe(spec.subjects.length);
  });
});

describe('buildParadigm', () => {
  it('gives every tense the language knows, not just the enrolled ones', () => {
    const paradigm = buildParadigm(spec, group('er'), 'parler');
    expect(paradigm.map(p => p.tenseId)).toEqual(spec.tenses.map(t => t.id));
  });

  it('conjugates the vehicle it was handed', () => {
    const [present] = buildParadigm(spec, group('er'), 'donner');
    expect(present.forms.p1).toBe('donnons');
  });

  it('falls back to a real vehicle when handed one from another group', () => {
    const [present] = buildParadigm(spec, group('ir'), 'parler');
    expect(present.forms.p1).toBe('finissons');
  });

  it('agrees with the tables practice is built from', () => {
    for (const tense of spec.tenses) {
      const table = buildTable(spec, group('re'), tense.id, 'attendre');
      const entry = buildParadigm(spec, group('re'), 'attendre').find(p => p.tenseId === tense.id);
      expect(entry?.forms).toEqual(table.forms);
    }
  });
});

describe('listPracticeTables', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');
  const LATER = new Date('2026-09-25T12:00:00Z').toISOString();

  it('lists everything enrolled, due or not', () => {
    const items = listPracticeTables(spec, all, {}, NOW);
    expect(items).toHaveLength(all.subjects.length);
  });

  /** ⚠️ Unlike `dueTables`, which is what a session is built from. */
  it('keeps a table that is not due, rather than dropping it', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, tables[0])]: { ...freshProgress(NOW), nextReview: LATER },
    };
    const items = listPracticeTables(spec, all, progress, NOW);
    expect(items).toHaveLength(tables.length);
    expect(dueTables(spec, tables, progress, NOW)).toHaveLength(tables.length - 1);
  });

  it('puts what is due first, then what falls due soonest', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, tables[0])]: { ...freshProgress(NOW), nextReview: LATER },
      [tableItemId(spec, tables[1])]: {
        ...freshProgress(NOW),
        nextReview: new Date('2026-09-23T12:00:00Z').toISOString(),
      },
    };
    const items = listPracticeTables(spec, all, progress, NOW);
    expect(items[0].due).toBe(true);
    const notDue = items.filter(i => !i.due);
    expect(notDue[0].table.subjectId).toBe(tables[1].subjectId);
    expect(notDue[1].table.subjectId).toBe(tables[0].subjectId);
  });

  it('treats a table that has never been practised as due, with no date', () => {
    const [item] = listPracticeTables(spec, all, {}, NOW);
    expect(item.due).toBe(true);
    expect(item.dueAt).toBeNull();
    expect(item.state).toBeUndefined();
  });

  it('names the boxes that have been missed, most-missed first', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = {
      [tableItemId(spec, tables[0])]: { ...freshProgress(NOW), misses: { s1: 1, p2: 4 } },
    };
    const item = listPracticeTables(spec, all, progress, NOW)
      .find(i => i.itemId === tableItemId(spec, tables[0]))!;
    expect(item.weakBoxes.map(b => b.personLabel)).toEqual(['vous', 'je']);
  });

  it('reports no weak boxes when nothing has been missed', () => {
    const tables = buildTables(spec, all);
    const progress: ConjugationProgressMap = { [tableItemId(spec, tables[0])]: freshProgress(NOW) };
    expect(listPracticeTables(spec, all, progress, NOW)[0].weakBoxes).toEqual([]);
  });
});

describe('daysUntil', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');

  it('is zero for anything already due', () => {
    expect(daysUntil(new Date('2026-09-21T12:00:00Z'), NOW)).toBe(0);
    expect(daysUntil(NOW, NOW)).toBe(0);
  });

  /** Rounds up, so "in six hours" is not indistinguishable from "due now". */
  it('rounds a part-day up', () => {
    expect(daysUntil(new Date('2026-09-22T18:00:00Z'), NOW)).toBe(1);
    expect(daysUntil(new Date('2026-09-23T12:00:00Z'), NOW)).toBe(1);
    expect(daysUntil(new Date('2026-09-25T00:00:00Z'), NOW)).toBe(3);
  });
});
