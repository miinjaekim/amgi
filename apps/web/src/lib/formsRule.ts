/**
 * How a looked-up word's forms behave, asked of the same `/api/explain` call
 * that defines it. Two languages, and two shapes on purpose (the user,
 * 2026-10-07 and 2026-10-08):
 *
 * - **Swedish gets a table**: `forms`, the four forms of a noun or the three
 *   of an adjective as fields. A Swedish plural is one of five endings or
 *   none and the word does not say which, so nearly every noun has something
 *   to show, and four forms read better in a grid than in a sentence.
 * - **French gets a sentence**: `formsNote`, and only off the default, which
 *   is a plural in -s and a feminine in -e. cheval and beau get one; table
 *   and grand do not. A word already ending in -s, -x or -z does not either:
 *   that it stays as it is in the plural can be read off its spelling.
 *
 * **About this word, never about the language.** "Swedish marks definiteness
 * with a suffix" is true of every noun and so says nothing about bok; it is a
 * grammar lesson, and it is what a model writes when asked to "explain the
 * forms". Both rules ask for the forms themselves.
 *
 * **The Swedish rule asks for every adjective's forms and judges none of
 * them.** The first cut asked for a note "only when the adjective is
 * irregular", and the model called gammal, röd and vacker regular. Whether
 * stor, stort, stora is worth showing is arithmetic on three strings, so
 * `normalizeWordForms` does it and the model is only asked what the forms are.
 *
 * The French examples are written out per native language rather than asked
 * for "in ${nativeLanguage}" off the English ones, because the wording is the
 * thing being fixed: left to translate, the model writes a full polite
 * sentence where the note wants a terse line.
 *
 * Lives here for the reason `GLOSS_RULE` does — each language's branch of
 * `/api/explain` carries it in both of its templates, and the wording is what
 * drifts when it is written more than once.
 */
const FRENCH_EXAMPLES: Record<'English' | 'Korean', string> = {
  English: 'cheval → "Irregular plural: chevaux." beau → "bel before a vowel sound; feminine belle, plural beaux." table → null. grand → null.',
  Korean: 'cheval → "불규칙 복수형: chevaux." beau → "모음 소리 앞에서는 bel, 여성형은 belle, 복수형은 beaux." table → null. grand → null.',
};

/**
 * The rule as a bullet and the matching line of the JSON shape, both with
 * their leading newline so a branch can append them after `posRule` and
 * `posJson`. Two empty strings on every language that asks for neither.
 */
export function formsRule(studyLanguage: string, nativeLanguage: string): { rule: string; json: string } {
  if (studyLanguage === 'Swedish') {
    return {
      rule: `\n- "forms": the forms of the Swedish word, as fields. If it is a noun: { "indefiniteSingular": "bok", "definiteSingular": "boken", "indefinitePlural": "böcker", "definitePlural": "böckerna" } — each the bare form with no article in front (never "en bok"). Set both plural fields to null when the noun has no plural in use (mjölk); never invent a form. If it is an adjective: { "common": "stor", "neuter": "stort", "plural": "stora" } — the form used with en-words, the form used with ett-words, and the plural and definite form — and repeat the word where a form does not change (bra, bra, bra). Spell every form exactly as Swedish writes it. Set "forms" to null for a verb, any other part of speech, and a multi-word entry.`,
      json: `\n  "forms": { the noun's four forms or the adjective's three } | null,`,
    };
  }
  if (studyLanguage === 'French') {
    const examples = FRENCH_EXAMPLES[nativeLanguage === 'Korean' ? 'Korean' : 'English'];
    return {
      rule: `\n- "formsNote": if the French word is a noun or an adjective, ONE short sentence in ${nativeLanguage} about how the forms of this particular word behave. Set null when the word is predictable: a plural that adds -s (or a word already ending in -s, -x or -z, which does not change), and for an adjective a feminine that adds -e (or one already ending in -e). Otherwise give the forms that differ — an irregular plural, an irregular feminine, a second masculine form used before a vowel sound, or a word that never changes. Most French words get null. Write the forms themselves in French, as plain text with no quotation marks or markdown. State facts about this word only: never explain how plurals or agreement work in French, and never restate its gender. Set null for a verb, any other part of speech, and a multi-word entry. Examples: ${examples}`,
      json: `\n  "formsNote": "one short sentence in ${nativeLanguage}" | null,`,
    };
  }
  return { rule: '', json: '' };
}
