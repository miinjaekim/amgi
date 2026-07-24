export type StudyLanguage = 'Korean' | 'Swedish' | 'English' | 'French' | 'Japanese';

// i18n keys used for review directions/prompts — must exist in i18n.ts
export type DirectionLabelKey =
  | 'directionKoreanToEnglish'
  | 'directionEnglishToKorean'
  | 'directionSwedishToEnglish'
  | 'directionEnglishToSwedish'
  | 'directionFrenchToEnglish'
  | 'directionEnglishToFrench'
  | 'directionJapaneseToEnglish'
  | 'directionEnglishToJapanese';
export type DirectionPromptKey =
  | 'promptKoreanToEnglish'
  | 'promptEnglishToKorean'
  | 'promptSwedishToEnglish'
  | 'promptEnglishToSwedish'
  | 'promptFrenchToEnglish'
  | 'promptEnglishToFrench'
  | 'promptJapaneseToEnglish'
  | 'promptEnglishToJapanese';
export type FieldLabelKey = 'labelKorean' | 'labelEnglish' | 'labelSwedish' | 'labelFrench' | 'labelJapanese';

export type CardSideField = 'korean' | 'swedish' | 'english' | 'french' | 'japanese';

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
  /** Field holding the translation side of the card */
  backField: CardSideField;
  /** Language of the translation side */
  backLanguage: 'English' | 'Korean';
  /** i18n keys for the two card-side labels */
  studyLabelKey: FieldLabelKey;
  backLabelKey: FieldLabelKey;
  /** i18n keys for review direction chips and question prompts */
  directionFrontToBackKey: DirectionLabelKey;
  directionBackToFrontKey: DirectionLabelKey;
  promptFrontToBackKey: DirectionPromptKey;
  promptBackToFrontKey: DirectionPromptKey;
  /** Google Cloud TTS language code + Chirp 3: HD voice name for pronunciation audio, if supported */
  ttsLanguageCode?: string;
  ttsVoiceName?: string;
}

export const STUDY_LANGUAGE_CONFIGS: Record<StudyLanguage, StudyLanguageConfig> = {
  Korean: {
    code: 'Korean',
    label: 'Korean',
    labelNative: '한국어',
    collection: 'cards',
    studyField: 'korean',
    backField: 'english',
    backLanguage: 'English',
    studyLabelKey: 'labelKorean',
    backLabelKey: 'labelEnglish',
    directionFrontToBackKey: 'directionKoreanToEnglish',
    directionBackToFrontKey: 'directionEnglishToKorean',
    promptFrontToBackKey: 'promptKoreanToEnglish',
    promptBackToFrontKey: 'promptEnglishToKorean',
    ttsLanguageCode: 'ko-KR',
    ttsVoiceName: 'ko-KR-Chirp3-HD-Charon',
  },
  Swedish: {
    code: 'Swedish',
    label: 'Swedish',
    labelNative: 'Svenska',
    collection: 'cards_swedish',
    studyField: 'swedish',
    backField: 'english',
    backLanguage: 'English',
    studyLabelKey: 'labelSwedish',
    backLabelKey: 'labelEnglish',
    directionFrontToBackKey: 'directionSwedishToEnglish',
    directionBackToFrontKey: 'directionEnglishToSwedish',
    promptFrontToBackKey: 'promptSwedishToEnglish',
    promptBackToFrontKey: 'promptEnglishToSwedish',
  },
  French: {
    code: 'French',
    label: 'French',
    labelNative: 'Français',
    collection: 'cards_french',
    studyField: 'french',
    backField: 'english',
    backLanguage: 'English',
    studyLabelKey: 'labelFrench',
    backLabelKey: 'labelEnglish',
    directionFrontToBackKey: 'directionFrenchToEnglish',
    directionBackToFrontKey: 'directionEnglishToFrench',
    promptFrontToBackKey: 'promptFrenchToEnglish',
    promptBackToFrontKey: 'promptEnglishToFrench',
  },
  Japanese: {
    code: 'Japanese',
    label: 'Japanese',
    labelNative: '日本語',
    collection: 'cards_japanese',
    studyField: 'japanese',
    backField: 'english',
    backLanguage: 'English',
    studyLabelKey: 'labelJapanese',
    backLabelKey: 'labelEnglish',
    directionFrontToBackKey: 'directionJapaneseToEnglish',
    directionBackToFrontKey: 'directionEnglishToJapanese',
    promptFrontToBackKey: 'promptJapaneseToEnglish',
    promptBackToFrontKey: 'promptEnglishToJapanese',
  },
  // English study pairs with Korean — the only non-English native language
  // supported today. A native-Korean learner's card back is Korean.
  English: {
    code: 'English',
    label: 'English',
    labelNative: 'English',
    collection: 'cards_english',
    studyField: 'english',
    backField: 'korean',
    backLanguage: 'Korean',
    studyLabelKey: 'labelEnglish',
    backLabelKey: 'labelKorean',
    directionFrontToBackKey: 'directionEnglishToKorean',
    directionBackToFrontKey: 'directionKoreanToEnglish',
    promptFrontToBackKey: 'promptEnglishToKorean',
    promptBackToFrontKey: 'promptKoreanToEnglish',
    ttsLanguageCode: 'en-US',
    ttsVoiceName: 'en-US-Chirp3-HD-Charon',
  },
};

