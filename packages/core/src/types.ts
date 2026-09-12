import { isAllKana, markPitchAccent } from './pitchAccent';
import { kanaToHangul, kanaToRomaji, kikuyuToEnglish, kikuyuToHangul } from './transliterate';

/**
 * Traditional and Simplified Chinese are separate study languages rather than
 * one language with a script preference: the decks stay independent, so
 * neither constrains the other, and regional vocabulary differences go beyond
 * the glyphs. A Simplified deck would be its own registry entry.
 *
 * `Hanja` is the entry that most looks like it should have been a pack, and the
 * precedent cuts that way: kanji is a pack under Japanese, and so are both kana
 * packs. **What makes it an entry is the card, not the script.** A hanja card
 * holds three parts — the character, its 훈 (meaning) and its 음 (sound) — and
 * the learner chooses which of them is the front. 훈 and 음 have to be
 * addressable separately for that, and a pack cannot add a field. Traditional
 * vs Simplified is the precedent that fits: a script with its own collection.
 */
export type StudyLanguage =
  | 'Korean'
  | 'Swedish'
  | 'English'
  | 'French'
  | 'Japanese'
  | 'TraditionalChinese'
  | 'Spanish'
  | 'Kikuyu'
  | 'Swahili'
  | 'Hanja';

/**
 * i18n keys for the character-breakdown section heading. Every Han-script
 * language gets its own key because English names the script differently per
 * language (hanja / kanji / hanzi), even where Korean does not.
 */
export type CharacterSectionKey = 'sectionHanja' | 'sectionKanji' | 'sectionHanzi';
export type FieldLabelKey =
  | 'labelKorean'
  | 'labelEnglish'
  | 'labelSwedish'
  | 'labelFrench'
  | 'labelJapanese'
  | 'labelTraditionalChinese'
  | 'labelSpanish'
  | 'labelKikuyu'
  | 'labelSwahili'
  | 'labelHanja';

export type CardSideField =
  | 'korean'
  | 'swedish'
  | 'english'
  | 'french'
  | 'japanese'
  | 'traditionalChinese'
  | 'spanish'
  | 'kikuyu'
  | 'swahili'
  | 'hanja';

/**
 * Per-study-language configuration. Adding a language means adding an entry
 * here (plus its Gemini prompt branches in the API routes and i18n keys),
 * instead of growing per-language conditionals across the app.
 */
export interface StudyLanguageConfig {
  code: StudyLanguage;
  label: string;
  labelNative: string;
  /** Firestore collection holding this language's cards */
  collection: string;
  /**
   * BCP-47 tag for `Intl` APIs — word segmentation in `diff.ts` today.
   *
   * Separate from `ttsLanguageCode` rather than reusing it, because that field
   * answers a different question and gives a wrong answer here: Traditional
   * Chinese TTS is `cmn-TW`, which names the spoken variety, where `Intl` wants
   * `zh-TW`. Keeping them apart means neither has to compromise for the other.
   */
  locale: string;
  /** Field on cards/TermCore/ExamplePair holding the study-language text */
  studyField: CardSideField;
  /** i18n key for the study-side label */
  studyLabelKey: FieldLabelKey;
  /**
   * Section heading for the per-character breakdown, on languages written with
   * Han characters. Absent means the language has no characters to break down,
   * and the depth prompt leaves the section out entirely.
   */
  characterSectionKey?: CharacterSectionKey;
  /**
   * Google Cloud TTS language code + voice name for pronunciation audio, if
   * supported. Chirp 3: HD wherever the locale has one — `cmn-TW` doesn't, so
   * Traditional Chinese takes a WaveNet voice rather than a Mainland accent.
   */
  ttsLanguageCode?: string;
  ttsVoiceName?: string;
  /**
   * Voice for single-character text, where one is needed.
   *
   * Chirp 3: HD is generative, and on a lone character it intermittently
   * returns silence instead of audio — measured at 11/70 kana and 9/21 Korean
   * syllables, with a different set failing on each run. Two-character text was
   * clean (0/15), so the problem is specifically an utterance too short for the
   * model to commit to. The Neural2 voices returned silence 0/91 times on the
   * same inputs, so a single character is routed to one.
   *
   * Only set where single-character terms are a normal card: a lone kana or
   * hanja is the whole point of a kana pack and common in Korean, whereas a
   * one-letter French or Swedish term is not really a thing. Adding one for
   * those is a line here if that changes.
   */
  ttsShortVoiceName?: string;
}

