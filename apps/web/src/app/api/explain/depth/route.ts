import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English', studyLanguage = 'Korean' } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  let prompt: string;

  if (studyLanguage !== 'Korean') {
    prompt = `Provide deeper explanation for the term "${term}" (${termLanguage}), for a learner of ${studyLanguage}.
Write all explanations in ${nativeLanguage}.

Include only what is genuinely useful for a language learner:
- "definition": a clear, detailed definition in ${nativeLanguage}
- "notes": any important usage nuance, register details, etymology, or common mistakes — only if truly relevant. Otherwise omit or leave as empty string.

Respond with only this JSON:
{
  "definition": "definition in ${nativeLanguage}",
  "hanja": "",
  "notes": "usage/etymology notes or empty string"
}`;
  } else {
    prompt = `Provide deeper explanation for the term "${term}" (${termLanguage}).
Write all explanations in ${nativeLanguage}.

Include only what is genuinely useful for a language learner:
- "definition": a clear, detailed definition in ${nativeLanguage}
- "hanja": if the term is Korean and has meaningful hanja roots, provide the breakdown. For each character include its traditional Korean hun-eum (훈음) reading — the native-Korean meaning plus the sound, e.g. 水 is "물 수" — alongside the English gloss (e.g. "葛藤: 葛 갈 (칡 갈 — kudzu vine) + 藤 등 (등나무 등 — wisteria vine) → entanglement, conflict"). Otherwise omit or leave as empty string.
- "notes": any important cultural context, usage nuance, register details, or common mistakes — only if truly relevant. Otherwise omit or leave as empty string.

Respond with only this JSON:
{
  "definition": "definition in ${nativeLanguage}",
  "hanja": "hanja breakdown or empty string",
  "notes": "cultural/usage notes or empty string"
}`;
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const depth = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(depth);
}
