import type { ExamplePair, ExplainResult, TermDepth } from './types';

export async function getTermExplanation(
  term: string,
  nativeLanguage = 'English',
  context?: string,
  baseUrl = ''
): Promise<ExplainResult> {
  const res = await fetch(`${baseUrl}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, nativeLanguage, context }),
  });

  if (!res.ok) throw new Error('Failed to get term explanation');
  return res.json();
}

export async function getTermDepth(
  term: string,
  termLanguage: 'Korean' | 'English',
  nativeLanguage = 'English',
  baseUrl = ''
): Promise<TermDepth> {
  const res = await fetch(`${baseUrl}/api/explain/depth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get term depth');
  return res.json();
}

export async function getTermExamples(
  term: string,
  termLanguage: 'Korean' | 'English',
  nativeLanguage = 'English',
  baseUrl = ''
): Promise<ExamplePair[]> {
  const res = await fetch(`${baseUrl}/api/explain/examples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get term examples');
  const data = await res.json();
  return data.examples;
}
