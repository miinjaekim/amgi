import type { StudyLanguage } from './types';
import { HIRAGANA_PACK, KATAKANA_PACK } from './kana';

/**
 * Curated packs — pools a user draws from over time. Two kinds, because two
 * kinds of content need two different things from the app:
 *
 * - `lookup` packs are word lists. Tapping a word runs the normal Learn flow,
 *   because the value is in the explanation Gemini writes for it. Words target
 *   learners who have the basics: terms where a one-word translation is
 *   insufficient. `context` disambiguates polysemous words so /api/explain
 *   resolves the intended (business/test) sense, not the everyday one.
 *
 * - `cards` packs are pre-authored. Tapping saves the card as written, with no
 *   model call, because the content is closed and known — there is nothing for
 *   a model to add about あ that isn't already on the card, and asking would
 *   only produce prose and a chance of being wrong.
 */
export interface PackWord {
  word: string;
  context?: string;
}

/** A complete card, needing no lookup: front text and the back it answers to. */
export interface PackCard {
  study: string;
  back: string;
}

interface PackBase {
  id: string;
  /** Display text keyed by native language */
  name: { English: string; Korean: string };
  description: { English: string; Korean: string };
}

export interface LookupPack extends PackBase {
  kind: 'lookup';
  words: PackWord[];
}

export interface CardPack extends PackBase {
  kind: 'cards';
  cards: PackCard[];
  /** Show a pronunciation button per entry — worth it when the card *is* a sound. */
  pronounceable?: boolean;
}

export type VocabPack = LookupPack | CardPack;

/**
 * The study-language text of every entry in a pack, whichever kind it is —
 * what the saved-marking and progress count are keyed on.
 */
export function getPackTerms(pack: VocabPack): string[] {
  return pack.kind === 'lookup' ? pack.words.map(w => w.word) : pack.cards.map(c => c.study);
}

/**
 * Sources: Barron's 600 Essential Words for the TOEIC,
 * pass-the-toeic-test.com word list. Draft review: docs/packs/toeic-pack-draft.md
 */