export const STUDY_LANGUAGE_CONFIGS: Record<StudyLanguage, StudyLanguageConfig> = {
  Korean: {
    code: 'Korean',
    label: 'Korean',
    labelNative: '한국어',
    collection: 'cards',
    locale: 'ko',
    studyField: 'korean',
    studyLabelKey: 'labelKorean',
    characterSectionKey: 'sectionHanja',
    ttsLanguageCode: 'ko-KR',
    ttsVoiceName: 'ko-KR-Chirp3-HD-Charon',
    ttsShortVoiceName: 'ko-KR-Neural2-C',
  },
  Swedish: {
    code: 'Swedish',
    label: 'Swedish',
    labelNative: 'Svenska',
    collection: 'cards_swedish',
    locale: 'sv',
    studyField: 'swedish',
    studyLabelKey: 'labelSwedish',
    ttsLanguageCode: 'sv-SE',
    ttsVoiceName: 'sv-SE-Chirp3-HD-Charon',
  },
  French: {
    code: 'French',
    label: 'French',
    labelNative: 'Français',
    collection: 'cards_french',
    locale: 'fr',
    studyField: 'french',
    studyLabelKey: 'labelFrench',
    ttsLanguageCode: 'fr-FR',
    ttsVoiceName: 'fr-FR-Chirp3-HD-Charon',
  },
  Spanish: {
    code: 'Spanish',
    label: 'Spanish',
    labelNative: 'Español',
    collection: 'cards_spanish',
    locale: 'es',
    studyField: 'spanish',
    studyLabelKey: 'labelSpanish',
    // European Spanish, chosen the way `fr-FR` and `sv-SE` were: one deck per
    // registry entry, named for the variety it actually speaks. Latin American
    // Spanish is a real and larger-audience alternative (`es-US`, and vocabulary
    // differences well past the accent), and if it is ever wanted it follows the
    // Traditional/Simplified rule at the top of this file — its own entry with
    // its own collection, not a script or accent toggle on this one.
    ttsLanguageCode: 'es-ES',
    ttsVoiceName: 'es-ES-Chirp3-HD-Charon',
  },
  Kikuyu: {
    code: 'Kikuyu',
    label: 'Kikuyu',
    labelNative: 'Gĩkũyũ',
    collection: 'cards_kikuyu',
    // `ki` is the ISO 639-1 code, and `Intl.Segmenter` accepts it — verified,
    // because an unrecognised tag would silently fall back to the host locale
    // and mis-segment every writing diff.
    locale: 'ki',
    studyField: 'kikuyu',
    studyLabelKey: 'labelKikuyu',
    // **The first entry with no TTS at all**, which is why `ttsLanguageCode`
    // and `ttsVoiceName` were optional. Google Cloud TTS has no Kikuyu voice —
    // checked against the live voice list, not assumed: 2066 voices, 62
    // locales, and the only Bantu one is `sw-KE`. Swahili is the tempting
    // stand-in and it is the wrong one: it has no `ĩ`/`ũ` in its alphabet, so
    // the two vowels that distinguish Kikuyu words are exactly what it would
    // mispronounce. Silence beats confidently wrong pronunciation on a
    // learner's card. Both apps already hide the button when these are unset.
    //
    // No `gender` either — Kikuyu marks noun class, not gender, and the model
    // is not reliable enough to teach it. Measured on eight nouns: `mũndũ` and
    // `mũtĩ` came back right, `rũthiomi` came back with the Swahili plural
    // `ndimi` instead of `thiomi`. A wrong class on a card teaches wrong
    // agreement across every sentence the learner builds with it, so the field
    // is left off until something better than the model can fill it.
  },
  Swahili: {
    code: 'Swahili',
    label: 'Swahili',
    labelNative: 'Kiswahili',
    collection: 'cards_swahili',
    // `sw` is the ISO 639-1 code, and `Intl.Segmenter` accepts it — verified
    // the way `ki` was, because an unrecognised tag resolves silently to the
    // host locale instead of throwing, and every writing diff would mis-segment
    // with nothing to show that it had.
    locale: 'sw',
    studyField: 'swahili',
    studyLabelKey: 'labelSwahili',
    // `sw-KE` is the only Swahili locale Google Cloud TTS carries, so the
    // variety question the Spanish entry raises never arises here — there is no
    // `sw-TZ` to weigh Kenyan against, and nothing to name a second deck for.
    // It has 30 voices and every one of them is Chirp 3: HD, so this takes
    // `Charon` like the rest rather than the WaveNet fallback Traditional
    // Chinese needs. Checked against the live voice list, and synthesised:
    // `rafiki`, `kuandika` and `furaha` came back 6–8 kB, well clear of the
    // silence floor in `/api/pronounce`.
    ttsLanguageCode: 'sw-KE',
    ttsVoiceName: 'sw-KE-Chirp3-HD-Charon',
    // No `ttsShortVoiceName`: that field exists for languages where a lone
    // character is a normal card, as a kana or a hanja is. Swahili has no
    // one-letter words worth a card, so the Chirp 3: HD silence bug it works
    // around is unreachable here.
    //
    // No `gender`, for the reason it is off on Kikuyu one entry up: Swahili
    // marks noun class, not gender. It is the richer system of the two — class
    // drives agreement on verbs, adjectives and possessives alike — which makes
    // a wrong one more damaging on a card, not less. The Kikuyu probe is also
    // evidence *about* Swahili rather than merely next to it: the model reached
    // for Swahili noun morphology unprompted and got the Kikuyu word wrong with
    // it, which says the class system is what it pattern-matches, not what it
    // knows. Left off until something better than the model can fill it.
  },
  Japanese: {
    code: 'Japanese',
    label: 'Japanese',
    labelNative: '日本語',
    collection: 'cards_japanese',
    locale: 'ja',
    studyField: 'japanese',
    studyLabelKey: 'labelJapanese',
    characterSectionKey: 'sectionKanji',
    ttsLanguageCode: 'ja-JP',
    ttsVoiceName: 'ja-JP-Chirp3-HD-Charon',
    ttsShortVoiceName: 'ja-JP-Neural2-C',
  },
  TraditionalChinese: {
    code: 'TraditionalChinese',
    label: 'Chinese (Traditional)',
    labelNative: '繁體中文',
    collection: 'cards_chinese_traditional',
    locale: 'zh-TW',
    studyField: 'traditionalChinese',
    studyLabelKey: 'labelTraditionalChinese',
    characterSectionKey: 'sectionHanzi',
    // `cmn-TW` has no Chirp 3: HD voice, so this is WaveNet against
    // `cmn-CN-Chirp3-HD-Charon`: a Taiwanese accent in an older voice, or a
    // better voice with a Mainland one. Accent fidelity is the point of audio
    // on a Traditional deck, so the accent wins. Both read Traditional input
    // fine — the script was never the constraint.
    ttsLanguageCode: 'cmn-TW',
    ttsVoiceName: 'cmn-TW-Wavenet-A',
  },
  Hanja: {
    code: 'Hanja',
    label: 'Hanja',
    labelNative: '한자',
    // Its own collection, not `cards`. A hanja card is a different shape from a
    // Korean word card — three parts rather than a front and a gloss — and the
    // deck filters, progress rollups and pack enrolment all key on the
    // collection to keep the two from pooling.
    collection: 'cards_hanja',
    // `ko`, because a hanja card's text that `Intl` ever segments is Korean:
    // 훈, 음 and the 훈음 read together. The character itself is one grapheme
    // and segments the same under any locale.
    locale: 'ko',
    studyField: 'hanja',
    studyLabelKey: 'labelHanja',
    // No `characterSectionKey`, deliberately, even though this is the most
    // Han-script deck there is. That section answers "what is inside 여건" — it
    // breaks a word into its characters. A card whose front is already one
    // character has nothing to break down, and asking the depth prompt for it
    // would return the card back to itself. Korean keeps `sectionHanja` for the
    // question it does answer.
    //
    // **The button speaks the 음, never the glyph** — 수, not 水.
    //
    // Not a style preference. Handing 水 to a Korean voice does return audio
    // (6720 bytes, well clear of the silence floor, measured 2026-09-09), but
    // nothing about the response says *what it read*, and a card that teaches a
    // reading cannot be built on a guess about one. The 음 is a string this
    // card already holds and there is nothing to infer. `PronounceButton`
    // enforces it: on Hanja it renders only when it is given the 음, so a glyph
    // or a Han-script example can never reach the voice by omission.
    //
    // Every utterance here is therefore one syllable, which is exactly the case
    // `ttsShortVoiceName` exists for — Chirp 3: HD intermittently returns
    // silence on a lone character where Neural2 did not, 0/91 times. The
    // Chirp voice stays named for the multi-syllable text this deck does not
    // currently produce.
    ttsLanguageCode: 'ko-KR',
    ttsVoiceName: 'ko-KR-Chirp3-HD-Charon',
    ttsShortVoiceName: 'ko-KR-Neural2-C',
  },
  // English study pairs with Korean — the only non-English native language
  // supported today. A native-Korean learner's card back is Korean.
  English: {
    code: 'English',
    label: 'English',
    labelNative: 'English',
    collection: 'cards_english',
    locale: 'en',
    studyField: 'english',
    studyLabelKey: 'labelEnglish',
    ttsLanguageCode: 'en-US',
    ttsVoiceName: 'en-US-Chirp3-HD-Charon',
  },
};

