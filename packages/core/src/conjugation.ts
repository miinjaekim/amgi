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
 * ⚠️ **The schedule belongs to the table, not the box.** Missing `nous` brings
 * the whole table back, and the next question from it may be any box — with a
 * per-box miss tally so the weak one is preferred. That tally means more after
 * the rework than before: "your `nous` is weak" is now a claim about the ending,
 * across every verb in the group, rather than about one word.
 *
 * ⚠️ **Per-verb scheduling for a *group* must stay reachable**, the same
 * constraint recorded when the table was chosen over the box: ids are built by
 * `conjugationItemId` and progress is keyed by whatever it returns, so splitting
 * something finer later means more ids, not a different shape.
 *
 * **Regular forms are computed; irregular forms are stored.** There is no rule
 * to generate an irregular from, and `docs/packs/README.md` governs — the model
 * is not a source — so `FRENCH_IRREGULARS` is empty until that sourcing job is
 * done. The types hold both today; only one of them has content.
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

/** One subject in one tense: the unit that carries a schedule. */
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
 * What is remembered about a table.
 *
 * The SM-2 fields are the same four every scheduled thing in the app carries.
 * `misses` is the extra, and it is a tally rather than a scheduler: it decides
 * *which box to ask*, never *when to ask*.
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
  /** Person id → how many times this box has been missed. */
  misses: Record<string, number>;
}

/** Progress for every table the learner has touched, keyed by item id. */
export type ConjugationProgressMap = Record<string, ConjugationProgress>;

/** What the learner has added to their practice set. */
export interface ConjugationEnrolment {
  /** Tense ids. Adding one is how a learner progresses; nothing adds them for you. */
  tenses: string[];
  /** Subject ids, as `subjectKey` returns them. */
  subjects: string[];
}

/** A subject's stable id, which is also what enrolment stores. */
export function subjectKey(subject: ConjugationSubject): string {
  return `${subject.kind}:${subject.id}`;
}

/**
 * The id a table's schedule is filed under.
 *
 * A function rather than a template literal at each call site: the shape has
 * already changed once (it was verb-and-tense before groups existed) and every
 * producer and consumer of one has to change together when it does.
 */
