import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { MODES, modeFromPath, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useMode } from '../context/ModeContext';
import type { Palette } from '../theme';

/**
 * The mode switcher — Instagram's account switcher, for modes.
 *
 * Opened by holding the last tab, and from Munli's own header (which has no tab
 * bar yet to hold). ⚠️ **A hold is invisible**, so it is never the only door;
 * see the discoverability note in `.scratchpad/backlog.md`.
 *
 * Bottom-anchored because the gesture that opens it happens at the bottom of
 * the screen — the list should appear where the thumb already is, not in the
 * middle of the screen it is covering.
 */
export default function ModeSwitcherSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { interfaceLanguage } = useUser();
  const { switchMode } = useMode();
  const pathname = usePathname();
  const current = modeFromPath(pathname);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* The backdrop dismisses. A switcher you opened by accident with a long
          press has to be as cheap to leave as it was to open. */}
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.title}>{t(interfaceLanguage, 'modeSwitchTitle')}</Text>
          {MODES.map(mode => {
            const active = mode.id === current;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[s.row, active && s.rowActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onClose();
                  if (!active) switchMode(mode.id);
                }}
              >
                <View style={s.rowText}>
                  <Text style={s.name}>{mode.name}</Text>
                  <Text style={s.tagline}>{t(interfaceLanguage, mode.taglineKey)}</Text>
                </View>
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={C.highlight}
                    accessibilityLabel={t(interfaceLanguage, 'modeCurrent')}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end', padding: 20, paddingBottom: 40 },
    sheet: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 12 },
    title: {
      color: C.muted, fontFamily: 'monospace', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: 1.5, paddingHorizontal: 8, paddingBottom: 8,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
      borderWidth: 1, borderColor: C.border, marginBottom: 6,
    },
    rowActive: { borderColor: C.highlight, backgroundColor: C.bg },
    rowText: { flex: 1 },
    name: { color: C.text, fontFamily: 'monospace', fontSize: 16, fontWeight: '700' },
    tagline: { color: C.muted, fontFamily: 'monospace', fontSize: 12, marginTop: 2 },
  });
}
