import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getStudyLanguageConfig, parseWritingReview, WRITING_MAX_CHARS } from '@amgi/core';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

export async function POST(req: NextRequest) {
  const { text, nativeLanguage = 'English', studyLanguage = 'Korean' } = await req.json();

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  // The client caps this too, with a counter. Repeated here because the cap is
  // about the cost and readability of the *response*, and a client is not where
  // that gets enforced.
  if (text.length > WRITING_MAX_CHARS) {
    return NextResponse.json({ error: 'text is too long' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  // Registry codes are identifiers, not prose: interpolating the code yields
  // "a learner of TraditionalChinese". Every prompt in the app uses `label`.
  const config = getStudyLanguageConfig(studyLanguage);
  const language = config.label;

  const scriptRule = studyLanguage === 'TraditionalChinese'
    ? '\n- Write all Mandarin in Traditional characters (繁體字) as used in Taiwan, never Simplified (简体字).'
    : '';

  const prompt = `A learner of ${language} has written the passage below. Review it.

PASSAGE:
"""
${text}
"""

Return three things.

1. "rewrite" — the whole passage as a native ${language} speaker would naturally
have written it, preserving what the learner was trying to say. Keep their
voice and their intent; do not make it longer, more formal, or more literary
than they were going for. If the passage is already natural, return it
essentially unchanged.

2. "rewriteNative" — "rewrite" translated into ${nativeLanguage}, so the learner
can check that the corrected version still says what they meant. Translate the
rewrite faithfully, including any place where it departs from what they wrote —
this is the line that lets them catch a correction that changed their meaning,
so smoothing it over defeats the purpose. Match the register of the rewrite.

3. "findings" — what is worth noticing, as a single ordered list.

CALIBRATION — this matters more than anything else here:
Judge the level from the passage itself and pitch the feedback to that level.
A beginner needs the grammar that is actually blocking them and should not be
handed register subtleties they cannot use yet. A strong writer has no basic
errors to report, so telling them their grammar is fine is worthless — give
them naturalness, collocation and register instead. Order the list by what THIS
writer most needs to see, most important first. Never pad: if there is nothing
useful to say, return an empty list. Do not invent problems to fill space, and
do not report stylistic preferences as errors.

Each finding is an object:
- "kind": one of "grammar", "naturalness", "register", "vocabulary".
  - grammar — a rule was broken: conjugation, particle, agreement, word order.
  - naturalness — not wrong, but no native would phrase it that way.
  - register — the formality or tone does not match the situation.
  - vocabulary — the word they reached for is not the word that exists for this.
- "original": the exact span from the passage, quoted verbatim. Omit if the
  finding is not about a specific span.
- "suggested": how a native would put that span. Omit if the finding only
  observes something rather than replacing it.
- "note": one or two sentences on why, written in ${nativeLanguage}. Speak to
  the learner directly. This is the substance — make it worth reading.
- "card": include ONLY when the finding contains something worth remembering
  later — a word, a set phrase, or a grammar pattern. A one-off typo or a
  slip they clearly already know teaches nothing; omit "card" there. A grammar
  pattern IS a valid card, and for a beginner it is often the most valuable
  one. Shape:
    { "study": "the ${language} word, phrase or pattern",
      "back": { "English": "…", "Korean": "…" } }
  Both backs are always required. "study" must be written in ${language}, and
  in its citation form — the dictionary form of a verb, the pattern itself for
  a grammar point — not inflected as it happened to appear in the passage.
  Each back is a flashcard back, so write the shortest natural translation or
  gloss — never a dictionary definition, never a full sentence, and never a
  definition that uses the term itself. For a grammar pattern, gloss what it
  does in a few words.
  Prefer a single gloss, and give a second one only when a single gloss would
  genuinely mislead — words used interchangeably, or a term no one word in the
  other language covers. Separate the two with a comma. Never more than two,
  and never a second one added just for completeness.${scriptRule}

Every "note", and both "back" values, must be written so the learner can read
them: notes in ${nativeLanguage}, backs in English and Korean respectively.

Respond with only this JSON:
{
  "rewrite": "the passage, natively written",
  "rewriteNative": "that same text in ${nativeLanguage}",
  "findings": [
    { "kind": "…", "original": "…", "suggested": "…", "note": "…",
      "card": { "study": "…", "back": { "English": "…", "Korean": "…" } } }
  ]
}`;

  const result = await model.generateContent(prompt);
  const parsed = parseWritingReview(JSON.parse(stripMarkdownCodeBlock(result.response.text())));

  if (!parsed) {
    return NextResponse.json({ error: 'Could not review this passage' }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
