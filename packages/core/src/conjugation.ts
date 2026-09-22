import type { TranslationKey } from './i18n';
import { getNextReviewData } from './sm2';
import { sameFoldedText } from './typedAnswer';
import type { StudyLanguage } from './types';

/**
 * Verb conjugation practice.
 *
 * **Vocabulary, used consistently everywhere below.** A **table** is one subject
 * in one tense. Its **boxes** are the forms, one per person. **One question** is
 * one box: the app names the subject, the tense and the person, and the learner
 * types the form.
 *
 * ⚠️ **A "subject" is a rule for regular verbs and a verb for irregular ones**,
 * and this is the distinction the whole module turns on. Reworked 2026-09-22 on
 * the user's call after the first cut scheduled every verb individually:
 *
 * - A **group** (`-er`, `-ir`, …) is one fact. `parler`, `donner` and
 *   `travailler` in the présent are the same ending applied three times, so
 *   scheduling them separately drills one thing under three names and tells the
 *   scheduler nothing it did not already know. The group is the item; a verb
 *   from it is the **vehicle** the question is asked through, and the vehicle
 *   varies so the learner produces the ending rather than recalling a word.
 * - An **irregular verb** is its own fact — `aller` teaches you nothing about
 *   `être` — so it keeps a table per verb, exactly as before.
 *
 * ⚠️ **`-cer` and `-ger` are their own groups, not exceptions inside `-er`.**
 * `nous mangeons` is not `mang` + `ons`, so `manger` is a *broken vehicle* for
 * the plain `-er` pattern: a learner asked to produce it from the `-er` rule
 * would be marked wrong for applying the rule correctly. They are separate
 * patterns, which is also how they are taught.
 *
 * ⚠️ **The schedule belongs to the box, and the table is how it is shown.**
 * Reversed 2026-09-22 on the user's call, the same day the first shape shipped:
 * *"having one tense of one verb group due means I'd practice just one verb
 * conjugation … I might be struggling with `ils` but I randomly got `tu` or `je`
 * and the practice ends."* A table is six facts, not one. The shape it replaces
 * rated a whole table from one box's verdict, so answering `tu` correctly
 * pushed `ils` out by the same interval — five boxes scheduled on evidence from
 * one — and the per-box miss tally could only bias a draw that happened once a
 * session, after the miss had already been paid for.
 *
 * ⚠️ **The precedent is Amgi's own.** A card is scheduled per *direction*, and
 * `helpReviewPoints` says so to the user: *"Each card is asked both ways."*
 * Splitting a table into its boxes is that same move — one item per fact — which
 * is what distinguishes it from the multiplication `vision.md` refuses. Nothing
 * here adapts per learner; there are simply six facts where the code used to
 * claim one.
 *
 * **A round is the unit of a session, and a round is a table.** The due boxes of
 * one table are asked together, laid out as its paradigm, and each rates
 * independently. That is how a paradigm is practised, and it keeps the counts
 * legible — `-er · présent — 3 due` rather than 72 loose items.
 *
 * ⚠️ **The boxes that are not due are masked until the round is checked.**
 * Showing them would hand over the answer — `je parle`, `nous parlons` and `vous
 * parlez` make `tu parles` free — so the paradigm fills in only once the round
 * has been answered, at which point it is reference rather than a leak.
 *
 * **Regular forms are computed; irregular forms are stored.** There is no rule
 * to generate an irregular from, and `docs/packs/README.md` governs — the model
 * is not a source — so `FRENCH_IRREGULARS` is a **sourced dataset**, tier A
 * against two independent published references, written up in
 * `docs/packs/french-irregular-verbs-draft.md` before it was typed in here.
 *
 * **Zero model calls.** Grading is `typedAnswer.ts`, which folds apostrophes and
 * deliberately does not fold diacritics — for a conjugation table the accent is
 * the content.
 */

/** A grammatical person, labelled as the language itself labels it. */
export interface ConjugationPerson {
  id: string;
  /** `je`, `nous` — the language's own word, never translated. */
  label: string;
}

/** A tense, named as a learner of that language learns its name. */
export interface ConjugationTense {
  id: string;
  /** `présent`, `imparfait` — not translated, for the same reason. */
  label: string;
  /**
   * What the tense does and when to reach for it, as copy keys.
   *
   * ⚠️ **Sourced content, and optional for that reason.** A tense with no note
   * shows its table and nothing else, which is honest; writing one from the
   * model would not be — `docs/packs/README.md` governs, and the French notes
   * are tiered and cited in `docs/packs/french-tense-notes-draft.md`.
   *
   * Keys rather than strings because this is a language's data and the copy is
   * per interface language: the tense is the same fact in en and in ko.
   */
  aboutLeadKey?: TranslationKey;
  /** The uses, one per line, split on `\n` — the help-sheet shape. */
  aboutPointsKey?: TranslationKey;
}

/** Which rule class a regular group conjugates by. */
export type ConjugationGroupId = 'er' | 'cer' | 'ger' | 'ir' | 're';

/**
 * A regular group: one rule, practised through whichever verb turns up.
 *
 * ⚠️ **Every verb in `vehicles` must be conjugated correctly by this group's
 * rule and no other.** That is why `-cer` and `-ger` are separate groups rather
 * than a spelling footnote inside `-er` — a vehicle the rule gets wrong would
 * mark a learner wrong for knowing the pattern.
 */
export interface ConjugationGroup {
  kind: 'group';
  id: ConjugationGroupId;
  /** `-er`. Shown as the subject of a question, so it is the language's own. */
  label: string;
  vehicles: readonly string[];
}

/** An irregular verb: stored forms, because there is no rule to generate them. */
export interface ConjugationIrregularVerb {
  kind: 'verb';
  id: string;
  infinitive: string;
  /** Tense id → person id → form. Every tense this verb is practised in. */
  forms: Record<string, Record<string, string>>;
}

/** What a table can be about. */
export type ConjugationSubject = ConjugationGroup | ConjugationIrregularVerb;

/** Everything one language's conjugation practice is built from. */
export interface ConjugationSpec {
  language: StudyLanguage;
  persons: readonly ConjugationPerson[];
  tenses: readonly ConjugationTense[];
  subjects: readonly ConjugationSubject[];
  /**
   * The subject pronoun as it is written in front of a given form — `je` but
   * `j'aime`. Used only to *accept* an extra spelling, never to reject one, so
   * an imperfect rule here can cost nothing.
   */
  subjectFor: (person: ConjugationPerson, form: string) => string;
  /** Forms for a regular group's vehicle, by rule. */
  conjugate: (infinitive: string, group: ConjugationGroupId, tenseId: string) => string[];
}