export function getStudyLanguageConfig(studyLanguage?: StudyLanguage | string): StudyLanguageConfig {
  return STUDY_LANGUAGE_CONFIGS[studyLanguage as StudyLanguage] ?? STUDY_LANGUAGE_CONFIGS.Korean;
}

/** Which card slot holds the back, and how to name it. */
export interface BackSideConfig {
  /** Field holding the translation side of the card */
  backField: CardSideField;
  /** Language of the translation side */
  backLanguage: 'English' | 'Korean';
  /** i18n key for the back-side label */
  backLabelKey: FieldLabelKey;
}

/**
 * The back side belongs to the *pair* of languages, not to either one alone,
 * which is why this is separate from `getStudyLanguageConfig` rather than a
 * field on it: a Korean native studying Japanese wants a Korean back, but a
 * Korean native studying Korean cannot have one.
 *
 * Deliberately not named for its input. `getStudyLanguageConfig` is a real
 * lookup into `STUDY_LANGUAGE_CONFIGS`; there is no table keyed on native
 * language and there could not be one.
 *
 * The rule is just "your own language", with one escape hatch. Studying the
 * language you already speak is the only case where that collides with the
 * front of the card, and there the back falls to the other side — which
 * reproduces exactly what the old hardcoded table said for every pair.
 *
 * ⚠️ **Hanja is the one card this does not fully describe**, and the gap is
 * real rather than a bug to fix here. 水 is 물 수 to every reader: 훈음 is
 * Korean whatever language the learner speaks, and "water" is a *different
 * fact* about the character, not a translation of 물 수. So a hanja card's back
 * is 훈 + 음 always, and an English native gets an English gloss **in addition**
 * — decided by the user 2026-09-09 — rather than instead. This function still
 * answers correctly for the gloss slot (`english` for an English native), which
 * is all it is asked for until 훈 and 음 become fields of their own.
 */
export function getBackSideConfig(
  studyLanguage?: StudyLanguage | string,
  nativeLanguage?: string | null,
): BackSideConfig {
  const { studyField } = getStudyLanguageConfig(studyLanguage);
  const own: CardSideField = nativeLanguage === 'Korean' ? 'korean' : 'english';
  const backField = own !== studyField ? own : own === 'korean' ? 'english' : 'korean';
  return {
    backField,
    backLanguage: backField === 'korean' ? 'Korean' : 'English',
    backLabelKey: backField === 'korean' ? 'labelKorean' : 'labelEnglish',
  };
}

/**
 * Which part of a hanja card sits on the front. The other two fall to the back.
 *
 * **A display setting, not a scheduling axis** — decided by the user
 * 2026-09-09. Three parts split into a front and a back is six configurations,
 * and those six are exactly these three partitions × the two `ReviewDirection`s
 * that already exist. So `frontToBack` and `backToFront` keep meaning forward
 * and reverse, the union does not grow, and `sm2.ts`, `reviewQueue.ts` and
 * `offlineReview.ts` are untouched:
 *
 * | partition   | frontToBack        | backToFront        |
 * |-------------|--------------------|--------------------|
 * | `character` | 水 → 물 수          | 물 수 → 水          |
 * | `hun`       | 물 → 水 수          | 水 수 → 물          |
 * | `eum`       | 수 → 水 물          | 水 물 → 수          |
 *
 * ⚠️ **Chosen deck-level and left alone**, the way a study language is. The
 * accepted cost is that switching inherits intervals earned answering a
 * different question; choosing once is what keeps that small. **This control
 * does not belong in the review session**, where it would become a toggle and
 * make the inherited intervals meaningless. Partition-keyed tracking is
 * additive and can be layered on later if switching turns out to be common.
 */
export type HanjaPartition = 'character' | 'hun' | 'eum';

export const HANJA_PARTITIONS: readonly HanjaPartition[] = ['character', 'hun', 'eum'] as const;

/** 水 → 물 수, the question the 급수 exam actually asks. */
export const DEFAULT_HANJA_PARTITION: HanjaPartition = 'character';

export function isHanjaPartition(value: unknown): value is HanjaPartition {
  return typeof value === 'string' && (HANJA_PARTITIONS as readonly string[]).includes(value);
}

/**
 * A hanja card split into a front and a back, by partition.
 *
 * **The only place the three parts are ever joined.** They are stored apart
 * precisely because the split moves, so every surface that wants 훈음 as one
 * string comes through here rather than assembling its own — which is how the
 * two would drift into disagreeing about the separator.
 *
 * The back keeps the canonical 한자 · 훈 · 음 order whichever part was lifted
 * out of it, so 水 물 and 물 수 never appear as the same fact in two orders.
 *
 * **Falls back to the character partition on a card that cannot be split.**
 * Hanja cards saved before 훈 and 음 became fields carry the 훈음 assembled in
 * `korean` and nothing to take apart; asking one for the 훈 alone would show a
 * blank front. Answering the question the card *did* store is the only honest
 * option, and it is what a learner sees until that card is next enriched.
 */
