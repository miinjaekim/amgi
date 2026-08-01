import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

export type LearnMode = 'word' | 'passage';

/**
 * Word / Passage switch at the top of Learn.
 *
 * A visible segmented control rather than a subtler affordance: it is the only
 * thing advertising that Learn takes passages at all, so it has to be legible
 * at a glance from the empty state. Rendered in every one of the Learn screen's
 * render paths — a control that disappears once you search is a control people
 * stop trusting.
 */
export default function LearnModeToggle({
  mode, onChange, nativeLanguage,
}: {
  mode: LearnMode;
  onChange: (mode: LearnMode) => void;
  nativeLanguage: string | null | undefined;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  return (
    <View style={s.wrap}>
      <View style={s.group}>
        {(['word', 'passage'] as const).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => onChange(m)}
            style={[s.segment, mode === m && s.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
          >
            <Text style={[s.label, mode === m && s.labelActive]}>
              {t(nativeLanguage, m === 'word' ? 'learnModeWord' : 'learnModePassage')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
    group: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 3 },
    segment: { paddingHorizontal: 18, paddingVertical: 5, borderRadius: 16 },
    segmentActive: { backgroundColor: C.highlight },
    label: { fontSize: 14, fontWeight: '700', color: C.muted },
    labelActive: { color: C.bg },
  });
}