/** One subject in one tense: six boxes, each carrying its own schedule. */
export interface ConjugationTable {
  subjectKind: ConjugationSubject['kind'];
  subjectId: string;
  /** What the question names: `-er` for a group, `être` for a verb. */
  subjectLabel: string;
  /**
   * The verb this table's forms are actually of.
   *
   * For an irregular subject it is the subject. For a group it is the
   * **vehicle** — one verb drawn from the group, which changes between
   * questions so the learner produces the ending rather than recalling a word.
   */
  infinitive: string;
  tenseId: string;
  tenseLabel: string;
  /** Person id → the form. */
  forms: Record<string, string>;
}

/**
 * What is remembered about a **box** — one person of one table.
 *
 * The SM-2 fields are the same four every scheduled thing in the app carries.
 * `misses` is the extra, and it no longer decides anything: a due box is asked
 * because it is due, so the tally is only ever *reported*, on Progress and on
 * Saved. It was `Record<personId, number>` while a table carried one schedule
 * for six boxes; now that each box carries its own, it is that box's count.
 *
 * `nextReview` is an ISO string rather than a Date or a Firestore Timestamp:
 * this lives in a plain map on the user document and is read by two platforms,
 * so neither has to know how the other serialises a date.
 */
export interface ConjugationProgress {
  interval: number;
  ease: number;
  repetitions: number;
  /** ISO 8601. */
  nextReview: string;
  /** How many times this box has been missed since it was last produced. */
  misses: number;
}

/** Progress for every box the learner has touched, keyed by box id. */
export type ConjugationProgressMap = Record<string, ConjugationProgress>;

/**
 * What the learner has added to their practice set.
 *
 * ⚠️ **Pairs, not a cross product**, and the shape matters. This was a list of
 * tenses and a list of subjects, which could only ever express "every saved
 * group in every saved tense" — so saving `-er` while looking at the présent and
 * `-re` while looking at the imparfait produced four tables when two were asked
 * for. A learner practising `-er` in three tenses and `-re` in only the présent
 * is an ordinary thing to want and the old shape could not say it.
 *
 * Each entry is `${subjectKey}:${tenseId}` — the item id without its language,
 * so enrolment and scheduling are the same shape rather than two that have to be
 * kept in step.
 */
export interface ConjugationEnrolment {
  items: string[];
}

/** A subject's stable id, which is also what enrolment stores. */
export function subjectKey(subject: ConjugationSubject): string {
  return `${subject.kind}:${subject.id}`;
}

/**
 * The id a box's schedule is filed under, and the key of the table holding it.
 *
 * A function rather than a template literal at each call site: the shape has
 * changed twice now — verb-and-tense before groups existed, and subject-and-tense
 * before the box became the scheduled item — and every producer and consumer of
 * one has to change together when it does.
 *
 * ⚠️ **Without `personId` this is a table's key, which is not a schedule.** It
 * identifies a row in a list and prefixes the six ids underneath it; nothing is
 * filed under it. `progress[tableKey]` is always `undefined`, by construction.
 */
export function conjugationItemId(
  language: StudyLanguage,
  subject: ConjugationSubject,
  tenseId: string,
  personId?: string,
): string {
  const table = `${language}:${subjectKey(subject)}:${tenseId}`;
  return personId === undefined ? table : `${table}:${personId}`;
}

/* ── French ──────────────────────────────────────────────────────────────── */

const FRENCH_PERSONS: readonly ConjugationPerson[] = [
  { id: 's1', label: 'je' },
  { id: 's2', label: 'tu' },
  { id: 's3', label: 'il/elle' },
  { id: 'p1', label: 'nous' },
  { id: 'p2', label: 'vous' },
  { id: 'p3', label: 'ils/elles' },
];

const FRENCH_TENSES: readonly ConjugationTense[] = [
  { id: 'present', label: 'présent', aboutLeadKey: 'tenseFrenchPresentLead', aboutPointsKey: 'tenseFrenchPresentPoints' },
  { id: 'imparfait', label: 'imparfait', aboutLeadKey: 'tenseFrenchImparfaitLead', aboutPointsKey: 'tenseFrenchImparfaitPoints' },
  { id: 'futur', label: 'futur simple', aboutLeadKey: 'tenseFrenchFuturLead', aboutPointsKey: 'tenseFrenchFuturPoints' },
];

/** `-cer` and `-ger` take the `-er` endings; only their spelling differs. */
const PRESENT_ENDINGS: Record<ConjugationGroupId, string[]> = {
  er:  ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  cer: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  ger: ['e', 'es', 'e', 'ons', 'ez', 'ent'],
  ir:  ['is', 'is', 'it', 'issons', 'issez', 'issent'],
  re:  ['s', 's', '', 'ons', 'ez', 'ent'],
};

const IMPERFECT_ENDINGS = ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'];
const FUTURE_ENDINGS = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];

/**
 * The spelling rule that defines the `-cer` and `-ger` groups.
 *
 * The consonant keeps its sound before `a` and `o` and nowhere else, so the
 * adjustment is keyed on the *ending* rather than baked into a stem: `nous
 * commençons` and `nous mangeons`, but `nous commencions` and `nous mangions`.
 */
function joinFrench(group: ConjugationGroupId, stem: string, ending: string): string {
  const softening = ending.startsWith('a') || ending.startsWith('o');
  if (softening && group === 'cer') return `${stem.slice(0, -1)}ç${ending}`;
  if (softening && group === 'ger') return `${stem}e${ending}`;
  return stem + ending;
}

function frenchConjugate(infinitive: string, group: ConjugationGroupId, tenseId: string): string[] {
  const stem = infinitive.slice(0, -2);
  switch (tenseId) {
    case 'present':
      return PRESENT_ENDINGS[group].map(e => joinFrench(group, stem, e));
    case 'imparfait': {
      // The imperfect is built on the present `nous` stem, which for `-ir`
      // verbs carries the `-iss-` and for the rest is the bare stem.
      const base = group === 'ir' ? `${stem}iss` : stem;
      return IMPERFECT_ENDINGS.map(e => joinFrench(group, base, e));
    }
    case 'futur': {
      // Built on the infinitive, less a final `-e`. Its own `e` already softens
      // the consonant, so `joinFrench` has nothing to do — calling it here would
      // be a coincidence rather than a rule.
      const base = group === 're' ? infinitive.slice(0, -1) : infinitive;
      return FUTURE_ENDINGS.map(e => base + e);
    }
    default:
      throw new Error(`Unknown tense: ${tenseId}`);
  }
}

