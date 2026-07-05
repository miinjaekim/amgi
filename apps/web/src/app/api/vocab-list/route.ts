import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { goal, studyLanguage = 'Korean', count = 15 } = await req.json();

  if (!goal || typeof goal !== 'string') {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.7 } });

  const listSize = Math.min(Math.max(Number(count) || 15, 5), 30);

  const prompt = `A learner of ${studyLanguage} described why they are learning:

"${goal}"

Build a starter vocabulary list of exactly ${listSize} ${studyLanguage} words or short expressions tailored to that goal. Prioritize words the learner will actually use for this goal, ordered from most to least essential. Single words or short set phrases only — no full sentences, no duplicates, no romanization.

Respond with only this JSON:
{ "words": ["word1", "word2", ...] }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(stripMarkdownCodeBlock(text));

  if (!Array.isArray(parsed.words)) {
    return NextResponse.json({ error: 'Failed to generate vocabulary list' }, { status: 502 });
  }

  return NextResponse.json({ words: parsed.words.filter((w: unknown) => typeof w === 'string' && w.trim()) });
}
