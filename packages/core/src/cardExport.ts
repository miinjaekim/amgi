import {
  getBackSide, getCharacterBreakdown, getExampleSides, getStudyLangSide,
  getStudyLanguageConfig, nativeForStudy,
} from './types';
import type { Flashcard, StudyLanguagePair } from './types';
import { partOfSpeechLabel } from './i18n';

/**
 * Every card you own, as a file you can take elsewhere.
 *
 * ⚠️ **Everything, every language, archived included.** This used to live on
 * My Cards and export exactly the filtered list on screen. It moved to
 * Settings → Your data on 2026-09-25, which is what the privacy policy and the
 * delete-account warning point to: "take a copy before you go". A copy that
 * quietly leaves out a language you removed from the switcher, or the cards you
 * archived, is not a copy. So callers pass every collection's cards, and
 * nothing here filters.
 *
 * One builder for both platforms, since web and mobile each had their own
 * copy of the loops and had already drifted in how they found the study side.
 *
 * Each card's back is written in the language its own deck is explained in.
 * `nativeForStudy` falls back to English for a language no longer on the list,
 * which is also where `getBackSide` itself falls back.
 */

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

const savedDate = (c: Flashcard) =>
  c.createdAt instanceof Date && !isNaN(c.createdAt.getTime()) ? c.createdAt.toISOString().slice(0, 10) : '';

/**
 * One row per card, with a Language column. The front and back headers are
 * generic now that one file holds several languages; the old per-language
 * headers ("Korean", "English") would have been wrong for every other row.
 */
export function cardsToCSV(cards: readonly Flashcard[], pairs: readonly StudyLanguagePair[]): string {
  const rows = [['Language', 'Front', 'Back', 'Part of speech', 'Formality', 'Definition', 'Characters', 'Notes', 'Examples', 'Saved', 'Status']];
  for (const c of cards) {
    const native = nativeForStudy(pairs, c.studyLanguage ?? 'Korean');
    const examples = c.examples?.map(e => {
      const sides = getExampleSides(e, c.studyLanguage, native);
      return `${sides.study} / ${sides.back}`;
    }).join(' | ') ?? '';
    rows.push([
      getStudyLanguageConfig(c.studyLanguage).label,
      getStudyLangSide(c),
      getBackSide(c, native),
      // The label, not the code: the column is read by a person, and it is the
      // same word the badge showed them.
      partOfSpeechLabel(native, c) || '',
      c.formality || '',
      c.definition || '',
      getCharacterBreakdown(c) || '',
      c.notes || '',
      examples,
      savedDate(c),
      c.archived ? 'archived' : 'active',
    ]);
  }
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}

/**
 * Anki's plain-text import, one subdeck per language (`Amgi::Korean`) through
 * the `#deck column` header, so importing it does not pour every language into
 * one deck. Archived cards come too, for the reason at the top of this file.
 */
export function cardsToAnki(cards: readonly Flashcard[], pairs: readonly StudyLanguagePair[]): string {
  const lines = ['#separator:Tab', '#html:false', '#notetype:Basic', '#deck column:1'];
  for (const c of cards) {
    const native = nativeForStudy(pairs, c.studyLanguage ?? 'Korean');
    const backParts = [getBackSide(c, native)];
    if (c.briefDefinition) backParts.push(c.briefDefinition);
    else if (c.definition) backParts.push(c.definition);
    // Tabs and newlines would break the row; the rest is plain text.
    const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ');
    const deck = `Amgi::${getStudyLanguageConfig(c.studyLanguage).label}`;
    lines.push([deck, getStudyLangSide(c), backParts.join(' — ')].map(clean).join('\t'));
  }
  return lines.join('\n');
}