/**
 * The five regular patterns, each with the verbs it is practised through.
 *
 * ⚠️ **Common, not frequency-ranked.** Calling this a frequency list would be a
 * sourcing claim with nothing behind it; ordering it properly is part of the
 * same job that brings in the irregulars.
 */
const FRENCH_GROUPS: readonly ConjugationGroup[] = [
  { kind: 'group', id: 'er',  label: '-er',  vehicles: ['parler', 'regarder', 'travailler', 'chercher', 'donner', 'aimer', 'écouter', 'habiter'] },
  { kind: 'group', id: 'cer', label: '-cer', vehicles: ['commencer', 'placer', 'avancer', 'lancer'] },
  { kind: 'group', id: 'ger', label: '-ger', vehicles: ['manger', 'changer', 'voyager', 'partager'] },
  { kind: 'group', id: 'ir',  label: '-ir',  vehicles: ['finir', 'choisir', 'réussir', 'grandir'] },
  { kind: 'group', id: 're',  label: '-re',  vehicles: ['vendre', 'attendre', 'répondre', 'entendre'] },
];

/**
 * The three verbs a French learner reaches for first, as stored forms.
 *
 * ⚠️ **Sourced, not generated**, which is the whole reason this sat empty from
 * 2026-09-22 until it was done: an irregular form is recalled content, not a
 * rule, and `docs/packs/README.md` governs — the model is not a source. Every
 * form here is **tier A**: Larousse and Bescherelle, two independent published
 * references, agree character for character, accents included. The draft with
 * the per-form citations, the licence finding and the rendering check is
 * `docs/packs/french-irregular-verbs-draft.md`.
 *
 * ⚠️ **Three verbs, and the fourth is a different job.** "The next most useful
 * irregular" is a frequency claim, and nothing in this repo is behind one — the
 * same reason `FRENCH_GROUPS` is described as *common* rather than ranked.
 *
 * ⚠️ **The bare form, never the pronoun.** `subjectFor` supplies `je` or `j'`
 * at grading time, so storing `j'ai` here would double it.
 */
const FRENCH_IRREGULARS: readonly ConjugationIrregularVerb[] = [
  {
    kind: 'verb', id: 'etre', infinitive: 'être',
    forms: {
      present:   { s1: 'suis',   s2: 'es',     s3: 'est',   p1: 'sommes',  p2: 'êtes',   p3: 'sont' },
      imparfait: { s1: 'étais',  s2: 'étais',  s3: 'était', p1: 'étions',  p2: 'étiez',  p3: 'étaient' },
      futur:     { s1: 'serai',  s2: 'seras',  s3: 'sera',  p1: 'serons',  p2: 'serez',  p3: 'seront' },
    },
  },
  {
    kind: 'verb', id: 'avoir', infinitive: 'avoir',
    forms: {
      present:   { s1: 'ai',     s2: 'as',     s3: 'a',     p1: 'avons',   p2: 'avez',   p3: 'ont' },
      imparfait: { s1: 'avais',  s2: 'avais',  s3: 'avait', p1: 'avions',  p2: 'aviez',  p3: 'avaient' },
      futur:     { s1: 'aurai',  s2: 'auras',  s3: 'aura',  p1: 'aurons',  p2: 'aurez',  p3: 'auront' },
    },
  },
  {
    kind: 'verb', id: 'aller', infinitive: 'aller',
    forms: {
      present:   { s1: 'vais',   s2: 'vas',    s3: 'va',    p1: 'allons',  p2: 'allez',  p3: 'vont' },
      imparfait: { s1: 'allais', s2: 'allais', s3: 'allait', p1: 'allions', p2: 'alliez', p3: 'allaient' },
      futur:     { s1: 'irai',   s2: 'iras',   s3: 'ira',   p1: 'irons',   p2: 'irez',   p3: 'iront' },
    },
  },
];

const FRENCH_VOWELS = 'aeiouéèêëàâîïôöûùü';

const FRENCH_SPEC: ConjugationSpec = {
  language: 'French',
  persons: FRENCH_PERSONS,
  tenses: FRENCH_TENSES,
  subjects: [...FRENCH_GROUPS, ...FRENCH_IRREGULARS],
  subjectFor: (person, form) => {
    if (person.id !== 's1') return person.label;
    const first = form.charAt(0).toLowerCase();
    return FRENCH_VOWELS.includes(first) || first === 'h' ? "j'" : 'je';
  },
  conjugate: frenchConjugate,
};

/**
 * ⚠️ **French only, and that is an assumption rather than a decision** — it is
 * the ask that opened this. The tool is language-generic and a language is a
 * spec, so changing the answer is a dataset swap, not a redesign.
 */
const SPECS: readonly ConjugationSpec[] = [FRENCH_SPEC];

export function conjugationSpec(language: StudyLanguage): ConjugationSpec | undefined {
  return SPECS.find(spec => spec.language === language);
}

export function hasConjugation(language: StudyLanguage): boolean {
  return conjugationSpec(language) !== undefined;
}

/**
 * The subjects of one kind — the two topics Munli browses verbs through.
 *
 * ⚠️ **Regular and irregular verbs are separate topics, not two sections of
 * one.** They are different kinds of thing to learn: a group is a rule that one
 * example demonstrates, and an irregular verb is a fact that no other verb
 * tells you anything about. Browsing them together meant one page whose halves
 * wanted different shapes — a handful of patterns against what will be a long
 * list of verbs.
 */
export function subjectsOfKind<K extends ConjugationSubject['kind']>(
  spec: ConjugationSpec,
  kind: K,
): Extract<ConjugationSubject, { kind: K }>[] {
  return spec.subjects.filter(
    (subject): subject is Extract<ConjugationSubject, { kind: K }> => subject.kind === kind,
  );
}

/** How many of the practice set's entries belong to subjects of this kind. */
export function enrolledCountOfKind(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  kind: ConjugationSubject['kind'],
): number {
  const keys = new Set(subjectsOfKind(spec, kind).map(subjectKey));
  return enrolment.items.filter(item => keys.has(item.slice(0, item.lastIndexOf(':')))).length;
}

export function findSubject(spec: ConjugationSpec, key: string): ConjugationSubject | undefined {
  return spec.subjects.find(subject => subjectKey(subject) === key);
}

