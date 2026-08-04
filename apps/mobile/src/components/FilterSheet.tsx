import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { t } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

export interface FilterOption {
  key: string;
  label: string;
  /** Rows this option would show. Omitted where a count says nothing. */
  count?: number;
}

export interface FilterGroup {
  title: string;
  options: FilterOption[];
  selected: string;
  onSelect: (key: string) => void;
}

interface Props {
  groups: FilterGroup[];
  onClose: () => void;
  nativeLanguage: string | null | undefined;
}

/**
 * The choosing controls for a list, behind one button.
 *
 * Chips inline are the better control right up until there are three rows of
 * them: on a phone that is half a screen of chrome standing between you and the
 * first card, and the rows are answering a question you asked once. A summary
 * button states what is currently on — which a row of chips never did well,
 * since it shows what is *available* and leaves you to spot which one is lit —
 * and the options come back when you go looking for them.
 *
 * Counts live in here rather than on the button for the same reason: a count
 * informs the choice, so it belongs where the choice is made.
 *
 * Selections apply as you tap, so there is no draft to keep and "Done" only
 * closes. A sheet that could be cancelled would need a Cancel, and undoing a
 * filter is already one tap.
 */
export default function FilterSheet({ groups, onClose, nativeLanguage }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        {/* Tap-to-dismiss on its own layer behind the sheet rather than
            wrapping it — wrapping makes the press handler and the ScrollView
            fight over the same touch, and the body then only scrolls
            intermittently. Same reasoning as PageHeader's help sheet. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t(nativeLanguage, 'cardsFilterDone')}
        />
        <View style={s.sheet}>
          <ScrollView style={s.bodyScroll} contentContainerStyle={s.body}>
            {groups.map(group => (
              <View key={group.title} style={s.group}>
                <Text style={s.groupTitle}>{group.title}</Text>
                <View style={s.chipRow}>
                  {group.options.map(option => {
                    const on = option.key === group.selected;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[s.chip, on && s.chipOn]}
                        onPress={() => group.onSelect(option.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={[s.chipText, on && s.chipTextOn]}>
                          {option.count === undefined ? option.label : `${option.label} (${option.count})`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.doneBtn} onPress={onClose}>
            <Text style={s.doneBtnText}>{t(nativeLanguage, 'cardsFilterDone')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // Bottom-anchored: the button that opens it sits low on the screen, and a
    // sheet that rises from the thumb is less of a jump than one that appears
    // in the middle.
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 20, borderTopRightRadius: 20,
      borderWidth: 1, borderBottomWidth: 0, borderColor: C.border,
      paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32,
      maxHeight: '80%',
    },
    // Scrolls only when it has to — three groups fit on a typical phone, and
    // the cap is for a long deck list or large font settings.
    bodyScroll: { flexGrow: 0 },
    body: { gap: 20 },

    group: { gap: 10 },
    groupTitle: {
      fontSize: 12, fontWeight: '700', color: C.muted,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    chipOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    chipText: { fontSize: 14, color: C.text },
    chipTextOn: { color: C.bg, fontWeight: '600' },

    doneBtn: {
      marginTop: 20, backgroundColor: C.highlight, borderRadius: 12,
      paddingVertical: 14, alignItems: 'center',
    },
    doneBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  });
}
