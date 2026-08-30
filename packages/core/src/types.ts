import { isAllKana, markPitchAccent } from './pitchAccent';

/**
 * Traditional and Simplified Chinese are separate study languages rather than
 * one language with a script preference: the decks stay independent, so
 * neither constrains the other, and regional vocabulary differences go beyond
 * the glyphs. A Simplified deck would be its own registry entry.
 */
export type StudyLanguage =
  | 'Korean'
  | 'Swedish'
  | 'English'
  | 'French'
  | 'Japanese'
  | 'TraditionalChinese'
  | 'Spanish'
  | 'Kikuyu'
  | 'Swahili';

/**
 * i18n keys for the character-breakdown section heading. Every Han-script
 * language gets its own key because English names the script differently per
 * language (hanja / kanji / hanzi), even where Korean does not.
 */
export type CharacterSectionKey = 'sectionHanja' | 'sectionKanji' | 'sectionHanzi';
export type FieldLabelKey =
  | 'labelKorean'
  | 'labelEnglish'
  | 'labelSwedish'
  | 'labelFrench'
  | 'labelJapanese'
  | 'labelTraditionalChinese'
  | 'labelSpanish'
  | 'labelKikuyu'
  | 'labelSwahili';

export type CardSideField =
  | 'korean'
  | 'swedish'
  | 'english'
  | 'french'
  | 'japanese'
  | 'traditionalChinese'
  | 'spanish'
  | 'kikuyu'
  | 'swahili';

/**
 * Per-study-language configuration. Adding a language means adding an entry
 * here (plus its Gemini prompt branches in the API routes and i18n keys),
 * instead of growing per-language conditionals across the app.
 */
export interface StudyLanguageConfig {
  code: StudyLanguage;
  label: string;
  labelNative: string;
  /** Firestore collection holding this language's cards */
  collection: string;
  /**
   * BCP-47 tag for `Intl` APIs — word segmentation in `diff.ts` today.
   *
   * Separate from `ttsLanguageCode` rather than reusing it, because that field
   * answers a different question and gives a wrong answer here: Traditional
   * Chinese TTS is `cmn-TW`, which names the spoken variety, where `Intl` wants
   * `zh-TW`. Keeping them apart means neither has to compromise for the other.
   */
  locale: string;
  /** Field on cards/TermCore/ExamplePair holding the study-language text */
  studyField: CardSideField;
  /** i18n key for the study-side label */
  studyLabelKey: FieldLabelKey;
  /**
   * Section heading for the per-character breakdown, on languages written with
   * Han characters. Absent means the language has no characters to break down,
   * and the depth prompt leaves the section out entirely.
   */
  characterSectionKey?: CharacterSectionKey;
  /**
   * Google Cloud TTS language code + voice name for pronunciation audio, if
   * supported. Chirp 3: HD wherever the locale has one — `cmn-TW` doesn't, so
   * Traditional Chinese takes a WaveNet voice rather than a Mainland accent.
   */
  ttsLanguageCode?: string;
  ttsVoiceName?: string;
  /**
   * Voice for single-character text, where one is needed.
   *
   * Chirp 3: HD is generative, and on a lone character it intermittently
   * returns silence instead of audio — measured at 11/70 kana and 9/21 Korean
   * syllables, with a different set failing on each run. Two-character text was
   * clean (0/15), so the problem is specifically an utterance too short for the
   * model to commit to. The Neural2 voices returned silence 0/91 times on the
   * same inputs, so a single character is routed to one.
   *
   * Only set where single-character terms are a normal card: a lone kana or
   * hanja is the whole point of a kana pack and common in Korean, whereas a
   * one-letter French or Swedish term is not really a thing. Adding one for
   * those is a line here if that changes.
   */
  ttsShortVoiceName?: string;
}

