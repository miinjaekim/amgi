import type { StudyLanguage } from './types';

/**
 * The text a pronunciation button should actually synthesize.
 *
 * A Japanese kanji compound is ambiguous to TTS — 生物 is せいぶつ (organism)
 * or なまもの (raw food) — and `furigana` is precisely the reading that
 * resolves it, so speak the kana whenever the card carries them.
 *
 * Deliberately takes `furigana` and not `getReading()`: the other reading
 * field, `pinyin`, is Latin transliteration, and handing "jiǎotàchē" to a
 * Mandarin voice would get the letters read back, not the word.
 */
export function getSpokenText(text: string, furigana?: string): string {
  return furigana?.trim() || text;
}

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
