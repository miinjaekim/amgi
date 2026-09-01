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

/**
 * How fast pronunciation audio plays back.
 *
 * A **multiplier on the stored clip**, not a synthesis rate. Every clip is
 * already generated once at `SPEAKING_RATE = 0.85` and cached under a path that
 * bakes that rate in (`pronunciation/{lang}/{voice}-r{rate}/{hash}.mp3`), so
 * making speed a synthesis parameter would mean a fresh Google TTS call and a
 * permanent stored object *per rate per term*. Stretching at playback keeps one
 * cached file per term at any speed, and needs no server round trip to change.
 *
 * `normal` is therefore 1.0 — the pace the app has always played, not natural
 * speech. The set is deliberately small and named rather than a free slider:
 * both settings surfaces already speak in chip rows, and should time-stretching
 * ever prove too artifact-y at the slow end, a fixed set maps onto server-side
 * rates without the UI changing at all.
 */
export type PronunciationSpeed = 'slow' | 'normal' | 'fast';

export const PRONUNCIATION_SPEEDS: {
  value: PronunciationSpeed;
  rate: number;
  labelKey: 'speedSlow' | 'speedNormal' | 'speedFast';
}[] = [
  { value: 'slow', rate: 0.7, labelKey: 'speedSlow' },
  { value: 'normal', rate: 1, labelKey: 'speedNormal' },
  { value: 'fast', rate: 1.2, labelKey: 'speedFast' },
];

export const DEFAULT_PRONUNCIATION_SPEED: PronunciationSpeed = 'normal';

export function pronunciationRate(speed: PronunciationSpeed): number {
  return PRONUNCIATION_SPEEDS.find(s => s.value === speed)?.rate ?? 1;
}

/** Read a stored preference back, falling back to the default on anything unrecognized. */
export function parsePronunciationSpeed(raw: string | null | undefined): PronunciationSpeed {
  return PRONUNCIATION_SPEEDS.some(s => s.value === raw)
    ? (raw as PronunciationSpeed)
    : DEFAULT_PRONUNCIATION_SPEED;
}
