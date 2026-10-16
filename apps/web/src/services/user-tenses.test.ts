import { describe, it, expect } from 'vitest';
import {
  acceptedForms,
  addedTenses,
  buildConjugationQueue,
  buildTable,
  buildTables,
  conjugationSpec,
  conjugationTenseKey,
  defaultEnrolment,
  dueBoxes,
  enrolAddedTense,
  findSubject,
  isCorrectForm,
  learnerSpec,
  matchCatalogueTense,
  normalizeProgress,
  parseConjugationForms,
  parseTenseForms,
  rateBox,
  removeAddedTense,
  requestTense,
  settleUserTense,
  settleUserVerb,
  tenseFormRule,
  tensePersons,
  tenseVehicles,
  tenseVerbs,
  unverifiedKey,
  userTenseOutcomeCopy,
  withCatalogueTenses,
} from '@amgi/core';
import type { ConjugationIrregularVerb, ConjugationSpec, UserTense, UserTenseMap, UserVerb } from '@amgi/core';

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

/* ── Adding a tense ─────────────────────────────────────────────────────── */

const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
const ETRE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'];

/** A passé composé for a verb, the way the tense route hands it over. */
function passeCompose(verb: string): string[] {
  if (verb === 'aller') return ETRE.map((aux, i) => `${aux} ${i >= 3 ? 'allés' : 'allé'}`);
  const participle = verb === 'être' ? 'été' : verb === 'avoir' ? 'eu'
    : verb.endsWith('er') ? `${verb.slice(0, -2)}é`
    : verb.endsWith('ir') ? `${verb.slice(0, -2)}i`
    : `${verb.slice(0, -2)}u`;
  return AVOIR.map(aux => `${aux} ${participle}`);
}

/** What the tense route returns for every verb the learner has. */
function routeAnswer(forSpec: ConjugationSpec, tenseId: string, make: (verb: string) => string[]) {
  const asked = withCatalogueTenses(forSpec, [tenseId]);
  const verbs = tenseVerbs(asked);
  return { asked, verbs, forms: parseTenseForms(asked, tenseId, verbs, Object.fromEntries(verbs.map(v => [v, make(v)]))) };
}

function addedPasseCompose(): UserTenseMap {
  const { verbs, forms } = routeAnswer(base, 'passe-compose', passeCompose);
  const outcome = settleUserTense(matchCatalogueTense(base, 'passé composé')!, verbs, forms, NOW);
  if (outcome.status !== 'added') throw new Error('not added');
  return { [conjugationTenseKey('French', 'passe-compose')]: outcome.tense };
}

describe('naming a tense', () => {
  it('matches the French name with or without accents, and the English and Korean', () => {
    for (const typed of ['passé composé', 'Passe compose', 'passé-composé', 'le passé composé', 'present perfect', '복합과거', '복합 과거 시제']) {
      expect(matchCatalogueTense(base, typed)?.id).toBe('passe-compose');
    }
  });

  it('settles a shipped tense, an unknown name and a new one without a call', () => {
    expect(requestTense(base, 'présent')).toEqual({ status: 'exists', label: 'présent' });
    expect(requestTense(base, 'future')).toEqual({ status: 'exists', label: 'futur simple' });
    expect(requestTense(base, 'past')).toEqual({ status: 'unknown' });
    expect(requestTense(base, 'subjonctif')).toMatchObject({ status: 'ready', tense: { id: 'subjonctif' } });
  });

  it('settles a tense already added as existing', () => {
    const mine = learnerSpec(base, undefined, addedPasseCompose());
    expect(requestTense(mine, 'passé composé')).toEqual({ status: 'exists', label: 'passé composé' });
  });

  it('has every catalogue tense findable by its own label, ids unique', () => {
    const ids = base.catalogue!.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tense of base.catalogue!) expect(matchCatalogueTense(base, tense.label)?.id).toBe(tense.id);
  });

  it('keeps the shipped tenses in the catalogue under their own ids', () => {
    for (const tense of base.tenses) expect(base.catalogue!.some(t => t.id === tense.id)).toBe(true);
  });
});

describe('the tense prompt rule', () => {
  it('says what the parser will read', () => {
    const asked = withCatalogueTenses(base, ['passe-compose', 'imperatif', 'subjonctif']);
    const find = (id: string) => asked.tenses.find(t => t.id === id)!;
    expect(tenseFormRule(asked, find('passe-compose'))).toMatch(/exactly 6 forms.*two words/);
    expect(tenseFormRule(asked, find('imperatif'))).toMatch(/exactly 3 forms, in the order tu, nous, vous.*no subject pronoun/);
    expect(tenseFormRule(asked, find('subjonctif'))).toMatch(/Leave out que/);
  });
});