/* ── Enrolment ───────────────────────────────────────────────────────────── */

/** The enrolment entry for one subject in one tense. */
export function enrolmentKey(subject: ConjugationSubject, tenseId: string): string {
  return `${subjectKey(subject)}:${tenseId}`;
}

/** Whether a subject is enrolled in a tense. */
export function isEnrolled(
  enrolment: ConjugationEnrolment,
  subject: ConjugationSubject,
  tenseId: string,
): boolean {
  return enrolment.items.includes(enrolmentKey(subject, tenseId));
}

/**
 * Add or remove a subject across several tenses at once.
 *
 * What the Save button on a group does: it commits whatever tenses are being
 * looked at. Adding is idempotent, so saving twice is not two entries.
 *
 * ⚠️ **It refuses to empty the practice set.** An empty one reads as broken
 * rather than as a choice, and `normalizeEnrolment` would silently refill it —
 * which is worse than refusing the tap, because the refill is invisible.
 */
export function setEnrolled(
  enrolment: ConjugationEnrolment,
  subject: ConjugationSubject,
  tenseIds: readonly string[],
  on: boolean,
): ConjugationEnrolment {
  const keys = tenseIds.map(tenseId => enrolmentKey(subject, tenseId));
  if (!on) {
    const next = enrolment.items.filter(item => !keys.includes(item));
    return next.length === 0 ? enrolment : { items: next };
  }
  const missing = keys.filter(key => !enrolment.items.includes(key));
  return missing.length === 0 ? enrolment : { items: [...enrolment.items, ...missing] };
}

/**
 * What a learner starts with: every regular pattern, in the présent alone.
 *
 * ⚠️ **The tenses are where progression lives, and they are chosen from the
 * outside.** A beginner practises the présent; adding the imparfait is a
 * decision the learner makes on the Verbs surface. Nothing reads a level off
 * anything, which is what `vision.md` refuses — per-level *content* is allowed,
 * the app deciding what you are ready for is not.
 *
 * Every group rather than just `-er`, because the groups are five facts and not
 * five difficulties; a learner who only meets `-er` verbs simply never sees the
 * others come up as due.
 */
export function defaultEnrolment(spec: ConjugationSpec): ConjugationEnrolment {
  const first = spec.tenses[0].id;
  return {
    items: spec.subjects
      .filter(subject => subject.kind === 'group')
      .map(subject => enrolmentKey(subject, first)),
  };
}

/**
 * An enrolment with anything unrecognised dropped, and never empty.
 *
 * A stored enrolment outlives the build that wrote it — a group that was
 * renamed, a tense that was removed, or the earlier cross-product shape, which
 * carries no `items` at all and so falls back here rather than needing a
 * migration.
 */
export function normalizeEnrolment(
  spec: ConjugationSpec,
  stored: Partial<ConjugationEnrolment> | undefined,
): ConjugationEnrolment {
  const valid = (stored?.items ?? []).filter(item => {
    const split = item.lastIndexOf(':');
    if (split <= 0) return false;
    return findSubject(spec, item.slice(0, split)) !== undefined
      && spec.tenses.some(tense => tense.id === item.slice(split + 1));
  });
  // De-duplicated: a repeated entry would build the same table twice and count
  // it twice in every total.
  const items = [...new Set(valid)];
  return items.length > 0 ? { items } : defaultEnrolment(spec);
}

/** The tenses this practice set touches, in the language's own order. */
export function enrolledTenses(spec: ConjugationSpec, enrolment: ConjugationEnrolment): ConjugationTense[] {
  return spec.tenses.filter(tense =>
    enrolment.items.some(item => item.endsWith(`:${tense.id}`)));
}

/* ── Tables ──────────────────────────────────────────────────────────────── */

/**
 * One table.
 *
 * `vehicle` picks which verb a *group* table is asked through, and is ignored
 * for an irregular subject. Defaulting to the first keeps the function pure and
 * testable; the session passes a real choice.
 */
export function buildTable(
  spec: ConjugationSpec,
  subject: ConjugationSubject,
  tenseId: string,
  vehicle?: string,
): ConjugationTable {
  const tense = spec.tenses.find(t => t.id === tenseId);
  if (!tense) throw new Error(`Unknown tense: ${tenseId}`);

  const common = {
    subjectKind: subject.kind,
    subjectId: subject.id,
    tenseId,
    tenseLabel: tense.label,
  };

  if (subject.kind === 'verb') {
    const forms = subject.forms[tenseId];
    if (!forms) throw new Error(`${subject.infinitive} has no ${tenseId}`);
    return { ...common, subjectLabel: subject.infinitive, infinitive: subject.infinitive, forms };
  }

  const infinitive = vehicle && subject.vehicles.includes(vehicle) ? vehicle : subject.vehicles[0];
  const forms = spec.conjugate(infinitive, subject.id, tenseId);
  return {
    ...common,
    subjectLabel: subject.label,
    infinitive,
    forms: Object.fromEntries(spec.persons.map((p, i) => [p.id, forms[i]])),
  };
}

/**
 * Every table in the practice set, or in a narrower selection of it.
 *
 * ⚠️ **Enrolment is the outer bound and a selection only narrows it** — a tense
 * that is not enrolled cannot be practised by asking for it here. That keeps the
 * two surfaces honest: Verbs decides what exists, the setup screen decides what
 * to do today.
 */
export function buildTables(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  selection?: { tenses?: readonly string[]; subjects?: readonly string[] },
): ConjugationTable[] {
  const tables: ConjugationTable[] = [];
  for (const item of enrolment.items) {
    const split = item.lastIndexOf(':');
    const key = item.slice(0, split);
    const tenseId = item.slice(split + 1);
    if (selection?.tenses && !selection.tenses.includes(tenseId)) continue;
    if (selection?.subjects && !selection.subjects.includes(key)) continue;
    const subject = findSubject(spec, key);
    if (!subject) continue;
    // An irregular verb may simply not have been given this tense yet.
    if (subject.kind === 'verb' && !subject.forms[tenseId]) continue;
    tables.push(buildTable(spec, subject, tenseId));
  }
  // Language order rather than the order things were saved in, so a list does
  // not reshuffle itself as the learner adds to it.
  const tenseOrder = spec.tenses.map(t => t.id);
  const subjectOrder = spec.subjects.map(subjectKey);
  return tables.sort((a, b) =>
    tenseOrder.indexOf(a.tenseId) - tenseOrder.indexOf(b.tenseId)
    || subjectOrder.indexOf(`${a.subjectKind}:${a.subjectId}`)
       - subjectOrder.indexOf(`${b.subjectKind}:${b.subjectId}`));
}

