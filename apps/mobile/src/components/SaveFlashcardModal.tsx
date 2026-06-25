import React, { useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { t } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';
import type { Flashcard } from '../services/firestore';

interface Props {
  draft: Partial<Flashcard>;
  nativeLanguage: string | null | undefined;
  saving: boolean;
  onChange: (field: 'korean' | 'english', value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function SaveFlashcardModal({ draft, nativeLanguage, saving, onChange, onSave, onClose }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={s.sheet} onPress={() => {}}>
            <Text style={s.title}>{t(nativeLanguage, 'reviewEditFlashcard')}</Text>

            <Text style={s.label}>{t(nativeLanguage, 'labelKorean')}</Text>
            <TextInput
              style={s.input}
              value={draft.korean ?? ''}
              onChangeText={v => onChange('korean', v)}
              autoFocus
              returnKeyType="next"
            />

            <Text style={s.label}>{t(nativeLanguage, 'labelEnglish')}</Text>
            <TextInput
              style={s.input}
              value={draft.english ?? ''}
              onChangeText={v => onChange('english', v)}
              returnKeyType="done"
              onSubmitEditing={onSave}
            />

            <View style={s.row}>
              <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={s.saveBtnText}>{t(nativeLanguage, 'save')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={s.cancelBtnText}>{t(nativeLanguage, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  sheet: {
    width: '100%', backgroundColor: C.surface, borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: C.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.highlight, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, color: C.text, backgroundColor: C.bg, marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  saveBtn: {
    flex: 1, backgroundColor: C.highlight, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    flex: 1, backgroundColor: C.border, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: C.text, fontWeight: '600', fontSize: 15 },
  });
}