export const STUDY_LANGUAGE_CONFIGS: Record<StudyLanguage, StudyLanguageConfig> = {
  Korean: {
    code: 'Korean',
    label: 'Korean',
    labelNative: '한국어',
    collection: 'cards',
    locale: 'ko',
    studyField: 'korean',
    studyLabelKey: 'labelKorean',
    characterSectionKey: 'sectionHanja',
    ttsLanguageCode: 'ko-KR',
    ttsVoiceName: 'ko-KR-Chirp3-HD-Charon',
    ttsShortVoiceName: 'ko-KR-Neural2-C',
  },
  Swedish: {
    code: 'Swedish',
    label: 'Swedish',
    labelNative: 'Svenska',
    collection: 'cards_swedish',
    locale: 'sv',
    studyField: 'swedish',
    studyLabelKey: 'labelSwedish',
    ttsLanguageCode: 'sv-SE',
    ttsVoiceName: 'sv-SE-Chirp3-HD-Charon',
  },
  French: {
    code: 'French',
    label: 'French',
    labelNative: 'Français',
    collection: 'cards_french',
    locale: 'fr',
    studyField: 'french',
    studyLabelKey: 'labelFrench',
    ttsLanguageCode: 'fr-FR',
    ttsVoiceName: 'fr-FR-Chirp3-HD-Charon',
  },
  Spanish: {
    code: 'Spanish',
    label: 'Spanish',
    labelNative: 'Español',
    collection: 'cards_spanish',
    locale: 'es',
    studyField: 'spanish',
    studyLabelKey: 'labelSpanish',
    // European Spanish, chosen the way `fr-FR` and `sv-SE` were: one deck per
    // registry entry, named for the variety it actually speaks. Latin American
    // Spanish is a real and larger-audience alternative (`es-US`, and vocabulary
    // differences well past the accent), and if it is ever wanted it follows the
    // Traditional/Simplified rule at the top of this file — its own entry with
    // its own collection, not a script or accent toggle on this one.
    ttsLanguageCode: 'es-ES',
    ttsVoiceName: 'es-ES-Chirp3-HD-Charon',
  },
  Kikuyu: {
    code: 'Kikuyu',
    label: 'Kikuyu',
    labelNative: 'Gĩkũyũ',
    collection: 'cards_kikuyu',
    // `ki` is the ISO 639-1 code, and `Intl.Segmenter` accepts it — verified,
    // because an unrecognised tag would silently fall back to the host locale
    // and mis-segment every writing diff.
    locale: 'ki',
    studyField: 'kikuyu',
    studyLabelKey: 'labelKikuyu',
    // **The first entry with no TTS at all**, which is why `ttsLanguageCode`
    // and `ttsVoiceName` were optional. Google Cloud TTS has no Kikuyu voice —
    // checked against the live voice list, not assumed: 2066 voices, 62
    // locales, and the only Bantu one is `sw-KE`. Swahili is the tempting
    // stand-in and it is the wrong one: it has no `ĩ`/`ũ` in its alphabet, so
    // the two vowels that distinguish Kikuyu words are exactly what it would
    // mispronounce. Silence beats confidently wrong pronunciation on a
    // learner's card. Both apps already hide the button when these are unset.
    //
    // No `gender` either — Kikuyu marks noun class, not gender, and the model
    // is not reliable enough to teach it. Measured on eight nouns: `mũndũ` and
    // `mũtĩ` came back right, `rũthiomi` came back with the Swahili plural
    // `ndimi` instead of `thiomi`. A wrong class on a card teaches wrong
    // agreement across every sentence the learner builds with it, so the field
    // is left off until something better than the model can fill it.
  },
  Swahili: {
    code: 'Swahili',
    label: 'Swahili',
    labelNative: 'Kiswahili',
    collection: 'cards_swahili',
    // `sw` is the ISO 639-1 code, and `Intl.Segmenter` accepts it — verified
    // the way `ki` was, because an unrecognised tag resolves silently to the
    // host locale instead of throwing, and every writing diff would mis-segment
    // with nothing to show that it had.
    locale: 'sw',
    studyField: 'swahili',
    studyLabelKey: 'labelSwahili',
    // `sw-KE` is the only Swahili locale Google Cloud TTS carries, so the
    // variety question the Spanish entry raises never arises here — there is no
    // `sw-TZ` to weigh Kenyan against, and nothing to name a second deck for.
    // It has 30 voices and every one of them is Chirp 3: HD, so this takes
    // `Charon` like the rest rather than the WaveNet fallback Traditional
    // Chinese needs. Checked against the live voice list, and synthesised:
    // `rafiki`, `kuandika` and `furaha` came back 6–8 kB, well clear of the
    // silence floor in `/api/pronounce`.
    ttsLanguageCode: 'sw-KE',
    ttsVoiceName: 'sw-KE-Chirp3-HD-Charon',
    // No `ttsShortVoiceName`: that field exists for languages where a lone
    // character is a normal card, as a kana or a hanja is. Swahili has no
    // one-letter words worth a card, so the Chirp 3: HD silence bug it works
    // around is unreachable here.
    //
    // No `gender`, for the reason it is off on Kikuyu one entry up: Swahili
    // marks noun class, not gender. It is the richer system of the two — class
    // drives agreement on verbs, adjectives and possessives alike — which makes
    // a wrong one more damaging on a card, not less. The Kikuyu probe is also
    // evidence *about* Swahili rather than merely next to it: the model reached
    // for Swahili noun morphology unprompted and got the Kikuyu word wrong with
    // it, which says the class system is what it pattern-matches, not what it
    // knows. Left off until something better than the model can fill it.
  },
  Japanese: {
    code: 'Japanese',
    label: 'Japanese',
    labelNative: '日本語',
    collection: 'cards_japanese',
    locale: 'ja',
    studyField: 'japanese',
    studyLabelKey: 'labelJapanese',
    characterSectionKey: 'sectionKanji',
    ttsLanguageCode: 'ja-JP',
    ttsVoiceName: 'ja-JP-Chirp3-HD-Charon',
    ttsShortVoiceName: 'ja-JP-Neural2-C',
  },
  TraditionalChinese: {
    code: 'TraditionalChinese',
    label: 'Chinese (Traditional)',
    labelNative: '繁體中文',
    collection: 'cards_chinese_traditional',
    locale: 'zh-TW',
    studyField: 'traditionalChinese',
    studyLabelKey: 'labelTraditionalChinese',
    characterSectionKey: 'sectionHanzi',
    // `cmn-TW` has no Chirp 3: HD voice, so this is WaveNet against
    // `cmn-CN-Chirp3-HD-Charon`: a Taiwanese accent in an older voice, or a
    // better voice with a Mainland one. Accent fidelity is the point of audio
    // on a Traditional deck, so the accent wins. Both read Traditional input
    // fine — the script was never the constraint.
    ttsLanguageCode: 'cmn-TW',
    ttsVoiceName: 'cmn-TW-Wavenet-A',
  },
  // English study pairs with Korean — the only non-English native language
  // supported today. A native-Korean learner's card back is Korean.
  English: {
    code: 'English',
    label: 'English',
    labelNative: 'English',
    collection: 'cards_english',
    locale: 'en',
    studyField: 'english',
    studyLabelKey: 'labelEnglish',
    ttsLanguageCode: 'en-US',
    ttsVoiceName: 'en-US-Chirp3-HD-Charon',
  },
};

