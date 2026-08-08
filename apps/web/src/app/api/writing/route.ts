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
      "back": { "English": "…", "Korean": "…" },
      "gap": true }
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
  and never a second one added just for completeness.
  "gap": set this to true ONLY in the case described immediately below, and
  omit the field entirely otherwise.

WORDS THEY DID NOT HAVE — do not miss these:
When a learner cannot reach a ${language} word, they leave a mark in the
passage. Two marks, and both are easy to read past because the rest of the
sentence often looks fine:
  1. They write the word in ${nativeLanguage} in the middle of their
     ${language} sentence.
  2. They talk around it — a whole phrase describing the thing, where a native
     would use one word. "the thing you open bottles with" for a corkscrew.
EVERY one of these gets its own finding, with "kind": "vocabulary", and that
finding MUST carry a "card" with "gap": true whose "study" is the ${language}
word they were missing. Never merge two missing words into one finding, and
never let a missing word pass with only a mention in the rewrite.
Rank these HIGH in the list. Everything else you report is a judgement about
what would be better; this is the one thing the passage *proves* they needed and
did not have. It is the single most valuable card a piece of writing can yield.
- "pattern": include when the finding's take-away is a reusable grammar
  pattern — something that takes a stem and a context and produces a FORM, and
  that this learner will meet again. A connective ending, a tense construction,
  a case or agreement rule are patterns. A word, a set phrase, a collocation, a
  one-off slip and a typo are not.
  This does NOT depend on the finding's "kind". A finding can be "naturalness" —
  no rule was broken, but no native would phrase it that way — and still be
  about a pattern the learner should be able to produce; those are often the
  most valuable ones here. Judge the take-away, not the kind. Shape:
    { "pattern": "the citation form, in ${language}",
      "kind": "choice" | "form",
      "gloss": { "English": "…", "Korean": "…" },
      "note": "one or two sentences in ${nativeLanguage} on when to reach for it" }
  The pattern's own "kind" classifies WHAT THIS LEARNER GOT WRONG, not what the
  pattern is in the abstract:
  - "choice" — they failed to reach for it. A meaning had to be matched to a
    form and they picked a different form, or a clumsier way round it. The
    pattern was available and they did not choose it.
  - "form" — they reached for it and applied it wrongly. A rule operated on
    something they were already writing and the output came out wrong:
    an agreement, a contraction, a conjugation, an allomorph by sound.
  Many patterns can be either depending on the error. Writing "de eau" instead
  of "d'eau" is "form" — they wanted "de" and the elision rule failed. Writing a
  correct but unnatural sequence of short sentences where a native would have
  joined them is "choice" — nothing was misapplied, the pattern was never
  reached for. Decide from the learner's actual mistake, and when the passage
  genuinely does not distinguish them, answer "choice".
  "pattern" is the citation form — the pattern itself, not as it happened to be
  inflected in the passage. Each gloss is a few words on what the pattern does,
  in the same shortest-natural-phrasing style as a card back.
  A finding may carry BOTH "card" and "pattern". Two cases, and they are
  different:
  - The take-away IS the pattern. Give both, with the same text in each — the
    card is a fallback for clients that cannot practise patterns.
  - The finding is about a missing word that ALSO illustrates a pattern. Then
    the card is the vocabulary they lacked and the pattern is the grammar
    point, they are different strings, and both are wanted. Do not drop the
    vocabulary card because a pattern was worth mentioning too.${scriptRule}

Every "note", and both "back" values, must be written so the learner can read
them: notes in ${nativeLanguage}, backs in English and Korean respectively.

Respond with only this JSON:
{
  "rewrite": "the passage, natively written",
  "rewriteNative": "that same text in ${nativeLanguage}",
  "findings": [
    { "kind": "…", "original": "…", "suggested": "…", "note": "…",
      "card": { "study": "…", "back": { "English": "…", "Korean": "…" },
                "gap": true },
      "pattern": { "pattern": "…", "kind": "choice",
                   "gloss": { "English": "…", "Korean": "…" }, "note": "…" } }
  ]
}`;

  const result = await model.generateContent(prompt);
  const parsed = parseWritingReview(JSON.parse(stripMarkdownCodeBlock(result.response.text())));

  if (!parsed) {
    return NextResponse.json({ error: 'Could not review this passage' }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
