import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  availableStudyLanguages, getStudyLanguageConfig, nativeOptionsFor, t,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import BottomSheet, { SheetRow } from './BottomSheet';
import type { Palette } from '../theme';

/**
 * Adding a language, as the two questions it actually is.
 *
 * **Both are asked, every time.** The second one is the whole reason this
 * exists: a deck is a study language *plus* the language it is explained in,
 * and defaulting the second to whatever the last deck used is how a Korean
 * speaker ends up with Spanish cards glossed in Korean because their first
 * deck happened to be Japanese.
 *
 * The options are filtered rather than validated:
 *
 * - `availableStudyLanguages` drops what is already added, so the same deck
 *   cannot be created twice — cards shard one collection per study language.
 * - `nativeOptionsFor` drops the study language itself, which is what makes
 *   "studying Korean, explained in Korean" unreachable rather than corrected
 *   after the fact.
 *
 * Two sheets rather than one with a back arrow: `BottomSheet` is a `Modal`, and
 * stacking a second question inside the first one's scroll view is how the
 * reminder picker used to lose taps to its own backdrop.
 */
export default function AddLanguageSheet({
  onClose, onAdded,
}: {
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage, languages, addLanguage } = useUser();
  const [study, setStudy] = useState<StudyLanguage | null>(null);
  const [busy, setBusy] = useState(false);

  const available = availableStudyLanguages(languages);

  const choose = async (native: string) => {
    if (!study || busy) return;
    setBusy(true);
    try {
      await addLanguage({ study, native });
    } finally {
      // The local state has already moved even if the write is still in
      // flight offline, so the sheet closes either way.
      setBusy(false);
      onAdded?.();
      onClose();
    }
  };

  if (available.length === 0) {
    return (
      <BottomSheet visible title={t(interfaceLanguage, 'addLanguage')} onClose={onClose}>
        <View style={s.empty}>
          <Text style={s.emptyText}>{t(interfaceLanguage, 'addLanguageAllAdded')}</Text>
        </View>
      </BottomSheet>
    );
  }

  if (study === null) {
    return (
      <BottomSheet visible title={t(interfaceLanguage, 'addLanguageStudyTitle')} onClose={onClose}>
        {available.map(lang => (
          <SheetRow
            key={lang.code}
            label={t(interfaceLanguage, getStudyLanguageConfig(lang.code).studyLabelKey)}
            onPress={() => setStudy(lang.code)}
          />
        ))}
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible
      // Names the language being added: by this step the first question is
      // gone from the screen, and "which language?" alone is ambiguous
      // between the two this flow asks.
      title={t(interfaceLanguage, 'addLanguageNativeTitle', {
        study: t(interfaceLanguage, getStudyLanguageConfig(study).studyLabelKey),
      })}
      onClose={onClose}
    >
      <Text style={s.subtitle}>{t(interfaceLanguage, 'addLanguageNativeSubtitle')}</Text>
      {nativeOptionsFor(study).map(option => (
        <SheetRow
          key={option.code}
          label={option.label}
          onPress={() => { void choose(option.code); }}
        />
      ))}
    </BottomSheet>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    subtitle: {
      fontSize: 13, color: C.muted, paddingHorizontal: 20,
      paddingBottom: 12, lineHeight: 19,
    },
    empty: { paddingHorizontal: 20, paddingVertical: 12 },
    emptyText: { fontSize: 14, color: C.muted, lineHeight: 20 },
  });
}
