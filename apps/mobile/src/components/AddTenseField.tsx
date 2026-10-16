import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { addedTenses, t, userTenseOutcomeCopy } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useAddTense } from '../hooks/useAddTense';
import type { Palette } from '../theme';

/**
 * Add a tense of your own to Munli, and see the ones you have added.
 *
 * Drawn as `AddVerbField` is, beside it. The learner types a tense's name — in
 * French, English or Korean — and what it matched, or why it did not, is the
 * line underneath. The added tenses are listed here rather than on each verb,
 * because a tense belongs to every verb at once.
 *
 * ⚠️ **Removing takes the tense's progress with it**, so the button asks twice,
 * inline rather than in an alert: the first tap turns it into the second.
 */
export default function AddTenseField() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const { state, add, remove, spec } = useAddTense();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  if (!spec) return null;

  const working = state.phase === 'working';
  const copy = state.phase === 'done' ? userTenseOutcomeCopy(state.outcome) : undefined;
  const mine = addedTenses(spec);
  const submit = () => {
    if (!typed.trim() || working) return;
    void add(typed).then(outcome => { if (outcome?.status === 'added') setTyped(''); });
  };

  return (
    <View style={s.wrap}>
      {!open ? (
        <TouchableOpacity style={s.open} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={s.openText}>+ {t(interfaceLanguage, 'tenseAddOpen')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.row}>
          <TextInput
            autoFocus
            style={s.input}
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submit}
            placeholder={t(interfaceLanguage, 'tenseAddPlaceholder')}
            placeholderTextColor={C.muted}
            accessibilityLabel={t(interfaceLanguage, 'tenseAddOpen')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.button, (!typed.trim() || working) && s.buttonOff]}
            onPress={submit}
            disabled={!typed.trim() || working}
            accessibilityRole="button"
          >
            <Text style={s.buttonText}>{t(interfaceLanguage, working ? 'tenseAddWorking' : 'verbAddButton')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {(copy || state.phase === 'failed') && (
        <Text style={s.note} accessibilityLiveRegion="polite">
          {copy ? t(interfaceLanguage, copy.key, copy.params) : t(interfaceLanguage, 'tenseAddFailed')}
        </Text>
      )}

      {mine.length > 0 && (
        <View style={s.list}>
          <Text style={s.heading}>{t(interfaceLanguage, 'tensesAdded')}</Text>
          {mine.map(tense => (
            <View key={tense.id} style={s.item}>
              <Text style={s.label}>
                {tense.label}
                <Text style={s.tag}>  {t(interfaceLanguage, 'verbUnverifiedTag')}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (confirming !== tense.id) { setConfirming(tense.id); return; }
                  setConfirming(null);
                  remove(tense.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(interfaceLanguage, 'tenseRemoveLabel', { tense: tense.label })}
                hitSlop={8}
              >
                <Text style={[s.remove, confirming === tense.id && s.removeArmed]}>
                  {t(interfaceLanguage, confirming === tense.id ? 'tenseRemoveConfirm' : 'tenseRemove')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <Text style={s.note}>{t(interfaceLanguage, 'tenseUnverified')}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // Sits under the add-verb button, which has no margin of its own.
    wrap: { marginTop: 12 },
    open: {
      padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: C.highlight,
      borderRadius: 14, alignItems: 'center',
    },
    openText: { color: C.highlight, fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9, color: C.text, fontSize: 14,
    },
    button: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    buttonOff: { opacity: 0.4 },
    buttonText: { color: C.bg, fontSize: 14, fontWeight: '700' },
    note: { color: C.muted, fontSize: 12, marginTop: 8 },
    list: { marginTop: 16 },
    heading: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12 },
    label: { flex: 1, color: C.text, fontSize: 14 },
    tag: { color: C.muted, fontSize: 11 },
    remove: { color: C.muted, fontSize: 12, textDecorationLine: 'underline' },
    removeArmed: { color: C.highlight, fontWeight: '700' },
  });
}