/**
 * A table's key — a row's identity, not a schedule.
 *
 * Used as a list key and as the prefix of its six box ids. Nothing is filed
 * under it; see `conjugationItemId`.
 */
export function tableKey(spec: ConjugationSpec, table: ConjugationTable): string {
  return `${spec.language}:${table.subjectKind}:${table.subjectId}:${table.tenseId}`;
}

/** The id one box's schedule is filed under. */
export function boxItemId(
  spec: ConjugationSpec,
  table: ConjugationTable,
  personId: string,
): string {
  return `${tableKey(spec, table)}:${personId}`;
}

/**
 * Progress with everything this spec cannot account for dropped.
 *
 * ⚠️ **This is what performs the 2026-09-22 reset**, and it is a read-side drop
 * rather than a migration. Table-grained entries are keyed by four segments and
 * carry `misses` as a map; a box id has five and carries a number. The two
 * cannot collide, so the old entries were already inert — but leaving them to
 * sit on the user document forever is worse than dropping them the moment they
 * are read, and the user's call was a clean slate rather than a rewrite of old
 * intervals into six copies of themselves.
 *
 * It also drops a box whose subject, tense or person the spec no longer has —
 * `normalizeEnrolment`'s rule, for the same reason: the spec is the authority on
 * what exists, and a stale key would otherwise be counted forever.
 */
export function normalizeProgress(
  spec: ConjugationSpec,
  raw: ConjugationProgressMap | undefined,
): ConjugationProgressMap {
  const kept: ConjugationProgressMap = {};
  for (const [id, state] of Object.entries(raw ?? {})) {
    const parts = id.split(':');
    if (parts.length !== 5) continue;
    const [language, kind, subjectId, tenseId, personId] = parts;
    if (language !== spec.language) continue;
    if (!findSubject(spec, `${kind}:${subjectId}`)) continue;
    if (!spec.tenses.some(tense => tense.id === tenseId)) continue;
    if (!spec.persons.some(person => person.id === personId)) continue;
    if (typeof state?.misses !== 'number' || typeof state?.nextReview !== 'string') continue;
    kept[id] = state;
  }
  return kept;
}

/* ── Scheduling ──────────────────────────────────────────────────────────── */

/**
 * A table and the boxes of it to ask — the unit a session is built from.
 *
 * ⚠️ **A round is a table even though the schedule is a box's**, which is the
 * whole shape of the 2026-09-22 reversal. Scheduling per box answers the
 * complaint (a weak `ils` is asked because it is due, not because a die landed
 * on it); asking them a table at a time is how a paradigm is actually
 * practised, and is what keeps `-er · présent — 3 due` readable where 72 loose
 * items would not be.
 */
export interface ConjugationRound {
  table: ConjugationTable;
  /** Person ids in the spec's order, which is the order a paradigm is read in. */
  personIds: string[];
}

/**
 * The boxes of a table that are due now, in person order.
 *
 * A box with no progress has never been asked, so it is due — the same rule
 * `isDue` applies to an untracked card direction.
 */
export function dueBoxes(
  spec: ConjugationSpec,
  table: ConjugationTable,
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): string[] {
  return spec.persons
    .filter(person => {
      const state = progress[boxItemId(spec, table, person.id)];
      return !state || new Date(state.nextReview) <= now;
    })
    .map(person => person.id);
}

/**
 * The rounds waiting, soonest first, with never-practised tables ahead of them.
 *
 * A table with no due box is not a round: it is dropped rather than returned
 * empty, so a caller counting rounds is counting work.
 */
export function dueRounds(
  spec: ConjugationSpec,
  tables: readonly ConjugationTable[],
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): ConjugationRound[] {
  const rounds: { round: ConjugationRound; at: number }[] = [];
  for (const table of tables) {
    const personIds = dueBoxes(spec, table, progress, now);
    if (personIds.length === 0) continue;
    // A table is placed by its most overdue box, and a box never practised
    // sorts ahead of every dated one — the order `dueTables` used to give.
    let at = Infinity;
    for (const personId of personIds) {
      const state = progress[boxItemId(spec, table, personId)];
      at = Math.min(at, state ? new Date(state.nextReview).getTime() : -Infinity);
    }
    rounds.push({ round: { table, personIds }, at });
  }
  return rounds.sort((a, b) => a.at - b.at).map(entry => entry.round);
}

/**
 * How many boxes are due across a set of tables.
 *
 * ⚠️ **This is what every due count in Munli counts**, from the practice picker
 * to a pill on Saved. Counting tables would be counting rounds, which is a
 * number about the session rather than about what is owed.
 */
export function countDueBoxes(
  spec: ConjugationSpec,
  tables: readonly ConjugationTable[],
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): number {
  return tables.reduce((total, table) => total + dueBoxes(spec, table, progress, now).length, 0);
}

/** What a hinted answer is worth. A subset of the card ratings, by design. */
export type ConjugationVerdict = 'again' | 'hard' | 'good';

/** A box that has never been practised. */
export function freshProgress(now: Date = new Date()): ConjugationProgress {
  return { interval: 0, ease: 2.5, repetitions: 0, nextReview: now.toISOString(), misses: 0 };
}

/**
 * What a rating does to one box.
 *
 * The SM-2 half is `getNextReviewData`, unchanged and shared with every card in
 * the app. ⚠️ **It now speaks only for the box that was answered** — the defect
 * this replaces was one verdict setting six intervals, so `tu` answered
 * correctly scheduled `ils` away with it.
 *
 * The tally is the local part, and it is now a report rather than an input: a
 * miss increments it, and a correct answer clears it rather than decrementing —
 * a box you have now produced is answered, not "less wrong than before".
 */
export function rateBox(
  current: ConjugationProgress | undefined,
  verdict: ConjugationVerdict,
): ConjugationProgress {
  const base = current ?? freshProgress();
  const next = getNextReviewData(
    { interval: base.interval, ease: base.ease, repetitions: base.repetitions },
    verdict,
  );
  return {
    interval: next.interval,
    ease: next.ease,
    repetitions: next.repetitions,
    nextReview: next.nextReview.toISOString(),
    // ⚠️ The tally follows the *verdict*, not whether the string matched. A form
    // assembled from both hints is `again`, and it counts as a miss here too.
    misses: verdict === 'again' ? base.misses + 1 : 0,
  };
}