export function hanjaFaces(
  card: Pick<TermCore, 'hanja' | 'hun' | 'eum' | 'korean'> & { term?: string },
  partition: HanjaPartition = DEFAULT_HANJA_PARTITION,
): { front: string; back: string } {
  const character = card.hanja || card.term || '';
  const hun = card.hun || '';
  const eum = card.eum || '';

  if (!hun || !eum) {
    return { front: character, back: [hun, eum].filter(Boolean).join(' ') || card.korean || '' };
  }

  const join = (...parts: string[]) => parts.filter(Boolean).join(' ');
  if (partition === 'hun') return { front: hun, back: join(character, eum) };
  if (partition === 'eum') return { front: eum, back: join(character, hun) };
  return { front: character, back: join(hun, eum) };
}

/**
 * The 훈음 as one string — 물 수.
 *
 * Written onto `korean` when a hanja card is saved, so every surface keyed on
 * the language pair (the card list, the detail modal, CSV and Anki export,
 * `getBackSide`) keeps working with no knowledge of partitions. **Derived,
 * never authored**: `hun` and `eum` are the stored truth and this is assembled
 * from them at the one point a card is written.
 */
export function hunEum(card: Pick<TermCore, 'hanja' | 'hun' | 'eum' | 'korean'>): string {
  return hanjaFaces(card, 'character').back;
}

// Example pairs — one side per language, see StudyLanguageConfig field names
export interface ExamplePair {
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  traditionalChinese?: string;
  spanish?: string;
  kikuyu?: string;
  swahili?: string;
  /**
   * A word the character appears in, not a sentence — an example of 독음, the
   * sound a hanja takes inside a word, which is the thing a 훈음 alone does not
   * tell you. 水 is 물 수 on its own and 수 in 수영.
   */
  hanja?: string;
  english: string;
}

/**
 * The parts of speech a card can be tagged with — one closed, language-generic
 * set, stored as a code and rendered through `partOfSpeechLabel()`.
 *
 * **A code, never display text**, and that is the whole point: "noun" on a card
 * has to read 명사 to a Korean native and Noun to an English one, and which of
 * those a reader wants can change after the card is saved. Storing the label
 * would mean either a Firestore migration on every native-language switch or a
 * second generated field per language — the problem the two back slots already
 * solved once, and a code solves outright because there is nothing to store per
 * reader. Unknown values never reach a card: `/api/explain` normalizes the
 * model's answer through `normalizePartOfSpeech` before it is returned.
 *
 * Language-generic on purpose. `particle` covers Korean 조사 and Japanese 助詞,
 * `counter` covers 単位/量詞, and no code names a language — the registry
 * warning at the top of this file applies here too, so don't add
 * `naAdjective` for Japanese. The i/na split is a real distinction and it is
 * deliberately not here: it belongs in the depth notes, where it can be
 * explained, rather than in a badge that would be blank for five of the six
 * decks.
 */
export const PART_OF_SPEECH_CODES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'determiner',
  'numeral',
  'preposition',
  'conjunction',
  'interjection',
  'particle',
  'counter',
  'affix',
  'phrase',
  'idiom',
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_CODES)[number];

/**
 * A model's part-of-speech answer as a code, or undefined if it isn't one.
 *
 * Tolerant of case and stray whitespace, and of the two shapes a model reaches
 * for when a closed list is not quite enough — "Noun (countable)" and
 * "noun/verb" both resolve to the first code named. Anything else is dropped
 * rather than stored: a card carrying `gerund` would render no badge at every
 * site anyway, and dropping it at the boundary keeps that from being a fact
 * about the UI.
 */
