import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

function detectTermLanguage(term: string): 'Korean' | 'English' {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(term) ? 'Korean' : 'English';
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

  const termLanguage = detectTermLanguage(term);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Provide a concise translation for the term "${term}".
Write the translation in ${nativeLanguage}.

IMPORTANT: The "korean" and "english" fields must ALWAYS be in their respective languages:
- "korean" must always be the Korean word or phrase written in Korean script (한국어)
- "english" must always be the English word or phrase written in English

For "formality", if the term is Korean, classify it as one of: Casual, Standard, Formal, Honorific, Slang. If the term is English, use "N/A".

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "translation": "short translation in ${nativeLanguage}",
  "formality": "formality level"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const core = JSON.parse(stripMarkdownCodeBlock(text));

  core.termLanguage = termLanguage;

  return NextResponse.json(core);
}
