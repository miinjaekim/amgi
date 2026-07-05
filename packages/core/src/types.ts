export type StudyLanguage = 'Korean' | 'Swedish' | 'English' | 'French';

// i18n keys used for review directions/prompts — must exist in i18n.ts
export type DirectionLabelKey =
  | 'directionKoreanToEnglish'
  | 'directionEnglishToKorean'
  | 'directionSwedishToEnglish'
  | 'directionEnglishToSwedish'
  | 'directionFrenchToEnglish'
  | 'directionEnglishToFrench';
export type DirectionPromptKey =
  | 'promptKoreanToEnglish'
  | 'promptEnglishToKorean'
  | 'promptSwedishToEnglish'
  | 'promptEnglishToSwedish'
  | 'promptFrenchToEnglish'
  | 'promptEnglishToFrench';
export type FieldLabelKey = 'labelKorean' | 'labelEnglish' | 'labelSwedish' | 'labelFrench';

export type CardSideField = 'korean' | 'swedish' | 'english' | 'french';

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
  english: string;
}

export interface TermCore {
  term: string;
  termLanguage: 'Korean' | 'English' | 'Swedish' | 'French';
  korean?: string;
  swedish?: string;
  french?: string;
  english: string;
  translation?: string;
  formality?: string;
  gender?: string; // grammatical gender: Swedish 'en'/'ett', French 'le'/'la'
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
  core: Pick<TermCore, 'term' | 'termLanguage' | 'korean' | 'swedish' | 'french' | 'english'>,
  studyLanguage: StudyLanguage = 'Korean'
): { term: string; termLanguage: string } {
  if (core.termLanguage !== studyLanguage) {
    const studySide = core[getStudyLanguageConfig(studyLanguage).studyField];
    if (studySide) return { term: studySide, termLanguage: studyLanguage };
  }
  return { term: core.term, termLanguage: core.termLanguage };
}

// Word of the day — daily featured term on the Learn screen
export interface WordOfTheDay {
  term: string; // study-language word
  english: string;
  korean?: string; // translation side for English study
  briefDefinition?: string;
  formality?: string; // Korean
  gender?: string; // Swedish
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
