import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { getStudyLanguageConfig } from '@amgi/core';

export async function POST(req: NextRequest) {
  const { term, termLanguage, nativeLanguage = 'English', studyLanguage = 'Korean', translation, briefDefinition } = await req.json();

  if (!term || typeof term !== 'string') {
    return new Response(JSON.stringify({ error: 'term is required' }), { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Gemini API not configured' }), { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.4 } });

  const config = getStudyLanguageConfig(studyLanguage);
  const line = `{"${config.studyField}":"<${config.code} sentence>","${config.backField}":"<${nativeLanguage} translation>"}`;

  const hasSense = (typeof translation === 'string' && translation.trim()) || (typeof briefDefinition === 'string' && briefDefinition.trim());
  const senseNote = hasSense
    ? `\nThe word may have multiple meanings. Use only this sense${translation ? ` — "${translation}"` : ''}${briefDefinition ? `: ${briefDefinition}` : ''}. Every sentence must use "${term}" in exactly this meaning.\n`
    : '';

  const prompt = `Give 3 natural example sentences using the ${termLanguage} word "${term}".
${senseNote}Write all translations in ${nativeLanguage}.

Respond with exactly 3 lines, one JSON object per line, no extra text:
${line}
${line}
${line}`;

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
