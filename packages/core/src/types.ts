export type StudyLanguage = 'Korean' | 'Swedish';

// Example pairs — korean/swedish are the study-language sides
export interface ExamplePair {
  korean?: string;
  swedish?: string;
  english: string;
}

export interface TermCore {
  term: string;
  termLanguage: 'Korean' | 'English' | 'Swedish';
  korean?: string;
  swedish?: string;
  english: string;
  translation?: string;
  formality?: string;
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

/** Returns the study-language side of a card (Korean or Swedish). */
export function getStudyLangSide(card: Pick<Flashcard, 'studyLanguage' | 'korean' | 'swedish' | 'term'>): string {
  if (card.studyLanguage === 'Swedish') return card.swedish || card.term;
  return card.korean || card.term;
}

/** Returns the study-language text from an example pair. */
export function getExampleStudyLangText(ex: ExamplePair): string {
  return ex.korean ?? ex.swedish ?? '';
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

export const SUPPORTED_STUDY_LANGUAGES = [
  { code: 'Korean' as StudyLanguage, label: 'Korean', labelNative: '한국어' },
  { code: 'Swedish' as StudyLanguage, label: 'Swedish', labelNative: 'Svenska' },
] as const;

// Backward compat alias used by existing UI code
export const SUPPORTED_LANGUAGES = SUPPORTED_NATIVE_LANGUAGES;
