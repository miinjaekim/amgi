import { getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

/**
 * The character-breakdown instruction for the depth prompt, or null for a
 * language that isn't written with Han characters.
 *
 * For a Han-script word the most useful thing to know is what each character
 * means and how it reads *inside this word* — but each language names that
 * reading differently, so the instruction is per language rather than one
 * generic "explain the characters". Korean gets the hun-eum (훈음) it always
 * had; Japanese needs on'yomi vs kun'yomi, which is the whole difficulty of
 * reading kanji; Mandarin needs per-character pinyin with tones.
 *
 * Lives here rather than inside either route because `/depth` and
 * `/depth-stream` ask for the same content in two envelopes (JSON vs. marker
 * sections), and the wording is exactly what drifts when it's written twice.
 * Callers append their own "otherwise ..." clause, since that part is the
 * envelope's business.
 */
export function characterBreakdownInstruction(studyLanguage: StudyLanguage): string | null {
  switch (getStudyLanguageConfig(studyLanguage).code) {
    case 'Korean':
      return 'if the term is Korean and has meaningful hanja roots, provide the breakdown. For each character include its traditional Korean hun-eum (훈음) reading — the native-Korean meaning plus the sound, e.g. 水 is "물 수" — alongside the English gloss (e.g. "葛藤: 葛 갈 (칡 갈 — kudzu vine) + 藤 등 (등나무 등 — wisteria vine) → entanglement, conflict").';
    case 'Japanese':
      return 'if the term contains kanji, break it down character by character. For each kanji give the reading it takes in this specific word, labelled on\'yomi or kun\'yomi, plus what the character itself means (e.g. "図書館: 図 と (kun) — diagram, plan + 書 しょ (on) — write, book + 館 かん (on) — large building → a building of books, a library"). A term written entirely in hiragana or katakana has no characters to break down.';
    case 'TraditionalChinese':
      return 'break the term down character by character. For each character give its pinyin with the tone mark it takes in this word, plus what the character means on its own (e.g. "電腦: 電 diàn — electricity + 腦 nǎo — brain → computer"). Write every character in Traditional form. For a single-character term, explain the character and one or two common compounds it forms.';
    default:
      return null;
  }
}