export function getStudyLanguageConfig(studyLanguage?: StudyLanguage | string): StudyLanguageConfig {
  return STUDY_LANGUAGE_CONFIGS[studyLanguage as StudyLanguage] ?? STUDY_LANGUAGE_CONFIGS.Korean;
}

// Example pairs — one side per language, see StudyLanguageConfig field names
export interface ExamplePair {
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  english: string;
}

export interface TermCore {
  term: string;
  termLanguage: 'Korean' | 'English' | 'Swedish' | 'French' | 'Japanese';
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  english: string;
  translation?: string;
  formality?: string;
  gender?: string; // grammatical gender: Swedish 'en'/'ett', French 'le'/'la'
  furigana?: string; // Japanese kana reading, present when the term contains kanji
  briefDefinition?: string;
}

export interface TermDepth {
  definition?: string;
  hanja?: string;
  notes?: string;
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
  termLanguage: 'Korean' | 'English' | 'Swedish';
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

/** Returns the translation side of a card. */
export function getBackSide(card: CardSides): string {
  const config = getStudyLanguageConfig(card.studyLanguage);
  return card[config.backField] || card.translation || '';
}

/** Returns the study-language text from an example pair. */
export function getExampleStudyLangText(ex: ExamplePair, studyLanguage?: StudyLanguage): string {
  if (studyLanguage) return ex[getStudyLanguageConfig(studyLanguage).studyField] ?? '';
  return ex.korean ?? ex.swedish ?? '';
}

/** Splits an example pair into its study-language and translation sides. */
export function getExampleSides(
  ex: ExamplePair,
  studyLanguage?: StudyLanguage
): { study: string; back: string } {
  const config = getStudyLanguageConfig(studyLanguage);
  return { study: ex[config.studyField] ?? '', back: ex[config.backField] ?? '' };
}

/**
 * Returns the term that depth/examples calls should elaborate on.
 * Digging deeper must always target the study-language word: if the user
 * typed the term in another language (termLanguage !== studyLanguage),
 * the interesting word is the study-language translation, not the term
 * they already understand.
 */
export function getDepthTarget(
  core: Pick<TermCore, 'term' | 'termLanguage' | 'korean' | 'swedish' | 'french' | 'japanese' | 'english' | 'briefDefinition'>,
  studyLanguage: StudyLanguage = 'Korean'
): { term: string; termLanguage: string; translation?: string; briefDefinition?: string } {
  const config = getStudyLanguageConfig(studyLanguage);
  // Pass the already-resolved sense along: for polysemous terms (pack context
  // hints, disambiguation picker, "not what you meant") depth/examples must
  // elaborate on the meaning the user chose, not whichever sense Gemini
  // reaches for first.
  const sense = {
    translation: core[config.backField] || (core.termLanguage !== studyLanguage ? core.term : undefined),
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
export function wordOfTheDayCore(wotd: WordOfTheDay, studyLanguage: StudyLanguage): TermCore {
  if (wotd.core) return wotd.core;
  const config = getStudyLanguageConfig(studyLanguage);
  const core: Record<string, unknown> = {
    term: wotd.term,
    termLanguage: studyLanguage,
    english: config.studyField === 'english' ? wotd.term : wotd.english,
    [config.studyField]: wotd.term,
    [config.backField]: config.backField === 'korean' ? wotd.korean : wotd.english,
    briefDefinition: wotd.briefDefinition,
    formality: wotd.formality,
    gender: wotd.gender,
    furigana: wotd.furigana,
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
  // (Swedish, French, Japanese) — fall back to any native that isn't the
  // language they just chose to study.
  return SUPPORTED_NATIVE_LANGUAGES.find((l) => l.code !== nextStudyLanguage)!.code;
}
