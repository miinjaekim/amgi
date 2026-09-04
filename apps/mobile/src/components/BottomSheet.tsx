import React, { useMemo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

interface Props {
  visible: boolean;
  /** Rendered above the rows in the same quiet uppercase the settings sections use. */
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The slide-up sheet, extracted from the reminder time picker that was the
 * only thing using it. A second caller (the study-language switcher) arrived
 * with the Progress tab, and a picker whose backdrop and geometry are copied
 * rather than shared is a picker that drifts.
 *
 * Capped at 60% height with the rows scrolling inside: nine study languages
 * fit, and the list of reminder times never did.
 */
export default function BottomSheet({ visible, title, onClose, children }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        {/* Claims the touch so a tap on the sheet's own padding doesn't reach
            the backdrop behind it and dismiss what you were aiming at. The
            time picker had this bug for as long as it owned the markup. */}
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          {title && <Text style={s.title}>{title}</Text>}
          <ScrollView>{children}</ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/** One tappable line in a sheet. `selected` marks the value already in force. */
export function SheetRow({ label, selected, onPress }: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} accessibilityRole="button">
      <Text style={[s.rowText, selected && s.rowTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      paddingTop: 16, paddingBottom: 24, maxHeight: '60%',
    },
    title: {
      fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      paddingHorizontal: 20, marginBottom: 8,
    },
    row: { paddingVertical: 12, paddingHorizontal: 20 },
    rowText: { fontSize: 16, color: C.text, textAlign: 'center' },
    rowTextSelected: { color: C.highlight, fontWeight: '700' },
  });
}