/* ── Answering ───────────────────────────────────────────────────────────── */

/**
 * Every spelling of a box that counts as right.
 *
 * The bare form is the answer. The form behind its subject pronoun is accepted
 * too, because a learner who has drilled `j'aime` as a unit is not wrong — and
 * accepting more spellings can only ever turn a false miss into a pass.
 */
export function acceptedForms(spec: ConjugationSpec, table: ConjugationTable, personId: string): string[] {
  const person = spec.persons.find(p => p.id === personId);
  const form = table.forms[personId];
  if (!person || !form) return [];
  const subject = spec.subjectFor(person, form);
  return [form, subject.endsWith("'") ? `${subject}${form}` : `${subject} ${form}`];
}

/** Whether what was typed answers the box. Local, pure, no model. */
export function isCorrectForm(
  spec: ConjugationSpec,
  table: ConjugationTable,
  personId: string,
  typed: string,
): boolean {
  return acceptedForms(spec, table, personId).some(accepted => sameFoldedText(accepted, typed));
}

/* ── Hints ───────────────────────────────────────────────────────────────── */

/**
 * A way out of an empty box that costs something.
 *
 * `vision.md` refuses multiple choice because offering candidates does the
 * retrieval for the learner, and then admits that refusing it leaves whoever
 * cannot start with nothing to do but be wrong. The answer is a hint that
 * *costs*: the search space narrows and the verdict falls with it.
 */
export function conjugationHints(table: ConjugationTable, personId: string): string[] {
  const form = table.forms[personId];
  if (!form) return [];
  const split = Math.max(1, Math.ceil(form.length / 2));
  return [`${form.slice(0, split)}…`, `…${form.slice(split)}`];
}

/**
 * The best verdict still available after taking `hintsTaken` hints.
 *
 * A correct answer with no hints is `good`; one hint makes it `hard`; two means
 * the form was assembled from both halves, which is not recall, so it lapses.
 * The schedule is told — that is the whole point of a hint that costs.
 */
export function hintedVerdict(hintsTaken: number, correct: boolean): ConjugationVerdict {
  if (!correct) return 'again';
  if (hintsTaken === 0) return 'good';
  if (hintsTaken === 1) return 'hard';
  return 'again';
}

/* ── Progress ────────────────────────────────────────────────────────────── */

export interface ConjugationTenseSummary {
  tenseId: string;
  label: string;
  /** Boxes with any history at all. */
  practised: number;
  /** Boxes that exist for this tense, within the practice set. */
  total: number;
  due: number;
}

/** A box the learner keeps getting wrong, named in full. */
export interface ConjugationWeakBox {
  subjectLabel: string;
  tenseLabel: string;
  personLabel: string;
  form: string;
  misses: number;
}

export interface ConjugationSummary {
  practised: number;
  total: number;
  due: number;
  byTense: ConjugationTenseSummary[];
  /** Most-missed first. Empty when nothing has been missed. */
  weakest: ConjugationWeakBox[];
}

/**
 * What Munli's Progress tab shows for conjugation.
 *
 * ⚠️ **Counted in boxes, not tables**, since 2026-09-22 — a box is what carries
 * a schedule, so a table-shaped total would be a number about the furniture.
 * The copy moved with it: "forms started", "forms in all".
 *
 * ⚠️ **`weakest` is the one thing here a card-shaped progress view could not
 * produce.** The schedule now knows a box is shaky all by itself, so the tally
 * no longer *decides* anything — but it still says how badly, and how badly is
 * what ranks this list.
 */
export function summarizeConjugation(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  progress: ConjugationProgressMap,
  limit = 5,
  now: Date = new Date(),
): ConjugationSummary {
  const tables = buildTables(spec, enrolment);
  const byTense: ConjugationTenseSummary[] = [];
  const weakest: ConjugationWeakBox[] = [];
  let practised = 0;
  let due = 0;

  for (const tense of enrolledTenses(spec, enrolment)) {
    const tenseId = tense.id;
    const forTense = tables.filter(table => table.tenseId === tenseId);
    let tensePractised = 0;
    let tenseDue = 0;

    for (const table of forTense) {
      for (const person of spec.persons) {
        const state = progress[boxItemId(spec, table, person.id)];
        if (!state) {
          // Never practised is also never scheduled, which `dueBoxes` reads as
          // due — the same rule an untracked card direction gets.
          tenseDue += 1;
          continue;
        }
        tensePractised += 1;
        if (new Date(state.nextReview) <= now) tenseDue += 1;
        if (state.misses > 0) {
          weakest.push({
            subjectLabel: table.subjectLabel,
            tenseLabel: table.tenseLabel,
            personLabel: person.label,
            form: table.forms[person.id],
            misses: state.misses,
          });
        }
      }
    }

    byTense.push({
      tenseId,
      label: tense.label,
      practised: tensePractised,
      total: forTense.length * spec.persons.length,
      due: tenseDue,
    });
    practised += tensePractised;
    due += tenseDue;
  }

  weakest.sort((a, b) => b.misses - a.misses);
  return {
    practised,
    total: tables.length * spec.persons.length,
    due,
    byTense,
    weakest: weakest.slice(0, limit),
  };
}

/* ── Sessions ────────────────────────────────────────────────────────────── */

export interface ConjugationQueueOptions {
  /**
   * Include boxes that are not due yet.
   *
   * Off by default, which is what makes a session *end*. Over-practising is a
   * legitimate thing to want — it is just something the learner asks for on the
   * start screen rather than something the draw does silently.
   */
  includeNotDue?: boolean;
  /**
   * Ask a whole table at once instead of one box per question.
   *
   * ⚠️ **Off by default, on the user's call after using it.** Asking every due
   * box of a table together was the first shape of the box grain, and it made a
   * session that is meant to be quick into a form to fill in — *"I don't like
   * being forced to always fill the whole table for every verb"*. The paradigm
   * is a different exercise, not a better packaging of this one: it asks how
   * much of a table you can produce in one go, which is worth offering and
   * wrong to impose.
   *
   * Either way the session covers the same boxes and `countQuestions` returns
   * the same number; only the packaging differs.
   */
  wholeTable?: boolean;
}