export function getStudyLanguageConfig(studyLanguage?: StudyLanguage | string): StudyLanguageConfig {
  return STUDY_LANGUAGE_CONFIGS[studyLanguage as StudyLanguage] ?? STUDY_LANGUAGE_CONFIGS.Korean;
}

/** Which card slot holds the back, and how to name it. */
export interface BackSideConfig {
  /** Field holding the translation side of the card */
  backField: CardSideField;
  /** Language of the translation side */
  backLanguage: 'English' | 'Korean';
  /** i18n key for the back-side label */
  backLabelKey: FieldLabelKey;
}

/**
 * The back side belongs to the *pair* of languages, not to either one alone,
 * which is why this is separate from `getStudyLanguageConfig` rather than a
 * field on it: a Korean native studying Japanese wants a Korean back, but a
 * Korean native studying Korean cannot have one.
 *
 * Deliberately not named for its input. `getStudyLanguageConfig` is a real
 * lookup into `STUDY_LANGUAGE_CONFIGS`; there is no table keyed on native
 * language and there could not be one.
 *
 * The rule is just "your own language", with one escape hatch. Studying the
 * language you already speak is the only case where that collides with the
 * front of the card, and there the back falls to the other side — which
 * reproduces exactly what the old hardcoded table said for every pair.
 */
export function getBackSideConfig(
  studyLanguage?: StudyLanguage | string,
  nativeLanguage?: string | null,
): BackSideConfig {
  const { studyField } = getStudyLanguageConfig(studyLanguage);
  const own: CardSideField = nativeLanguage === 'Korean' ? 'korean' : 'english';
  const backField = own !== studyField ? own : own === 'korean' ? 'english' : 'korean';
  return {
    backField,
    backLanguage: backField === 'korean' ? 'Korean' : 'English',
    backLabelKey: backField === 'korean' ? 'labelKorean' : 'labelEnglish',
  };
}

