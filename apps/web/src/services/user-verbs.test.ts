import { describe, it, expect } from 'vitest';
import {
  buildConjugationQueue,
  buildTable,
  buildTables,
  conjugationSpec,
  conjugationVerbKey,
  findSubject,
  isPronominalVerb,
  isUserVerb,
  normalizeEnrolment,
  normalizeProgress,
  parseConjugationForms,
  settleUserVerb,
  subjectsOfKind,
  summarizeConjugation,
  userVerbOutcomeCopy,
  listVerbRows,
  userVerbSubjectKey,
  withUserVerbs,
} from '@amgi/core';
import type { ConjugationGroup, UserVerbMap } from '@amgi/core';

const spec = conjugationSpec('French')!;
const NOW = new Date('2026-10-04T12:00:00Z');

/** Forms the way the lookup route hands them over: six per tense, in person order. */
const DANSER = {
  present: ['danse', 'danses', 'danse', 'dansons', 'dansez', 'dansent'],
  imparfait: ['dansais', 'dansais', 'dansait', 'dansions', 'dansiez', 'dansaient'],
  futur: ['danserai', 'danseras', 'dansera', 'danserons', 'danserez', 'danseront'],
};
const PRENDRE = {
  present: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
  imparfait: ['prenais', 'prenais', 'prenait', 'prenions', 'preniez', 'prenaient'],
  futur: ['prendrai', 'prendras', 'prendra', 'prendrons', 'prendrez', 'prendront'],
};
const APPELER = {
  present: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'],
  imparfait: ['appelais', 'appelais', 'appelait', 'appelions', 'appeliez', 'appelaient'],
  futur: ['appellerai', 'appelleras', 'appellera', 'appellerons', 'appellerez', 'appelleront'],
};
const NAGER = {
  present: ['nage', 'nages', 'nage', 'nageons', 'nagez', 'nagent'],
  imparfait: ['nageais', 'nageais', 'nageait', 'nagions', 'nagiez', 'nageaient'],
  futur: ['nagerai', 'nageras', 'nagera', 'nagerons', 'nagerez', 'nageront'],
};

const verb = (french: string, verbGroup: string | undefined, conjugation: unknown) =>
  settleUserVerb(spec, { french, partOfSpeech: 'verb', verbGroup, conjugation }, NOW);

/** A learner's stored verbs, from what `settleUserVerb` added. */
function stored(...outcomes: ReturnType<typeof settleUserVerb>[]): UserVerbMap {
  const map: UserVerbMap = {};
  for (const outcome of outcomes) {
    if (outcome.status !== 'added') throw new Error(`not added: ${outcome.status}`);
    map[conjugationVerbKey('French', outcome.verb.infinitive)] = outcome.verb;
  }
  return map;
}

describe('parseConjugationForms', () => {
  it('keys six forms by person', () => {
    expect(parseConjugationForms(spec, DANSER)?.present).toEqual({
      s1: 'danse', s2: 'danses', s3: 'danse', p1: 'dansons', p2: 'dansez', p3: 'dansent',
    });
  });

  /** The prompt asks for bare forms; a model that adds the pronoun is tidied, not refused. */
  it('takes a subject pronoun off', () => {
    const forms = parseConjugationForms(spec, {
      present: ["j'ai", 'tu as', 'il/elle a', 'nous avons', 'vous avez', 'ils ont'],
    });
    expect(Object.values(forms!.present)).toEqual(['ai', 'as', 'a', 'avons', 'avez', 'ont']);
  });

  it('drops a tense that is incomplete or unknown, and returns nothing when none is left', () => {
    const forms = parseConjugationForms(spec, {
      ...DANSER, imparfait: DANSER.imparfait.slice(0, 5), subjonctif: DANSER.present,
    });
    expect(Object.keys(forms!)).toEqual(['present', 'futur']);
    expect(parseConjugationForms(spec, { present: ['danse', null, '', 1, 'x y', 'z'] })).toBeUndefined();
    expect(parseConjugationForms(spec, null)).toBeUndefined();
  });

  it('reads back what it wrote', () => {
    const forms = parseConjugationForms(spec, PRENDRE);
    expect(parseConjugationForms(spec, forms)).toEqual(forms);
  });
});

