import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

// Firestore is the source of truth: the first request for a (date, language
// pair) generates and stores the word, everyone else reads it back. The CDN
// header below is only a fast-path — a cache miss re-reads Firestore and
// serves the same word, so consistency doesn't depend on cache behavior.
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
};

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

  const docId = `${date}_${studyLanguage}_${nativeLanguage}`.replace(/[^\w.-]/g, '_');
  let docRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    docRef = getDb().collection('wordOfTheDay').doc(docId);
    const snap = await docRef.get();
    if (snap.exists) {
      return NextResponse.json(snap.data(), { headers: CACHE_HEADERS });
    }
  } catch {
    // Firestore unavailable — fall through and serve a freshly generated
    // word rather than failing the request; it just won't be shared.
    docRef = null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 1.0 } });

  const extraField =
    studyLanguage === 'Swedish'
      ? '"gender": "en" | "ett" | null'
      : studyLanguage === 'French'
        ? '"gender": "le" | "la" | null'
        : studyLanguage === 'Japanese'
          ? '"furigana": "reading in hiragana if the word contains kanji" | null'
          : studyLanguage === 'Korean'
            ? '"formality": "Casual | Standard | Formal | Honorific | Slang"'
            : null;

  const translationLine =
    studyLanguage === 'English'
      ? '"korean": "the best Korean translation", "english": "the word itself"'
      : '"english": "the best English translation"';

  const prompt = `You are picking the "word of the day" (${date}) for learners of ${studyLanguage}.

Pick ONE ${studyLanguage} word or short expression.

Hard requirement — practical value: it must be a word an intermediate learner would encounter often in everyday conversation, media, or daily life, or need often when speaking. Avoid absolute-beginner vocabulary (greetings, numbers, colors) and obscure, archaic, or academic terms.

Preference — date relevance: if ${date} falls on or near a holiday, observance, season, or notable annual event in places where ${studyLanguage} is spoken, prefer a common word naturally connected to it (a seasonal weather word, a holiday food, an activity typical of this time of year). The date-relevant word must still satisfy the hard requirement above — never drop to beginner vocabulary or reach for a rare word just to match the date. If nothing fits, pick any high-value word: culturally revealing, hard to translate directly, or highly useful in daily conversation.

Vary your choice — different dates should yield different words.

Respond with only this JSON:
{
  "term": "the ${studyLanguage} word, written in ${studyLanguage}",
  ${translationLine},
  "briefDefinition": "one sentence in ${nativeLanguage} explaining the meaning"${extraField ? `,\n  ${extraField}` : ''}
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(stripMarkdownCodeBlock(text));

  if (docRef) {
    try {
      // create() fails if the doc appeared since our read — another request
      // won the first-user race, so serve its word and discard ours.
      await docRef.create(parsed);
    } catch {
      try {
        const winner = await docRef.get();
        if (winner.exists) {
          return NextResponse.json(winner.data(), { headers: CACHE_HEADERS });
        }
      } catch {
        // Fall through to serving the freshly generated word.
      }
    }
  }

  return NextResponse.json(parsed, { headers: CACHE_HEADERS });
}
