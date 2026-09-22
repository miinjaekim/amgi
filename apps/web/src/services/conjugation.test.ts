import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  boxItemId,
  buildConjugationQueue,
  buildParadigm,
  buildTable,
  buildTables,
  conjugationHints,
  conjugationSpec,
  countDueBoxes,
  countQuestions,
  daysUntil,
  enrolledCountOfKind,
  enrolledTenses,
  enrolmentKey,
  defaultEnrolment,
  dueBoxes,
  dueRounds,
  findSubject,
  freshProgress,
  hasConjugation,
  hintedVerdict,
  isCorrectForm,
  listPracticeTables,
  normalizeEnrolment,
  normalizeProgress,
  rateBox,
  setEnrolled,
  subjectKey,
  subjectsOfKind,
  summarizeConjugation,
  tableKey,
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
/** Every group in every tense — the widest practice set the spec allows. */
const everything: ConjugationEnrolment = {
  items: spec.subjects.flatMap(subject => spec.tenses.map(tense => enrolmentKey(subject, tense.id))),
};
const groupCount = spec.subjects.filter(s => s.kind === 'group').length;

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
    const tables = buildTables(spec, all);
    expect(tables).toHaveLength(groupCount);
    expect(new Set(tables.map(t => t.subjectId)).size).toBe(groupCount);
  });

  it('names the group as the subject and the vehicle as the verb', () => {
    const table = buildTable(spec, group('er'), 'present', 'donner');
    expect(table.subjectLabel).toBe('-er');
    expect(table.infinitive).toBe('donner');
    expect(table.forms.p1).toBe('donnons');
  });

  it('gives every vehicle of a group the same key', () => {
    const a = buildTable(spec, group('er'), 'present', 'parler');
    const b = buildTable(spec, group('er'), 'present', 'donner');
    expect(tableKey(spec, a)).toBe(tableKey(spec, b));
    expect(boxItemId(spec, a, 'p1')).toBe(boxItemId(spec, b, 'p1'));
  });

  it('keeps different groups and tenses apart', () => {
    const ids = new Set(buildTables(spec, everything).map(t => tableKey(spec, t)));
    expect(ids.size).toBe(groupCount * spec.tenses.length);
  });

  /** ⚠️ The grain: six schedules per table, not one. */
  it('gives every box of a table its own id', () => {
    const table = buildTable(spec, group('er'), 'present');
    const ids = new Set(spec.persons.map(person => boxItemId(spec, table, person.id)));
    expect(ids.size).toBe(spec.persons.length);
    // A table's key is a prefix of its boxes' ids, and is not one of them.
    for (const id of ids) expect(id.startsWith(`${tableKey(spec, table)}:`)).toBe(true);
    expect(ids.has(tableKey(spec, table))).toBe(false);
  });

  it('falls back to a real vehicle when handed one that is not in the group', () => {
    const table = buildTable(spec, group('er'), 'present', 'vendre');
    expect(group('er').vehicles).toContain(table.infinitive);
  });
});

