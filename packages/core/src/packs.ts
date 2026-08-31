import type { CardSides, StudyLanguage } from './types';
import { getBackSideConfig, getStudyLanguageConfig } from './types';
import { DAILY_LIFE_PACK } from './dailyLife';
import { IDIOMS_PACK } from './idioms';
import { HIRAGANA_PACK, KATAKANA_PACK } from './kana';
import { KANJI_GRADE_1_2_PACK } from './kanji';
import {
  MILITARY_AFFAIRS_PACK_EN,
  MILITARY_AFFAIRS_PACK_KO,
  MILITARY_UNIT_PACK_EN,
  MILITARY_UNIT_PACK_KO,
} from './military';
import { SPANISH_BASICS_PACK } from './spanishBasics';
import { TOPIK_ADVANCED_PACK } from './topik';

/**
 * Curated packs — pools a user draws from over time.
 *
 * There used to be two kinds. A `cards` pack was pre-authored and saved
 * straight to Firestore; a `lookup` pack was a bare word list whose entries had
 * no back at all, so the only way in was tapping one word at a time through the
 * Learn flow and waiting for a model call. That split bought nothing and cost a
 * lot: a lookup pack could not be bulk-saved, drilled, or reviewed as a deck,
 * because there was no card to write.
 *
 * Every pack is now pre-authored. The difference that remains is presentational
 * (`layout`) and whether the entries are worth hearing (`pronounceable`), which
 * are properties of the content rather than two different kinds of thing.
 *
 * The authored back is a **seed, not a finished card**. It is what makes an
 * entry savable and reviewable at all; depth — definition, character breakdown,
 * usage notes, examples — is generated on demand per card, from the deck, the
 * card list, or mid-review. That is what makes a one-line gloss acceptable on
 * words like 여건 or `outstanding`, where a gloss alone would undersell the
 * word.
 */

/**
 * A card back, keyed by the language it is written in.
 *
 * Partial, because on most packs only one side can ever be read. A pack whose
 * study language is English or Korean puts its study text in the same slot one
 * of these would occupy, and `buildPackCardDraft` writes the study side last so
 * it wins — an authored English back on an English pack is overwritten the
 * moment the card saves. Requiring both would mean authoring 133 English glosses
 * of English words that no reader could ever see.
 *
 * Kana is the case that genuinely needs both: romaji answers "what sound is あ"
 * for an English speaker and 아 answers it for a Korean one, and neither is a
 * translation of the other.
 */
export interface PackBack {
  English?: string;
  Korean?: string;
}

export interface PackEntry {
  /** The study-language text — the front of the card. */
  study: string;
  back: PackBack;
  /**
   * The article this noun takes — Spanish `el`/`la`, and whatever a future
   * gendered language names.
   *
   * Its own field rather than part of `study`, matching what `/api/explain`
   * already returns for a looked-up Spanish, French or Swedish noun. That
   * symmetry is the whole point: without it a pack noun saves bare while the
   * same word looked up by hand carries its article and renders a badge on
   * lookup, review and the card detail — two cards for one word that disagree
   * about how much they know. It also reaches `acceptedAnswers`, which takes
   * both `baño` and `el baño` from a learner who learned the noun with its
   * article.
   *
   * Absent on everything that is not a noun, and on the packs that predate it.
   */
  gender?: string;
  /**
   * Which sense this entry means, when the word alone is ambiguous.
   *
   * Two jobs, and the second is why it outlives the save. It disambiguates for
   * the reader (`fine` here is the penalty, not the adjective), and it is
   * carried onto the saved card as `briefDefinition`, where `/api/explain/depth`
   * and `/api/explain/examples` read it to pin the sense they explain. Without
   * that carry, asking for depth on 경기 returns a paragraph about sport.
   */
  context?: string;
}

/**
 * A named group of entries — the unit of enrolment.
 *
 * Sections exist because 160 words is not one decision. They are semantic
 * rather than uniform slices: "Familiar words, second meanings" is a theme a
 * learner can hold in mind, where "words 31–60" is not. That costs some
 * evenness — the sections here run 20 to 45 — and it is worth it.
 */
export interface PackSection {
  /** Stable id, so per-section UI state survives a re-render or a reorder. */
  id: string;
  name: { English: string; Korean: string };
  /** Optional one-liner on why this group hangs together. */
  note?: { English: string; Korean: string };
  entries: PackEntry[];
}

