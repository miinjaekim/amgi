import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getStudyLanguageConfig, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import BottomSheet from './BottomSheet';
import StudyLanguageList from './StudyLanguageList';
import type { Palette } from '../theme';

/**
 * The study language, at the right end of a title row, and the way to change it.
 *
 * Both modes show one language at a time — Munli's verb tables, Amgi's cards
 * and packs — so each screen says which one it is showing. Munli's first, and
 * Amgi's since 2026-09-25, which is why it lost the `Munli` from its name.
 *
 * **A switcher since the same day**, at the user's ask: someone moving between
 * two decks (Korean and Hanja, say) had to go to Progress to do it. It opens
 * the same sheet as `ProgressHeader`'s language line — same `BottomSheet`,
 * same `StudyLanguageList` — so a switch made here behaves like one made there.
 * Neither Progress carries the chip: Munli's has that header, and Amgi's
 * covers every language at once.
 *
 * `marginLeft: 'auto'` pushes it to the end of whatever row it is dropped
 * into, so a header needs no layout of its own to hold it.
 */
export default function StudyLanguageChip() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, studyLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const language = getStudyLanguageConfig(studyLanguage).label;

  return (
    <>
      <TouchableOpacity
        style={s.chip}
        onPress={() => setOpen(true)}
        // The chip is small by design; this keeps the tap target honest.
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={t(interfaceLanguage, 'studyLanguageChipLabel', { language })}
        accessibilityHint={t(interfaceLanguage, 'settingsStudyLanguage')}
      >
        <Text style={s.label} numberOfLines={1}>
          {language}
          <Text style={s.chevron}>{'  ▾'}</Text>
        </Text>
      </TouchableOpacity>

      <BottomSheet
        visible={open}
        title={t(interfaceLanguage, 'settingsStudyLanguage')}
        onClose={() => setOpen(false)}
      >
        <StudyLanguageList onSelect={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    chip: {
      marginLeft: 'auto', flexShrink: 0,
      borderWidth: 1, borderColor: C.border, borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    label: { color: C.muted, fontSize: 12 },
    chevron: { fontSize: 9 },
  });
}