describe('enrolment', () => {
  it('starts with every group in the first tense only', () => {
    expect(all.items).toHaveLength(groupCount);
    expect(enrolledTenses(spec, all).map(t => t.id)).toEqual([spec.tenses[0].id]);
  });

  /**
   * ⚠️ The shape the cross product could not express: one group in three
   * tenses and another in only one.
   */
  it('can enrol one group in more tenses than another', () => {
    let enrolment: ConjugationEnrolment = { items: [] };
    enrolment = setEnrolled(enrolment, group('er'), spec.tenses.map(t => t.id), true);
    enrolment = setEnrolled(enrolment, group('re'), ['present'], true);
    const tables = buildTables(spec, enrolment);
    expect(tables.filter(t => t.subjectId === 'er')).toHaveLength(spec.tenses.length);
    expect(tables.filter(t => t.subjectId === 're')).toHaveLength(1);
  });

  it('adds only what is missing, so saving twice is not two entries', () => {
    const once = setEnrolled({ items: [] }, group('er'), ['present', 'futur'], true);
    expect(setEnrolled(once, group('er'), ['present'], true).items).toEqual(once.items);
  });

  it('removes only the tenses it was asked about', () => {
    const both = setEnrolled({ items: [] }, group('er'), ['present', 'futur'], true);
    expect(setEnrolled(both, group('er'), ['futur'], false).items)
      .toEqual([enrolmentKey(group('er'), 'present')]);
  });

  /** An empty practice set reads as broken, so the last entry cannot go. */
  it('refuses to empty the practice set', () => {
    const one = setEnrolled({ items: [] }, group('er'), ['present'], true);
    expect(setEnrolled(one, group('er'), ['present'], false)).toEqual(one);
  });

  it('drops anything it no longer recognises', () => {
    const cleaned = normalizeEnrolment(spec, {
      items: ['group:er:present', 'group:er:ghost', 'verb:nope:present', 'nonsense'],
    });
    expect(cleaned.items).toEqual(['group:er:present']);
  });

  it('de-duplicates, so a table is never counted twice', () => {
    expect(normalizeEnrolment(spec, { items: ['group:er:present', 'group:er:present'] }).items)
      .toEqual(['group:er:present']);
  });

  /** The old cross-product shape carries no items, so it falls back rather than needing a migration. */
  it('falls back to the default for an empty, missing or obsolete enrolment', () => {
    expect(normalizeEnrolment(spec, { items: [] })).toEqual(all);
    expect(normalizeEnrolment(spec, undefined)).toEqual(all);
    expect(normalizeEnrolment(spec, { tenses: ['present'], subjects: ['group:er'] } as never)).toEqual(all);
  });

  /** Enrolment is the outer bound; a session can only narrow it. */
  it('cannot practise a tense that is not enrolled', () => {
    expect(buildTables(spec, all, { tenses: ['futur'] })).toEqual([]);
  });

  it('narrows to the chosen subjects', () => {
    const tables = buildTables(spec, everything, { subjects: ['group:er'] });
    expect(new Set(tables.map(t => t.subjectId))).toEqual(new Set(['er']));
    expect(tables).toHaveLength(spec.tenses.length);
  });

  /** Language order, so a list does not reshuffle as the learner adds to it. */
  it('orders tables by tense then subject, not by when they were saved', () => {
    const shuffled: ConjugationEnrolment = {
      items: [enrolmentKey(group('re'), 'futur'), enrolmentKey(group('er'), 'present')],
    };
    expect(buildTables(spec, shuffled).map(t => `${t.subjectId}:${t.tenseId}`))
      .toEqual(['er:present', 're:futur']);
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
  const table = tables[0];
  const boxes = spec.persons.length;
  const allOf = (t: typeof table, nextReview: string): ConjugationProgressMap =>
    Object.fromEntries(spec.persons.map(person => [
      boxItemId(spec, t, person.id), { ...freshProgress(NOW), nextReview },
    ]));

  /** ⚠️ Six facts per table, which is what every due count now counts. */
  it('treats every box of an unpractised table as due', () => {
    expect(dueBoxes(spec, table, {}, NOW)).toEqual(spec.persons.map(p => p.id));
    expect(countDueBoxes(spec, tables, {}, NOW)).toBe(tables.length * boxes);
  });

  it('withholds only the box that is scheduled ahead', () => {
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, table, 'p1')]: { ...freshProgress(NOW), nextReview: LATER },
    };
    expect(dueBoxes(spec, table, progress, NOW)).not.toContain('p1');
    expect(dueBoxes(spec, table, progress, NOW)).toHaveLength(boxes - 1);
    expect(countDueBoxes(spec, tables, progress, NOW)).toBe(tables.length * boxes - 1);
  });

  /**
   * ⚠️ **The defect the 2026-09-22 reversal exists to fix.** One box's verdict
   * used to set the whole table's interval, so answering `tu` scheduled `ils`
   * away with it — five boxes rated on evidence from one.
   */
  it('leaves the other boxes alone when one is answered', () => {
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, table, 's2')]: rateBox(undefined, 'good'),
    };
    expect(dueBoxes(spec, table, progress, NOW))
      .toEqual(spec.persons.map(p => p.id).filter(id => id !== 's2'));
  });

  it('asks a round for every table with a due box, and every due box in it', () => {
    const rounds = dueRounds(spec, tables, {}, NOW);
    expect(rounds).toHaveLength(tables.length);
    expect(countQuestions(rounds)).toBe(tables.length * boxes);
  });

  /** A round with nothing in it is not work, so it is not a round. */
  it('drops a table with nothing due rather than returning it empty', () => {
    const rounds = dueRounds(spec, tables, allOf(table, LATER), NOW);
    expect(rounds).toHaveLength(tables.length - 1);
    expect(rounds.map(r => r.table.subjectId)).not.toContain(table.subjectId);
  });

  it('puts the most overdue table first, and a never-practised one ahead of both', () => {
    const progress: ConjugationProgressMap = {
      ...allOf(tables[0], LATER),
      ...allOf(tables[1], LATER),
      [boxItemId(spec, tables[0], 'p1')]: {
        ...freshProgress(NOW), nextReview: new Date('2026-09-21T12:00:00Z').toISOString(),
      },
      [boxItemId(spec, tables[1], 'p1')]: {
        ...freshProgress(NOW), nextReview: new Date('2026-09-19T12:00:00Z').toISOString(),
      },
    };
    const order = dueRounds(spec, tables, progress, NOW).map(r => r.table.subjectId);
    expect(order.slice(-2)).toEqual([tables[1].subjectId, tables[0].subjectId]);
    expect(order.slice(0, -2)).toEqual(tables.slice(2).map(t => t.subjectId));
  });

  it('makes a missed box due again immediately', () => {
    const after = rateBox(undefined, 'again');
    expect(new Date(after.nextReview).getTime()).toBeLessThanOrEqual(Date.now());
    expect(after.repetitions).toBe(0);
    expect(after.misses).toBe(1);
  });

  it('counts misses on the box and clears the count when it is produced', () => {
    let state = rateBox(undefined, 'again');
    state = rateBox(state, 'again');
    expect(state.misses).toBe(2);
    state = rateBox(state, 'good');
    expect(state.misses).toBe(0);
  });

  it('counts a two-hint answer as a miss', () => {
    expect(rateBox(undefined, hintedVerdict(2, true)).misses).toBe(1);
  });
});