export interface VocabPack {
  id: string;
  /** Display text keyed by native language */
  name: { English: string; Korean: string };
  description: { English: string; Korean: string };
  sections: PackSection[];
  /**
   * How the deck page lays entries out. `grid` packs a wall of single glyphs
   * into small tiles — the only thing that makes 71 kana scannable; `list`
   * gives each entry a row wide enough for a word and its gloss. Keyed on the
   * shape of the content, not on the pack, so a future single-character pack
   * inherits the grid without anyone remembering to ask for it.
   */
  layout: 'grid' | 'list';
  /** Show a pronunciation button per entry — worth it when the card *is* a sound. */
  pronounceable?: boolean;
}

/** Every entry in a pack, in section order. */
export function getPackEntries(pack: VocabPack): PackEntry[] {
  return pack.sections.flatMap(section => section.entries);
}

/**
 * The study-language text of every entry in a pack — what the saved-marking and
 * progress count are keyed on.
 */
export function getPackTerms(pack: VocabPack): string[] {
  return getPackEntries(pack).map(entry => entry.study);
}

/**
 * The side of a back this reader will actually get, which is not always the one
 * `getPackText` would pick.
 *
 * `getPackText` keys on native language, which is right for a pack's name and
 * description — those are UI copy. A card back is different: it has to match the
 * slot `buildPackCardDraft` will write it into, and that is decided by the
 * *pair* of languages. The two disagree in exactly one case, someone studying
 * the language they already speak, where the back falls to the other side. A
 * Korean-native TOEIC learner and an English-native one both read the Korean
 * back, because on an English pack the English slot is the front of the card.
 *
 * Falls back to whichever side exists, so a pack that authored only one side
 * never renders blank.
 */
export function resolvePackBack(
  back: PackBack,
  studyLanguage: StudyLanguage,
  nativeLanguage?: string | null,
): string {
  const { backLanguage } = getBackSideConfig(studyLanguage, nativeLanguage);
  return back[backLanguage] ?? back.English ?? back.Korean ?? '';
}

/**
 * Lowercased study sides of the user's cards, for marking pack entries as
 * already saved. Matches on text rather than `packId` deliberately: a word you
 * looked up on your own should count, and cards saved before `packId` existed
 * carry no pack.
 */
export function collectSavedTerms(cards: CardSides[]): Set<string> {
  const terms = new Set<string>();
  for (const card of cards) {
    const config = getStudyLanguageConfig(card.studyLanguage);
    const study = card[config.studyField] ?? card.term;
    if (study) terms.add(study.toLowerCase());
    if (card.term) terms.add(card.term.toLowerCase());
  }
  return terms;
}

/**
 * Which of these entries this account does not have a card for yet, or `null`
 * when that is not knowable.
 *
 * Takes entries rather than a pack so one function serves both enrolment units:
 * pass a section's entries to enrol a section, `getPackEntries(pack)` to enrol
 * the deck.
 *
 * The null is the point. Callers hold the saved set as `Set | null`, where null
 * means the fetch is still in flight or has failed, and reading that as "none
 * saved" enrolled whole decks on top of themselves — one account ended up with
 * all 71 katakana cards twice. Propagating the unknown instead of collapsing it
 * to an empty set makes the caller answer for it, which a comment asking them
 * to check first does not.
 */
export function unsavedEntries(
  entries: readonly PackEntry[],
  savedTerms: ReadonlySet<string> | null,
): PackEntry[] | null {
  if (savedTerms === null) return null;
  return entries.filter(entry => !savedTerms.has(entry.study.toLowerCase()));
}

/** How many of these entries the user already has a card for. */
export function countSavedEntries(
  entries: readonly PackEntry[],
  savedTerms: ReadonlySet<string>,
): number {
  return entries.filter(entry => savedTerms.has(entry.study.toLowerCase())).length;
}

/** How many of a pack's entries the user already has a card for. */
export function countSavedPackTerms(pack: VocabPack, savedTerms: ReadonlySet<string>): number {
  return countSavedEntries(getPackEntries(pack), savedTerms);
}