// Example pairs — one side per language, see StudyLanguageConfig field names
export interface ExamplePair {
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  traditionalChinese?: string;
  spanish?: string;
  kikuyu?: string;
  swahili?: string;
  english: string;
}

/**
 * The parts of speech a card can be tagged with — one closed, language-generic
 * set, stored as a code and rendered through `partOfSpeechLabel()`.
 *
 * **A code, never display text**, and that is the whole point: "noun" on a card
 * has to read 명사 to a Korean native and Noun to an English one, and which of
 * those a reader wants can change after the card is saved. Storing the label
 * would mean either a Firestore migration on every native-language switch or a
 * second generated field per language — the problem the two back slots already
 * solved once, and a code solves outright because there is nothing to store per
 * reader. Unknown values never reach a card: `/api/explain` normalizes the
 * model's answer through `normalizePartOfSpeech` before it is returned.
 *
 * Language-generic on purpose. `particle` covers Korean 조사 and Japanese 助詞,
 * `counter` covers 単位/量詞, and no code names a language — the registry
 * warning at the top of this file applies here too, so don't add
 * `naAdjective` for Japanese. The i/na split is a real distinction and it is
 * deliberately not here: it belongs in the depth notes, where it can be
 * explained, rather than in a badge that would be blank for five of the six
 * decks.
 */
export const PART_OF_SPEECH_CODES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'determiner',
  'numeral',
  'preposition',
  'conjunction',
  'interjection',
  'particle',
  'counter',
  'affix',
  'phrase',
  'idiom',
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_CODES)[number];

/**
 * A model's part-of-speech answer as a code, or undefined if it isn't one.
 *
 * Tolerant of case and stray whitespace, and of the two shapes a model reaches
 * for when a closed list is not quite enough — "Noun (countable)" and
 * "noun/verb" both resolve to the first code named. Anything else is dropped
 * rather than stored: a card carrying `gerund` would render no badge at every
 * site anyway, and dropping it at the boundary keeps that from being a fact
 * about the UI.
 */
