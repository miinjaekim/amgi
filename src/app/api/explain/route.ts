import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

function detectTermLanguage(term: string): 'Korean' | 'English' {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(term) ? 'Korean' : 'English';
}

export async function POST(req: NextRequest) {
  const { term, nativeLanguage = 'English', context } = await req.json();

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

  let prompt: string;

  if (context) {
    // Context provided — skip ambiguity check, resolve directly
    prompt = `Provide a concise translation for the term "${term}" with this context: "${context}".
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
  "translation": "short translation in ${nativeLanguage} matching the given context",
  "formality": "formality level"
}`;
  } else {
    // No context — check for ambiguity first
    prompt = `You are a language learning assistant for Korean-English learners.

Given the term "${term}", determine whether it has multiple significantly different meanings that would confuse a language learner.

A term is ambiguous when it has 2 or more distinct common meanings that lead to meaningfully different translations or usage contexts (e.g., Korean 배 can mean boat, belly, or pear).

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "translation": "short translation in ${nativeLanguage}",
  "formality": "Casual | Standard | Formal | Honorific | Slang | N/A"
}

IMPORTANT for the non-ambiguous case:
- "korean" must always be written in Korean script (한국어)
- "english" must always be written in English
- For "formality", if the term is Korean use one of: Casual, Standard, Formal, Honorific, Slang. If English, use "N/A".`;
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(stripMarkdownCodeBlock(text));

  if (!parsed.ambiguous) {
    parsed.termLanguage = termLanguage;
  }

  return NextResponse.json(parsed);
}
