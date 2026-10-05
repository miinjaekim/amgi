import type { TextStyle } from 'react-native';
import { isRtlText } from '@amgi/core';

const RTL_LINE: TextStyle = { writingDirection: 'rtl', textAlign: 'right', flexGrow: 1 };
const RTL_INLINE: TextStyle = { writingDirection: 'rtl' };

/**
 * Style for a line that stands on its own — an example sentence, a row in My
 * Cards, a field being typed into. Right to left and right-aligned when the
 * text is Arabic, nothing otherwise.
 *
 * The interface itself is never mirrored; only the line of Arabic turns. It
 * grows to fill its row because a `Text` is otherwise as wide as its words,
 * and right-aligning inside that changes nothing.
 */
export function rtlLine(text: string | null | undefined): TextStyle | null {
  return isRtlText(text) ? RTL_LINE : null;
}

/**
 * For text whose place is set by its container — a review card's centred face,
 * a headword beside its badges. Direction only, so punctuation lands at the
 * right end without the layout moving.
 */
export function rtlInline(text: string | null | undefined): TextStyle | null {
  return isRtlText(text) ? RTL_INLINE : null;
}
