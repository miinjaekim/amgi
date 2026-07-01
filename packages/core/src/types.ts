// Term types
export interface ExamplePair {
  korean: string;
  english: string;
}

export interface TermCore {
  term: string;
  termLanguage: 'Korean' | 'English';
  korean: string;
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
  termLanguage: 'Korean' | 'English';
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

// User types
export interface UserPreferences {
  nativeLanguage: string;
  streak?: number;
  longestStreak?: number;
  lastReviewDate?: string; // 'YYYY-MM-DD' in local timezone
  reviewedToday?: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Korean', label: '한국어' },
] as const;