export function normalizePartOfSpeech(value: unknown): PartOfSpeech | undefined {
  if (typeof value !== 'string') return undefined;
  const first = value.toLowerCase().split(/[/,(]/)[0].trim();
  return (PART_OF_SPEECH_CODES as readonly string[]).includes(first)
    ? (first as PartOfSpeech)
    : undefined;
}

export interface TermCore {
  term: string;
  termLanguage: StudyLanguage;
  korean?: string;
  swedish?: string;
  french?: string;
  japanese?: string;
  traditionalChinese?: string;
  spanish?: string;
  kikuyu?: string;
  swahili?: string;
  hanja?: string;
  english: string;
  translation?: string;
  /**
   * The part of speech of the **study-language** word, not of `term`.
   *
   * Same rule as `getDepthTarget`: a learner who typed "awkward" into a Korean
   * deck is being shown a card whose front is 어색하다, and tagging that card
   * with English "awkward"'s adjective would describe the word they already
   * knew. Absent on every card saved before this field existed, and on pack
   * cards, which author no part of speech.
   */
  partOfSpeech?: PartOfSpeech;
  formality?: string;
  gender?: string; // grammatical gender: Swedish 'en'/'ett', French 'le'/'la'
  furigana?: string; // Japanese kana reading, present when the term contains kanji
  pinyin?: string; // Traditional Chinese reading, tone-marked
  /**
   * Japanese pitch accent as an アクセント核 position — `0` for 平板, otherwise
   * the mora after which the pitch falls. Unlike every other field on this
   * type it is **not** written by the model: `/api/explain` looks it up in a
   * dictionary, because Gemini scored 6/27 against the dictionary's 27/27 and
   * failed by flattening 雨/飴 and 花/鼻 into one accent. See
   * `apps/web/src/data/README.md`. Absent on cards saved before this shipped,
   * and on any word the dictionary does not carry.
   */
  pitchAccent?: number;
  /**
   * The two halves of a hanja's 훈음, stored apart and never as one string.
   *
   * 훈 is the character's native-Korean meaning (물), 음 is its Korean sound
   * (수); read together they are the 훈음, 물 수. They sit here beside `furigana`
   * and `pinyin` — parts of one card — rather than becoming `CardSideField`s,
   * which name the *languages* a card has sides in. Both of these are Korean.
   *
   * **Separate because the split moves.** The kanji pack can author one string
   * (`물 — みず / スイ`) because its back never changes shape; a hanja card's
   * front is whichever part the learner chose, so any pre-assembled 훈음 would
   * have to be taken apart again at review. `hanjaFaces()` is the only place
   * they are ever joined.
   */
  hun?: string;
  eum?: string;
  briefDefinition?: string;
}

export interface TermDepth {
  definition?: string;
  /**
   * Per-character breakdown for a Han-script term — what each character means
   * and how it reads inside this word. Not `hanja`: Korean, Japanese and
   * Chinese all want this section, and only one of them calls it hanja.
   */
  characterBreakdown?: string;
  notes?: string;
}

/**
 * The character breakdown to render.
 *
 * Korean cards saved before this field was generalized carried the breakdown as
 * `hanja`, and this read through to it rather than migrating them. That ended
 * when Hanja became a study language: `hanja` is now the *front* of a Hanja
 * card, and one name cannot mean the character and its own breakdown at once.
 * `migrate:legacy-hanja` moved those cards, so there is one field again.
 *
 * Still a function rather than a field read, because every caller renders the
 * section the same way and an empty string has to read as absent.
 */
export function getCharacterBreakdown(
  depth: Pick<TermDepth, 'characterBreakdown'>
): string | undefined {
  return depth.characterBreakdown || undefined;
}

export interface TermExplanation extends TermCore, TermDepth {
  examples?: ExamplePair[];
}

export interface DisambiguationMeaning {
  label: string;
  hint: string;
}

export interface TermAmbiguous {
  ambiguous: true;
  term: string;
  termLanguage: StudyLanguage;
  meanings: DisambiguationMeaning[];
}

/**
 * The spelling correction a lookup applied on the way to answering.
 *
 * Deliberately not a `TermCore` field: it describes the *lookup*, not the term,
 * and `TermCore` is spread wholesale onto a saved card — a card carrying
 * "this was once a typo" would be storing a detail about the day it was
 * created. `applySpellingCorrection` lifts it off before the client keeps
 * anything.
 */
export interface WithCorrection {
  /** The corrected spelling, or null/absent when nothing was corrected. */
  corrected?: string | null;
}

export type ExplainResult = (TermCore & WithCorrection) | (TermAmbiguous & WithCorrection);

// Flashcard / review types
export interface ReviewTracking {
  nextReview: Date | string;
  interval: number;
  ease: number;
  repetitions: number;
}

export interface Flashcard extends TermExplanation {
  id?: string;
  uid: string;
  createdAt: Date;
  archived?: boolean;
  studyLanguage?: StudyLanguage; // undefined = legacy Korean
  /**
   * The pack this card came from, when it came from one. Absent on every card
   * saved by looking a word up, and on every card saved before this field
   * existed — so it identifies provenance and must never be used to decide
   * whether a term is already saved. Deck progress matches on the study side
   * instead, which also credits a word you looked up on your own.
   *
   * A pack id, or `pack/section` when the card came from a subpack — which is
   * every card enrolled since subpacks landed, the whole-deck button included.
   * Never split it by hand: `parentPackId` and `resolvePackRef` in `packs.ts`
   * are the only two readers of that shape, and `getCollectionId` is the only
   * read of this field for grouping.
   */
  packId?: string;
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
  /** @deprecated Use frontToBack.nextReview or backToFront.nextReview instead */
  nextReview?: Date | string;
  /** @deprecated Use frontToBack.interval or backToFront.interval instead */
  interval?: number;
  /** @deprecated Use frontToBack.ease or backToFront.ease instead */
  ease?: number;
  /** @deprecated Use frontToBack.repetitions or backToFront.repetitions instead */
  repetitions?: number;
}

/** A card-shaped object carrying language side fields. */
export type CardSides = Partial<Record<CardSideField, string>> & {
  studyLanguage?: StudyLanguage;
  term?: string;
  translation?: string;
  /**
   * A hanja's 훈 and 음. Card fields rather than `CardSideField`s — those name
   * the *languages* a card has sides in, and these are two halves of one
   * Korean reading — but the side accessors below need them, because a hanja
   * card's Korean side is assembled from exactly these two.
   */
  hun?: string;
  eum?: string;
};

/** Returns the study-language side of a card. */
export function getStudyLangSide(card: CardSides): string {
  const config = getStudyLanguageConfig(card.studyLanguage);
  return card[config.studyField] || card.term || '';
}

/**
 * Returns the translation side of a card.
 *
 * Falls back to `english` because backs only became native-aware after people
 * had saved cards: every document written before that carries its back there
 * and nowhere else. A Korean native sees English on those rather than a blank
 * card, until the card is next saved and gains a Korean side.
 *
 * ⚠️ **`nativeLanguage` is required, and that is a fix rather than a style.**
 * It was optional, and omitting it does not fail — it quietly resolves to the
 * English back, because `getBackSideConfig` reads any non-Korean value as "not
 * a Korean native". Both card-detail modals dropped it and showed every Korean
 * native an English gloss on every deck, on a screen where the correct text was
 * two lines away in the same function. A required parameter turns that from a
 * wrong answer into a compile error.
 */
export function getBackSide(card: CardSides, nativeLanguage: string | null | undefined): string {
  const { backField } = getBackSideConfig(card.studyLanguage, nativeLanguage);
  // A hanja's Korean side is its 훈음, and the lookup returns that as two
  // fields rather than one string — deliberately, since either half can be the
  // front. `buildFlashcardDoc` assembles it at save time, so without the same
  // assembly here every surface *before* the save is the one place a hanja card
  // has no Korean back, and falls through to the English gloss instead.
  if (card.studyLanguage === 'Hanja' && backField === 'korean') {
    const assembled = hunEum(card);
    if (assembled) return assembled;
  }
  return card[backField] || card.english || card.translation || '';
}

/**
 * The back-side text of a term that was just looked up.
 *
 * Card-shaped `getBackSide` cannot serve this: a `TermCore` carries
 * `termLanguage` — the language the user typed in — where a card carries
 * `studyLanguage`, so the pair has to be passed rather than read off the value.
 * The `english` fallback is the same one and exists for a sharper reason here:
 * nothing guarantees the model filled the native slot. An API deployment older
 * than this code will not, and the term must still show a translation.
 */
export function getTermBackSide(
  core: CardSides,
  studyLanguage?: StudyLanguage,
  nativeLanguage?: string | null
): string {
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  // A hanja's Korean side is its 훈음, and the lookup returns that as two
  // fields rather than one string — deliberately, since either half can be the
  // front. `buildFlashcardDoc` assembles it at save time, so without the same
  // assembly here every surface *before* the save is the one place a hanja card
  // has no Korean back, and falls through to the English gloss instead.
  if (studyLanguage === 'Hanja' && backField === 'korean') {
    const assembled = hunEum(core);
    if (assembled) return assembled;
  }
  return core[backField] || core.english || core.translation || '';
}

/** Returns the study-language text from an example pair. */
export function getExampleStudyLangText(ex: ExamplePair, studyLanguage?: StudyLanguage): string {
  if (studyLanguage) return ex[getStudyLanguageConfig(studyLanguage).studyField] ?? '';
  return ex.korean ?? ex.swedish ?? '';
}

/**
 * The pronunciation aid shown as a badge beside a term.
 *
 * Two things share one badge, in the order a learner needs them: the **reading**
 * (Japanese furigana, with its pitch drop marked; Traditional Chinese pinyin)
 * and then the **transliteration** — the term respelled in the script the
 * reader already uses. `すし · sushi` for an English native, `すし · 스시` for a
 * Korean one, off the same card.
 *
 * The transliteration is why this now takes `nativeLanguage`. Every other field
 * on a card is a fact about the word; this one is a fact about who is looking
 * at it, so it cannot be stored and must be derived per reader. It is also why
 * Kikuyu gets a badge at all, having neither furigana nor pinyin: for Kikuyu
 * the respelling *is* the whole aid, since no TTS voice exists for the language
 * and its spelling hides real sounds (`c` is /ʃ~tʃ/, never /k/).
 *
 * Deriving rather than storing means it needs no backfill and works on every
 * card already saved — the opposite trade from `pitchAccent`, which has to be
 * looked up because accent cannot be read off the spelling.
 *
 * A card only ever carries the fields belonging to its own language, so the
 * next reading-bearing language is one branch here rather than a conditional at
 * each of the six render sites.
 */
export function getReading(
  card: Pick<TermCore, 'furigana' | 'pinyin' | 'pitchAccent' | 'japanese' | 'kikuyu'>,
  studyLanguage?: StudyLanguage,
  nativeLanguage?: string | null
): string | undefined {
  const isKorean = nativeLanguage === 'Korean';

  const kana = card.furigana || (card.japanese && isAllKana(card.japanese) ? card.japanese : '');
  if (kana) {
    const reading = markPitchAccent(kana, card.pitchAccent);
    const transliteration = isKorean ? kanaToHangul(kana) : kanaToRomaji(kana);
    // The transliteration is dropped when it would only repeat the reading,
    // which is what a Korean native sees on a word already written in kana.
    return transliteration && transliteration !== reading
      ? `${reading} · ${transliteration}`
      : reading;
  }

  if (studyLanguage === 'Kikuyu' && card.kikuyu) {
    return (isKorean ? kikuyuToHangul : kikuyuToEnglish)(card.kikuyu) || undefined;
  }

  return card.pinyin || undefined;
}

/** Splits an example pair into its study-language and translation sides. */
export function getExampleSides(
  ex: ExamplePair,
  studyLanguage?: StudyLanguage,
  nativeLanguage?: string | null
): { study: string; back: string } {
  const { studyField } = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  return { study: ex[studyField] ?? '', back: ex[backField] ?? ex.english ?? '' };
}

/**
 * Returns the term that depth/examples calls should elaborate on.
 * Digging deeper must always target the study-language word: if the user
 * typed the term in another language (termLanguage !== studyLanguage),
 * the interesting word is the study-language translation, not the term
 * they already understand.
 */
export function getDepthTarget(
  core: Pick<
    TermCore,
    | 'term'
    | 'termLanguage'
    | 'korean'
    | 'swedish'
    | 'french'
    | 'japanese'
    | 'traditionalChinese'
    | 'spanish'
    | 'kikuyu'
    | 'swahili'
    | 'hanja'
    | 'english'
    | 'briefDefinition'
  >,
  studyLanguage: StudyLanguage = 'Korean',
  nativeLanguage?: string | null
): { term: string; termLanguage: string; translation?: string; briefDefinition?: string } {
  const config = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  // Pass the already-resolved sense along: for polysemous terms (pack context
  // hints, disambiguation picker, "not what you meant") depth/examples must
  // elaborate on the meaning the user chose, not whichever sense Gemini
  // reaches for first.
  const sense = {
    translation:
      core[backField] || core.english || (core.termLanguage !== studyLanguage ? core.term : undefined),
    briefDefinition: core.briefDefinition,
  };
  if (core.termLanguage !== studyLanguage) {
    const studySide = core[config.studyField];
    if (studySide) return { term: studySide, termLanguage: studyLanguage, ...sense };
  }
  return { term: core.term, termLanguage: core.termLanguage, ...sense };
}

// Word of the day — daily featured term on the Learn screen
export interface WordOfTheDay {
  term: string; // study-language word
  english: string;
  /**
   * The Korean side. Named for English study because that is the only deck
   * where it is the *front*'s counterpart, but it is filled on every deck a
   * Korean native studies — `/api/word-of-the-day` asks for both sides
   * whenever the back is Korean. Absent only on documents written before backs
   * became native-aware, which is what `wordOfTheDayCore` falls back for.
   */
  korean?: string;
  briefDefinition?: string;
  partOfSpeech?: PartOfSpeech; // every language
  formality?: string; // Korean
  gender?: string; // Swedish/French
  furigana?: string; // Japanese
  pitchAccent?: number; // Japanese, looked up rather than generated
  pinyin?: string; // Traditional Chinese
  /**
   * The explanation to show when the card is tapped, generated and stored
   * alongside the word so the tap is a read rather than a second, independently
   * worded Gemini call. Absent on documents written before this was added —
   * use `wordOfTheDayCore()`, which reconstructs it from the fields above.
   */
  core?: TermCore;
}

/**
 * The three lines a lookup result shows: the headword, the side under it, and
 * the gloss that sometimes rides beside that side.
 *
 * Shared because both apps render this identically, and because rendering the
 * same fact twice is how three separate "Korean native sees English" bugs got
 * in on 2026-09-09. `buildLookupCardDraft` decides what the *card* will be;
 * this decides what the screen above the save button says, and the two have to
 * agree or the save is a surprise.
 *
 * **On Hanja the headword is the character, whichever half was typed.** Type 물
 * and the answer is 水 with 물 수 behind it — not 물 with 水 as its
 * "translation", which is what a term-leads rule produces on a character deck.
 */
export function lookupCardFaces(
  core: TermCore,
  studyLanguage: StudyLanguage,
  nativeLanguage?: string | null,
): { headword: string; back: string; gloss?: string } {
  const { studyField } = getStudyLanguageConfig(studyLanguage);

  if (studyLanguage === 'Hanja') {
    return {
      headword: core.hanja || core.term,
      back: hunEum(core),
      // 훈음 is Korean for every reader, so an English native gets the gloss
      // *beside* it rather than instead of it.
      gloss: nativeLanguage === 'Korean' ? undefined : core.english || undefined,
    };
  }

  const back = (core.termLanguage === studyLanguage
    ? getTermBackSide(core, studyLanguage, nativeLanguage)
    : (core as CardSides)[studyField]) || core.translation || '';
  return { headword: core.term, back };
}

/**
 * The `TermCore` a word of the day represents, so tapping the card can show an
 * explanation without regenerating one. Prefers the stored `core`; falls back
 * to assembling the fields the word of the day always carries.
 */
export function wordOfTheDayCore(
  wotd: WordOfTheDay,
  studyLanguage: StudyLanguage,
  nativeLanguage?: string | null
): TermCore {
  if (wotd.core) return wotd.core;
  const config = getStudyLanguageConfig(studyLanguage);
  const { backField } = getBackSideConfig(studyLanguage, nativeLanguage);
  const core: Record<string, unknown> = {
    term: wotd.term,
    termLanguage: studyLanguage,
    english: config.studyField === 'english' ? wotd.term : wotd.english,
    [config.studyField]: wotd.term,
    // `korean` may be absent on a word of the day generated before backs became
    // native-aware; the English side is what those documents have.
    [backField]: (backField === 'korean' ? wotd.korean : wotd.english) ?? wotd.english,
    briefDefinition: wotd.briefDefinition,
    partOfSpeech: wotd.partOfSpeech,
    formality: wotd.formality,
    gender: wotd.gender,
    furigana: wotd.furigana,
    pitchAccent: wotd.pitchAccent,
    pinyin: wotd.pinyin,
  };
  // A field the model left out must be dropped, not carried as undefined:
  // this object is written to Firestore, which rejects undefined values.
  for (const key of Object.keys(core)) {
    if (core[key] === undefined) delete core[key];
  }
  return core as unknown as TermCore;
}

// User types

/**
 * One language the learner has added, and the language it is explained in.
 *
 * ⚠️ **`native` here is not the interface language**, and keeping those two
 * apart is the whole point of this type. Before it, one `nativeLanguage` field
 * did three jobs at once: it picked the card's back slot, it was interpolated
 * into every `/api/explain` prompt, and it chose the language of the app's own
 * chrome. Those are not the same question. Someone who reads Korean well can
 * want Japanese explained in Korean while still running Amgi in English, and
 * with one field that was unsayable.
 *
 * So `native` answers only the first two — **the back slot and the
 * explanations** — and the chrome moved to `UserPreferences.interfaceLanguage`.
 *
 * **One entry per study language**, which is forced rather than chosen: cards
 * shard into one collection per study language (`cards_japanese`), so there is
 * nowhere to put a second Japanese deck explained in a different language.
 * `addLanguagePair` replaces rather than appends for that reason.
 *
 * **`native` is never the study language itself.** `nativeOptionsFor` filters
 * it out at the point of choosing, which is what makes "studying Korean,
 * explained in Korean" unreachable rather than merely discouraged. Legacy data
 * that says otherwise still renders: `getBackSideConfig` has always fallen to
 * the other side in that case, so nothing has to be repaired on read.
 */
export interface StudyLanguagePair {
  study: StudyLanguage;
  /** The language this deck's card backs and explanations are written in. */
  native: string;
}

export interface UserPreferences {
  /**
   * @deprecated Read `interfaceLanguage` for chrome and `languages` for a
   * deck's explanation language. Kept on the document because it is what every
   * account written before 2026-09-12 has, and it is the seed both of those
   * migrate from — see `seedLanguagePairs`. Still written on first run so an
   * older build reading this account does not see an unset language.
   */
  nativeLanguage: string;
  /**
   * The languages the learner has added, each with the language it is
   * explained in. Absent on an account written before this existed, which is
   * what `seedLanguagePairs` fills in.
   */
  languages?: StudyLanguagePair[];
  /**
   * What Amgi speaks to the user in — nav, buttons, settings copy, reminders.
   *
   * Its own field rather than a per-deck value because there is only ever one
   * of it on screen. Switching decks therefore cannot change it, which is what
   * retires the confirmation dialog that used to warn the interface was about
   * to move.
   */
  interfaceLanguage?: string;
  studyLanguage?: StudyLanguage;
  /**
   * Which part of a hanja card sits on the front. Absent means
   * `DEFAULT_HANJA_PARTITION` — the question the exam asks.
   *
   * One setting rather than one per deck, matching how the study language
   * itself is stored: there is a single Hanja deck, and a learner who has
   * chosen how they want to be asked has chosen it for that deck.
   */
  hanjaPartition?: HanjaPartition;
  streak?: number;
  longestStreak?: number;
  lastReviewDate?: string; // 'YYYY-MM-DD' in local timezone
  reviewedToday?: number;
  /**
   * The day the one-off `mature` backfill completed, `YYYY-MM-DD`.
   *
   * `mature` is written by every rating from 2026-09-12, but a card not rated
   * since carries no flag — and those are exactly the long-interval cards a
   * "cards learned" count is mostly made of. So the flag is backfilled once
   * from the intervals already on the documents. Unlike a daily rollup, this
   * *can* be backfilled: the interval is current state, not a past event.
   *
   * Recorded here rather than inferred, because the alternative is re-reading
   * every card in ten collections on every visit to find out whether it is
   * needed. Absent means it has not run for this account.
   */
  matureBackfillAt?: string;
}

export const SUPPORTED_NATIVE_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Korean', label: '한국어' },
] as const;

