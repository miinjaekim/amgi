import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { t, userVerbOutcomeCopy, userVerbTopic } from '@amgi/core';
import type { MunliTopic } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useAddVerb } from '../hooks/useAddVerb';
import { SCREEN_GUTTER } from './PageHeader';
import type { Palette } from '../theme';

/**
 * Add a verb of your own to Munli.
 *
 * What it becomes is not the learner's choice and not this field's: a regular
 * verb joins its group as one more verb the pattern is asked through, and an
 * irregular one gets a table on this screen. The line under the field says
 * which happened, and links across when the verb landed on the other topic.
 */
export default function AddVerbField({ topic }: { topic: MunliTopic['id'] }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const { state, add, spec } = useAddVerb();
  const [term, setTerm] = useState('');
  if (!spec) return null;

  const working = state.phase === 'working';
  const outcome = state.phase === 'done' ? state.outcome : undefined;
  const copy = outcome && userVerbOutcomeCopy(spec, outcome);
  const landed = outcome && userVerbTopic(outcome);
  const submit = () => {
    if (!term.trim() || working) return;
    void add(term).then(() => setTerm(''));
  };

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <TextInput
          style={s.input}
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={submit}
          placeholder={t(interfaceLanguage, 'verbAddPlaceholder')}
          placeholderTextColor={C.muted}
          accessibilityLabel={t(interfaceLanguage, 'verbAddPlaceholder')}
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
      {(copy || state.phase === 'failed') && (
        <Text style={s.note}>
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'verbAddFailed')}
          {landed && landed !== topic && (
            <Text style={s.link} onPress={() => router.push(`/munli/topics/${landed}` as never)}>
              {' '}{t(interfaceLanguage, landed === 'regular' ? 'topicRegularVerbs' : 'verbsIrregular')}
            </Text>
          )}
        </Text>
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 18 },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 14,
    },
    button: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    buttonOff: { opacity: 0.4 },
    buttonText: { color: C.bg, fontSize: 14, fontWeight: '700' },
    note: { color: C.muted, fontSize: 12, marginTop: 8 },
    link: { color: C.highlight, fontWeight: '600' },
  });
}
