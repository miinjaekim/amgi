import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import type { TextStyle } from 'react-native';
import { diffText, getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * One text with the corrections marked in place, rather than two texts to look
 * between. Native counterpart of the web `TextDiff`.
 *
 * Nested `<Text>` rather than a row of views: RN only reflows text across lines
 * when the pieces are children of a single `<Text>`, so a flex-wrapped row of
 * word views would break mid-sentence at the wrong places and lose the shared
 * baseline. The tradeoff is that each segment styles only what `<Text>` can —
 * colour and `textDecorationLine`, which is all this needs.
 */
export default function TextDiff({
  before,
  after,
  studyLanguage,
  style,
}: {
  before: string;
  after: string;
  studyLanguage: StudyLanguage;
  style?: TextStyle;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { locale } = getStudyLanguageConfig(studyLanguage);
  // Quadratic in the token count, and both texts are stable once a review has
  // come back — so not on every render.
  const segments = useMemo(() => diffText(before, after, locale), [before, after, locale]);

  return (
    <Text style={[s.base, style]}>
      {segments.map((segment, i) => (
        <Text
          key={i}
          style={
            segment.op === 'remove' ? s.removed
              : segment.op === 'add' ? s.added
                : s.same
          }
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    base: { fontSize: 17, lineHeight: 26 },
    same: { color: C.text },
    removed: { color: C.error, textDecorationLine: 'line-through' },
    added: { color: C.highlight, fontWeight: '700' },
  });
}