export const SUPPORTED_STUDY_LANGUAGES: { code: StudyLanguage; label: string; labelNative: string }[] =
  Object.values(STUDY_LANGUAGE_CONFIGS).map(({ code, label, labelNative }) => ({ code, label, labelNative }));

/**
 * Every card collection, paired with the language it holds.
 *
 * Cards shard per language — the collection name *is* the routing — so any
 * question about the whole deck rather than the current language has to visit
 * all of them. Derived from the registry rather than listed by hand, so a tenth
 * language is not a list someone forgets to update.
 */
export const CARD_COLLECTIONS: { code: StudyLanguage; collection: string }[] =
  Object.values(STUDY_LANGUAGE_CONFIGS).map(({ code, collection }) => ({ code, collection }));

// Backward compat alias used by existing UI code
export const SUPPORTED_LANGUAGES = SUPPORTED_NATIVE_LANGUAGES;

export function isStudyLanguage(value: unknown): value is StudyLanguage {
  return typeof value === 'string' && value in STUDY_LANGUAGE_CONFIGS;
}

export function isNativeLanguage(value: unknown): boolean {
  return SUPPORTED_NATIVE_LANGUAGES.some((l) => l.code === value);
}

/**
 * The languages a deck can be explained in, for a given study language.
 *
 * The study language itself is filtered out, and that single line is what
 * makes the collision the old `resolveStudyLanguage`/`resolveNativeLanguage`
 * pair existed to clean up **unreachable instead of corrected**. Those two
 * functions are gone with this: they moved a global native language off a
 * collision after the fact, and there is no global native language any more.
 */
