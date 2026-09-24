import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { getStudyLanguageConfig, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * The study language, at the right end of a title row.
 *
 * Both modes show one language at a time — Munli's verb tables, Amgi's cards
 * and packs — so each screen says which one it is showing. Munli's first, and
 * Amgi's since 2026-09-25, which is why it lost the `Munli` from its name.
 *
 * A label, not a switcher. Neither Progress carries it: Munli's has the switcher
 * in `ProgressHeader`, and Amgi's covers every language at once.
 *
 * `marginLeft: 'auto'` pushes it to the end of whatever row it is dropped
 * into, so a header needs no layout of its own to hold it.
 */
export default function StudyLanguageChip() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const language = getStudyLanguageConfig(studyLanguage).label;

  return (
    <Text
      style={s.chip}
      numberOfLines={1}
      accessibilityLabel={t(interfaceLanguage, 'studyLanguageChipLabel', { language })}
    >
      {language}
    </Text>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    chip: {
      marginLeft: 'auto', flexShrink: 0,
      borderWidth: 1, borderColor: C.border, borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 3,
      color: C.muted, fontSize: 12, overflow: 'hidden',
    },
  });
}
