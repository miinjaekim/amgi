import type { StudyLanguage } from './types';

export async function getPronunciationUrl(
  text: string,
  studyLanguage: StudyLanguage = 'Korean',
  baseUrl = ''
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/pronounce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, studyLanguage }),
  });

  if (!res.ok) throw new Error('Failed to get pronunciation audio');
  const { url } = await res.json();
  return url;
}