export function normalizePartOfSpeech(value: unknown): PartOfSpeech | undefined {
  if (typeof value !== 'string') return undefined;
  const first = value.toLowerCase().split(/[/,(]/)[0].trim();
  return (PART_OF_SPEECH_CODES as readonly string[]).includes(first)
    ? (first as PartOfSpeech)
    : undefined;
}

export interface TermCore {
  term: string;
  termLanguage: StudyLanguage;
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  traditionalChinese?: string;
  spanish?: string;
  kikuyu?: string;
  swahili?: string;
  english: string;
  translation?: string;
  /**
   * The part of speech of the **study-language** word, not of `term`.
   *
   * Same rule as `getDepthTarget`: a learner who typed "awkward" into a Korean
   * deck is being shown a card whose front is 어색하다, and tagging that card
   * with English "awkward"'s adjective would describe the word they already
   * knew. Absent on every card saved before this field existed, and on pack
   * cards, which author no part of speech.
   */
  partOfSpeech?: PartOfSpeech;
  formality?: string;
  gender?: string; // grammatical gender: Swedish 'en'/'ett', French 'le'/'la'
  furigana?: string; // Japanese kana reading, present when the term contains kanji
  pinyin?: string; // Traditional Chinese reading, tone-marked
  /**
   * Japanese pitch accent as an アクセント核 position — `0` for 平板, otherwise
   * the mora after which the pitch falls. Unlike every other field on this
   * type it is **not** written by the model: `/api/explain` looks it up in a
   * dictionary, because Gemini scored 6/27 against the dictionary's 27/27 and
   * failed by flattening 雨/飴 and 花/鼻 into one accent. See
   * `apps/web/src/data/README.md`. Absent on cards saved before this shipped,
   * and on any word the dictionary does not carry.
   */
  pitchAccent?: number;
  briefDefinition?: string;
}

export interface TermDepth {
  definition?: string;
  /**
   * Per-character breakdown for a Han-script term — what each character means
   * and how it reads inside this word. Not `hanja`: Korean, Japanese and
   * Chinese all want this section, and only one of them calls it hanja.
   */
  characterBreakdown?: string;
  /**
   * @deprecated Korean cards saved before the field was generalized. Never
   * write it; read it through `getCharacterBreakdown()`, which is why those
   * cards need no migration.
   */
  hanja?: string;
  notes?: string;
}

/** The character breakdown to render, from either the current or legacy field. */
export function getCharacterBreakdown(
  depth: Pick<TermDepth, 'characterBreakdown' | 'hanja'>
): string | undefined {
  return depth.characterBreakdown || depth.hanja || undefined;
}

export interface TermExplanation extends TermCore, TermDepth {
  examples?: ExamplePair[];
}

export interface DisambiguationMeaning {
  label: string;
  hint: string;
}

export interface TermAmbiguous {
  ambiguous: true;
  term: string;
  termLanguage: StudyLanguage;
  meanings: DisambiguationMeaning[];
}

/**
 * The spelling correction a lookup applied on the way to answering.
 *
 * Deliberately not a `TermCore` field: it describes the *lookup*, not the term,
 * and `TermCore` is spread wholesale onto a saved card — a card carrying
 * "this was once a typo" would be storing a detail about the day it was
 * created. `applySpellingCorrection` lifts it off before the client keeps
 * anything.
 */
export interface WithCorrection {
  /** The corrected spelling, or null/absent when nothing was corrected. */
  corrected?: string | null;
}

export type ExplainResult = (TermCore & WithCorrection) | (TermAmbiguous & WithCorrection);

// Flashcard / review types
export interface ReviewTracking {
  nextReview: Date | string;
  interval: number;
  ease: number;
  repetitions: number;
}

export interface Flashcard extends TermExplanation {
  id?: string;
  uid: string;
  createdAt: Date;
  archived?: boolean;
  studyLanguage?: StudyLanguage; // undefined = legacy Korean
  /**
   * The pack this card came from, when it came from one. Absent on every card
   * saved by looking a word up, and on every card saved before this field
   * existed — so it identifies provenance and must never be used to decide
   * whether a term is already saved. Deck progress matches on the study side
   * instead, which also credits a word you looked up on your own.
   */
  packId?: string;
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
  /** @deprecated Use frontToBack.nextReview or backToFront.nextReview instead */
  nextReview?: Date | string;
  /** @deprecated Use frontToBack.interval or backToFront.interval instead */
  interval?: number;
  /** @deprecated Use frontToBack.ease or backToFront.ease instead */
  ease?: number;
  /** @deprecated Use frontToBack.repetitions or backToFront.repetitions instead */
  repetitions?: number;
}

/** A card-shaped object carrying language side fields. */
export type CardSides = Partial<Record<CardSideField, string>> & {
  studyLanguage?: StudyLanguage;
  term?: string;
  translation?: string;
};

/** Returns the study-language side of a card. */
export function getStudyLangSide(card: CardSides): string {
  const config = getStudyLanguageConfig(card.studyLanguage);
  return card[config.studyField] || card.term || '';
}

/**
 * Returns the translation side of a card.
 *
 * Falls back to `english` because backs only became native-aware after people
 * had saved cards: every document written before that carries its back there
 * and nowhere else. A Korean native sees English on those rather than a blank
 * card, until the card is next saved and gains a Korean side.
 */
export function getBackSide(card: CardSides, nativeLanguage?: string | null): string {
  const { backField } = getBackSideConfig(card.studyLanguage, nativeLanguage);
  return card[backField] || card.english || card.translation || '';
}

/**
 * The back-side text of a term that was just looked up.
 *
 * Card-shaped `getBackSide` cannot serve this: a `TermCore` carries
 * `termLanguage` — the language the user typed in — where a card carries
 * `studyLanguage`, so the pair has to be passed rather than read off the value.
 * The `english` fallback is the same one and exists for a sharper reason here:
 * nothing guarantees the model filled the native slot. An API deployment older
 * than this code will not, and the term must still show a translation.
 */
export function getTermBackSide(
  core: CardSides,
  studyLanguage?: StudyLanguage,
  nativeLanguage?: string | null
): string {
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  return core[backField] || core.english || core.translation || '';
}

/** Returns the study-language text from an example pair. */
export function getExampleStudyLangText(ex: ExamplePair, studyLanguage?: StudyLanguage): string {
  if (studyLanguage) return ex[getStudyLanguageConfig(studyLanguage).studyField] ?? '';
  return ex.korean ?? ex.swedish ?? '';
}

/**
 * The pronunciation reading to show as a badge beside a term, if the study
 * language has one — Japanese furigana, Traditional Chinese pinyin. A card
 * only ever carries the field belonging to its own language, so the next
 * reading-bearing language is one entry here rather than another conditional
 * at every render site.
 *
 * Japanese pitch accent rides **inside** this one badge rather than beside it:
 * は＼し already contains the reading, so marking the furigana it was going to
 * show anyway costs no space and adds the distinction furigana alone cannot
 * make. A card with no accent — one saved before the field existed, or a word
 * the dictionary does not carry — falls back to bare furigana, which is what
 * every Japanese card showed before.
 *
 * A kana-only term is its own reading, so it has no furigana by design (the
 * prompt sets it null when there is no kanji). It still has an accent worth
 * showing, which is why `japanese` is read here as the fallback source.
 */
export function getReading(
  card: Pick<TermCore, 'furigana' | 'pinyin' | 'pitchAccent' | 'japanese'>
): string | undefined {
  const kana = card.furigana || (card.japanese && isAllKana(card.japanese) ? card.japanese : '');
  if (kana) return markPitchAccent(kana, card.pitchAccent);
  return card.pinyin || undefined;
}

/** Splits an example pair into its study-language and translation sides. */
export function getExampleSides(
  ex: ExamplePair,
  studyLanguage?: StudyLanguage,
  nativeLanguage?: string | null
): { study: string; back: string } {
  const { studyField } = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  return { study: ex[studyField] ?? '', back: ex[backField] ?? ex.english ?? '' };
}

/**
 * Returns the term that depth/examples calls should elaborate on.
 * Digging deeper must always target the study-language word: if the user
 * typed the term in another language (termLanguage !== studyLanguage),
 * the interesting word is the study-language translation, not the term
 * they already understand.
 */
export function getDepthTarget(
  core: Pick<
    TermCore,
    | 'term'
    | 'termLanguage'
    | 'korean'
    | 'swedish'
    | 'french'
    | 'japanese'
    | 'traditionalChinese'
    | 'spanish'
    | 'kikuyu'
    | 'swahili'
    | 'english'
    | 'briefDefinition'
  >,
  studyLanguage: StudyLanguage = 'Korean',
  nativeLanguage?: string | null
): { term: string; termLanguage: string; translation?: string; briefDefinition?: string } {
  const config = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  // Pass the already-resolved sense along: for polysemous terms (pack context
  // hints, disambiguation picker, "not what you meant") depth/examples must
  // elaborate on the meaning the user chose, not whichever sense Gemini
  // reaches for first.
  const sense = {
    translation:
      core[backField] || core.english || (core.termLanguage !== studyLanguage ? core.term : undefined),
    briefDefinition: core.briefDefinition,
  };
  if (core.termLanguage !== studyLanguage) {
    const studySide = core[config.studyField];
    if (studySide) return { term: studySide, termLanguage: studyLanguage, ...sense };
  }
  return { term: core.term, termLanguage: core.termLanguage, ...sense };
}

// Word of the day — daily featured term on the Learn screen
export interface WordOfTheDay {
  term: string; // study-language word
  english: string;
  korean?: string; // translation side for English study
  briefDefinition?: string;
  partOfSpeech?: PartOfSpeech; // every language
  formality?: string; // Korean
  gender?: string; // Swedish/French
  furigana?: string; // Japanese
  pitchAccent?: number; // Japanese, looked up rather than generated
  pinyin?: string; // Traditional Chinese
  /**
   * The explanation to show when the card is tapped, generated and stored
   * alongside the word so the tap is a read rather than a second, independently
   * worded Gemini call. Absent on documents written before this was added —
   * use `wordOfTheDayCore()`, which reconstructs it from the fields above.
   */
  core?: TermCore;
}

/**
 * The `TermCore` a word of the day represents, so tapping the card can show an
 * explanation without regenerating one. Prefers the stored `core`; falls back
 * to assembling the fields the word of the day always carries.
 */
export function wordOfTheDayCore(
  wotd: WordOfTheDay,
  studyLanguage: StudyLanguage,
  nativeLanguage?: string | null
): TermCore {
  if (wotd.core) return wotd.core;
  const config = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  const core: Record<string, unknown> = {
    term: wotd.term,
    termLanguage: studyLanguage,
    english: config.studyField === 'english' ? wotd.term : wotd.english,
    [config.studyField]: wotd.term,
    // `korean` may be absent on a word of the day generated before backs became
    // native-aware; the English side is what those documents have.
    [backField]: (backField === 'korean' ? wotd.korean : wotd.english) ?? wotd.english,
    briefDefinition: wotd.briefDefinition,
    partOfSpeech: wotd.partOfSpeech,
    formality: wotd.formality,
    gender: wotd.gender,
    furigana: wotd.furigana,
    pitchAccent: wotd.pitchAccent,
    pinyin: wotd.pinyin,
  };
  // A field the model left out must be dropped, not carried as undefined:
  // this object is written to Firestore, which rejects undefined values.
  for (const key of Object.keys(core)) {
    if (core[key] === undefined) delete core[key];
  }
  return core as unknown as TermCore;
}

// User types
export interface UserPreferences {
  nativeLanguage: string;
  studyLanguage?: StudyLanguage;
  streak?: number;
  longestStreak?: number;
  lastReviewDate?: string; // 'YYYY-MM-DD' in local timezone
  reviewedToday?: number;
}

export const SUPPORTED_NATIVE_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Korean', label: '한국어' },
] as const;

