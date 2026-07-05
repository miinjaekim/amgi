import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getStudyLanguageConfig } from '@amgi/core';

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.4 } });

  const config = getStudyLanguageConfig(studyLanguage);
  const isStudyLang = termLanguage === config.code;

  const prompt = `Provide 2–3 natural example sentences using the term "${term}" (${termLanguage}).

Each example must have:
- "${config.studyField}": ${isStudyLang ? `a natural ${config.code} sentence using the term` : `the ${config.code} translation of the example sentence`}
- "${config.backField}": ${isStudyLang ? `a ${nativeLanguage} translation of the ${config.code} sentence` : `the original ${config.backLanguage} sentence using the term`}

Respond with only this JSON:
{
  "examples": [
    { "${config.studyField}": "...", "${config.backField}": "..." },
    { "${config.studyField}": "...", "${config.backField}": "..." }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(data);
}
