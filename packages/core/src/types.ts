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
  | 'TraditionalChinese';

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
  | 'labelTraditionalChinese';

export type CardSideField =
  | 'korean'
  | 'swedish'
  | 'english'
  | 'french'
  | 'japanese'
  | 'traditionalChinese';

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
    studyField: 'french',
    studyLabelKey: 'labelFrench',
    ttsLanguageCode: 'fr-FR',
    ttsVoiceName: 'fr-FR-Chirp3-HD-Charon',
  },
  Japanese: {
    code: 'Japanese',
    label: 'Japanese',
    labelNative: '日本語',
    collection: 'cards_japanese',
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
  english: string;
}

export interface TermCore {
  term: string;
  termLanguage: StudyLanguage;
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  traditionalChinese?: string;
  english: string;
  translation?: string;
  formality?: string;
  gender?: string; // grammatical gender: Swedish 'en'/'ett', French 'le'/'la'
  furigana?: string; // Japanese kana reading, present when the term contains kanji
  pinyin?: string; // Traditional Chinese reading, tone-marked
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

export type ExplainResult = TermCore | TermAmbiguous;

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
 */
export function getReading(card: Pick<TermCore, 'furigana' | 'pinyin'>): string | undefined {
  return card.furigana || card.pinyin || undefined;
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
  formality?: string; // Korean
  gender?: string; // Swedish/French
  furigana?: string; // Japanese
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
    formality: wotd.formality,
    gender: wotd.gender,
    furigana: wotd.furigana,
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
  // stepping in here would only fight the choice being made.
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
