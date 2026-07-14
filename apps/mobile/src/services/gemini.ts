import {
  getTermExplanation as _explain,
  getTermDepth as _depth,
  getTermExamples as _examples,
} from '@amgi/core';

export type { ExplainResult, TermCore, TermDepth, TermAmbiguous, ExamplePair } from '@amgi/core';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const getTermExplanation = (term: string, nativeLanguage?: string, context?: string) =>
  _explain(term, nativeLanguage, context, BASE_URL);

export const getTermDepth = (
  term: string,
  termLanguage: string,
  nativeLanguage?: string,
  sense?: { translation?: string; briefDefinition?: string }
) => _depth(term, termLanguage, nativeLanguage, BASE_URL, undefined, sense);

export const getTermExamples = (
  term: string,
  termLanguage: string,
  nativeLanguage?: string,
  sense?: { translation?: string; briefDefinition?: string }
) => _examples(term, termLanguage, nativeLanguage, BASE_URL, undefined, sense);
