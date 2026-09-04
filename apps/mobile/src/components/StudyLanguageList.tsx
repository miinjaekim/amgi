import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_STUDY_LANGUAGES, resolveNativeLanguage, t } from '@amgi/core';
import type { StudyLanguage, TranslationKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * The study-language options, with a check on the one in force.
 *
 * Mirrors web's `StudyLanguageList` export and exists for the same reason: the
 * settings screen and the quick switcher on Progress both offer this choice,
 * and a switch that behaves differently depending on where it was made is a
 * switch nobody trusts. In particular the confirmation below belongs to the
 * *choice*, not to either surface — settings never had it and should have.
 */
export default function StudyLanguageList({ onSelect }: { onSelect?: () => void }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { nativeLanguage, studyLanguage, setStudyLanguage } = useUser();

  const labelFor = (code: string) => t(nativeLanguage, `label${code}` as TranslationKey);

  const choose = (code: StudyLanguage) => {
    const commit = () => { void setStudyLanguage(code); onSelect?.(); };

    // Choosing the language Amgi is currently speaking to you in moves your
    // *native* language — `setStudyLanguage` runs `resolveNativeLanguage`, so
    // the whole interface changes language on the next render. That is
    // defensible from a settings screen and alarming from a one-tap chip, so
    // it is confirmed here rather than at either call site, and named: the
    // dialog says which language the app is about to start speaking.
    const nextNative = resolveNativeLanguage(code, nativeLanguage, studyLanguage);
    if (nextNative && nextNative !== nativeLanguage) {
      Alert.alert(
        t(nativeLanguage, 'switchNativeWarningTitle'),
        t(nativeLanguage, 'switchNativeWarningBody', {
          study: labelFor(code),
          native: labelFor(nextNative),
        }),
        [
          { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
          { text: t(nativeLanguage, 'switchNativeWarningConfirm'), onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  return (
    <View>
      {SUPPORTED_STUDY_LANGUAGES.map(({ code, label, labelNative }) => {
        const active = studyLanguage === code;
        return (
          <TouchableOpacity
            key={code}
            style={s.row}
            onPress={() => choose(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.label, active && s.labelActive]} numberOfLines={1}>
              {label}
              {labelNative !== label && <Text style={s.native}>{`  ${labelNative}`}</Text>}
            </Text>
            {active && <Ionicons name="checkmark" size={18} color={C.highlight} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, paddingVertical: 13, paddingHorizontal: 20,
    },
    label: { flex: 1, fontSize: 15, color: C.text },
    labelActive: { color: C.highlight, fontWeight: '700' },
    native: { color: C.muted, fontWeight: '400' },
  });
}
