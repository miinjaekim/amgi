import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

function detectKorean(term: string): boolean {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(term);
}

export async function POST(req: NextRequest) {
  const { term, nativeLanguage = 'English', context, studyLanguage = 'Korean' } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  let prompt: string;

  if (studyLanguage === 'Swedish') {
    // Swedish: termLanguage is set by Gemini (Latin script — can't detect client-side)
    if (context) {
      prompt = `Provide a concise translation for the Swedish/English term "${term}" with this context: "${context}".

Determine whether "${term}" is Swedish or English and set "termLanguage" accordingly.

IMPORTANT:
- "swedish" must always be the Swedish word or phrase written in Swedish
- "english" must always be the English word or phrase written in English
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "gender": if the Swedish term is a noun, set to "en" or "ett". Otherwise set to null.
- "briefDefinition": a single clear sentence defining the term in ${nativeLanguage}.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "Swedish or English",
  "swedish": "Swedish word/phrase",
  "english": "English word/phrase",
  "gender": "en" | "ett" | null,
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant for Swedish-English learners.

Given the term "${term}", determine whether it is Swedish or English, then check if it has multiple significantly different meanings.

A term is ambiguous when it has 2 or more distinct common meanings that would confuse a language learner.

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",
  "termLanguage": "Swedish or English",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "Swedish or English",
  "swedish": "Swedish word/phrase",
  "english": "English word/phrase",
  "gender": "en" | "ett" | null,
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "swedish" must always be written in Swedish
- "english" must always be written in English
- Both should be the single best translation. Never list synonyms with semicolons or slashes.
- "gender": if the Swedish term is a noun, set to "en" or "ett". Otherwise set to null.
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'French') {
    // French: termLanguage is set by Gemini (Latin script — can't detect client-side)
    if (context) {
      prompt = `Provide a concise translation for the French/English term "${term}" with this context: "${context}".

Determine whether "${term}" is French or English and set "termLanguage" accordingly.

IMPORTANT:
- "french" must always be the French word or phrase written in French
- "english" must always be the English word or phrase written in English
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "gender": if the French term is a noun, set to "le" or "la". Otherwise set to null.
- "briefDefinition": a single clear sentence defining the term in ${nativeLanguage}.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "French or English",
  "french": "French word/phrase",
  "english": "English word/phrase",
  "gender": "le" | "la" | null,
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant for French-English learners.

Given the term "${term}", determine whether it is French or English, then check if it has multiple significantly different meanings.

A term is ambiguous when it has 2 or more distinct common meanings that would confuse a language learner.

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",
  "termLanguage": "French or English",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "French or English",
  "french": "French word/phrase",
  "english": "English word/phrase",
  "gender": "le" | "la" | null,
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "french" must always be written in French
- "english" must always be written in English
- Both should be the single best translation. Never list synonyms with semicolons or slashes.
- "gender": if the French term is a noun, set to "le" or "la". Otherwise set to null.
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'English') {
    // English study — for native-Korean learners. The card back is Korean,
    // so Hangul detection distinguishes the two sides client-free.
    const termLanguage = detectKorean(term) ? 'Korean' : 'English';

    if (context) {
      prompt = `Provide a concise translation for the term "${term}" with this context: "${context}". The user is a native ${nativeLanguage} speaker learning English.

IMPORTANT: The "english" and "korean" fields must ALWAYS be in their respective languages:
- "english" must always be the English word or phrase written in English
- "korean" must always be the Korean word or phrase written in Korean script (한국어)
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "english": "English word/phrase",
  "korean": "Korean word/phrase in 한국어",
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant helping a native ${nativeLanguage} speaker learn English.

Given the term "${term}", determine whether it has multiple significantly different meanings that would confuse a language learner.

A term is ambiguous when it has 2 or more distinct common meanings that lead to meaningfully different translations or usage contexts (e.g., English "bat" can mean the animal or sports equipment).

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

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "english": "English word/phrase",
  "korean": "Korean word/phrase in 한국어",
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "english" must always be written in English
- "korean" must always be written in Korean script (한국어)
- Both should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else {
    // Korean (default)
    const termLanguage = detectKorean(term) ? 'Korean' : 'English';

    if (context) {
      prompt = `Provide a concise translation for the term "${term}" with this context: "${context}".

IMPORTANT: The "korean" and "english" fields must ALWAYS be in their respective languages:
- "korean" must always be the Korean word or phrase written in Korean script (한국어)
- "english" must always be the English word or phrase written in English
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.

For "formality", if the term is Korean, classify it as one of: Casual, Standard, Formal, Honorific, Slang. If the term is English, use "N/A".

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "formality": "formality level",
  "briefDefinition": "one-sentence definition"
}`;
    } else {
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

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "formality": "Casual | Standard | Formal | Honorific | Slang | N/A",
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "korean" must always be written in Korean script (한국어)
- "english" must always be written in English
- Both "korean" and "english" should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.
- For "formality", if the term is Korean use one of: Casual, Standard, Formal, Honorific, Slang. If English, use "N/A".
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(parsed);
}