describe('settleUserTense', () => {
  it('lists the verbs whose forms did not come back', () => {
    const { verbs, forms } = routeAnswer(base, 'passe-compose', v => (v === 'parler' ? ['parlé'] : passeCompose(v)));
    const outcome = settleUserTense(matchCatalogueTense(base, 'passé composé')!, verbs, forms, NOW);
    expect(outcome).toMatchObject({ status: 'added', missing: ['parler'] });
    expect(userTenseOutcomeCopy(outcome)).toEqual({ key: 'tenseAddedMissing', params: { tense: 'passé composé', verbs: 'parler' } });
  });

  it('refuses a tense with nothing usable', () => {
    const { verbs } = routeAnswer(base, 'passe-compose', passeCompose);
    expect(settleUserTense(matchCatalogueTense(base, 'passé composé')!, verbs, {}, NOW))
      .toEqual({ status: 'noForms', label: 'passé composé' });
  });
});

describe('learnerSpec', () => {
  const tenses = addedPasseCompose();
  const mine = learnerSpec(base, undefined, tenses);
  const er = findSubject(mine, 'group:er')!;
  const etre = findSubject(mine, 'verb:etre')!;

  it('puts the tense after the shipped ones, marked as added', () => {
    expect(mine.tenses.map(t => t.id)).toEqual(['present', 'imparfait', 'futur', 'passe-compose']);
    expect(addedTenses(mine)).toMatchObject([{ id: 'passe-compose', compound: true, userAdded: true }]);
  });

  it('gives an irregular verb its forms, and a group its vehicles’', () => {
    expect(buildTable(mine, etre, 'passe-compose').forms.s1).toBe('ai été');
    const table = buildTable(mine, er, 'passe-compose', 'donner');
    expect(table.forms).toMatchObject({ s1: 'ai donné', p3: 'ont donné' });
    expect(table.subjectLabel).toBe('-er');
  });

  it('marks every table in it unverified, and says why', () => {
    const table = buildTable(mine, etre, 'passe-compose');
    expect(table.userAdded).toBe(true);
    expect(unverifiedKey(mine, table)).toBe('tenseUnverified');
    expect(buildTable(mine, etre, 'present').userAdded).toBeUndefined();
  });

  it('leaves the shipped tenses and the sourced irregulars exactly as they were', () => {
    for (const tense of base.tenses) {
      for (const subject of base.subjects) {
        expect(buildTable(mine, findSubject(mine, `${subject.kind}:${subject.id}`)!, tense.id))
          .toEqual(buildTable(base, subject, tense.id));
      }
    }
  });

  it('draws a group only through vehicles that have forms in the tense', () => {
    const { verbs, forms } = routeAnswer(base, 'passe-compose', v => (v === 'parler' ? [] : passeCompose(v)));
    const outcome = settleUserTense(matchCatalogueTense(base, 'passé composé')!, verbs, forms, NOW);
    const partial = learnerSpec(base, undefined, {
      [conjugationTenseKey('French', 'passe-compose')]: (outcome as { tense: UserTense }).tense,
    });
    const group = findSubject(partial, 'group:er')!;
    expect(tenseVehicles(partial, group, 'passe-compose')).not.toContain('parler');
    expect(tenseVehicles(partial, group, 'present')).toContain('parler');
    expect(buildTable(partial, group, 'passe-compose', 'parler').infinitive).toBe('regarder');
    const tables = buildTables(partial, enrolAddedTense(partial, { items: [] }, 'passe-compose'));
    for (const round of buildConjugationQueue(partial, tables, {}, {}, NOW, () => 0.0)) {
      expect(round.table.infinitive).not.toBe('parler');
    }
  });

  it('drops a stored tense the catalogue does not know, or filed under the wrong key', () => {
    const stray = learnerSpec(base, undefined, {
      'French:passe-recent': { tenseId: 'passe-recent', forms: {}, addedAt: NOW.toISOString() },
      'French:conditionnel': { tenseId: 'subjonctif', forms: {}, addedAt: NOW.toISOString() },
    });
    expect(stray.tenses.map(t => t.id)).toEqual(['present', 'imparfait', 'futur']);
  });

  it('keeps progress in the tense and the impératif’s persons only', () => {
    const state = rateBox(undefined, 'good');
    const kept = normalizeProgress(mine, {
      'French:verb:etre:passe-compose:s1': state,
      'French:verb:etre:subjonctif:s1': state,
    });
    expect(Object.keys(kept)).toEqual(['French:verb:etre:passe-compose:s1']);
  });
});

