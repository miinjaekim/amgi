export interface ExamplePair {
  korean: string;
  english: string;
}

export interface TermExplanation {
  term: string;
  termLanguage: 'Korean' | 'English';
  korean: string;
  english: string;
  translation: string;
  definition: string;
  hanja?: string;
  examples: ExamplePair[];
  notes?: string;
}

export async function getTermExplanation(term: string, nativeLanguage = 'English'): Promise<TermExplanation> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, nativeLanguage }),
  });

  if (!res.ok) {
    throw new Error('Failed to get term explanation');
  }

  return res.json();
}
