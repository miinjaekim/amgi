import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import {
  PART_OF_SPEECH_CODES,
  getBackSideConfig,
  getStudyLanguageConfig,
  normalizePartOfSpeech,
  parseModelJson,
} from '@amgi/core';

function detectKorean(term: string): boolean {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(term);
}

function detectJapanese(term: string): boolean {
  // Hiragana, katakana, or CJK ideographs (kanji)
  return /[぀-ヿ一-鿿]/.test(term);
}

function detectChinese(term: string): boolean {
  // Han ideographs: CJK Unified Ideographs, Extension A, and the
  // compatibility block. No kana range — a Chinese deck never sees them.
  return /[㐀-䶿一-鿿豈-﫿]/.test(term);
}

export async function POST(req: NextRequest) {
  const { term, nativeLanguage = 'English', context, studyLanguage = 'Korean', exact = false } = await req.json();

  if (!term || typeof term !== 'string') {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1 } });

  // The back side follows native language, but `english` stays populated on
  // every card: it is what documents written before this existed carry, what
  // CSV and Anki export read, and what makes switching native language later
  // show a back rather than a blank. Asking for both sides costs a field in
  // one response, not a second call.
  const back = getBackSideConfig(studyLanguage, nativeLanguage);
  const nativeBackRule = back.backField === 'english' ? '' :
    `\n- "${back.backField}" must always be the ${back.backLanguage} word or phrase for that same meaning, written in ${back.backLanguage}. Single best translation — never list synonyms with semicolons or slashes.`;
  const nativeBackJson = back.backField === 'english' ? '' :
    `\n  "${back.backField}": "${back.backLanguage} word/phrase",`;

  // Spellcheck rides the lookup instead of preceding it: one round trip, and
  // the model that already knows this language pair does the judging. A
  // separate check would be a second call before the first, and a second prompt
  // to keep in step with these.
  //
  // Only the no-context prompts carry it. A context lookup is a *re*-lookup of
  // a term this route already returned — disambiguation or "not what you
  // meant?" — so the spelling question was settled a call ago.
  //
  // `exact` is the user's override, the "search for what you typed instead"
  // link. It drops the rule rather than filtering the answer afterwards,
  // because the thing being overridden is the model's judgement, not its
  // formatting: asked again without the rule, it explains what was typed.
  //
  // The rule is written to refuse far more often than it fires. A learner
  // typing a word they don't know well is exactly who a correction overrules
  // wrongly, so rare, archaic, dialectal, slang and proper nouns are all named
  // as *not* misspellings — a real word Amgi doesn't recognise has to stay
  // reachable, and the override alone isn't enough if the correction is eager.
  const spellBlock = exact ? '' : `
Also judge the spelling of "${term}". Set "corrected" ONLY when it is a clear misspelling of one specific real word, one obvious slip away — of whatever kind this writing system makes easy. A transposed, doubled, dropped or wrong letter. A missing or wrong accent. A word spelled the way it *sounds* rather than the way the language spells it: Korean 마지하다 for 맞이하다, 안녕하세여 for 안녕하세요. Wrong okurigana, or kana where the word is normally written in kanji. A Simplified character where the Traditional one belongs.

Finding yourself assembling a meaning out of the parts of "${term}", because you cannot place it as a word you know, is that same signal — a real word does not need to be assembled.

Otherwise set "corrected" to null. A rare, archaic, dialectal, slang or proper-noun spelling is not a misspelling. A valid inflected, conjugated or compounded form is not a misspelling. Neither is anything where two different corrections are equally likely — you would be guessing which word the learner meant.

When you do set it, every other field — the meanings too, if it is ambiguous — must describe the corrected spelling rather than "${term}".
`;
  const spellJson = exact ? '' : `\n  "corrected": "corrected spelling" | null,`;

  // Part of speech, on every card and in the reader's own language.
  //
  // Asked for as a code from a closed list, never as a label: the badge has to
  // read 명사 to a Korean native and "Noun" to an English one, and that is a
  // render-time lookup off one stored value rather than a field per language.
  // `normalizePartOfSpeech` below drops anything that isn't on the list, so a
  // model that answers "gerund" costs a badge, not a bad card.
  //
  // It describes the *study-language* word, which is the rule `getDepthTarget`
  // already follows: someone who typed "awkward" into a Korean deck is saving
  // 어색하다, and English "awkward"'s adjective would describe the word they
  // came in already knowing.
  const studyLabel = getStudyLanguageConfig(studyLanguage).label;
  const posRule = `\n- "partOfSpeech": the part of speech of the ${studyLabel} word — exactly one of: ${PART_OF_SPEECH_CODES.join(' | ')}. Judge it by ${studyLabel}'s own grammar, not English's. "particle" covers Korean 조사 and Japanese 助詞; "counter" covers counting words like 個, 枚, 마리; "affix" is a prefix or suffix that is not a word on its own. A multi-word entry is "phrase", or "idiom" when its meaning does not follow from its parts. Set null rather than guessing when none of them fits.`;
  const posJson = `\n  "partOfSpeech": "${PART_OF_SPEECH_CODES.join(' | ')}" | null,`;

  let prompt: string;

  if (studyLanguage === 'Swedish') {
    // Swedish: termLanguage is set by Gemini (Latin script — can't detect client-side)
    if (context) {
      prompt = `Provide a concise translation for the Swedish/English term "${term}" with this context: "${context}".

Determine whether "${term}" is Swedish or English and set "termLanguage" accordingly.

IMPORTANT:
- "swedish" must always be the Swedish word or phrase written in Swedish
- "english" must always be the English word or phrase written in English${nativeBackRule}
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "gender": if the Swedish term is a noun, set to "en" or "ett". Otherwise set to null.${posRule}
- "briefDefinition": a single clear sentence defining the term in ${nativeLanguage}.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "Swedish or English",
  "swedish": "Swedish word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "en" | "ett" | null,${posJson}
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

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "Swedish or English",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "Swedish or English",
  "swedish": "Swedish word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "en" | "ett" | null,${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "swedish" must always be written in Swedish
- "english" must always be written in English${nativeBackRule}
- Both should be the single best translation. Never list synonyms with semicolons or slashes.
- "gender": if the Swedish term is a noun, set to "en" or "ett". Otherwise set to null.${posRule}
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'French') {
    // French: termLanguage is set by Gemini (Latin script — can't detect client-side)
    if (context) {
      prompt = `Provide a concise translation for the French/English term "${term}" with this context: "${context}".

Determine whether "${term}" is French or English and set "termLanguage" accordingly.

IMPORTANT:
- "french" must always be the French word or phrase written in French
- "english" must always be the English word or phrase written in English${nativeBackRule}
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "gender": if the French term is a noun, set to "le" or "la". Otherwise set to null.${posRule}
- "briefDefinition": a single clear sentence defining the term in ${nativeLanguage}.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "French or English",
  "french": "French word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "le" | "la" | null,${posJson}
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

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "French or English",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "French or English",
  "french": "French word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "le" | "la" | null,${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "french" must always be written in French
- "english" must always be written in English${nativeBackRule}
- Both should be the single best translation. Never list synonyms with semicolons or slashes.
- "gender": if the French term is a noun, set to "le" or "la". Otherwise set to null.${posRule}
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'Spanish') {
    // Spanish: termLanguage is set by Gemini (Latin script — can't detect client-side)
    if (context) {
      prompt = `Provide a concise translation for the Spanish/English term "${term}" with this context: "${context}".

Determine whether "${term}" is Spanish or English and set "termLanguage" accordingly.

IMPORTANT:
- "spanish" must always be the Spanish word or phrase written in Spanish
- "english" must always be the English word or phrase written in English${nativeBackRule}
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "gender": if the Spanish term is a noun, set to "el" or "la". Otherwise set to null.${posRule}
- "briefDefinition": a single clear sentence defining the term in ${nativeLanguage}.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "Spanish or English",
  "spanish": "Spanish word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "el" | "la" | null,${posJson}
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant for Spanish-English learners.

Given the term "${term}", determine whether it is Spanish or English, then check if it has multiple significantly different meanings.

A term is ambiguous when it has 2 or more distinct common meanings that would confuse a language learner.

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "Spanish or English",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "Spanish or English",
  "spanish": "Spanish word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "gender": "el" | "la" | null,${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "spanish" must always be written in Spanish
- "english" must always be written in English${nativeBackRule}
- Both should be the single best translation. Never list synonyms with semicolons or slashes.
- "gender": if the Spanish term is a noun, set to "el" or "la". Otherwise set to null.${posRule}
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'Japanese') {
    // Japanese: kana/kanji are script-detectable
    const termLanguage = detectJapanese(term) ? 'Japanese' : 'English';

    if (context) {
      prompt = `Provide a concise translation for the term "${term}" with this context: "${context}".

IMPORTANT: The "japanese" and "english" fields must ALWAYS be in their respective languages:
- "japanese" must always be the Japanese word or phrase written the way it is naturally written (kanji where usual)
- "english" must always be the English word or phrase written in English${nativeBackRule}
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "furigana": if "japanese" contains kanji, give its full reading in hiragana. Otherwise set to null.${posRule}

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "japanese": "Japanese word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "furigana": "reading in hiragana" | null,${posJson}
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant for Japanese-English learners.

Given the term "${term}", determine whether it has multiple significantly different meanings that would confuse a language learner.

A term is ambiguous when it has 2 or more distinct common meanings that lead to meaningfully different translations or usage contexts (e.g., Japanese はし can mean bridge or chopsticks).

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "japanese": "Japanese word/phrase",
  "english": "English word/phrase",${nativeBackJson}
  "furigana": "reading in hiragana" | null,${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "japanese" must always be written the way it is naturally written in Japanese (kanji where usual)
- "english" must always be written in English${nativeBackRule}
- Both should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.
- "furigana": if "japanese" contains kanji, give its full reading in hiragana. Otherwise null.${posRule}
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  } else if (studyLanguage === 'TraditionalChinese') {
    // Traditional Chinese: Han characters are script-detectable
    const termLanguage = detectChinese(term) ? 'TraditionalChinese' : 'English';

    if (context) {
      prompt = `Provide a concise translation for the term "${term}" with this context: "${context}".

IMPORTANT: The "traditionalChinese" and "english" fields must ALWAYS be in their respective languages:
- "traditionalChinese" must always be the Mandarin word or phrase written in Traditional characters (繁體字) as used in Taiwan. Never return Simplified characters (简体字) — convert them if the input used them.
- "english" must always be the English word or phrase written in English${nativeBackRule}
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.
- "pinyin": the full Hanyu Pinyin reading of "traditionalChinese", with tone marks (e.g. "dōngxi"), spaced by word.${posRule}

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "traditionalChinese": "Mandarin word/phrase in 繁體字",
  "english": "English word/phrase",${nativeBackJson}
  "pinyin": "tone-marked pinyin",${posJson}
  "briefDefinition": "one-sentence definition"
}`;
    } else {
      prompt = `You are a language learning assistant for Mandarin-English learners studying Traditional characters.

Given the term "${term}", determine whether it has multiple significantly different meanings that would confuse a language learner.

A term is ambiguous when it has 2 or more distinct common meanings that lead to meaningfully different translations or usage contexts (e.g., 東西 can mean "thing" or "east and west", each with its own pronunciation).

A term is NOT ambiguous when:
- It has one clear primary meaning
- Secondary meanings are rare or archaic
- The meanings are closely related variants of the same concept

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "traditionalChinese": "Mandarin word/phrase in 繁體字",
  "english": "English word/phrase",${nativeBackJson}
  "pinyin": "tone-marked pinyin",${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "traditionalChinese" must always be written in Traditional characters (繁體字) as used in Taiwan. Never return Simplified characters (简体字) — convert them if the input used them.
- "english" must always be written in English${nativeBackRule}
- Both should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.
- "pinyin": the full Hanyu Pinyin reading of "traditionalChinese", with tone marks (e.g. "dōngxi"), spaced by word.${posRule}
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
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.${posRule}

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "english": "English word/phrase",
  "korean": "Korean word/phrase in 한국어",${posJson}
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

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "english": "English word/phrase",
  "korean": "Korean word/phrase in 한국어",${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "english" must always be written in English
- "korean" must always be written in Korean script (한국어)
- Both should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.${posRule}
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
- Both fields should use the single best translation. Only use 2-3 words if one word is genuinely insufficient. Never list synonyms with semicolons or slashes.${posRule}

For "formality", if the term is Korean, classify it as one of: Casual, Standard, Formal, Honorific, Slang. If the term is English, use "N/A".

For "briefDefinition", write a single clear sentence defining the term in ${nativeLanguage}. No examples, no cultural context — just the core meaning.

Respond with only this JSON:
{
  "term": "${term}",
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "formality": "formality level",${posJson}
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

${spellBlock}
If AMBIGUOUS, respond with only this JSON:
{
  "ambiguous": true,
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "meanings": [
    { "label": "short label (3-6 words max)", "hint": "one sentence clarifying this meaning" },
    { "label": "...", "hint": "..." }
  ]
}

Every "label" and "hint" must be written in ${nativeLanguage} — the user may not understand any other language.

If NOT ambiguous, respond with only this JSON:
{
  "term": "${term}",${spellJson}
  "termLanguage": "${termLanguage}",
  "korean": "Korean word/phrase in 한국어",
  "english": "English word/phrase",
  "formality": "Casual | Standard | Formal | Honorific | Slang | N/A",${posJson}
  "briefDefinition": "one-sentence definition in ${nativeLanguage}"
}

IMPORTANT for the non-ambiguous case:
- "korean" must always be written in Korean script (한국어)
- "english" must always be written in English
- Both "korean" and "english" should be the single best translation. Only use 2-3 words if truly necessary. Never list synonyms with semicolons or slashes.
- For "formality", if the term is Korean use one of: Casual, Standard, Formal, Honorific, Slang. If English, use "N/A".${posRule}
- "briefDefinition" must be a single sentence defining the core meaning. No examples, no cultural context.`;
    }
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseModelJson(text);

  // The one field this route narrows before returning, because it is the one
  // whose value is a code the client will look up rather than text it will
  // print. "Noun (countable)" resolves; "gerund" is dropped here rather than
  // reaching Firestore and rendering nothing forever after.
  if (parsed && typeof parsed === 'object' && 'partOfSpeech' in parsed) {
    const record = parsed as Record<string, unknown>;
    const pos = normalizePartOfSpeech(record.partOfSpeech);
    if (pos) record.partOfSpeech = pos;
    else delete record.partOfSpeech;
  }

  return NextResponse.json(parsed);
}
