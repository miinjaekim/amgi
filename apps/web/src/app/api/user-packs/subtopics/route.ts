import { NextRequest, NextResponse } from 'next/server';
import { parseKnownTerms, parsePackBrief } from '@amgi/core';
import { proposeSubtopics } from '@/lib/userPackSourcing';

/**
 * Step 2 of making a pack: `{ brief, studyLanguage, knownTerms? }` →
 * `{ name, description, subtopics }`. No search, so it is quick enough to wait on.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const brief = parsePackBrief(body?.brief);
  if (!brief) {
    return NextResponse.json({ error: 'brief needs purpose, about and usage' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  try {
    const proposal = await proposeSubtopics({
      apiKey,
      brief,
      studyLanguage: body.studyLanguage ?? 'Korean',
      knownTerms: parseKnownTerms(body.knownTerms),
    });
    if (!proposal) {
      return NextResponse.json({ error: 'No subtopics came back' }, { status: 502 });
    }
    return NextResponse.json(proposal);
  } catch (error) {
    console.error('user-packs/subtopics failed', error);
    return NextResponse.json({ error: 'Failed to propose subtopics' }, { status: 500 });
  }
}
