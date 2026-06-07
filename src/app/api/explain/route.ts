import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { term } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Please provide a detailed explanation for the Korean term "${term}". Include:
1. A short, comma-separated English translation (e.g., 'insight, discernment, taste')
2. A clear, detailed definition
3. Hanja breakdown (if available)
4. 2-3 example sentences, each with both Korean and English translation
5. Any important notes about usage, context, or cultural significance

Format the response as JSON with the following structure:
{
  "term": "${term}",
  "translation": "short translation here",
  "definition": "definition here",
  "hanja": "hanja breakdown here (or empty string if not available)",
  "examples": [
    { "korean": "example sentence in Korean", "english": "English translation" },
    { "korean": "...", "english": "..." }
  ],
  "notes": "additional notes here (optional)"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const explanation = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(explanation);
}
