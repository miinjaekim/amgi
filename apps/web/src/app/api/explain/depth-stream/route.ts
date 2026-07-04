import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English', studyLanguage = 'Korean' } = await req.json();

  if (!term || typeof term !== 'string') {
    return new Response(JSON.stringify({ error: 'term is required' }), { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API not configured' }), { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  let prompt: string;

  if (studyLanguage === 'Swedish') {
    prompt = `The user already has a one-sentence definition of "${term}" (${termLanguage}). Go deeper — but stay concise. Every sentence should earn its place.
Write all explanations in ${nativeLanguage}.

- Definition: 2-3 sentences max. Add what the one-liner misses: connotation, nuance, how it differs from near-synonyms. Use **bold** for the single most important word or phrase — the nuance a learner must not miss. No padding.
- Notes: what a learner actually needs to know — a usage nuance, register, etymology, or common mistake. If there are multiple distinct points, use a short bullet list. Bold the single most critical point. Skip ("none") if there's nothing genuinely useful to add.

Respond in exactly this format with no extra text:

DEFINITION:
<definition here>

NOTES:
<notes or "none">`;
  } else {
    prompt = `The user already has a one-sentence definition of "${term}" (${termLanguage}). Go deeper — but stay concise. Every sentence should earn its place.
Write all explanations in ${nativeLanguage}.

- Definition: 2-3 sentences max. Add what the one-liner misses: connotation, nuance, how it differs from near-synonyms. Use **bold** for the single most important word or phrase — the nuance a learner must not miss. No padding.
- Hanja: if the term is Korean and has meaningful hanja roots, provide the breakdown (e.g. "葛藤: 갈 (kudzu vine) + 등 (wisteria vine) → entanglement, conflict"). Otherwise write "none".
- Notes: what a learner actually needs to know — a cultural nuance, register trap, or common mistake. If there are multiple distinct points, use a short bullet list. Bold the single most critical point. Skip ("none") if there's nothing genuinely useful to add.

Respond in exactly this format with no extra text:

DEFINITION:
<definition here>

HANJA:
<hanja breakdown or "none">

NOTES:
<notes or "none">`;
  }

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
