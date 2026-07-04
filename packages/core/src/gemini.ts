import type { ExamplePair, ExplainResult, TermDepth, StudyLanguage } from './types';

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
  studyLanguage: StudyLanguage = 'Korean'
): Promise<TermDepth> {
  const res = await fetch(`${baseUrl}/api/explain/depth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage, studyLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get term depth');
  return res.json();
}

export async function getTermExamples(
  term: string,
  termLanguage: string,
  nativeLanguage = 'English',
  baseUrl = '',
  studyLanguage: StudyLanguage = 'Korean'
): Promise<ExamplePair[]> {
  const res = await fetch(`${baseUrl}/api/explain/examples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage, studyLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get term examples');
  const data = await res.json();
  return data.examples;
}