export const SUPPORTED_STUDY_LANGUAGES: { code: StudyLanguage; label: string; labelNative: string }[] =
  Object.values(STUDY_LANGUAGE_CONFIGS).map(({ code, label, labelNative }) => ({ code, label, labelNative }));

// Backward compat alias used by existing UI code
export const SUPPORTED_LANGUAGES = SUPPORTED_NATIVE_LANGUAGES;

export function isStudyLanguage(value: unknown): value is StudyLanguage {
  return typeof value === 'string' && value in STUDY_LANGUAGE_CONFIGS;
}

export function isNativeLanguage(value: unknown): boolean {
  return SUPPORTED_NATIVE_LANGUAGES.some((l) => l.code === value);
}

/**
 * Study language to use after the native language changes.
 *
 * Natives don't study their own language — the setup modal enforces this by
 * excluding the native language from the study options, but changing native
 * language later in settings could strand you on a deck that teaches you your
 * own language. On a collision we move to the language the user just stopped
 * being native in (English ↔ Korean, the demo case), never to a language they
 * weren't already using.
 */
export function resolveStudyLanguage(
  nextNativeLanguage: string,
  currentStudyLanguage: StudyLanguage,
  previousNativeLanguage: string | null | undefined
): StudyLanguage {
  // No previous native means first-time setup, which the setup modal owns —
  // it already excludes the native language from the study options, and
  // stepping in here would only fight the choice being made. True on both
  // platforms since mobile got its own blocking setup modal; before that
  // mobile had no first run at all, and this early return was the hole the
  // native-Korean-studying-Korean collision came through.
  if (previousNativeLanguage == null) return currentStudyLanguage;
  if (currentStudyLanguage !== nextNativeLanguage) return currentStudyLanguage;
  if (isStudyLanguage(previousNativeLanguage) && previousNativeLanguage !== nextNativeLanguage) {
    return previousNativeLanguage;
  }
  // No usable previous native (first run, or it isn't a study language) — any
  // supported study language other than the new native will do.
  return SUPPORTED_STUDY_LANGUAGES.find((l) => l.code !== nextNativeLanguage)!.code;
}

/**
 * Native language to use after the study language changes — the mirror of
 * `resolveStudyLanguage`.
 *
 * Picking your own language to study is the same contradiction seen from the
 * other side: a native English speaker who switches to studying English is
 * really telling us they aren't a native English speaker. We move the native
 * language to the one they were just studying, when that is a language we
 * support natively; otherwise to any native language that isn't the new study
 * language. Note this changes the UI language too, which is a larger effect
 * than the mirror case has.
 */
export function resolveNativeLanguage(
  nextStudyLanguage: StudyLanguage,
  currentNativeLanguage: string | null | undefined,
  previousStudyLanguage: StudyLanguage
): string | null | undefined {
  if (currentNativeLanguage !== nextStudyLanguage) return currentNativeLanguage;
  if (isNativeLanguage(previousStudyLanguage) && previousStudyLanguage !== nextStudyLanguage) {
    return previousStudyLanguage;
  }
  // Previously studying something we don't support as a native language
  // (Swedish, French, Japanese, Traditional Chinese) — fall back to any
  // native that isn't the language they just chose to study.
  return SUPPORTED_NATIVE_LANGUAGES.find((l) => l.code !== nextStudyLanguage)!.code;
}
