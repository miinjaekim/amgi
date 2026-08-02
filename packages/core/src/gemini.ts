import type { ExamplePair, ExplainResult, TermDepth, StudyLanguage, WordOfTheDay } from './types';
import { getExampleSides } from './types';

/**
 * Fetches the daily featured word for a (date, language pair) from
 * /api/word-of-the-day. Returns null on any failure — the Learn screen
 * treats the word of the day as a non-essential nicety.
 */
export async function getWordOfTheDay(
  date: string,
  studyLanguage: StudyLanguage = 'Korean',
  nativeLanguage = 'English',
  baseUrl = ''
): Promise<WordOfTheDay | null> {
  try {
    const params = new URLSearchParams({ date, studyLanguage, nativeLanguage });
    const res = await fetch(`${baseUrl}/api/word-of-the-day?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.term ? (data as WordOfTheDay) : null;
  } catch {
    return null;
  }
}

/**
 * Parses NDJSON example lines from /api/explain/examples-stream.
 * Accepts a pair only when both the study-language side and the back side
 * (per STUDY_LANGUAGE_CONFIGS) are present — tolerant of partial lines
 * while the stream is still arriving.
 */
export function parseStreamedExamples(
  text: string,
  studyLanguage: StudyLanguage = 'Korean',
  nativeLanguage?: string | null
): ExamplePair[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(line => {
      try {
        const parsed = JSON.parse(line);
        const sides = getExampleSides(parsed, studyLanguage, nativeLanguage);
        if (sides.study && sides.back) return [parsed as ExamplePair];
      } catch {}
      return [];
    });
}

/**
 * Parses the partial NDJSON-free text stream from /api/explain/depth-stream
 * into a TermDepth. Tolerant of incomplete sections while the stream arrives:
 * a section only appears once its marker line is present.
 */
export function parseStreamedDepth(text: string): TermDepth {
  const section = (marker: string, nextMarker?: string) => {
    const start = text.indexOf(`${marker}\n`);
    if (start === -1) return undefined;
    const contentStart = start + marker.length + 1;
    const end = nextMarker ? text.indexOf(`${nextMarker}\n`, contentStart) : text.length;
    const content = text.slice(contentStart, end === -1 ? text.length : end).trim();
    return content && content.toLowerCase() !== 'none' ? content : undefined;
  };
  const result: TermDepth = {};
  // Marker presence, not language: the depth prompt only emits CHARACTERS: for
  // Han-script languages, so the parser needs no per-language branch. Safe to
  // have renamed from HANJA: — the stream is ephemeral, nothing stores it.
  const hasCharacters = text.includes('CHARACTERS:\n');
  const def = section('DEFINITION:', hasCharacters ? 'CHARACTERS:' : 'NOTES:');
  const characters = hasCharacters ? section('CHARACTERS:', 'NOTES:') : undefined;
  const notes = section('NOTES:');
  if (def !== undefined) result.definition = def;
  if (characters !== undefined) result.characterBreakdown = characters;
  if (notes !== undefined) result.notes = notes;
  return result;
}

/**
 * The depth fields worth writing to a card, from what the model returned.
 *
 * Both depth prompts are told to omit a section or leave it an empty string
 * when it has nothing useful to add, and both routinely do — `notes` on a plain
 * noun, `characterBreakdown` on anything that isn't Han script. Writing those
 * through would replace "this card has no notes yet" with "this card's notes
 * are empty", which reads the same to a user and differently to every `card.x &&`
 * check that decides whether to render a section.
 *
 * Shared because enrichment now happens from four surfaces across two platforms
 * and the filtering has to be identical on all of them: a card enriched from
 * review and the same card enriched from its deck must end up the same shape.
 */
export function depthFieldsToPersist(depth: TermDepth): Partial<TermDepth> {
  const fields: Partial<TermDepth> = {};
  for (const key of ['definition', 'characterBreakdown', 'notes'] as const) {
    const value = depth[key];
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim();
  }
  return fields;
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