export function nativeOptionsFor(
  studyLanguage: StudyLanguage,
): readonly { code: string; label: string }[] {
  return SUPPORTED_NATIVE_LANGUAGES.filter(l => l.code !== studyLanguage);
}

/** The study languages not yet added — what the add flow offers. */
export function availableStudyLanguages(
  pairs: readonly StudyLanguagePair[],
): typeof SUPPORTED_STUDY_LANGUAGES {
  return SUPPORTED_STUDY_LANGUAGES.filter(
    lang => !pairs.some(pair => pair.study === lang.code),
  );
}

/**
 * The language one deck is explained in.
 *
 * Falls back to English rather than throwing on a study language that is not in
 * the list. A switcher only ever offers added languages, so reaching this means
 * something raced — a deck removed on another device while this one was on it —
 * and an English explanation is a better answer than a crash. It is also
 * exactly what `getBackSideConfig` reads a missing value as, so the back slot
 * and the explanation stay in agreement.
 */
export function nativeForStudy(
  pairs: readonly StudyLanguagePair[],
  studyLanguage: StudyLanguage,
): string {
  return pairs.find(pair => pair.study === studyLanguage)?.native ?? 'English';
}

/**
 * Add a language, or change the one an existing deck is explained in.
 *
 * Replaces rather than appends on a study language already present, because
 * cards shard one collection per study language and a second entry would point
 * at the same cards with a different back slot.
 */
