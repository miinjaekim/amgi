import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { t, userVerbOutcomeCopy, userVerbSide } from '@amgi/core';
import type { VerbSide } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useAddVerb } from '../hooks/useAddVerb';
import { SCREEN_GUTTER } from './PageHeader';
import type { Palette } from '../theme';

/**
 * Add a verb of your own to Munli.
 *
 * ⚠️ **One button for both sides of the topic, above the switch.** What a verb
 * becomes is not the learner's choice: a regular verb joins its group as one
 * more verb the pattern is asked through, and an irregular one gets its own
 * table. So the button belongs to neither side, and `onLanded` lets the screen
 * turn to wherever the verb went.
 */
export default function AddVerbField({ onLanded }: { onLanded: (side: VerbSide) => void }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome);
  const submit = () => {
    if (!term.trim() || working) return;
    void add(term).then(added => {
      setTerm('');
      const side = added && userVerbSide(added);
      if (side) onLanded(side);
    });
  };

  return (
    <View style={s.wrap}>
      {!open ? (
        <TouchableOpacity style={s.open} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={s.openText}>+ {t(interfaceLanguage, 'verbAddOpen')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.row}>
          <TextInput
            autoFocus
            style={s.input}
            value={term}
            onChangeText={setTerm}
            onSubmitEditing={submit}
            placeholder={t(interfaceLanguage, 'verbAddPlaceholder')}
            placeholderTextColor={C.muted}
            accessibilityLabel={t(interfaceLanguage, 'verbAddOpen')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.button, (!term.trim() || working) && s.buttonOff]}
            onPress={submit}
            disabled={!term.trim() || working}
            accessibilityRole="button"
          >
            <Text style={s.buttonText}>{t(interfaceLanguage, working ? 'verbAddWorking' : 'verbAddButton')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {(copy || state.phase === 'failed') && (
        <Text style={s.note}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
        </Text>
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: SCREEN_GUTTER, marginTop: 8, marginBottom: 12 },
    open: {
      alignSelf: 'flex-start', borderWidth: 1, borderColor: C.highlight, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    openText: { color: C.highlight, fontSize: 13, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 14,
    },
    button: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    buttonOff: { opacity: 0.4 },
    buttonText: { color: C.bg, fontSize: 14, fontWeight: '700' },
    note: { color: C.muted, fontSize: 12, marginTop: 8 },
  });
}
