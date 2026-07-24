import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { getStudyLanguageConfig } from '@amgi/core';
import { characterBreakdownInstruction } from '@/lib/characterBreakdown';

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English', studyLanguage = 'Korean', translation, briefDefinition } = await req.json();

  if (!term || typeof term !== 'string') {
    return new Response(JSON.stringify({ error: 'term is required' }), { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API not configured' }), { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  const hasSense = (typeof translation === 'string' && translation.trim()) || (typeof briefDefinition === 'string' && briefDefinition.trim());
  const senseNote = hasSense
    ? `\nThe word may have multiple meanings. The user is studying only this sense${translation ? ` — "${translation}"` : ''}${briefDefinition ? `: ${briefDefinition}` : ''}. Everything you write must be about this meaning of "${term}".\n`
    : '';

  // Registry codes are identifiers, not prose — "TraditionalChinese" reads
  // badly inside a prompt sentence.
  const termName = getStudyLanguageConfig(termLanguage).label;

  // Only Han-script languages get the section, and `parseStreamedDepth` keys
  // off the marker being present, so leaving it out needs nothing else.
  const characters = characterBreakdownInstruction(studyLanguage);

  const prompt = `The user already has a one-sentence definition of "${term}" (${termName}). Go deeper — but stay concise. Every sentence should earn its place.
${senseNote}Write all explanations in ${nativeLanguage}.

- Definition: 2-3 sentences max. Add what the one-liner misses: connotation, nuance, how it differs from near-synonyms. Use **bold** for the single most important word or phrase — the nuance a learner must not miss. No padding.
${characters ? `- Characters: ${characters} Otherwise write "none".\n` : ''}- Notes: what a learner actually needs to know — a cultural or usage nuance, register trap, etymology, or common mistake. If there are multiple distinct points, use a short bullet list. Bold the single most critical point. Skip ("none") if there's nothing genuinely useful to add.

Respond in exactly this format with no extra text:

DEFINITION:
<definition here>
${characters ? '\nCHARACTERS:\n<character breakdown or "none">\n' : ''}
NOTES:
<notes or "none">`;

  const result = await model.generateContentStream(prompt);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
