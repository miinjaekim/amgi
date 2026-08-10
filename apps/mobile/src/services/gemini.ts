import { fetch as expoFetch } from 'expo/fetch';
import {
  getTermExplanation as _explain,
  getTermDepth as _depth,
  getTermExamples as _examples,
  getWordOfTheDay as _wotd,
  getPronunciationUrl as _pronounce,
  getWritingReview as _writingReview,
  getPatternExercise as _patternExercise,
  gradePatternAnswer as _gradePattern,
} from '@amgi/core';
import type { GrammarPattern, StudyLanguage } from '@amgi/core';

export { applySpellingCorrection } from '@amgi/core';
export type { ExplainResult, TermCore, TermDepth, TermAmbiguous, ExamplePair, SpellingCorrection } from '@amgi/core';
export type { WordOfTheDay } from '@amgi/core';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const getTermExplanation = (
  term: string,
  nativeLanguage?: string,
  context?: string,
  studyLanguage: StudyLanguage = 'Korean',
  exact = false,
) => _explain(term, nativeLanguage, context, BASE_URL, studyLanguage, exact);

export const getTermDepth = (
  term: string,
  termLanguage: string,
  nativeLanguage?: string,
  sense?: { translation?: string; briefDefinition?: string },
  studyLanguage: StudyLanguage = 'Korean',
) => _depth(term, termLanguage, nativeLanguage, BASE_URL, studyLanguage, sense);

export const getTermExamples = (
  term: string,
  termLanguage: string,
  nativeLanguage?: string,
  sense?: { translation?: string; briefDefinition?: string },
  studyLanguage: StudyLanguage = 'Korean',
) => _examples(term, termLanguage, nativeLanguage, BASE_URL, studyLanguage, sense);

export const getWordOfTheDay = (
  date: string,
  studyLanguage: StudyLanguage = 'Korean',
  nativeLanguage = 'English',
) => _wotd(date, studyLanguage, nativeLanguage, BASE_URL);

export const getPronunciationUrl = (
  text: string,
  studyLanguage: StudyLanguage = 'Korean',
) => _pronounce(text, studyLanguage, BASE_URL);

export const getWritingReview = (
  text: string,
  nativeLanguage?: string,
  studyLanguage: StudyLanguage = 'Korean',
) => _writingReview(text, nativeLanguage, studyLanguage, BASE_URL);

/**
 * Which rung the pattern is on is decided inside `getPatternExercise` from the
 * pattern's own `kind` and `repetitions`, so the caller passes the pattern and
 * not a format — the same on both platforms.
 */
export const getPatternExercise = (
  pattern: Pick<GrammarPattern, 'pattern' | 'kind' | 'gloss' | 'note' | 'studyLanguage' | 'production'>,
  nativeLanguage = 'English',
) => _patternExercise(pattern, nativeLanguage, BASE_URL);

/** Grading a production turn is `/api/writing`, unchanged. Cloze grades locally. */
export const gradePatternAnswer = (
  answer: string,
  nativeLanguage = 'English',
  studyLanguage: StudyLanguage = 'Korean',
) => _gradePattern(answer, nativeLanguage, studyLanguage, BASE_URL);

// Streaming variants — expo/fetch exposes a WHATWG ReadableStream body so the
// Learn screen can reveal depth/examples as they arrive, like web does.
const openStream = (path: string, body: Record<string, unknown>) =>
  expoFetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const streamTermDepth = (body: Record<string, unknown>) =>
  openStream('/api/explain/depth-stream', body);

export const streamTermExamples = (body: Record<string, unknown>) =>
  openStream('/api/explain/examples-stream', body);