/**
 * The Firestore draft for a pack entry. Shared because web and mobile were
 * building it identically, and because the field ordering below is easy to get
 * wrong when one platform changes.
 */
export function buildPackCardDraft(
  entry: PackEntry,
  packId: string,
  uid: string,
  studyLanguage: StudyLanguage,
): Record<string, unknown> {
  const config = getStudyLanguageConfig(studyLanguage);
  return {
    uid,
    term: entry.study,
    termLanguage: studyLanguage,
    packId,
    // Both authored sides are written when both exist, and the draft needs no
    // native language of its own: which side gets *shown* is `getBackSide`'s
    // decision at render time. A card that stored only the side its owner
    // happened to be reading would go blank on them the day they switched.
    ...(entry.back.English !== undefined ? { english: entry.back.English } : {}),
    ...(entry.back.Korean !== undefined ? { korean: entry.back.Korean } : {}),
    // The sense this entry means, kept so the depth and examples calls made
    // later — from the deck, the card list, or mid-review — explain the meaning
    // the pack intended rather than the word's most common one.
    ...(entry.context ? { briefDefinition: entry.context } : {}),
    // The article, where the entry names one — same field a looked-up noun
    // fills, so the two paths produce the same card.
    ...(entry.gender ? { gender: entry.gender } : {}),
    // Last, because on an English or Korean deck the study side is one of the
    // two slots above and has to win — a back never replaces the front.
    [config.studyField]: entry.study,
  };
}

export function getPackText(
  field: { English: string; Korean: string },
  nativeLanguage: string | null | undefined
): string {
  return nativeLanguage === 'Korean' ? field.Korean : field.English;
}

/**
 * Sources: Barron's 600 Essential Words for the TOEIC,
 * pass-the-toeic-test.com word list. Draft review: docs/packs/toeic-pack-draft.md
 * Backs: docs/packs/toeic-backs-draft.md
 *
 * Korean backs only. The study side is the `english` slot, so an authored
 * English back would be overwritten at save time and could never be read.
 */