export function addLanguagePair(
  pairs: readonly StudyLanguagePair[],
  pair: StudyLanguagePair,
): StudyLanguagePair[] {
  const without = pairs.filter(existing => existing.study !== pair.study);
  return [...without, pair];
}

/** Drop a deck from the switcher. The cards are untouched — see the copy. */
export function removeLanguagePair(
  pairs: readonly StudyLanguagePair[],
  studyLanguage: StudyLanguage,
): StudyLanguagePair[] {
  return pairs.filter(pair => pair.study !== studyLanguage);
}

/**
 * Pairs off a Firestore document, dropping anything unrecognisable.
 *
 * Tolerant on purpose: this reads a field other builds and other versions have
 * written, and one bad row must not cost the user every deck they have. A
 * language removed from the registry simply stops appearing.
 */
export function parseLanguagePairs(value: unknown): StudyLanguagePair[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<StudyLanguage>();
  const pairs: StudyLanguagePair[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { study, native } = entry as { study?: unknown; native?: unknown };
    if (!isStudyLanguage(study) || seen.has(study)) continue;
    if (typeof native !== 'string' || !isNativeLanguage(native)) continue;
    seen.add(study);
    pairs.push({ study, native });
  }
  return pairs;
}

/**
 * The language list for an account written before language lists existed.
 *
 * ⚠️ **Seeded from the decks that hold cards, not from the current study
 * language alone.** Every existing account has cards in however many
 * collections it has used, and the switcher now shows only added languages — so
 * seeding from `studyLanguage` by itself would hide every other deck the user
 * has been studying for months behind an Add flow they have no reason to think
 * they need. The cards were never deleted, but a deck you cannot reach is
 * indistinguishable from one you have lost.
 *
 * All of them inherit the old global `nativeLanguage`, which is the honest
 * reading: it is the language every one of those decks has in fact been
 * explained in until now.
 *
 * `withCards` is the study languages holding at least one card. The current
 * study language is included whether or not it has any, so a brand-new deck
 * someone just switched to does not vanish from under them.
 */
export function seedLanguagePairs(
  prefs: Pick<UserPreferences, 'nativeLanguage' | 'studyLanguage'>,
  withCards: readonly StudyLanguage[],
): StudyLanguagePair[] {
  const native = isNativeLanguage(prefs.nativeLanguage) ? prefs.nativeLanguage : 'English';
  const studyLanguages = new Set<StudyLanguage>(withCards);
  if (prefs.studyLanguage) studyLanguages.add(prefs.studyLanguage);
  // Nothing at all to go on — a document with a native language and no deck.
  // The current study language defaults to Korean everywhere else, so it does
  // here too rather than leaving someone with an empty switcher.
  if (studyLanguages.size === 0) studyLanguages.add('Korean');

  return SUPPORTED_STUDY_LANGUAGES
    .filter(lang => studyLanguages.has(lang.code))
    .map(lang => ({ study: lang.code, native }));
}

/*
 * `resolveStudyLanguage` and `resolveNativeLanguage` lived here until
 * 2026-09-12, and they are gone rather than deprecated.
 *
 * Both existed to repair one collision — the learner ending up studying the
 * language Amgi was speaking to them in — *after* it had happened, by moving
 * the other setting out from under them. That was the only repair available
 * while a single global `nativeLanguage` had to serve every deck at once.
 *
 * With a native language per deck the collision has nowhere to occur:
 * `nativeOptionsFor` drops the study language from the options at the moment
 * of choosing, so no pair can be built that needs correcting. The interface
 * language is now independent of every deck, so switching decks cannot move it
 * either — which also retires the confirmation dialog those functions made
 * necessary.
 *
 * Deleted rather than kept for legacy data: nothing reads a stored collision
 * through them. `getBackSideConfig` has always fallen to the other side when
 * the back would land on the front, so an old document saying "native Korean,
 * studying Korean" still renders correctly with no repair pass.
 */
