import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getStudyLanguageConfig, getBackSideConfig, parseModelJson } from '@amgi/core';

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English', studyLanguage = 'Korean', translation, briefDefinition } = await req.json();

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
  // This route always asked for translations in the native language; before
  // backs were native-aware it then stored them under `english`, so a Korean
  // learner's example translations were Korean sitting in the English field.
  const back = getBackSideConfig(studyLanguage, nativeLanguage);
  const isStudyLang = termLanguage === config.code;

  const hasSense = (typeof translation === 'string' && translation.trim()) || (typeof briefDefinition === 'string' && briefDefinition.trim());
  const senseNote = hasSense
    ? `\nThe word may have multiple meanings. Use only this sense${translation ? ` — "${translation}"` : ''}${briefDefinition ? `: ${briefDefinition}` : ''}. Every sentence must use "${term}" in exactly this meaning.\n`
    : '';

  const prompt = `Provide 2–3 natural example sentences using the term "${term}" (${termLanguage}).
${senseNote}
Each example must have:
- "${config.studyField}": ${isStudyLang ? `a natural ${config.code} sentence using the term` : `the ${config.code} translation of the example sentence`}
- "${back.backField}": ${isStudyLang ? `a ${nativeLanguage} translation of the ${config.code} sentence` : `the original ${back.backLanguage} sentence using the term`}

Respond with only this JSON:
{
  "examples": [
    { "${config.studyField}": "...", "${back.backField}": "..." },
    { "${config.studyField}": "...", "${back.backField}": "..." }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const data = parseModelJson(text);

  return NextResponse.json(data);
}
