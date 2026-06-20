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

export async function getTermExplanation(
  term: string,
  nativeLanguage = 'English',
  context?: string
): Promise<ExplainResult> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, nativeLanguage, context }),
  });

  if (!res.ok) {
    throw new Error('Failed to get term explanation');
  }

  return res.json();
}

export async function getTermDepth(
  term: string,
  termLanguage: 'Korean' | 'English',
  nativeLanguage = 'English'
): Promise<TermDepth> {
  const res = await fetch('/api/explain/depth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage }),
  });

  if (!res.ok) {
    throw new Error('Failed to get term depth');
  }

  return res.json();
}

export async function getTermExamples(
  term: string,
  termLanguage: 'Korean' | 'English',
  nativeLanguage = 'English'
): Promise<ExamplePair[]> {
  const res = await fetch('/api/explain/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, termLanguage, nativeLanguage }),
  });

  if (!res.ok) {
    throw new Error('Failed to get term examples');
  }

  const data = await res.json();
  return data.examples;
}