/**
 * The rounds a session will ask, fixed at the moment it starts.
 *
 * ⚠️ **A round is one box by default, and a whole table only when asked for.**
 * Scheduling is per box either way — that is what makes a weak `ils` come back
 * because it is due rather than because a die landed on it — but the *question*
 * is one form, which is what a five-second exercise looks like.
 *
 * ⚠️ **The vehicle varies, and is drawn per round.** Asking `-er · présent ·
 * nous` through `donner` today and `chercher` tomorrow tests the ending; asking
 * it through `parler` every time tests `parlons`. In whole-table mode the draw
 * is once per table rather than once per box, because a paradigm of six
 * different verbs is not a paradigm.
 *
 * ⚠️ **The queue is owned by the session from here on.** Ratings written while
 * it runs move the picker's counts and must not rebuild it under someone eight
 * questions in — the same rule `buildReviewQueue` follows. A miss therefore does
 * not rejoin the session in progress: the box is due again immediately, so it
 * returns in the *next* session.
 */
export function buildConjugationQueue(
  spec: ConjugationSpec,
  tables: readonly ConjugationTable[],
  progress: ConjugationProgressMap,
  options: ConjugationQueueOptions = {},
  now: Date = new Date(),
  random: () => number = Math.random,
): ConjugationRound[] {
  const pool: ConjugationRound[] = options.includeNotDue
    ? tables.map(table => ({ table, personIds: spec.persons.map(person => person.id) }))
    : dueRounds(spec, tables, progress, now);

  /** The table as it will be asked — a group gets a vehicle drawn for it. */
  const vehicled = (table: ConjugationTable): ConjugationTable => {
    const subject = findSubject(spec, `${table.subjectKind}:${table.subjectId}`);
    if (!subject || subject.kind !== 'group') return table;
    const pick = Math.min(subject.vehicles.length - 1, Math.floor(random() * subject.vehicles.length));
    return buildTable(spec, subject, table.tenseId, subject.vehicles[pick]);
  };

  const rounds: ConjugationRound[] = options.wholeTable
    ? pool.map(({ table, personIds }) => ({ table: vehicled(table), personIds }))
    // One round per due box, each drawing its own vehicle: within a session the
    // same ending then turns up on different verbs, which is the point of a
    // group being the item.
    : pool.flatMap(({ table, personIds }) =>
        personIds.map(personId => ({ table: vehicled(table), personIds: [personId] })));

  // Fisher–Yates, matching `reviewQueue`'s. Due order is subject order, and a
  // session that always opened on `-er` would drill the top of the list.
  for (let i = rounds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
  }
  return rounds;
}

/** How many boxes a session will ask — what its counter counts. */
export function countQuestions(rounds: readonly ConjugationRound[]): number {
  return rounds.reduce((total, round) => total + round.personIds.length, 0);
}

/* ── Reference ───────────────────────────────────────────────────────────── */

/** One verb's forms in one tense, for reading rather than answering. */
export interface ConjugationParadigmTense {
  tenseId: string;
  label: string;
  /** Person id → form. */
  forms: Record<string, string>;
}

/**
 * A verb's whole paradigm — every tense the language knows, for looking up.
 *
 * ⚠️ **Every tense, not the enrolled ones.** This is the reference half of the
 * practice set: you look a form up whether or not you have added its tense, and
 * seeing what the imparfait actually looks like is how someone decides to add
 * it. Enrolment bounds what is *practised*; it has no business bounding what can
 * be *read*.
 *
 * Shared by both platforms so one table cannot disagree with the other about a
 * form — the same reason the rules themselves live here.
 */
export function buildParadigm(
  spec: ConjugationSpec,
  subject: ConjugationSubject,
  vehicle?: string,
): ConjugationParadigmTense[] {
  return spec.tenses
    .filter(tense => subject.kind === 'group' || subject.forms[tense.id] !== undefined)
    .map(tense => {
      const table = buildTable(spec, subject, tense.id, vehicle);
      return { tenseId: tense.id, label: tense.label, forms: table.forms };
    });
}

/* ── The picker ─────────────────────────────────────────────────────────── */

/** One subject inside a section: a pattern (`-er`) or an irregular verb. */
export interface ConjugationSectionSubject {
  /** What `buildTables` narrows on — `group:er`. */
  key: string;
  label: string;
  due: number;
  /** Boxes, the same unit as `due`. */
  total: number;
}

/** A tense and what is saved under it: one row of the practice picker. */
export interface ConjugationSection {
  tenseId: string;
  label: string;
  due: number;
  total: number;
  subjects: ConjugationSectionSubject[];
}

/**
 * The practice set as sections with due counts — Review's picker, for verbs.
 *
 * ⚠️ **The tense is the section and the subject is the level under it**, which
 * is a choice rather than the only arrangement. Enrolment is
 * `subject:tense` pairs, so either could have been the outer axis; the tense
 * wins because it is what a learner sits down to practise ("today, the
 * imparfait"), because Progress already groups this way, and because it
 * mirrors pack → subpack, which is the shape this is copied from.
 *
 * ⚠️ **Counts are boxes.** A section saying "3 due" means three forms, not
 * three tables — see the grain note at the head of this file.
 *
 * The everything row a picker shows above these is the sum of them, which is
 * exact: a table belongs to one tense.
 */
export function listPracticeSections(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): ConjugationSection[] {
  return enrolledTenses(spec, enrolment).map(tense => {
    const tables = buildTables(spec, enrolment, { tenses: [tense.id] });
    return {
      tenseId: tense.id,
      label: tense.label,
      due: countDueBoxes(spec, tables, progress, now),
      total: tables.length * spec.persons.length,
      subjects: tables.map(table => ({
        key: `${table.subjectKind}:${table.subjectId}`,
        label: table.subjectLabel,
        due: dueBoxes(spec, table, progress, now).length,
        total: spec.persons.length,
      })),
    };
  });
}

/* ── The practice list ──────────────────────────────────────────────────── */

/** One box of a table in the practice set, with how it is going. */
export interface ConjugationBoxState {
  personId: string;
  personLabel: string;
  form: string;
  /** Absent when it has never been practised. */
  state?: ConjugationProgress;
  due: boolean;
  /** When it falls due, or `null` when it has never been practised. */
  dueAt: Date | null;
}

/** One table in the practice set, with how its six boxes are going. */
export interface ConjugationPracticeItem {
  table: ConjugationTable;
  /** The table's key — a list key, never a schedule. */
  itemId: string;
  /** Every box, in person order, whether or not it is due. */
  boxes: ConjugationBoxState[];
  /** Boxes with any history. */
  started: number;
  /** Boxes due now. */
  dueCount: number;
  due: boolean;
  /**
   * The soonest a box falls due, or `null` when something is due now.
   *
   * ⚠️ Only meaningful when `dueCount` is zero: a table with work waiting says
   * how much, not when. Every box has a schedule in that case, because a box
   * without one is due by definition.
   */
  dueAt: Date | null;
  /** Boxes missed at least once, most-missed first. Empty when none. */
  weakBoxes: { personId: string; personLabel: string; misses: number }[];
}

