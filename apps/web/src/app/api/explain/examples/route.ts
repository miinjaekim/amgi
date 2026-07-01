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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.7 } });

  const isKorean = termLanguage === 'Korean';

  const prompt = `Provide 2–3 natural example sentences using the term "${term}" (${termLanguage}).

Each example must have:
- "korean": ${isKorean ? 'a natural Korean sentence using the term' : 'the Korean translation of the example sentence'}
- "english": ${isKorean ? `a ${nativeLanguage} translation of the Korean sentence` : 'the original English sentence using the term'}

Respond with only this JSON:
{
  "examples": [
    { "korean": "...", "english": "..." },
    { "korean": "...", "english": "..." }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(data);
}
