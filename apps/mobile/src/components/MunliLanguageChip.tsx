import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { getStudyLanguageConfig, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * The study language, at the right end of a Munli title row.
 *
 * What Munli offers depends on the language — French has verb tables, Mandarin
 * does not — so each screen says which one it is showing. A label, not a
 * switcher: the switcher is `ProgressHeader`'s, which is also why Progress
 * does not carry this.
 *
 * `marginLeft: 'auto'` pushes it to the end of whatever row it is dropped
 * into, so a header needs no layout of its own to hold it.
 */
export default function MunliLanguageChip() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const language = getStudyLanguageConfig(studyLanguage).label;

  return (
    <Text
      style={s.chip}
      numberOfLines={1}
      accessibilityLabel={t(interfaceLanguage, 'munliLanguageChipLabel', { language })}
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
