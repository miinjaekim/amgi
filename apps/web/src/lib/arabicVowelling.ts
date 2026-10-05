import type { GoogleGenerativeAI } from '@google/generative-ai';
import { arabicReading, parseModelJson } from '@amgi/core';

/**
 * The vowelled reading for an Arabic word, asked on its own.
 *
 * **Server-only, and a step inside the lookup, not a route of its own.**
 * `/api/explain` and `/api/word-of-the-day` call it once they know which word
 * and which meaning the card is about.
 *
 * It is a second call because the first one cannot be trusted with this.
 * Roughly half of common Arabic words share their unvowelled spelling with
 * another word — ملك is king, angel, dominion, property and "to possess" — so
 * the reading follows from the meaning and the part of speech, and those are
 * only settled once the first answer exists. Measured on 102 word-and-meaning
 * pairs from Wiktionary, three runs each (2026-10-05):
 *
 * | how the reading was asked                                  | right on all three |
 * |------------------------------------------------------------|--------------------|
 * | as one more field of the lookup's own answer               | 78 / 102           |
 * | alone, plainly ("this word in this sense")                 | 77 / 102           |
 * | alone, with the wording below                              | 91 / 102           |
 *
 * As a field of the lookup it answered with the most frequent word of that
 * spelling whatever the card said — a noun's vowels on a card it had just
 * called a verb. The wording below is what the decision to ship an unchecked
 * reading rests on, so change it with a measurement in hand; the method is in
 * `.scratchpad/decisions/languages.md`.
 *
 * ⚠️ Nothing here makes the reading *checked*. No dictionary is consulted, the
 * misses that remain are real, and the reading is labelled as not checked
 * wherever it shows (`getReading`). The one thing enforced is `arabicReading`:
 * an answer that is not this word's letters is dropped.
 *
 * Never throws: a card without a reading is a whole card, and a failed second
 * call must not cost the learner the first.
 */
export async function vowelArabic(
  genAI: GoogleGenerativeAI,
  word: string,
  meaning: string,
  partOfSpeech?: unknown,
): Promise<string | undefined> {
  const pos = partOfSpeech === 'verb'
    ? 'verb (give the past tense, third person masculine singular)'
    : typeof partOfSpeech === 'string' && partOfSpeech
      ? partOfSpeech
      : 'not given';
  const prompt = `Arabic word, unvowelled: "${word}"
Meaning intended: "${meaning}"
Part of speech: ${pos}

Write this exact word with full vowel marks for that meaning, as a dictionary headword without case endings. Keep every letter as given: do not add, remove or replace a letter, and do not answer with a more common word of similar meaning. Several different words share this spelling; choose the vowelling that carries the meaning given, not the most frequent one. Use a shadda only if the word with this meaning has a doubled consonant: a form I verb such as كَتَبَ has none, a form II verb such as كَتَّبَ does.
Respond with only JSON: {"vowelled": "..."}`;
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // No thinking: the learner is already waiting on the lookup this follows,
      // and this is the configuration the numbers above were measured in.
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } as never,
    });
    const result = await model.generateContent(prompt);
    const parsed = parseModelJson(result.response.text()) as { vowelled?: unknown } | null;
    return arabicReading(word, parsed?.vowelled);
  } catch {
    return undefined;
  }
}
