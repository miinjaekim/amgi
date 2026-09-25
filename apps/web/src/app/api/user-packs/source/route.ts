import { NextRequest, NextResponse } from 'next/server';
import { parseKnownTerms, parsePackBrief, parseSubtopics } from '@amgi/core';
import { sourceSubtopic } from '@/lib/userPackSourcing';

/**
 * Step 3 of making a pack, for one subtopic: `{ brief, studyLanguage,
 * subtopic, knownTerms?, excludeTerms? }` → `{ words, dropped, pages }`.
 *
 * Search, then a fetch of every page it cites, so this takes a while. The app
 * will run it in the background; for now it is called directly.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const brief = parsePackBrief(body?.brief);
  // Re-validated through the same parser the subtopics step used.
  const [subtopic] = parseSubtopics(JSON.stringify([body?.subtopic]));
  if (!brief || !subtopic) {
    return NextResponse.json({ error: 'brief and subtopic are required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  try {
    const result = await sourceSubtopic({
      apiKey,
      brief,
      studyLanguage: body.studyLanguage ?? 'Korean',
      subtopic,
      knownTerms: parseKnownTerms(body.knownTerms),
      excludeTerms: parseKnownTerms(body.excludeTerms),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('user-packs/source failed', error);
    return NextResponse.json({ error: 'Failed to source words' }, { status: 500 });
  }
}