const TOEIC_PACK: LookupPack = {
  kind: 'lookup',
  id: 'toeic-core',
  name: { English: 'TOEIC Core Vocabulary', Korean: 'TOEIC 빈출 어휘' },
  description: {
    English: 'High-frequency TOEIC words that need more than a one-word translation — nuanced verbs, adjectives, and familiar words with unfamiliar meanings.',
    Korean: '단순 암기로는 부족한 TOEIC 빈출 어휘 — 뉘앙스가 중요한 동사와 형용사, 아는 단어의 새로운 뜻까지.',
  },
  words: [
    // Core business verbs
    { word: 'comply' },
    { word: 'accommodate' },
    { word: 'facilitate' },
    { word: 'expedite' },
    { word: 'allocate' },
    { word: 'implement' },
    { word: 'reimburse' },
    { word: 'delegate' },
    { word: 'streamline' },
    { word: 'consolidate' },
    { word: 'designate' },
    { word: 'waive' },
    { word: 'incur' },
    { word: 'adhere' },
    { word: 'rectify' },
    { word: 'compensate' },
    { word: 'authorize' },
    { word: 'anticipate' },
    { word: 'defer', context: 'to postpone to a later time' },
    { word: 'solicit' },
    { word: 'assess' },
    { word: 'conduct', context: 'to carry out, as in conduct a survey' },
    { word: 'deduct' },
    { word: 'dismiss' },
    { word: 'enclose' },
    { word: 'enroll' },
    { word: 'estimate' },
    { word: 'fulfill' },
    { word: 'itemize' },
    { word: 'jeopardize' },
    { word: 'justify' },
    { word: 'nominate' },
    { word: 'notify' },
    { word: 'postpone' },
    { word: 'prohibit' },
    { word: 'pursue' },
    { word: 'renovate' },
    { word: 'restructure' },
    { word: 'retain' },
    { word: 'revise' },
    { word: 'submit' },
    { word: 'supervise' },
    { word: 'terminate' },
    { word: 'verify' },
    { word: 'withdraw' },
    // Familiar words, second meanings — context pins the business sense
    { word: 'address', context: 'to deal with a problem or issue' },
    { word: 'outstanding', context: 'unpaid, as in an outstanding invoice' },
    { word: 'issue', context: 'to officially give out, as in issue a refund' },
    { word: 'cover', context: 'to substitute for someone or pay for a cost' },
    { word: 'meet', context: 'to satisfy, as in meet a deadline or requirement' },
    { word: 'run', context: 'to operate or manage, as in run a business' },
    { word: 'fine', context: 'a penalty payment' },
    { word: 'book', context: 'to reserve, as in book a room' },
    { word: 'field', context: 'to handle, as in field questions' },
    { word: 'party', context: 'a person or group in a contract' },
    { word: 'interest', context: 'money charged on a loan' },
    { word: 'balance', context: 'the remaining amount of money in an account' },
    { word: 'figure', context: 'a number or amount' },
    { word: 'term', context: 'a condition of a contract, or a period of time' },
    { word: 'charge', context: 'to bill money for something' },
    { word: 'file', context: 'to formally submit, as in file a complaint' },
    { word: 'draft', context: 'a preliminary version of a document' },
    { word: 'board', context: 'a group of company directors' },
    { word: 'subject', context: 'subject to — affected by or dependent on' },
    { word: 'practice', context: 'a usual way of doing things, as in business practice' },
    { word: 'bill', context: 'a request for payment' },
    { word: 'claim', context: 'to request something you are owed, as in an insurance claim' },
    { word: 'notice', context: "a formal announcement, as in give two weeks' notice" },
    { word: 'raise', context: 'an increase in pay' },
    { word: 'yield', context: 'to produce a result or profit' },
    { word: 'stock', context: 'goods kept on hand, as in in stock / out of stock' },
    { word: 'firm', context: 'a company' },
    { word: 'branch', context: 'a local office of a company' },
    { word: 'commission', context: 'money earned per sale' },
    { word: 'shift', context: 'a scheduled work period' },
    // Nuanced adjectives
    { word: 'tentative' },
    { word: 'feasible' },
    { word: 'adjacent' },
    { word: 'adequate' },
    { word: 'ambiguous' },
    { word: 'arbitrary' },
    { word: 'coherent' },
    { word: 'comprehensive' },
    { word: 'consistent' },
    { word: 'crucial' },
    { word: 'deliberate', context: 'intentional, done on purpose' },
    { word: 'eligible' },
    { word: 'explicit' },
    { word: 'inevitable' },
    { word: 'plausible' },
    { word: 'pragmatic' },
    { word: 'prevalent' },
    { word: 'subtle' },
    { word: 'viable' },
    { word: 'vulnerable' },
    { word: 'mandatory' },
    { word: 'compatible' },
    { word: 'durable' },
    { word: 'defective' },
    { word: 'hazardous' },
    { word: 'redundant' },
    { word: 'thorough' },
    { word: 'pending' },
    { word: 'preliminary' },
    { word: 'subsequent' },
    { word: 'applicable' },
    { word: 'confidential' },
    { word: 'overdue' },
    { word: 'prompt', context: 'quick and on time' },
    { word: 'complimentary', context: 'free of charge' },
    // Workplace & procedure nouns
    { word: 'invoice' },
    { word: 'itinerary' },
    { word: 'inventory' },
    { word: 'warranty' },
    { word: 'grievance' },
    { word: 'incentive' },
    { word: 'expenditure' },
    { word: 'liability' },
    { word: 'dividend' },
    { word: 'quotation' },
    { word: 'remittance' },
    { word: 'subsidiary' },
    { word: 'takeover' },
    { word: 'vacancy' },
    { word: 'venue' },
    { word: 'patent' },
    { word: 'lease' },
    { word: 'mortgage' },
    { word: 'surcharge' },
    { word: 'backlog' },
    { word: 'turnover', context: 'the rate of employees leaving, or total sales' },
    { word: 'proceeds', context: 'money from a sale or event' },
    { word: 'premises', context: "a company's building and land" },
  ],
};

export const VOCAB_PACKS: Partial<Record<StudyLanguage, VocabPack[]>> = {
  English: [TOEIC_PACK],
  Japanese: [HIRAGANA_PACK, KATAKANA_PACK],
};

export function getVocabPacks(studyLanguage: StudyLanguage): VocabPack[] {
  return VOCAB_PACKS[studyLanguage] ?? [];
}

export function getPackText(
  field: { English: string; Korean: string },
  nativeLanguage: string | null | undefined
): string {
  return nativeLanguage === 'Korean' ? field.Korean : field.English;
}
