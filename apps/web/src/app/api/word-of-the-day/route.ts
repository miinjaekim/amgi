import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebaseAdmin';
import { isStudyLanguage, wordOfTheDayCore, type WordOfTheDay } from '@amgi/core';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

/** How far back to look when keeping the daily word from repeating. */
const EXCLUSION_DAYS = 60;

function docIdFor(date: string, studyLanguage: string, nativeLanguage: string): string {
  return `${date}_${studyLanguage}_${nativeLanguage}`.replace(/[^\w.-]/g, '_');
}

/**
 * Terms already used for this language pair in the last EXCLUSION_DAYS days.
 * Read by document ID rather than a query so no composite index is needed;
 * a missing day is just an absent snapshot.
 */
async function recentTerms(
  date: string,
  studyLanguage: string,
  nativeLanguage: string
): Promise<string[]> {
  try {
    const db = getDb();
    const collection = db.collection('wordOfTheDay');
    const refs = Array.from({ length: EXCLUSION_DAYS }, (_, i) => {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (i + 1));
      return collection.doc(docIdFor(d.toISOString().slice(0, 10), studyLanguage, nativeLanguage));
    });
    const snaps = await db.getAll(...refs);
    return snaps.flatMap((s) => {
      const term = s.data()?.term;
      return typeof term === 'string' && term ? [term] : [];
    });
  } catch {
    // Exclusion is best-effort — a failed read just means a weaker prompt.
    return [];
  }
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

  const docId = docIdFor(date, studyLanguage, nativeLanguage);
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

  // Each date used to generate in isolation, so the model had no history to
  // vary against and common words recurred. Feed it what it already picked.
  const used = await recentTerms(date, studyLanguage, nativeLanguage);
  const exclusionBlock = used.length
    ? `\nAlready used — do NOT pick any of these, or any minor variant of them:\n${used.join(', ')}\n`
    : '';

  const buildPrompt = (insist: boolean) => `You are picking the "word of the day" (${date}) for learners of ${studyLanguage}.

Pick ONE ${studyLanguage} word or short expression.

Hard requirement — practical value: it must be a word an intermediate learner would encounter often in everyday conversation, media, or daily life, or need often when speaking. Avoid absolute-beginner vocabulary (greetings, numbers, colors) and obscure, archaic, or academic terms.

Preference — date relevance: if ${date} falls on or near a holiday, observance, season, or notable annual event in places where ${studyLanguage} is spoken, prefer a common word naturally connected to it (a seasonal weather word, a holiday food, an activity typical of this time of year). The date-relevant word must still satisfy the hard requirement above — never drop to beginner vocabulary or reach for a rare word just to match the date. If nothing fits, pick any high-value word: culturally revealing, hard to translate directly, or highly useful in daily conversation.
${exclusionBlock}${insist ? '\nYour previous answer was on the already-used list. Pick a genuinely different word this time.\n' : ''}
Respond with only this JSON:
{
  "term": "the ${studyLanguage} word, written in ${studyLanguage}",
  ${translationLine},
  "briefDefinition": "one sentence in ${nativeLanguage} explaining the meaning"${extraField ? `,\n  ${extraField}` : ''}
}`;

  const generate = async (insist: boolean) => {
    const result = await model.generateContent(buildPrompt(insist));
    return JSON.parse(stripMarkdownCodeBlock(result.response.text()));
  };

  let parsed = await generate(false);
  // One retry only: if it still collides, a repeat beats failing the request.
  if (used.includes(parsed?.term)) {
    try {
      parsed = await generate(true);
    } catch {
      // Keep the first pick rather than dropping the word of the day entirely.
    }
  }

  // Store the explanation the card will show. Tapping the card used to fire a
  // fresh /api/explain call, so the saved card could be worded differently from
  // the panel that was tapped; now the tap is a read of this.
  const stored: WordOfTheDay = { ...parsed };
  stored.core = wordOfTheDayCore(stored, isStudyLanguage(studyLanguage) ? studyLanguage : 'Korean');

  if (docRef) {
    try {
      // create() fails if the doc appeared since our read — another request
      // won the first-user race, so serve its word and discard ours.
      await docRef.create(stored);
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

  return NextResponse.json(stored, { headers: CACHE_HEADERS });
}