export function conjugationItemId(
  language: StudyLanguage,
  subject: ConjugationSubject,
  tenseId: string,
): string {
  return `${language}:${subjectKey(subject)}:${tenseId}`;
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
  { id: 'present', label: 'présent' },
  { id: 'imparfait', label: 'imparfait' },
  { id: 'futur', label: 'futur simple' },
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
 * ⚠️ **Empty on purpose, and it is the sourcing gate rather than an oversight.**
 * An irregular form is recalled content, not a rule, and `docs/packs/README.md`
 * governs: the model is not a source. `être`, `avoir` and `aller` arrive from a
 * citable reference with its licence checked. Everything around them is built
 * and tested, so that job is a data file and nothing else.
 */
const FRENCH_IRREGULARS: readonly ConjugationIrregularVerb[] = [];

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

export function findSubject(spec: ConjugationSpec, key: string): ConjugationSubject | undefined {
  return spec.subjects.find(subject => subjectKey(subject) === key);
}

/* ── Enrolment ───────────────────────────────────────────────────────────── */

/**
 * What a learner starts with: every regular pattern, in the présent alone.
 *
 * ⚠️ **The tense list is where progression lives, and it is chosen from the
 * outside.** A beginner practises the présent; adding the imparfait is a
 * decision the learner makes on the Verbs surface. Nothing here reads a level
 * off anything, which is what `vision.md` refuses — per-level *content* is
 * allowed, the app deciding what you are ready for is not.
 *
 * Every group is enrolled rather than just `-er`, because the groups are five
 * facts and not five difficulties; a learner who only ever meets `-er` verbs
 * simply never sees the others come up as due.
 */
export function defaultEnrolment(spec: ConjugationSpec): ConjugationEnrolment {
  return {
    tenses: [spec.tenses[0].id],
    subjects: spec.subjects.filter(s => s.kind === 'group').map(subjectKey),
  };
}

/**
 * An enrolment with anything unrecognised dropped, and never empty.
 *
 * A stored enrolment outlives the build that wrote it — a group that was
 * renamed, a tense that was removed — and the cost of being wrong is a practice
 * set with nothing in it, which looks broken rather than empty.
 */
export function normalizeEnrolment(
  spec: ConjugationSpec,
  stored: Partial<ConjugationEnrolment> | undefined,
): ConjugationEnrolment {
  const fallback = defaultEnrolment(spec);
  const tenses = (stored?.tenses ?? []).filter(id => spec.tenses.some(t => t.id === id));
  const subjects = (stored?.subjects ?? []).filter(key => findSubject(spec, key) !== undefined);
  return {
    tenses: tenses.length > 0 ? tenses : fallback.tenses,
    subjects: subjects.length > 0 ? subjects : fallback.subjects,
  };
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
 * ⚠️ **Enrolment is the outer bound and the session's choice narrows it** —
 * a tense not enrolled cannot be practised by asking for it here. That keeps
 * the two surfaces honest: the Verbs tab decides what exists, the setup screen
 * decides what to do today.
 */
export function buildTables(
  spec: ConjugationSpec,
  enrolment: ConjugationEnrolment,
  selection?: { tenses?: readonly string[]; subjects?: readonly string[] },
): ConjugationTable[] {
  const tenses = enrolment.tenses.filter(id => selection?.tenses ? selection.tenses.includes(id) : true);
  const subjects = enrolment.subjects
    .filter(key => selection?.subjects ? selection.subjects.includes(key) : true)
    .map(key => findSubject(spec, key))
    .filter((s): s is ConjugationSubject => s !== undefined);

  const tables: ConjugationTable[] = [];
  for (const tenseId of tenses) {
    for (const subject of subjects) {
      // An irregular verb may simply not have been given this tense yet.
      if (subject.kind === 'verb' && !subject.forms[tenseId]) continue;
      tables.push(buildTable(spec, subject, tenseId));
    }
  }
  return tables;
}

/** The item id for a table, which needs its subject back. */
export function tableItemId(spec: ConjugationSpec, table: ConjugationTable): string {
  return `${spec.language}:${table.subjectKind}:${table.subjectId}:${table.tenseId}`;
}

/* ── Scheduling ──────────────────────────────────────────────────────────── */

/**
 * The tables due now, soonest first, with never-practised ones ahead of them.
 *
 * A table with no progress has never been asked, so it is due — the same rule
 * `isDue` applies to an untracked card direction.
 */
export function dueTables(
  spec: ConjugationSpec,
  tables: readonly ConjugationTable[],
  progress: ConjugationProgressMap,
  now: Date = new Date(),
): ConjugationTable[] {
  const due = tables.filter(table => {
    const state = progress[tableItemId(spec, table)];
    return !state || new Date(state.nextReview) <= now;
  });
  return due.sort((a, b) => {
    const sa = progress[tableItemId(spec, a)];
    const sb = progress[tableItemId(spec, b)];
    if (!sa && !sb) return 0;
    if (!sa) return -1;
    if (!sb) return 1;
    return new Date(sa.nextReview).getTime() - new Date(sb.nextReview).getTime();
  });
}

/**
 * Which box to ask from a table.
 *
 * ⚠️ **This is where the per-table schedule pays its debt.** One schedule cannot
 * know that your `nous` specifically is weak, but the tally can, so the box with
 * the most misses is asked first. Ties fall to `tiebreak`, which the caller
 * supplies — a stable choice would ask the same box forever and teach exactly
 * one sixth of the table.
 */
export function pickPerson(
  spec: ConjugationSpec,
  progress: ConjugationProgress | undefined,
  tiebreak: () => number = Math.random,
): ConjugationPerson {
  const misses = progress?.misses ?? {};
  let worst = -1;
  for (const person of spec.persons) worst = Math.max(worst, misses[person.id] ?? 0);
  const candidates = worst > 0
    ? spec.persons.filter(p => (misses[p.id] ?? 0) === worst)
    : spec.persons;
  return candidates[Math.min(candidates.length - 1, Math.floor(tiebreak() * candidates.length))];
}

/** What a hinted answer is worth. A subset of the card ratings, by design. */
export type ConjugationVerdict = 'again' | 'hard' | 'good';

/** A table that has never been practised. */
export function freshProgress(now: Date = new Date()): ConjugationProgress {
  return { interval: 0, ease: 2.5, repetitions: 0, nextReview: now.toISOString(), misses: {} };
}

/**
 * What a rating does to a table.
 *
 * The SM-2 half is `getNextReviewData`, unchanged and shared with every card in
 * the app. The tally is the local part: a miss increments the box that was
 * asked, and a correct answer clears it rather than decrementing — a box you
 * have now produced is answered, not "less wrong than before".
 */
export function rateTable(
  current: ConjugationProgress | undefined,
  personId: string,
  verdict: ConjugationVerdict,
): ConjugationProgress {
  const base = current ?? freshProgress();
  const next = getNextReviewData(
    { interval: base.interval, ease: base.ease, repetitions: base.repetitions },
    verdict,
  );
  // ⚠️ The tally follows the *verdict*, not whether the string matched. A form
  // assembled from both hints is `again`, and it has to count as a miss here
  // too, or the box that needed both hints would stop being offered.
  const misses = { ...base.misses };
  if (verdict === 'again') misses[personId] = (misses[personId] ?? 0) + 1;
  else delete misses[personId];
  return {
    interval: next.interval,
    ease: next.ease,
    repetitions: next.repetitions,
    nextReview: next.nextReview.toISOString(),
    misses,
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
  /** Tables with any history at all. */
  practised: number;
  /** Tables that exist for this tense, within the practice set. */
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
 * ⚠️ **`weakest` is the one thing here a card-shaped progress view could not
 * produce**, and it is the payoff for the per-box tally. The schedule knows a
 * table is shaky; only the tally knows it is your `nous`. After the group
 * rework it says something stronger still — `-er · nous · imparfait` is a claim
 * about an ending across every verb in the group, not about one word.
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

  for (const tenseId of enrolment.tenses) {
    const tense = spec.tenses.find(t => t.id === tenseId);
    if (!tense) continue;
    const forTense = tables.filter(table => table.tenseId === tenseId);
    let tensePractised = 0;
    let tenseDue = 0;

    for (const table of forTense) {
      const state = progress[tableItemId(spec, table)];
      if (!state) {
        // Never practised is also never scheduled, which `dueTables` reads as
        // due — the same rule an untracked card direction gets.
        tenseDue += 1;
        continue;
      }
      tensePractised += 1;
      if (new Date(state.nextReview) <= now) tenseDue += 1;
      for (const [personId, misses] of Object.entries(state.misses)) {
        const person = spec.persons.find(p => p.id === personId);
        if (!person || misses <= 0) continue;
        weakest.push({
          subjectLabel: table.subjectLabel,
          tenseLabel: table.tenseLabel,
          personLabel: person.label,
          form: table.forms[personId],
          misses,
        });
      }
    }

    byTense.push({
      tenseId,
      label: tense.label,
      practised: tensePractised,
      total: forTense.length,
      due: tenseDue,
    });
    practised += tensePractised;
    due += tenseDue;
  }

  weakest.sort((a, b) => b.misses - a.misses);
  return { practised, total: tables.length, due, byTense, weakest: weakest.slice(0, limit) };
}

/* ── Sessions ────────────────────────────────────────────────────────────── */

/** One question: a table, and which of its boxes to ask. */
export interface ConjugationQuestion {
  table: ConjugationTable;
  personId: string;
}

export interface ConjugationQueueOptions {
  /**
   * Include tables that are not due yet.
   *
   * Off by default, which is what makes a session *end*. Over-practising is a
   * legitimate thing to want — it is just something the learner asks for on the
   * start screen rather than something the draw does silently.
   */
  includeNotDue?: boolean;
}

/**
 * The questions a session will ask, fixed at the moment it starts.
 *
 * ⚠️ **One question per table, and both the box and the vehicle are chosen
 * here** rather than when the question is shown. The table is the scheduled
 * item, so asking it twice in one sitting would be two questions about one
 * fact. Choosing up front also keeps every draw inside this function — the
 * screen renders a queue it was handed, so nothing random happens during render.
 *
 * ⚠️ **The vehicle varies, and that is the point of the group rework.** Asking
 * `-er · présent · nous` through `donner` today and `chercher` tomorrow tests
 * the ending; asking it through `parler` every time tests `parlons`.
 *
 * ⚠️ **The queue is owned by the session from here on.** Ratings written while
 * it runs move the picker's counts and must not rebuild it under someone eight
 * questions in — the same rule `buildReviewQueue` follows. A miss therefore does
 * not put the table back into the session in progress: it is due again
 * immediately, so it returns in the *next* session.
 */
export function buildConjugationQueue(
  spec: ConjugationSpec,
  tables: readonly ConjugationTable[],
  progress: ConjugationProgressMap,
  options: ConjugationQueueOptions = {},
  now: Date = new Date(),
  random: () => number = Math.random,
): ConjugationQuestion[] {
  const pool = options.includeNotDue ? [...tables] : dueTables(spec, tables, progress, now);
  const questions = pool.map(table => {
    const state = progress[tableItemId(spec, table)];
    const subject = findSubject(spec, `${table.subjectKind}:${table.subjectId}`);
    const asked = subject && subject.kind === 'group'
      ? buildTable(
          spec, subject, table.tenseId,
          subject.vehicles[Math.min(subject.vehicles.length - 1, Math.floor(random() * subject.vehicles.length))],
        )
      : table;
    return { table: asked, personId: pickPerson(spec, state, random).id };
  });
  // Fisher–Yates, matching `reviewQueue`'s. Due order is subject order, and a
  // session that always opened on `-er` would drill the top of the list.
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}