const TOEIC_PACK: VocabPack = {
  id: 'toeic-core',
  name: { English: 'TOEIC Core Vocabulary', Korean: 'TOEIC 빈출 어휘' },
  description: {
    English: 'High-frequency TOEIC words that need more than a one-word translation — nuanced verbs, adjectives, and familiar words with unfamiliar meanings.',
    Korean: '단순 암기로는 부족한 TOEIC 빈출 어휘 — 뉘앙스가 중요한 동사와 형용사, 아는 단어의 새로운 뜻까지.',
  },
  layout: 'list',
  sections: [
    {
      id: 'verbs',
      name: { English: 'Core business verbs', Korean: '핵심 비즈니스 동사' },
      entries: [
        { study: 'comply', back: { Korean: '준수하다, 따르다' } },
        { study: 'accommodate', back: { Korean: '수용하다' } },
        { study: 'facilitate', back: { Korean: '촉진하다' } },
        { study: 'expedite', back: { Korean: '신속히 처리하다' } },
        { study: 'allocate', back: { Korean: '배정하다, 할당하다' } },
        { study: 'implement', back: { Korean: '시행하다' } },
        { study: 'reimburse', back: { Korean: '환급하다' } },
        { study: 'delegate', back: { Korean: '위임하다' } },
        { study: 'streamline', back: { Korean: '간소화하다' } },
        { study: 'consolidate', back: { Korean: '통합하다' } },
        { study: 'designate', back: { Korean: '지정하다' } },
        { study: 'waive', back: { Korean: '면제하다' } },
        { study: 'incur', back: { Korean: '(비용·손실을) 초래하다' } },
        // Split from `comply` on purpose: two cards sharing a back make
        // back-to-front review unanswerable.
        { study: 'adhere', back: { Korean: '(규정·원칙을) 고수하다' } },
        { study: 'rectify', back: { Korean: '바로잡다' } },
        { study: 'compensate', back: { Korean: '보상하다' } },
        { study: 'authorize', back: { Korean: '승인하다, 권한을 주다' } },
        { study: 'anticipate', back: { Korean: '예상하다' } },
        { study: 'defer', back: { Korean: '(결정·지급을) 미루다' }, context: 'to postpone to a later time' },
        { study: 'solicit', back: { Korean: '(의견·후원을) 요청하다' } },
        { study: 'assess', back: { Korean: '평가하다' } },
        { study: 'conduct', back: { Korean: '(조사·업무를) 실시하다' }, context: 'to carry out, as in conduct a survey' },
        { study: 'deduct', back: { Korean: '공제하다' } },
        { study: 'dismiss', back: { Korean: '해고하다, 기각하다' } },
        { study: 'enclose', back: { Korean: '동봉하다' } },
        { study: 'enroll', back: { Korean: '등록하다' } },
        { study: 'estimate', back: { Korean: '견적을 내다, 추산하다' } },
        { study: 'fulfill', back: { Korean: '(조건·주문을) 이행하다' } },
        { study: 'itemize', back: { Korean: '항목별로 명세하다' } },
        { study: 'jeopardize', back: { Korean: '위태롭게 하다' } },
        { study: 'justify', back: { Korean: '정당화하다' } },
        { study: 'nominate', back: { Korean: '지명하다' } },
        { study: 'notify', back: { Korean: '통지하다' } },
        { study: 'postpone', back: { Korean: '(일정을) 연기하다' } },
        { study: 'prohibit', back: { Korean: '금지하다' } },
        { study: 'pursue', back: { Korean: '추진하다, 추구하다' } },
        { study: 'renovate', back: { Korean: '개조하다, 보수하다' } },
        { study: 'restructure', back: { Korean: '구조조정하다' } },
        { study: 'retain', back: { Korean: '보유하다, 유지하다' } },
        { study: 'revise', back: { Korean: '수정하다' } },
        { study: 'submit', back: { Korean: '제출하다' } },
        { study: 'supervise', back: { Korean: '감독하다' } },
        { study: 'terminate', back: { Korean: '(계약을) 종료하다' } },
        { study: 'verify', back: { Korean: '확인하다, 검증하다' } },
        { study: 'withdraw', back: { Korean: '(돈을) 인출하다, 철회하다' } },
      ],
    },
    {
      id: 'second-meanings',
      name: { English: 'Familiar words, second meanings', Korean: '익숙한 단어의 다른 뜻' },
      note: {
        English: 'Words you already know, in the sense the test uses. The hint is the entry.',
        Korean: '이미 아는 단어를 시험이 쓰는 뜻으로. 힌트가 곧 문제예요.',
      },
      entries: [
        { study: 'address', back: { Korean: '(문제를) 다루다, 해결하다' }, context: 'to deal with a problem or issue' },
        { study: 'outstanding', back: { Korean: '미지급의' }, context: 'unpaid, as in an outstanding invoice' },
        { study: 'issue', back: { Korean: '(공식적으로) 발급하다' }, context: 'to officially give out, as in issue a refund' },
        { study: 'cover', back: { Korean: '대신하다, (비용을) 충당하다' }, context: 'to substitute for someone or pay for a cost' },
        { study: 'meet', back: { Korean: '(기한·조건을) 충족하다' }, context: 'to satisfy, as in meet a deadline or requirement' },
        { study: 'run', back: { Korean: '운영하다' }, context: 'to operate or manage, as in run a business' },
        { study: 'fine', back: { Korean: '벌금' }, context: 'a penalty payment' },
        { study: 'book', back: { Korean: '예약하다' }, context: 'to reserve, as in book a room' },
        { study: 'field', back: { Korean: '(질문을) 처리하다' }, context: 'to handle, as in field questions' },
        { study: 'party', back: { Korean: '(계약) 당사자' }, context: 'a person or group in a contract' },
        { study: 'interest', back: { Korean: '이자' }, context: 'money charged on a loan' },
        { study: 'balance', back: { Korean: '잔액' }, context: 'the remaining amount of money in an account' },
        { study: 'figure', back: { Korean: '수치' }, context: 'a number or amount' },
        { study: 'term', back: { Korean: '(계약) 조건, 기간' }, context: 'a condition of a contract, or a period of time' },
        { study: 'charge', back: { Korean: '청구하다' }, context: 'to bill money for something' },
        { study: 'file', back: { Korean: '(서류를) 제출하다, 접수하다' }, context: 'to formally submit, as in file a complaint' },
        { study: 'draft', back: { Korean: '초안' }, context: 'a preliminary version of a document' },
        { study: 'board', back: { Korean: '이사회' }, context: 'a group of company directors' },
        { study: 'subject', back: { Korean: '~의 적용을 받는, ~을 조건으로 하는' }, context: 'subject to — affected by or dependent on' },
        { study: 'practice', back: { Korean: '관행' }, context: 'a usual way of doing things, as in business practice' },
        { study: 'bill', back: { Korean: '청구서' }, context: 'a request for payment' },
        { study: 'claim', back: { Korean: '(보험금을) 청구하다' }, context: 'to request something you are owed, as in an insurance claim' },
        { study: 'notice', back: { Korean: '(사전) 통보' }, context: "a formal announcement, as in give two weeks' notice" },
        { study: 'raise', back: { Korean: '임금 인상' }, context: 'an increase in pay' },
        { study: 'yield', back: { Korean: '(수익을) 내다, 산출하다' }, context: 'to produce a result or profit' },
        { study: 'stock', back: { Korean: '재고' }, context: 'goods kept on hand, as in in stock / out of stock' },
        { study: 'firm', back: { Korean: '회사' }, context: 'a company' },
        { study: 'branch', back: { Korean: '지점' }, context: 'a local office of a company' },
        { study: 'commission', back: { Korean: '수수료' }, context: 'money earned per sale' },
        { study: 'shift', back: { Korean: '교대 근무' }, context: 'a scheduled work period' },
      ],
    },
    {
      id: 'adjectives',
      name: { English: 'Nuanced adjectives', Korean: '뉘앙스가 중요한 형용사' },
      entries: [
        { study: 'tentative', back: { Korean: '잠정적인' } },
        { study: 'feasible', back: { Korean: '실현 가능한' } },
        { study: 'adjacent', back: { Korean: '인접한' } },
        { study: 'adequate', back: { Korean: '적절한, 충분한' } },
        { study: 'ambiguous', back: { Korean: '모호한' } },
        { study: 'arbitrary', back: { Korean: '자의적인, 임의의' } },
        { study: 'coherent', back: { Korean: '일관성 있는' } },
        { study: 'comprehensive', back: { Korean: '종합적인, 포괄적인' } },
        { study: 'consistent', back: { Korean: '일관된' } },
        { study: 'crucial', back: { Korean: '결정적인, 매우 중요한' } },
        { study: 'deliberate', back: { Korean: '의도적인' }, context: 'intentional, done on purpose' },
        { study: 'eligible', back: { Korean: '자격이 있는' } },
        { study: 'explicit', back: { Korean: '명시적인' } },
        { study: 'inevitable', back: { Korean: '불가피한' } },
        { study: 'plausible', back: { Korean: '그럴듯한' } },
        { study: 'pragmatic', back: { Korean: '실용적인' } },
        { study: 'prevalent', back: { Korean: '만연한' } },
        { study: 'subtle', back: { Korean: '미묘한' } },
        // Split from `feasible`: can be done at all vs. can survive once done.
        { study: 'viable', back: { Korean: '(사업이) 성공 가능한' } },
        { study: 'vulnerable', back: { Korean: '취약한' } },
        { study: 'mandatory', back: { Korean: '의무적인' } },
        { study: 'compatible', back: { Korean: '호환되는' } },
        { study: 'durable', back: { Korean: '내구성 있는' } },
        { study: 'defective', back: { Korean: '결함이 있는' } },
        { study: 'hazardous', back: { Korean: '위험한' } },
        { study: 'redundant', back: { Korean: '불필요한, 중복되는' } },
        { study: 'thorough', back: { Korean: '철저한' } },
        { study: 'pending', back: { Korean: '미결인, 계류 중인' } },
        { study: 'preliminary', back: { Korean: '예비의' } },
        { study: 'subsequent', back: { Korean: '그 이후의' } },
        { study: 'applicable', back: { Korean: '해당되는, 적용되는' } },
        { study: 'confidential', back: { Korean: '기밀의' } },
        { study: 'overdue', back: { Korean: '기한이 지난' } },
        { study: 'prompt', back: { Korean: '신속한' }, context: 'quick and on time' },
        { study: 'complimentary', back: { Korean: '무료의' }, context: 'free of charge' },
      ],
    },
    {
      id: 'nouns',
      name: { English: 'Workplace & procedure nouns', Korean: '업무·절차 명사' },
      entries: [
        // Split from `bill`: what you are asked to pay vs. the itemised document.
        { study: 'invoice', back: { Korean: '송장, 거래 명세서' } },
        { study: 'itinerary', back: { Korean: '여행 일정표' } },
        // Split from `stock`: the goods vs. the count of them.
        { study: 'inventory', back: { Korean: '재고 목록, 재고 조사' } },
        { study: 'warranty', back: { Korean: '품질 보증서' } },
        { study: 'grievance', back: { Korean: '(직장 내) 고충, 불만' } },
        // 장려금 rather than 인센티브: the loanword hands the English word back
        // in Hangul and teaches nothing.
        { study: 'incentive', back: { Korean: '장려금' } },
        { study: 'expenditure', back: { Korean: '지출' } },
        { study: 'liability', back: { Korean: '법적 책임, 부채' } },
        { study: 'dividend', back: { Korean: '배당금' } },
        { study: 'quotation', back: { Korean: '견적서' } },
        { study: 'remittance', back: { Korean: '송금' } },
        { study: 'subsidiary', back: { Korean: '자회사' } },
        { study: 'takeover', back: { Korean: '기업 인수' } },
        { study: 'vacancy', back: { Korean: '공석, 결원' } },
        { study: 'venue', back: { Korean: '행사 장소' } },
        { study: 'patent', back: { Korean: '특허' } },
        { study: 'lease', back: { Korean: '임대차 계약' } },
        { study: 'mortgage', back: { Korean: '주택 담보 대출' } },
        { study: 'surcharge', back: { Korean: '추가 요금' } },
        { study: 'backlog', back: { Korean: '밀린 일, 미처리 물량' } },
        { study: 'turnover', back: { Korean: '이직률, 총매출' }, context: 'the rate of employees leaving, or total sales' },
        { study: 'proceeds', back: { Korean: '수익금' }, context: 'money from a sale or event' },
        { study: 'premises', back: { Korean: '(회사) 부지, 건물' }, context: "a company's building and land" },
      ],
    },
  ],
};

