import { fetch as expoFetch } from 'expo/fetch';
import {
  getTermExplanation as _explain,
  getTermDepth as _depth,
  getTermExamples as _examples,
  getWordOfTheDay as _wotd,
  getPronunciationUrl as _pronounce,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

export type { ExplainResult, TermCore, TermDepth, TermAmbiguous, ExamplePair } from '@amgi/core';
export type { WordOfTheDay } from '@amgi/core';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const getTermExplanation = (
  term: string,
  nativeLanguage?: string,
  context?: string,
  studyLanguage: StudyLanguage = 'Korean',
) => _explain(term, nativeLanguage, context, BASE_URL, studyLanguage);

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
