import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { term, nativeLanguage = 'English' } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Please provide a detailed explanation for the term "${term}".
Write all explanations, definitions, and notes in ${nativeLanguage}.
The example sentences should always include both the original language version and a ${nativeLanguage} translation.

Include:
1. A short, comma-separated translation in ${nativeLanguage}
2. A clear, detailed definition written in ${nativeLanguage}
3. Hanja breakdown (if the term is Korean and hanja applies; otherwise omit or leave empty)
4. 2-3 example sentences, each with the original language and a ${nativeLanguage} translation
5. Any important notes about usage, context, or cultural significance, written in ${nativeLanguage}

Format the response as JSON:
{
  "term": "${term}",
  "translation": "short translation in ${nativeLanguage}",
  "definition": "definition in ${nativeLanguage}",
  "hanja": "hanja breakdown or empty string",
  "examples": [
    { "korean": "example sentence in the term's original language", "english": "${nativeLanguage} translation" },
    { "korean": "...", "english": "..." }
  ],
  "notes": "notes in ${nativeLanguage} (optional)"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const explanation = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(explanation);
}