/**
 * The packs offered per study language, in the order the deck page lists them.
 *
 * The two military packs appear under both English and Korean, which is a first
 * — one authored source of Korean–English pairs, registered once per direction
 * (see `military.ts`). They are not a sequence and the order here is not a
 * recommendation: a 통역병 in a line unit wants 부대·참모 first, a 통역장교
 * headed for public affairs wants 안보·정세 first, and the deck page has no way
 * to say "either, depending". Listed after the exam packs because those are
 * what most of each language's users came for.
 *
 * Spanish is one pack and needs no order. It is also the first registry entry
 * whose pack is elementary rather than a domain opened for someone already
 * fluent — the exception is argued in `spanishBasics.ts`, not here.
 *
 * English runs exam → everyday → idioms → job, which is register order rather
 * than difficulty order: TOEIC is what most English users arrived for, Everyday
 * English is the plainest thing here and Idioms the least literal, and the two
 * military packs stay last for the reason above. Japanese is the one registry
 * that *is* a sequence — hiragana, katakana, then kanji, because the kanji
 * pack's backs are written in the two scripts the packs before it teach.
 */
export const VOCAB_PACKS: Partial<Record<StudyLanguage, VocabPack[]>> = {
  English: [TOEIC_PACK, DAILY_LIFE_PACK, IDIOMS_PACK, MILITARY_UNIT_PACK_EN, MILITARY_AFFAIRS_PACK_EN],
  Japanese: [HIRAGANA_PACK, KATAKANA_PACK, KANJI_GRADE_1_2_PACK],
  Korean: [TOPIK_ADVANCED_PACK, MILITARY_UNIT_PACK_KO, MILITARY_AFFAIRS_PACK_KO],
  Spanish: [SPANISH_BASICS_PACK],
};

export function getVocabPacks(studyLanguage: StudyLanguage): VocabPack[] {
  return VOCAB_PACKS[studyLanguage] ?? [];
}

/** One pack by id, or undefined — a deck route's id comes from the URL. */
export function getVocabPack(studyLanguage: StudyLanguage, packId: string): VocabPack | undefined {
  return getVocabPacks(studyLanguage).find(pack => pack.id === packId);
}