describe('settleUserVerb', () => {
  it('makes a regular verb a vehicle, and stores no forms for it', () => {
    expect(verb('danser', 'er', DANSER)).toEqual({
      status: 'added',
      verb: { infinitive: 'danser', group: 'er', addedAt: NOW.toISOString() },
      subjectKey: 'group:er',
    });
  });

  /** `-ger` is its own group: `nageons` is not what the plain `-er` rule gives. */
  it('files a -ger verb under -ger', () => {
    const outcome = verb('nager', 'er', NAGER);
    expect(outcome).toMatchObject({ status: 'added', subjectKey: 'group:ger', verb: { group: 'ger' } });
  });

  it('gives an irregular verb its own table, with every tense', () => {
    const outcome = verb('prendre', 'irregular', PRENDRE);
    expect(outcome).toMatchObject({ status: 'added', subjectKey: 'verb:prendre', verb: { group: 'irregular' } });
    if (outcome.status !== 'added') throw new Error('unreachable');
    expect(Object.keys(outcome.verb.forms!)).toEqual(['present', 'imparfait', 'futur']);
    expect(outcome.verb.forms!.present.p3).toBe('prennent');
  });

  /**
   * The local check. The model calls `appeler` an `-er` verb, which it is, but
   * the rule gives `appele`. As a vehicle it would mark a learner wrong for
   * applying the rule correctly.
   */
  it('does not believe a regular group the forms contradict', () => {
    expect(verb('appeler', 'er', APPELER)).toMatchObject({
      status: 'added', subjectKey: 'verb:appeler', verb: { group: 'irregular' },
    });
    // `partir` ends in -ir; a model that calls it `ir` is contradicted by `pars`.
    const partir = {
      present: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'],
      imparfait: ['partais', 'partais', 'partait', 'partions', 'partiez', 'partaient'],
      futur: ['partirai', 'partiras', 'partira', 'partirons', 'partirez', 'partiront'],
    };
    expect(verb('partir', 'ir', partir)).toMatchObject({ verb: { group: 'irregular' } });
  });

  it('points at a verb Munli already has instead of adding it', () => {
    expect(verb('être', 'irregular', PRENDRE)).toEqual({ status: 'exists', infinitive: 'être', subjectKey: 'verb:etre' });
    expect(verb('parler', 'er', DANSER)).toEqual({ status: 'exists', infinitive: 'parler', subjectKey: 'group:er' });
    const mine = withUserVerbs(spec, stored(verb('danser', 'er', DANSER)));
    expect(settleUserVerb(mine, { french: 'Danser', partOfSpeech: 'verb', verbGroup: 'er', conjugation: DANSER }))
      .toMatchObject({ status: 'exists', subjectKey: 'group:er' });
  });

  it('refuses a pronominal verb', () => {
    expect(verb('se lever', 'er', DANSER)).toEqual({ status: 'pronominal' });
    expect(verb("s'appeler", 'er', APPELER)).toEqual({ status: 'pronominal' });
    expect(isPronominalVerb('S’habiller')).toBe(true);
    expect(isPronominalVerb('sembler')).toBe(false);
    expect(isPronominalVerb('servir')).toBe(false);
  });

  it('refuses what is not a verb, and a verb with no full table', () => {
    expect(settleUserVerb(spec, { french: 'maison', partOfSpeech: 'noun' })).toEqual({ status: 'notVerb' });
    expect(verb('avoir faim', 'irregular', PRENDRE)).toEqual({ status: 'notVerb' });
    expect(verb('falloir', 'irregular', null)).toEqual({ status: 'noForms', infinitive: 'falloir' });
    expect(verb('prendre', 'irregular', { present: PRENDRE.present }))
      .toEqual({ status: 'noForms', infinitive: 'prendre' });
  });

  it('says where the verb landed', () => {
    const danser = verb('danser', 'er', DANSER);
    expect(userVerbSubjectKey(danser)).toBe('group:er');
    expect(userVerbOutcomeCopy(spec, danser)).toEqual({ key: 'verbAddedRegular', params: { verb: 'danser', group: '-er' } });
    const prendre = verb('prendre', 'irregular', PRENDRE);
    expect(userVerbSubjectKey(prendre)).toBe('verb:prendre');
    // From Amgi the first tense is saved with the verb, and the line says so.
    expect(userVerbOutcomeCopy(spec, prendre, 'présent'))
      .toEqual({ key: 'verbAddedIrregularSaved', params: { verb: 'prendre', tense: 'présent' } });
    expect(userVerbOutcomeCopy(spec, danser, 'présent').key).toBe('verbAddedRegular');
    expect(userVerbOutcomeCopy(spec, prendre).key).toBe('verbAddedIrregular');
    expect(userVerbSubjectKey({ status: 'pronominal' })).toBeUndefined();
  });
});

