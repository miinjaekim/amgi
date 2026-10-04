import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { t, userVerbOutcomeCopy, userVerbSubjectKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useAddVerb } from '../hooks/useAddVerb';
import type { Palette } from '../theme';

/**
 * "Add to Munli", on a French verb in Amgi: a lookup result and a saved card.
 *
 * Separate from saving the card. Keeping a word and practising its conjugation
 * are two choices, and a learner may want either without the other.
 *
 * The verb is looked up again, with its forms, when this is pressed rather
 * than on every French lookup: eighteen forms would slow every lookup down for
 * a button most of them never use. The caller decides whether to show it; give
 * it a `key` of the verb so one verb's outcome is not shown under the next.
 */
export default function AddToMunliButton({ verb, gloss, style, onOpen }: {
  /** The French side — the infinitive. */
  verb: string;
  /** What it means, so the verb looked up is this one. */
  gloss?: string;
  style?: StyleProp<ViewStyle>;
  /** Runs before leaving for Munli — a modal has to close first. */
  onOpen?: () => void;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome, state.phase === 'done' ? state.savedTense : undefined);
  const landed = outcome && userVerbSubjectKey(outcome);

  return (
    <View style={style}>
      <TouchableOpacity
        style={[s.button, working && s.buttonOff]}
        onPress={() => add(verb, { gloss, practise: true })}
        disabled={working}
        accessibilityRole="button"
      >
        <Text style={s.buttonText}>{t(interfaceLanguage, working ? 'verbAddWorking' : 'verbAddToMunli')}</Text>
      </TouchableOpacity>
      {(copy || state.phase === 'failed') && (
        <Text style={s.note}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
        </Text>
      )}
      {landed && (
        <TouchableOpacity
          hitSlop={8}
          accessibilityRole="link"
          onPress={() => { onOpen?.(); router.push(`/munli/topics/verbs/${encodeURIComponent(landed)}` as never); }}
        >
          <Text style={s.link}>{t(interfaceLanguage, 'verbOpenInMunli')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    button: {
      alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    buttonOff: { opacity: 0.5 },
    buttonText: { fontSize: 14, fontWeight: '600', color: C.text },
    note: { color: C.muted, fontSize: 12, marginTop: 8 },
    link: { color: C.highlight, fontSize: 13, fontWeight: '600', marginTop: 6 },
  });
}
