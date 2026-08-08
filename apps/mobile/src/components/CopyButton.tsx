import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { t } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

type State = 'idle' | 'copied' | 'failed';

/**
 * Copies text to the clipboard, with the one thing a copy control cannot do
 * without: visible confirmation.
 *
 * A copy that succeeds silently is indistinguishable from one that did nothing,
 * and the usual result is tapping it again and then checking by pasting
 * somewhere. The label swaps for two seconds instead.
 *
 * More useful here than on web, which is why it exists: selecting text by hand
 * on a phone is fiddly, and the rewrite is the one thing on the screen worth
 * taking somewhere else.
 */
export default function CopyButton({
  text,
  nativeLanguage,
}: {
  text: string;
  nativeLanguage: string | null | undefined;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  const label = state === 'copied' ? 'copied' : state === 'failed' ? 'copyFailed' : 'copy';

  return (
    <TouchableOpacity
      style={[s.btn, state === 'copied' && s.btnCopied]}
      onPress={handleCopy}
      accessibilityRole="button"
    >
      <Text style={[s.text, state === 'copied' && s.textCopied]}>{t(nativeLanguage, label)}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    btn: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    btnCopied: { borderColor: C.highlight },
    text: { fontSize: 11, color: C.muted },
    textCopied: { color: C.highlight },
  });
}