describe('withUserVerbs', () => {
  const mine = withUserVerbs(spec, stored(
    verb('danser', 'er', DANSER), verb('nager', 'er', NAGER), verb('prendre', 'irregular', PRENDRE),
  ));
  const er = findSubject(mine, 'group:er') as ConjugationGroup;

  it('is the language spec itself when there is nothing to add', () => {
    expect(withUserVerbs(spec, undefined)).toBe(spec);
    expect(withUserVerbs(spec, {})).toBe(spec);
  });

  it('adds a regular verb after the built-in vehicles, so the default one stays sourced', () => {
    expect(er.vehicles.at(-1)).toBe('danser');
    expect(er.vehicles[0]).toBe('parler');
    expect((findSubject(mine, 'group:ger') as ConjugationGroup).vehicles).toContain('nager');
    expect(buildTable(mine, er, 'present').userAdded).toBeUndefined();
  });

  it('schedules nothing new for a regular verb', () => {
    const enrolment = normalizeEnrolment(mine, undefined);
    expect(enrolment).toEqual(normalizeEnrolment(spec, undefined));
    expect(buildTables(mine, enrolment)).toHaveLength(buildTables(spec, enrolment).length);
  });

  it('adds an irregular verb as a subject of its own', () => {
    expect(subjectsOfKind(mine, 'verb').map(v => v.infinitive)).toEqual(['être', 'avoir', 'aller', 'prendre']);
    const table = buildTable(mine, findSubject(mine, 'verb:prendre')!, 'present');
    expect(table.forms.p1).toBe('prenons');
    expect(table.userAdded).toBe(true);
  });

  /** The label follows the verb: every table built on an added one is marked. */
  it('marks every table an added verb is shown through, and no other', () => {
    expect(isUserVerb(mine, 'danser')).toBe(true);
    expect(isUserVerb(mine, 'parler')).toBe(false);
    expect(isUserVerb(spec, 'danser')).toBe(false);
    expect(buildTable(mine, er, 'imparfait', 'danser').userAdded).toBe(true);
    expect(buildTable(mine, er, 'imparfait', 'parler').userAdded).toBeUndefined();
  });

  it('draws an added verb as its group vehicle, marked', () => {
    const tables = buildTables(mine, { items: ['group:er:present'] });
    // The last slot of the draw is the last vehicle, which is the added one.
    const queue = buildConjugationQueue(mine, tables, {}, { wholeTable: true }, NOW, () => 0.999);
    expect(queue[0].table.infinitive).toBe('danser');
    expect(queue[0].table.userAdded).toBe(true);
    expect(queue[0].table.forms.p1).toBe('dansons');
  });

  it('keeps an added irregular verb enrolled and scheduled only under the learner’s spec', () => {
    const items = ['group:er:present', 'verb:prendre:present'];
    expect(normalizeEnrolment(mine, { items }).items).toEqual(items);
    expect(normalizeEnrolment(spec, { items }).items).toEqual(['group:er:present']);
    const box = { 'French:verb:prendre:present:p3': { interval: 1, ease: 2.5, repetitions: 1, nextReview: NOW.toISOString(), misses: 2 } };
    expect(normalizeProgress(mine, box)).toEqual(box);
    expect(normalizeProgress(spec, box)).toEqual({});
    const summary = summarizeConjugation(mine, { items }, box, 5, NOW);
    expect(summary.weakest).toEqual([
      { subjectLabel: 'prendre', tenseLabel: 'présent', personLabel: 'ils/elles', form: 'prennent', misses: 2, userAdded: true },
    ]);
  });

  it('lists the topic as rows, each saying how much of it is saved', () => {
    const rows = listVerbRows(mine, { items: ['group:er:present', 'group:er:futur', 'verb:prendre:present'] });
    expect(rows.map(row => row.label)).toEqual(['-er', '-cer', '-ger', '-ir', '-re', 'être', 'avoir', 'aller', 'prendre']);
    expect(rows[0]).toMatchObject({ key: 'group:er', kind: 'group', saved: 2, total: 3, userAdded: false });
    expect(rows[0].preview).toContain('parler, regarder');
    expect(rows[0].preview.endsWith('danser')).toBe(true);
    expect(rows[5]).toMatchObject({ label: 'être', preview: 'suis, es, est…', saved: 0, userAdded: false });
    expect(rows[8]).toMatchObject({ key: 'verb:prendre', preview: 'prends, prends, prend…', saved: 1, total: 3, userAdded: true });
  });

  it('drops a stored verb the spec carries itself, or that no longer fits', () => {
    const at = NOW.toISOString();
    const forms = parseConjugationForms(spec, PRENDRE);
    const odd: UserVerbMap = {
      'French:être': { infinitive: 'être', group: 'irregular', forms, addedAt: at },
      'French:parler': { infinitive: 'parler', group: 'er', addedAt: at },
      // Filed under the wrong language, the wrong key, the wrong group, and with no forms.
      'Spanish:hablar': { infinitive: 'hablar', group: 'er', addedAt: at },
      'French:chanter': { infinitive: 'danser', group: 'er', addedAt: at },
      'French:vendre': { infinitive: 'vendre', group: 'ir', addedAt: at },
      'French:venir': { infinitive: 'venir', group: 'irregular', addedAt: at },
      'French:se lever': { infinitive: 'se lever', group: 'er', addedAt: at },
    };
    expect(withUserVerbs(spec, odd)).toBe(spec);
  });

  it('orders added verbs by when they were added, on every device', () => {
    const map: UserVerbMap = {
      'French:chanter': { infinitive: 'chanter', group: 'er', addedAt: '2026-10-05T00:00:00.000Z' },
      'French:danser': { infinitive: 'danser', group: 'er', addedAt: '2026-10-04T00:00:00.000Z' },
    };
    expect(withUserVerbs(spec, map).userVerbs).toEqual(['danser', 'chanter']);
  });
});
