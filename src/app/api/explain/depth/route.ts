import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English' } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Provide deeper explanation for the term "${term}" (${termLanguage}).
Write all explanations in ${nativeLanguage}.

Include only what is genuinely useful for a language learner:
- "definition": a clear, detailed definition in ${nativeLanguage}
- "hanja": if the term is Korean and has meaningful hanja roots, provide the breakdown (e.g. "葛藤: 갈 (kudzu vine) + 등 (wisteria vine) → entanglement, conflict"). Otherwise omit or leave as empty string.
- "notes": any important cultural context, usage nuance, register details, or common mistakes — only if truly relevant. Otherwise omit or leave as empty string.

Respond with only this JSON:
{
  "definition": "definition in ${nativeLanguage}",
  "hanja": "hanja breakdown or empty string",
  "notes": "cultural/usage notes or empty string"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const depth = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(depth);
}