/**
 * Everything in the practice set, with its state — Munli's answer to Cards.
 *
 * ⚠️ **Not the same list as `dueRounds`, and the difference is the point.** That
 * one answers "what should I do now" and a session is built from it. This
 * answers "what am I learning", which includes everything that is *not* due —
 * a list that hid what you had already learned would be a strange inventory.
 *
 * Ordered due-first, then by when each falls due. That puts what needs
 * attention at the top without dropping the rest.
 */
export function listPracticeTables(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): ConjugationPracticeItem[] {
  const items = buildTables(spec, enrolment).map(table => {
    const boxes: ConjugationBoxState[] = spec.persons.map(person => {
      const state = progress[boxItemId(spec, table, person.id)];
      const dueAt = state ? new Date(state.nextReview) : null;
      // Never practised counts as due, the same rule `dueBoxes` and an
      // untracked card direction both follow.
      return {
        personId: person.id,
        personLabel: person.label,
        form: table.forms[person.id],
        state,
        due: !dueAt || dueAt <= now,
        dueAt,
      };
    });
    const dueCount = boxes.filter(box => box.due).length;
    const nextDue = boxes
      .map(box => box.dueAt)
      .filter((at): at is Date => at !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    return {
      table,
      itemId: tableKey(spec, table),
      boxes,
      started: boxes.filter(box => box.state).length,
      dueCount,
      due: dueCount > 0,
      dueAt: dueCount > 0 ? null : nextDue,
      weakBoxes: boxes
        .filter(box => (box.state?.misses ?? 0) > 0)
        .map(box => ({
          personId: box.personId,
          personLabel: box.personLabel,
          misses: box.state!.misses,
        }))
        .sort((a, b) => b.misses - a.misses),
    };
  });

  return items.sort((a, b) => {
    if (a.due !== b.due) return a.due ? -1 : 1;
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
}

/* ── The saved set ──────────────────────────────────────────────────────── */

/** One saved tense of one subject — the pair enrolment stores, with its state. */
export interface ConjugationSavedTense {
  tenseId: string;
  label: string;
  /** The table's key, for a list key and for opening its paradigm. */
  itemId: string;
  due: number;
  /** Boxes, the same unit as `due`. */
  total: number;
}

/** A pattern or an irregular verb, with every tense saved under it. */
export interface ConjugationSavedSubject {
  key: string;
  label: string;
  /** The subject itself — `setEnrolled` and the paradigm both need it back. */
  subject: ConjugationSubject;
  tenses: ConjugationSavedTense[];
  due: number;
  /** Boxes with any history, across the subject's saved tenses. */
  started: number;
  total: number;
  /** The soonest a box falls due, or `null` when something is due now. */
  dueAt: Date | null;
  /** Boxes missed at least once anywhere under this subject, most-missed first. */
  weakBoxes: { personId: string; personLabel: string; misses: number }[];
}

/**
 * The practice set grained by subject — what the Saved tab manages.
 *
 * ⚠️ **The same pairs as `listPracticeSections`, transposed.** That one grains
 * by tense because it answers "what should I sit down to"; this one grains by
 * pattern because it answers "what have I taken on". Two surfaces, two
 * questions, one enrolment underneath — which is Amgi's own Packs/Cards split.
 *
 * Built on `listPracticeTables` rather than beside it, so the inventory has one
 * definition and a due count cannot come out different on two tabs.
 *
 * ⚠️ **A subject with nothing saved is not a row.** This lists what is saved,
 * so an empty one belongs on Topics, which is the catalogue.
 */
export function listSavedSubjects(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): ConjugationSavedSubject[] {
  const items = listPracticeTables(spec, enrolment, progress, now);
  const byKey = new Map<string, ConjugationSavedSubject>();

  // Spec order, so a list does not reshuffle itself as the learner saves.
  for (const subject of spec.subjects) {
    const key = subjectKey(subject);
    const mine = items.filter(item => `${item.table.subjectKind}:${item.table.subjectId}` === key);
    if (mine.length === 0) continue;

    const misses = new Map<string, { personLabel: string; misses: number }>();
    for (const item of mine) {
      for (const box of item.weakBoxes) {
        const seen = misses.get(box.personId);
        // A person missed under two tenses is one weak box to name, carrying
        // the worse of the two counts — naming `nous` twice says nothing more.
        if (!seen || seen.misses < box.misses) {
          misses.set(box.personId, { personLabel: box.personLabel, misses: box.misses });
        }
      }
    }

    byKey.set(key, {
      key,
      label: subject.kind === 'group' ? subject.label : subject.infinitive,
      subject,
      // Language order for the tenses too, rather than due-first: this is an
      // inventory of what was taken on, and a row that reorders itself as you
      // practise is hard to point at.
      tenses: spec.tenses
        .map(tense => mine.find(item => item.table.tenseId === tense.id))
        .filter((item): item is (typeof mine)[number] => item !== undefined)
        .map(item => ({
          tenseId: item.table.tenseId,
          label: item.table.tenseLabel,
          itemId: item.itemId,
          due: item.dueCount,
          total: item.boxes.length,
        })),
      due: mine.reduce((n, item) => n + item.dueCount, 0),
      started: mine.reduce((n, item) => n + item.started, 0),
      total: mine.reduce((n, item) => n + item.boxes.length, 0),
      // Only meaningful with nothing due, exactly as it is on a table: a row
      // with work waiting says how much, not when.
      dueAt: mine.some(item => item.due)
        ? null
        : mine.map(item => item.dueAt)
            .filter((at): at is Date => at !== null)
            .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
      weakBoxes: [...misses.entries()]
        .map(([personId, box]) => ({ personId, ...box }))
        .sort((a, b) => b.misses - a.misses),
    });
  }

  return [...byKey.values()];
}

/**
 * Whole days from `now` until `dueAt`, never negative.
 *
 * Rounded up, so something due in six hours reads as "1 day" rather than "0" —
 * zero would be indistinguishable from due now, which is a different state with
 * a different colour.
 */
export function daysUntil(dueAt: Date, now: Date = new Date()): number {
  const ms = dueAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}