describe('a verb and a tense the learner both added', () => {
  /** What the lookup route returns for `danser` once the learner has the passé composé. */
  const danserLookup = {
    french: 'danser', partOfSpeech: 'verb', verbGroup: 'er',
    conjugation: {
      present: ['danse', 'danses', 'danse', 'dansons', 'dansez', 'dansent'],
      imparfait: ['dansais', 'dansais', 'dansait', 'dansions', 'dansiez', 'dansaient'],
      futur: ['danserai', 'danseras', 'dansera', 'danserons', 'danserez', 'danseront'],
      'passe-compose': passeCompose('danser'),
    },
  };

  it('keeps a regular verb’s forms for the added tense, and only those', () => {
    const before = learnerSpec(base, undefined, addedPasseCompose());
    const outcome = settleUserVerb(before, danserLookup, NOW);
    expect(outcome).toMatchObject({ status: 'added', subjectKey: 'group:er' });
    const verb = (outcome as { verb: UserVerb }).verb;
    expect(Object.keys(verb.forms ?? {})).toEqual(['passe-compose']);

    const after = learnerSpec(base, { 'French:danser': verb }, addedPasseCompose());
    const table = buildTable(after, findSubject(after, 'group:er')!, 'passe-compose', 'danser');
    expect(table.forms.s1).toBe('ai dansé');
    expect(unverifiedKey(after, table)).toBe('verbUnverified');
  });

  it('adds a verb whose lookup missed the added tense, without that tense', () => {
    const before = learnerSpec(base, undefined, addedPasseCompose());
    const { present, imparfait, futur } = danserLookup.conjugation;
    const outcome = settleUserVerb(before, { ...danserLookup, conjugation: { present, imparfait, futur } }, NOW);
    const verb = (outcome as { verb: UserVerb }).verb;
    expect(verb.forms).toBeUndefined();
    const after = learnerSpec(base, { 'French:danser': verb }, addedPasseCompose());
    expect(tenseVehicles(after, findSubject(after, 'group:er')!, 'passe-compose')).not.toContain('danser');
  });

  it('gives a verb added before the tense the forms the tense brought', () => {
    const { asked } = routeAnswer(base, 'passe-compose', passeCompose);
    const verb: UserVerb = { infinitive: 'danser', group: 'er', addedAt: NOW.toISOString() };
    const withVerb = learnerSpec(base, { 'French:danser': verb }, undefined);
    const { verbs, forms } = routeAnswer(withVerb, 'passe-compose', passeCompose);
    expect(verbs).toContain('danser');
    expect(asked.tenses.at(-1)?.id).toBe('passe-compose');
    const outcome = settleUserTense(matchCatalogueTense(base, 'passé composé')!, verbs, forms, NOW);
    const mine = learnerSpec(base, { 'French:danser': verb }, {
      [conjugationTenseKey('French', 'passe-compose')]: (outcome as { tense: UserTense }).tense,
    });
    expect(buildTable(mine, findSubject(mine, 'group:er')!, 'passe-compose', 'danser').forms.p1).toBe('avons dansé');
  });
});

describe('enrolling and removing a tense', () => {
  const tenses = addedPasseCompose();
  const mine = learnerSpec(base, undefined, tenses);

  it('saves every regular pattern in the new tense and no irregular verb', () => {
    const next = enrolAddedTense(mine, { items: ['group:er:present'] }, 'passe-compose');
    expect(next.items).toEqual([
      'group:er:present',
      'group:er:passe-compose', 'group:cer:passe-compose', 'group:ger:passe-compose',
      'group:ir:passe-compose', 'group:re:passe-compose',
    ]);
  });

  it('takes the tense’s saved entries and schedules with it', () => {
    const state = rateBox(undefined, 'good');
    const { enrolment, boxIds } = removeAddedTense(mine, {
      items: ['group:er:present', 'group:er:passe-compose', 'verb:etre:passe-compose'],
    }, {
      'French:group:er:present:s1': state,
      'French:group:er:passe-compose:s1': state,
      'French:verb:etre:passe-compose:p3': state,
    }, 'passe-compose');
    expect(enrolment.items).toEqual(['group:er:present']);
    expect(boxIds).toEqual(['French:group:er:passe-compose:s1', 'French:verb:etre:passe-compose:p3']);
  });

  it('falls back to the default set when the tense was all that was saved', () => {
    const { enrolment } = removeAddedTense(mine, { items: ['group:er:passe-compose'] }, {}, 'passe-compose');
    expect(enrolment).toEqual(defaultEnrolment(base));
  });
});
