/**
 * The forms note: one sentence on a Swedish or French lookup about how that
 * word's forms behave, and nothing when they behave the way the word suggests.
 *
 * **A note, not chips and not a table** (scoped with the user, 2026-10-07).
 * A noun already carries one grammatical fact as a chip — its gender — and a
 * chip per form would crowd the card. A table of forms is what Munli is for.
 *
 * **About this word, never about the language.** "Swedish marks definiteness
 * with a suffix" is true of every noun and so says nothing about bok; it is a
 * grammar lesson, and it is what a model writes when asked to "explain the
 * forms". Each rule below therefore asks for the forms themselves and names
 * the lesson as the thing not to write.
 *
 * **Null is the expected answer wherever the word is predictable**, and the
 * two languages draw that line in different places on purpose:
 *
 * - **Swedish nouns nearly always get one.** The plural is one of five
 *   endings or none, and the word does not say which, so there is no
 *   "predictable" Swedish noun to stay silent on.
 * - **French gets one only off the default**, which is a plural in -s and a
 *   feminine in -e. cheval and beau get a note; table and grand do not. A
 *   word already ending in -s, -x or -z does not either: that it stays as it
 *   is in the plural can be read off its spelling.
 *
 * Adjectives follow the French shape in both languages: the default pattern
 * (Swedish -t and -a) is silent, anything else is said. The Swedish rule has
 * the model write the forms out first because, told only "null when regular",
 * it called gammal and röd regular: rött and gamla are regular to a grammar
 * and still not what stor would lead a learner to write.
 *
 * The examples are written out per native language rather than asked for "in
 * ${nativeLanguage}" off the English ones, because the wording is the thing
 * being fixed: left to translate, the model writes a full polite sentence
 * where the note wants a terse line.
 *
 * Lives here for the reason `GLOSS_RULE` does — each language's branch of
 * `/api/explain` carries it in both of its templates, and the wording is what
 * drifts when it is written more than once.
 */
type FormsNoteLanguage = 'Swedish' | 'French';

const EXAMPLES: Record<FormsNoteLanguage, Record<'English' | 'Korean', string>> = {
  Swedish: {
    English: 'bok → "Plural böcker, with a vowel change; definite boken." hus → "The plural is the same as the singular; definite huset." liten → "Irregular: litet with ett-words, små in the plural." gammal → "Plural and definite gamla." röd → "rött with ett-words." stor → null.',
    Korean: 'bok → "복수형은 모음이 바뀌어 böcker, 한정형은 boken." hus → "복수형이 단수형과 같고, 한정형은 huset." liten → "불규칙: ett 명사에는 litet, 복수형은 små." gammal → "복수형과 한정형은 gamla." röd → "ett 명사에는 rött." stor → null.',
  },
  French: {
    English: 'cheval → "Irregular plural: chevaux." beau → "bel before a vowel sound; feminine belle, plural beaux." table → null. grand → null.',
    Korean: 'cheval → "불규칙 복수형: chevaux." beau → "모음 소리 앞에서는 bel, 여성형은 belle, 복수형은 beaux." table → null. grand → null.',
  },
};

const SCOPE: Record<FormsNoteLanguage, string> = {
  Swedish: 'For a noun, give its indefinite plural and its definite singular, and say so when the plural changes a vowel, is the same as the singular, or does not exist — a Swedish noun does not show which plural it takes, so a noun nearly always gets a note. For an adjective, write out its ett-form and its plural before deciding: set null only when they are exactly the word plus -t and the word plus -a, as stor, stort, stora is. Give the forms that differ whenever either one is anything else — a consonant that doubles or changes (röd, rött), a vowel or syllable that drops (vacker, vackra; gammal, gamla), a different word altogether (liten, små), or an adjective that never changes (bra).',
  French: 'Set null when the word is predictable: a plural that adds -s (or a word already ending in -s, -x or -z, which does not change), and for an adjective a feminine that adds -e (or one already ending in -e). Otherwise give the forms that differ — an irregular plural, an irregular feminine, a second masculine form used before a vowel sound, or a word that never changes. Most French words get null.',
};

function isFormsNoteLanguage(studyLanguage: string): studyLanguage is FormsNoteLanguage {
  return studyLanguage === 'Swedish' || studyLanguage === 'French';
}

/**
 * The rule as a bullet and the matching line of the JSON shape, both with
 * their leading newline so a branch can append them after `posRule` and
 * `posJson`. Two empty strings on every language that has no note.
 */
export function formsNoteRule(studyLanguage: string, nativeLanguage: string): { rule: string; json: string } {
  if (!isFormsNoteLanguage(studyLanguage)) return { rule: '', json: '' };
  const examples = EXAMPLES[studyLanguage][nativeLanguage === 'Korean' ? 'Korean' : 'English'];
  return {
    rule: `\n- "formsNote": if the ${studyLanguage} word is a noun or an adjective, ONE short sentence in ${nativeLanguage} about how the forms of this particular word behave. ${SCOPE[studyLanguage]} Write the forms themselves in ${studyLanguage}, as plain text with no quotation marks or markdown. State facts about this word only: never explain how plurals, definiteness or agreement work in ${studyLanguage}, and never restate its gender. Set null for a verb, any other part of speech, and a multi-word entry. Examples: ${examples}`,
    json: `\n  "formsNote": "one short sentence in ${nativeLanguage}" | null,`,
  };
}
