import type { ExamplePair, ExplainResult, TermDepth, StudyLanguage } from './types';
import { getExampleSides } from './types';

/**
 * Parses NDJSON example lines from /api/explain/examples-stream.
 * Accepts a pair only when both the study-language side and the back side
 * (per STUDY_LANGUAGE_CONFIGS) are present — tolerant of partial lines
 * while the stream is still arriving.
 */
export function parseStreamedExamples(text: string, studyLanguage: StudyLanguage = 'Korean'): ExamplePair[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        const parsed = JSON.parse(line);
        const sides = getExampleSides(parsed, studyLanguage);
        if (sides.study && sides.back) return [parsed as ExamplePair];
      } catch {}
      return [];
    });
}

export async function getTermExplanation(
  term: string,
  nativeLanguage = 'English',
  context?: string,
  baseUrl = '',
  studyLanguage: StudyLanguage = 'Korean'
): Promise<ExplainResult> {
  const res = await fetch(`${baseUrl}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, nativeLanguage, context, studyLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get term explanation');
  return res.json();
}

export async function getTermDepth(
  term: string,
  termLanguage: string,
  nativeLanguage = 'English',
  baseUrl = '',
  studyLanguage: StudyLanguage = 'Korean',
  sense?: { translation?: string; briefDefinition?: string }
): Promise<TermDepth> {
  const res = await fetch(`${baseUrl}/api/explain/depth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage, studyLanguage, ...sense }),
  });

  if (!res.ok) throw new Error('Failed to get term depth');
  return res.json();
}

export async function getTermExamples(
  term: string,
  termLanguage: string,
  nativeLanguage = 'English',
  baseUrl = '',
  studyLanguage: StudyLanguage = 'Korean',
  sense?: { translation?: string; briefDefinition?: string }
): Promise<ExamplePair[]> {
  const res = await fetch(`${baseUrl}/api/explain/examples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage, studyLanguage, ...sense }),
  });

  if (!res.ok) throw new Error('Failed to get term examples');
  const data = await res.json();
  return data.examples;
}
