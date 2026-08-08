import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getStudyLanguageConfig, parsePatternExercise } from '@amgi/core';

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
}

/**
 * Generates one exercise for one grammar pattern, at whichever rung it is on.
 *
 * Two arms, because practice runs controlled → free and the learner's stage
 * picks between them (`exerciseFormat`). A **cloze** is one sentence with the
 * pattern blanked; a **production** turn is a situation to express freely.
 *
 * This route is the only model call a cloze turn costs — grading one is a local
 * string comparison, so there is no second round trip and no grading variance.
 * A production turn additionally grades through `/api/writing` unchanged, since
 * a pattern review is a one-sentence writing review with a target and inventing
 * a second grading prompt is the parallel-endpoint drift this codebase has paid
 * for before.
 *
 * Both arms are language-generic, like `/api/writing` and unlike `/api/explain`
 * — one prompt each rather than six branches splitting again on context. That
 * is exactly why the writing-finding door ships before the Learn door.
 */
export async function POST(req: NextRequest) {
  const {
    format = 'production',
    pattern,
    gloss = {},
    note,
    nativeLanguage = 'English',
    studyLanguage = 'Korean',
  } = await req.json();

  if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
    return NextResponse.json({ error: 'pattern is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Warmer than the rest of the app, and on purpose. Every other prompt here
  // wants one right answer; this one wants a *different* situation each time
  // the same pattern comes round. At `/api/writing`'s 0.1 a pattern practised
  // weekly would pose near enough the same scene every week, and the learner
  // would be recalling their own previous sentence rather than running the
  // pattern — the exact failure the flashcard version of this had.
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 1.0 },
  });

  // Registry codes are identifiers, not prose: interpolating the code yields
  // "a learner of TraditionalChinese". Every prompt in the app uses `label`.
  const config = getStudyLanguageConfig(studyLanguage);
  const language = config.label;

  const glossText = nativeLanguage === 'Korean'
    ? gloss?.Korean ?? gloss?.English
    : gloss?.English ?? gloss?.Korean;

  const scriptRule = studyLanguage === 'TraditionalChinese'
    ? '\n- Write all Mandarin in Traditional characters (繁體字) as used in Taiwan, never Simplified (简体字).'
    : '';

  const patternHeader = `PATTERN: ${pattern}${glossText ? `\nWHAT IT DOES: ${glossText}` : ''}${note ? `\nWHEN TO REACH FOR IT: ${note}` : ''}`;

  const clozePrompt = `A learner of ${language} is practising one grammar pattern. Write them ONE
fill-in-the-blank exercise.

${patternHeader}

Return four things.

1. "sentence" — ONE natural ${language} sentence that uses this pattern, with the
part the pattern contributes replaced by exactly three underscores: ___
Everything else in the sentence stays intact. Exactly one gap, never two.

The sentence must make the answer INFERABLE. A learner who knows this pattern
should be able to fill the gap with confidence — so the surrounding words have to
pin down which relation is wanted, and must not leave two equally good answers
sitting in the gap. This is the single most important property; a gap with three
defensible fillers is a broken exercise.

Keep it short and everyday, one clause or two. Vary it: this same pattern comes
round again and the learner must not be answering from memory of a previous
sentence.

Do NOT name the pattern anywhere in the sentence or elsewhere in your response
except where asked below.

2. "meaning" — the whole sentence, gap filled in, rendered naturally in
${nativeLanguage}. This is shown to the learner alongside the gap, so they know
what they are trying to say. Translate the complete thought, not the fragment.

3. "input" — the base or dictionary form the learner must transform to fill the
gap: 가다 for a Korean -다가 gap, "de" for a French elision gap, an infinitive for
a tense gap. Give it whenever the gap is built out of some other word, so the
learner is being tested on the pattern rather than on guessing which verb you
had in mind. OMIT this field entirely when the gap is a bare slot with nothing to
transform, such as a particle or article choice.

4. "expected" — exactly the text that belongs in the gap. Just the gap's
contents: if the sentence is "영화를 ___ 잠들었어요." then expected is "보다가", not
the whole sentence and not "___보다가".

5. "alternates" — an array of every OTHER answer that would also be correct in
that exact gap. Different politeness levels, contracted and uncontracted forms,
regional variants, spacing variants — anything a competent learner might
reasonably type that a teacher would mark right. The learner's answer is compared
against this list by exact match, so **be generous**: a missing alternate marks a
correct answer wrong, which is the worst thing this exercise can do. Return an
empty array only when the gap genuinely admits one single form.${scriptRule}

Respond with only this JSON:
{
  "sentence": "a ${language} sentence with exactly one ___ gap",
  "meaning": "the whole sentence in ${nativeLanguage}",
  "input": "the base form to transform, omitted if there is nothing to transform",
  "expected": "just what goes in the gap",
  "alternates": ["another acceptable filling", "…"]
}`;

  const productionPrompt = `A learner of ${language} is practising one grammar pattern by producing
sentences with it. Write them ONE exercise.

${patternHeader}

Return four things.

1. "situation" — a short, concrete situation described in ${nativeLanguage},
which the learner will express as ONE sentence in ${language}.

THE SINGLE MOST IMPORTANT RULE: the situation must NEVER name the pattern, and
must never quote it, transliterate it, or describe it in grammatical terms.
Naming it teaches the label; reaching for it unprompted is the actual skill.
Write the situation so this pattern is the natural way a native would say it,
and let the learner arrive there on their own. Do not write "use the X form" or
"express this using…". Just describe the situation and what they mean.

Two or three sentences at most. Make it concrete and everyday — a specific
moment with specific things in it, not an abstract instruction. Vary it: this
same pattern will come round again, and the learner must not be able to answer
from memory of a previous turn.

2. "hintShape" — a nudge toward the shape, still without naming the pattern.
Say what the sentence has to do — which parts connect, in what order, what
relation holds between them — so a learner staring at a blank box has somewhere
to start. Written in ${nativeLanguage}. One sentence. It must remain possible to
read this and still not know which pattern is wanted.

3. "hintName" — the pattern itself, "${pattern}", plus at most a handful of words
on what it does. This is the last resort, given only when the learner asks
twice, so it may be explicit.

4. "targetForms" — an array of 4 to 10 short FRAGMENTS in ${language}: the
pattern as it appears attached to a stem. NOT whole sentences. Each entry is the
word or two that carries the pattern and nothing else — no subject, no object,
no second clause.

  For the Korean pattern -다가: ["다가", "보다가", "가다가", "먹다가", "하다가"]
  For the French passé composé: ["ai mangé", "suis allé", "as vu", "avons pris"]
  NOT like this: ["영화를 보다가 잠들었어요."] — that is a sentence, not a form.

FIRST ENTRY: if the pattern contains a fixed run of characters that appears
verbatim every single time the pattern is used — a suffix, an ending, a particle
— make that bare string the first entry, on its own. For -다가 that is "다가"; for
-는데 that is "는데". Where the pattern has no such invariant string, because it
is built from an auxiliary or is a rule about word order, omit it and let the
inflected fragments do the work.

THE REST: cover a range of COMMON stems, not only the verb your situation
suggests — the learner may reach for a different word than the one you had in
mind, and their sentence is no less correct for it. Include the politeness
levels the language distinguishes.

These are substring-matched against whatever the learner writes, so a fragment
carrying any extra words will simply never match. Be generous — a missing form
scores a correct answer as a miss, which is the worst thing this exercise can
do.${scriptRule}

Respond with only this JSON:
{
  "situation": "the situation, in ${nativeLanguage}, never naming the pattern",
  "hintShape": "the shape, in ${nativeLanguage}, still not naming it",
  "hintName": "${pattern} — what it does, in ${nativeLanguage}",
  "targetForms": ["a fragment", "another fragment", "…"]
}`;

  const isCloze = format === 'cloze';

  try {
    const result = await model.generateContent(isCloze ? clozePrompt : productionPrompt);
    const parsed = parsePatternExercise(
      JSON.parse(stripMarkdownCodeBlock(result.response.text())),
      { pattern },
      isCloze ? 'cloze' : 'production',
    );

    if (!parsed) {
      return NextResponse.json({ error: 'Could not generate an exercise' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[grammar/exercise] generation failed:', error);
    return NextResponse.json({ error: 'Could not generate an exercise' }, { status: 502 });
  }
}
