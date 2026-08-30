/**
 * Japanese pitch accent, rendered onto a kana reading.
 *
 * The card stores the accent as a **position**, not as a marked string — the
 * アクセント核: `0` for 平板 (no drop), otherwise the mora after which the pitch
 * falls. Storing the datum rather than the notation is what lets the badge
 * change shape later without a backfill, and every card written before this
 * shipped simply has no position and keeps showing bare furigana.
 *
 * Where the number comes from is in `apps/web/src/data/README.md`, and it is
 * the one reading field on any language that is **not** filled by the model:
 * measured 6/27 against 27/27 for the dictionary, and wrong in the specific way
 * that erases 雨/飴 and 花/鼻.
 */

/**
 * Splits kana into morae, which is the unit an accent position counts.
 *
 * Not the same as splitting into characters, and the difference is not an edge
 * case: きょう is two morae (きょ + う), so 今日 [1] drops after きょ. Counting
 * characters would put the fall inside the ようおん and mark the wrong syllable.
 * ん, っ and ー are each their own mora, which is why they are absent here —
 * only the small kana bind leftwards.
 */
const SMALL_KANA = new Set([...'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ']);

export function splitMorae(kana: string): string[] {
  const morae: string[] = [];
  for (const ch of kana) {
    if (SMALL_KANA.has(ch) && morae.length > 0) morae[morae.length - 1] += ch;
    else morae.push(ch);
  }
  return morae;
}

/** The mark placed at the point the pitch falls. */
export const DROP_MARK = '＼';

/**
 * A kana reading with the pitch drop marked — は＼し for 箸, はし＼ for 橋,
 * はし for 端.
 *
 * Returns the reading unchanged for 平板 (`0`), which is correct rather than
 * lazy: 平板 *is* the absence of a drop, so an unmarked reading is the
 * notation, not a missing one.
 *
 * A position past the end of the word marks nothing. That case is 尾高 —
 * 花 は_な is `2` on a two-mora word — where the fall lands on the particle
 * that follows rather than inside the word. In isolation 花 and 鼻 genuinely
 * sound alike, so a trailing mark is the honest rendering: it says the drop is
 * there without inventing a mora to put it on.
 */
export function markPitchAccent(kana: string, accentPosition: number | undefined): string {
  if (!kana || accentPosition === undefined || accentPosition === null) return kana;
  if (!Number.isInteger(accentPosition) || accentPosition < 0) return kana;
  if (accentPosition === 0) return kana;
  const morae = splitMorae(kana);
  if (accentPosition > morae.length) return kana;
  return morae.slice(0, accentPosition).join('') + DROP_MARK + morae.slice(accentPosition).join('');
}

/** True when a string is written entirely in kana (so it is already its own reading). */
export function isAllKana(text: string): boolean {
  return text.length > 0 && /^[぀-ゟ゠-ヿーー]+$/.test(text);
}