/**
 * ⚠️ **The 2026-09-22 reset, performed on read rather than by a migration.**
 * The user's call was a clean slate: table-grained progress is dropped rather
 * than split into six copies of one interval.
 */
describe('normalizeProgress', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');
  const table = buildTables(spec, all)[0];

  it('keeps a box it recognises', () => {
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, table, 'p1')]: freshProgress(NOW),
    };
    expect(normalizeProgress(spec, progress)).toEqual(progress);
  });

  it('drops the table-grained entries the box grain replaced', () => {
    const old = {
      [tableKey(spec, table)]: {
        interval: 3, ease: 2.5, repetitions: 1,
        nextReview: NOW.toISOString(), misses: { p1: 2 },
      },
    } as unknown as ConjugationProgressMap;
    expect(normalizeProgress(spec, old)).toEqual({});
  });

  it('drops a box whose subject, tense or person the spec has never heard of', () => {
    const progress = {
      'French:group:ghost:present:p1': freshProgress(NOW),
      'French:group:er:ghost:p1': freshProgress(NOW),
      'French:group:er:present:p9': freshProgress(NOW),
      'Korean:group:er:present:p1': freshProgress(NOW),
    } as ConjugationProgressMap;
    expect(normalizeProgress(spec, progress)).toEqual({});
  });

  it('is empty for a user who has never practised', () => {
    expect(normalizeProgress(spec, undefined)).toEqual({});
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
  const boxes = spec.persons.length;

  /** ⚠️ Counted in boxes since 2026-09-22 — a box is what carries a schedule. */
  it('counts every enrolled box as due when none has been practised', () => {
    const summary = summarizeConjugation(spec, all, {}, 5, NOW);
    expect(summary.practised).toBe(0);
    expect(summary.total).toBe(groupCount * boxes);
    expect(summary.due).toBe(summary.total);
  });

  it('only counts what is enrolled', () => {
    expect(summarizeConjugation(spec, everything, {}, 5, NOW).total)
      .toBe(groupCount * spec.tenses.length * boxes);
  });

  it('counts a practised box and takes it out of due when scheduled ahead', () => {
    const table = buildTables(spec, all)[0];
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, table, 'p1')]: {
        ...freshProgress(NOW),
        nextReview: new Date('2026-10-01T12:00:00Z').toISOString(),
      },
    };
    const summary = summarizeConjugation(spec, all, progress, 5, NOW);
    expect(summary.practised).toBe(1);
    expect(summary.due).toBe(summary.total - 1);
  });

  it('adds up its tenses', () => {
    const summary = summarizeConjugation(spec, everything, {}, 5, NOW);
    expect(summary.byTense).toHaveLength(spec.tenses.length);
    expect(summary.byTense.reduce((n, tense) => n + tense.total, 0)).toBe(summary.total);
    expect(summary.byTense.reduce((n, tense) => n + tense.due, 0)).toBe(summary.due);
  });

  /** The tally's payoff — and it names an ending, not a word. */
  it('names the weakest boxes by group, most-missed first', () => {
    const erPresent = buildTable(spec, group('er'), 'present');
    const irPresent = buildTable(spec, group('ir'), 'present');
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, erPresent, 'p1')]: { ...freshProgress(NOW), misses: 3 },
      [boxItemId(spec, irPresent, 's2')]: { ...freshProgress(NOW), misses: 5 },
    };
    const { weakest } = summarizeConjugation(spec, all, progress, 5, NOW);
    expect(weakest[0]).toMatchObject({ subjectLabel: '-ir', personLabel: 'tu', misses: 5 });
    expect(weakest[1]).toMatchObject({ subjectLabel: '-er', personLabel: 'nous', misses: 3 });
  });

  it('reports nothing weak when nothing has been missed', () => {
    const table = buildTables(spec, all)[0];
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, table, 'p1')]: freshProgress(NOW),
    };
    expect(summarizeConjugation(spec, all, progress, 5, NOW).weakest).toEqual([]);
  });
});
describe('buildConjugationQueue', () => {
  const NOW = new Date('2026-09-22T12:00:00Z');
  const LATER = new Date('2026-10-01T12:00:00Z').toISOString();
  const tables = buildTables(spec, all);
  const boxes = spec.persons.length;
  const fixed = () => 0;
  const scheduled = (nextReview: string): ConjugationProgressMap => Object.fromEntries(
    tables.flatMap(table => spec.persons.map(person => [
      boxItemId(spec, table, person.id), { ...freshProgress(NOW), nextReview },
    ])),
  );

  /**
   * ⚠️ **The complaint, answered.** One due table used to be one question: a
   * learner weak on `ils` could finish a session without being asked for it.
   */
  it('asks every due box of every due table', () => {
    const queue = buildConjugationQueue(spec, tables, {}, {}, NOW, fixed);
    expect(queue).toHaveLength(tables.length);
    expect(countQuestions(queue)).toBe(tables.length * boxes);
    for (const round of queue) expect(round.personIds).toEqual(spec.persons.map(p => p.id));
  });

  it('asks only the boxes that are due', () => {
    const progress: ConjugationProgressMap = {
      ...scheduled(LATER),
      [boxItemId(spec, tables[0], 'p3')]: { ...freshProgress(NOW), misses: 2, nextReview: NOW.toISOString() },
    };
    const queue = buildConjugationQueue(spec, tables, progress, {}, NOW, fixed);
    expect(queue).toHaveLength(1);
    expect(queue[0].personIds).toEqual(['p3']);
    expect(queue[0].table.subjectId).toBe(tables[0].subjectId);
  });

  it('is empty when nothing is due', () => {
    expect(buildConjugationQueue(spec, tables, scheduled(LATER), {}, NOW, fixed)).toEqual([]);
  });

  it('asks the whole table when told to include what is not due', () => {
    const queue = buildConjugationQueue(spec, tables, scheduled(LATER), { includeNotDue: true }, NOW, fixed);
    expect(queue).toHaveLength(tables.length);
    expect(countQuestions(queue)).toBe(tables.length * boxes);
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

  /** ⚠️ One vehicle per round: a paradigm of six different verbs is not one. */
  it('conjugates the whole round through a single vehicle', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      for (const round of buildConjugationQueue(spec, tables, {}, {}, NOW, () => r)) {
        const subject = findSubject(spec, `group:${round.table.subjectId}`) as ConjugationGroup;
        expect(subject.vehicles).toContain(round.table.infinitive);
        for (const personId of round.personIds) {
          expect(round.table.forms[personId]).toBeTruthy();
        }
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
  const tables = buildTables(spec, all);
  const boxes = spec.persons.length;
  const allOf = (t: typeof tables[number], nextReview: string): ConjugationProgressMap =>
    Object.fromEntries(spec.persons.map(person => [
      boxItemId(spec, t, person.id), { ...freshProgress(NOW), nextReview },
    ]));

  it('lists everything enrolled, due or not', () => {
    const items = listPracticeTables(spec, all, {}, NOW);
    expect(items).toHaveLength(groupCount);
    expect(items[0].boxes).toHaveLength(boxes);
  });

  /** ⚠️ Unlike `dueRounds`, which is what a session is built from. */
  it('keeps a table that is not due, rather than dropping it', () => {
    const progress = allOf(tables[0], LATER);
    expect(listPracticeTables(spec, all, progress, NOW)).toHaveLength(tables.length);
    expect(dueRounds(spec, tables, progress, NOW)).toHaveLength(tables.length - 1);
  });

  it('says how many boxes are due, not merely that some are', () => {
    const progress: ConjugationProgressMap = {
      ...allOf(tables[0], LATER),
      [boxItemId(spec, tables[0], 'p1')]: { ...freshProgress(NOW), nextReview: NOW.toISOString() },
      [boxItemId(spec, tables[0], 'p2')]: { ...freshProgress(NOW), nextReview: NOW.toISOString() },
    };
    const item = listPracticeTables(spec, all, progress, NOW)
      .find(i => i.itemId === tableKey(spec, tables[0]))!;
    expect(item.due).toBe(true);
    expect(item.dueCount).toBe(2);
    expect(item.started).toBe(boxes);
    // Work waiting says how much, not when.
    expect(item.dueAt).toBeNull();
  });

  it('dates a table with nothing due by its soonest box', () => {
    const progress: ConjugationProgressMap = {
      ...allOf(tables[0], new Date('2026-09-30T12:00:00Z').toISOString()),
      [boxItemId(spec, tables[0], 'p2')]: { ...freshProgress(NOW), nextReview: LATER },
    };
    const item = listPracticeTables(spec, all, progress, NOW)
      .find(i => i.itemId === tableKey(spec, tables[0]))!;
    expect(item.due).toBe(false);
    expect(item.dueCount).toBe(0);
    expect(item.dueAt?.toISOString()).toBe(LATER);
  });

  it('puts what is due first, then what falls due soonest', () => {
    const progress: ConjugationProgressMap = {
      ...allOf(tables[0], new Date('2026-09-30T12:00:00Z').toISOString()),
      ...allOf(tables[1], LATER),
    };
    const items = listPracticeTables(spec, all, progress, NOW);
    expect(items[0].due).toBe(true);
    const notDue = items.filter(i => !i.due);
    expect(notDue[0].table.subjectId).toBe(tables[1].subjectId);
    expect(notDue[1].table.subjectId).toBe(tables[0].subjectId);
  });

  it('treats a table that has never been practised as wholly due, with no date', () => {
    const [item] = listPracticeTables(spec, all, {}, NOW);
    expect(item.due).toBe(true);
    expect(item.dueCount).toBe(boxes);
    expect(item.started).toBe(0);
    expect(item.dueAt).toBeNull();
    expect(item.boxes.every(box => box.state === undefined)).toBe(true);
  });

  it('names the boxes that have been missed, most-missed first', () => {
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, tables[0], 's1')]: { ...freshProgress(NOW), misses: 1 },
      [boxItemId(spec, tables[0], 'p2')]: { ...freshProgress(NOW), misses: 4 },
    };
    const item = listPracticeTables(spec, all, progress, NOW)
      .find(i => i.itemId === tableKey(spec, tables[0]))!;
    expect(item.weakBoxes.map(b => b.personLabel)).toEqual(['vous', 'je']);
  });

  it('reports no weak boxes when nothing has been missed', () => {
    const progress: ConjugationProgressMap = {
      [boxItemId(spec, tables[0], 'p1')]: freshProgress(NOW),
    };
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

describe('subjectsOfKind', () => {
  it('separates the rules from the facts', () => {
    expect(subjectsOfKind(spec, 'group')).toHaveLength(groupCount);
    // Empty until the sourcing job lands, and the split has to survive that.
    expect(subjectsOfKind(spec, 'verb')).toEqual([]);
    expect(subjectsOfKind(spec, 'group').length + subjectsOfKind(spec, 'verb').length)
      .toBe(spec.subjects.length);
  });

  it('counts only the entries belonging to that kind', () => {
    expect(enrolledCountOfKind(spec, all, 'group')).toBe(all.items.length);
    expect(enrolledCountOfKind(spec, all, 'verb')).toBe(0);
  });

  it('counts a partial practice set correctly', () => {
    const one = setEnrolled({ items: [] }, group('er'), ['present', 'futur'], true);
    expect(enrolledCountOfKind(spec, one, 'group')).toBe(2);
  });
});
