import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getStudyLanguageConfig, parseModelJson } from '@amgi/core';
import { characterBreakdownInstruction } from '@/lib/characterBreakdown';


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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  const hasSense = (typeof translation === 'string' && translation.trim()) || (typeof briefDefinition === 'string' && briefDefinition.trim());
  const senseNote = hasSense
    ? `\nThe word may have multiple meanings. The user is studying only this sense${translation ? ` — "${translation}"` : ''}${briefDefinition ? `: ${briefDefinition}` : ''}. Everything you write must be about this meaning of "${term}".\n`
    : '';

  // Registry codes are identifiers, not prose — "TraditionalChinese" reads
  // badly inside a prompt sentence.
  const studyName = getStudyLanguageConfig(studyLanguage).label;
  const termName = getStudyLanguageConfig(termLanguage).label;

  // Only Han-script languages get the section — for the rest the key is left
  // out of the requested JSON entirely rather than asked for and thrown away.
  const characters = characterBreakdownInstruction(studyLanguage);

  const prompt = `Provide deeper explanation for the term "${term}" (${termName}), for a learner of ${studyName}.
${senseNote}Write all explanations in ${nativeLanguage}.

Include only what is genuinely useful for a language learner:
- "definition": a clear, detailed definition in ${nativeLanguage}
${characters ? `- "characterBreakdown": ${characters} Otherwise omit or leave as empty string.\n` : ''}- "notes": any important cultural context, usage nuance, register details, etymology, or common mistakes — only if truly relevant. Otherwise omit or leave as empty string.

Respond with only this JSON:
{
  "definition": "definition in ${nativeLanguage}",
${characters ? '  "characterBreakdown": "character breakdown or empty string",\n' : ''}  "notes": "cultural/usage notes or empty string"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const depth = parseModelJson(text);

  return NextResponse.json(depth);
}
