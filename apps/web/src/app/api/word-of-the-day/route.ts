import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

// Cached per unique URL (date + language pair) at the CDN, so all users
// share a single Gemini call per study language per day.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const studyLanguage = searchParams.get('studyLanguage') ?? 'Korean';
  const nativeLanguage = searchParams.get('nativeLanguage') ?? 'English';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid date' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 1.0 } });

  const extraField =
    studyLanguage === 'Swedish'
      ? '"gender": "en" | "ett" | null'
      : studyLanguage === 'French'
        ? '"gender": "le" | "la" | null'
        : studyLanguage === 'Korean'
          ? '"formality": "Casual | Standard | Formal | Honorific | Slang"'
          : null;

  const translationLine =
    studyLanguage === 'English'
      ? '"korean": "the best Korean translation", "english": "the word itself"'
      : '"english": "the best English translation"';

  const prompt = `You are picking the "word of the day" (${date}) for learners of ${studyLanguage}.

Pick ONE ${studyLanguage} word or short expression that is genuinely interesting to an intermediate learner: culturally revealing, hard to translate directly, or highly useful in daily conversation. Avoid absolute-beginner vocabulary (greetings, numbers, colors) and obscure academic terms. Vary your choice — the date is provided so different days should yield different words.

Respond with only this JSON:
{
  "term": "the ${studyLanguage} word, written in ${studyLanguage}",
  ${translationLine},
  "briefDefinition": "one sentence in ${nativeLanguage} explaining the meaning"${extraField ? `,\n  ${extraField}` : ''}
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(stripMarkdownCodeBlock(text));

  return NextResponse.json(parsed, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
