import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { t, userVerbOutcomeCopy, userVerbSubjectKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useAddVerb } from '../hooks/useAddVerb';
import type { Palette } from '../theme';

/**
 * Add a verb of your own to Munli.
 *
 * ⚠️ **One button above both groups of rows**, drawn as the Packs list draws
 * "Make a pack". What a verb becomes is not the learner's choice: a regular
 * verb joins its pattern as one more verb it is asked through, and an
 * irregular one becomes a row of its own. The line underneath says which, and
 * links to where it went.
 */
export default function AddVerbField() {
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
  const landed = outcome && userVerbSubjectKey(outcome);
  const submit = () => {
    if (!term.trim() || working) return;
    void add(term).then(() => setTerm(''));
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
          {landed && (
            <Text
              style={s.link}
              accessibilityRole="link"
              onPress={() => router.push(`/munli/topics/verbs/${encodeURIComponent(landed)}` as never)}
            >
              {'  '}{t(interfaceLanguage, 'verbOpen')}
            </Text>
          )}
        </Text>
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    wrap: {},
    open: {
      padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: C.highlight,
      borderRadius: 14, alignItems: 'center',
    },
    openText: { color: C.highlight, fontSize: 15, fontWeight: '700' },
    link: { color: C.highlight, fontWeight: '600' },
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
