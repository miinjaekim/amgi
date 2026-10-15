import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREVIEW_SCOPES, t } from '@amgi/core';
import type { PreviewScope } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/** The last scope picked, per device: what someone previews tends to stay the same. */
const SCOPE_KEY = 'preview-scope';

const SCOPE_LABEL = {
  new: 'previewScopeNew',
  due: 'previewScopeDue',
  both: 'previewScopeBoth',
} as const;

interface PreviewLauncherProps {
  counts: Record<PreviewScope, number>;
  onStart: (scope: PreviewScope) => void;
}

/**
 * The way into Preview, under Start rather than instead of it: Preview is an
 * option, not a step you have to take before reviewing.
 *
 * One button, which opens the choice of cards underneath it with a count for
 * each; picking one starts. An empty choice is shown disabled rather than
 * left out, so the three always read as the same three. The last one picked
 * is marked, remembered on this device.
 */
export default function PreviewLauncher({ counts, onStart }: PreviewLauncherProps) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const [lastScope, setLastScope] = useState<PreviewScope | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SCOPE_KEY)
      .then(stored => setLastScope(PREVIEW_SCOPES.find(scope => scope === stored) ?? null))
      .catch(() => { /* Nothing is marked. */ });
  }, []);

  if (counts.new === 0 && counts.due === 0) return null;

  const start = (scope: PreviewScope) => {
    // Not being able to remember the choice is no reason to refuse it.
    AsyncStorage.setItem(SCOPE_KEY, scope).catch(() => {});
    setLastScope(scope);
    onStart(scope);
  };

  return (
    <>
      <TouchableOpacity
        style={s.button}
        onPress={() => setOpen(v => !v)}
        accessibilityState={{ expanded: open }}
      >
        <Text style={s.buttonText}>{t(interfaceLanguage, 'previewStart')} {open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.choices} accessibilityLabel={t(interfaceLanguage, 'previewChoose')}>
          {PREVIEW_SCOPES.map(scope => {
            const empty = counts[scope] === 0;
            const marked = scope === lastScope && !empty;
            return (
              <TouchableOpacity
                key={scope}
                onPress={() => start(scope)}
                disabled={empty}
                accessibilityState={{ disabled: empty, selected: marked }}
                style={[s.choice, marked && s.choiceOn, empty && s.choiceOff]}
              >
                <Text style={[s.choiceText, marked && s.choiceTextOn]}>
                  {t(interfaceLanguage, SCOPE_LABEL[scope], { count: counts[scope] })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <Text style={s.note}>{t(interfaceLanguage, 'previewNote')}</Text>
    </>
  );
}

// The button matches Review's secondary buttons, the choices its direction pills.
function makeStyles(C: Palette) {
  return StyleSheet.create({
    button: {
      marginTop: 20, borderWidth: 1, borderColor: C.border,
      borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
    },
    buttonText: { fontSize: 14, fontWeight: '600', color: C.text },
    choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
    choice: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
    choiceOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    choiceOff: { opacity: 0.4 },
    choiceText: { fontSize: 13, color: C.text },
    choiceTextOn: { color: C.bg, fontWeight: '700' },
    note: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 12 },
  });
}
