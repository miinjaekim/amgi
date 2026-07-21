import React, { useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { getStudyLanguageConfig, t } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { getTermExplanation } from '../services/gemini';
import type { TermCore } from '../services/gemini';
import { saveFlashcardToFirestore } from '../services/firestore';
import type { Flashcard } from '../services/firestore';
import type { Palette } from '../theme';

type ImportStatus = 'pending' | 'loading' | 'success' | 'ambiguous' | 'error';
interface ImportItem { word: string; status: ImportStatus; data?: TermCore }

interface Props {
  studyLanguage: StudyLanguage;
  onClose: () => void;
  onSaved: (count: number) => void;
}

const DEFAULT_TRACKING = { nextReview: new Date(), interval: 0, ease: 2.5, repetitions: 0 };

export default function ImportModal({ studyLanguage, onClose, onSaved }: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [step, setStep] = useState<'input' | 'processing' | 'done'>('input');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const abortRef = useRef(false);

  const words = input.split('\n').map(w => w.trim()).filter(Boolean);

  const startImport = async () => {
    if (words.length === 0) return;
    abortRef.current = false;
    setItems(words.map(w => ({ word: w, status: 'pending' })));
    setSelected(new Set());
    setStep('processing');

    for (let i = 0; i < words.length; i++) {
      if (abortRef.current) break;
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'loading' } : item));
      try {
        const data = await getTermExplanation(words[i], nativeLanguage ?? 'English', undefined, studyLanguage);
        if ('ambiguous' in data && data.ambiguous) {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'ambiguous' } : item));
        } else {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success', data: data as TermCore } : item));
          setSelected(prev => new Set([...prev, i]));
        }
      } catch {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
      }
    }
    setStep('done');
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    let saved = 0;
    for (const i of selected) {
      const item = items[i];
      if (item.status !== 'success' || !item.data) continue;
      try {
        await saveFlashcardToFirestore({
          ...item.data,
          uid: user.uid,
          frontToBack: DEFAULT_TRACKING,
          backToFront: DEFAULT_TRACKING,
        } as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
        saved++;
      } catch {}
    }
    setSaving(false);
    onSaved(saved);
  };

  const close = () => { abortRef.current = true; onClose(); };
  const doneCount = items.filter(i => i.status !== 'pending' && i.status !== 'loading').length;
  const successCount = items.filter(i => i.status === 'success').length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{t(nativeLanguage, 'importTitle')}</Text>
            <TouchableOpacity onPress={close} hitSlop={12}><Text style={s.close}>×</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {step === 'input' && (
              <>
                <Text style={s.prompt}>{t(nativeLanguage, 'importPastePrompt')}</Text>
                <TextInput
                  style={s.textarea}
                  value={input}
                  onChangeText={setInput}
                  placeholder={'사랑\n행복\nhello\n...'}
                  placeholderTextColor={C.muted}
                  multiline
                  textAlignVertical="top"
                />
                {words.length > 0 && (
                  <Text style={s.count}>
                    {t(nativeLanguage, words.length === 1 ? 'importWordCountOne' : 'importWordCount', { count: words.length })}
                  </Text>
                )}
                <TouchableOpacity
                  style={[s.primaryBtn, words.length === 0 && s.primaryBtnDisabled]}
                  onPress={startImport}
                  disabled={words.length === 0}
                >
                  <Text style={s.primaryBtnText}>{t(nativeLanguage, 'importStart')}</Text>
                </TouchableOpacity>
              </>
            )}

            {(step === 'processing' || step === 'done') && (
              <>
                <Text style={s.prompt}>
                  {step === 'processing'
                    ? t(nativeLanguage, 'importProcessing', { done: doneCount, total: items.length })
                    : t(nativeLanguage, 'importDoneSummary', { success: successCount, total: items.length, selected: selected.size })}
                </Text>
                {items.map((item, i) => {
                  const isSel = selected.has(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={s.item}
                      disabled={item.status !== 'success'}
                      onPress={() => toggleSelect(i)}
                    >
                      <View style={[s.checkbox, isSel && s.checkboxOn, item.status !== 'success' && s.checkboxHidden]}>
                        {isSel && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={s.itemMain}>
                        <View style={s.itemRow}>
                          <Text style={s.itemWord}>{item.word}</Text>
                          {item.status === 'loading' && <ActivityIndicator size="small" color={C.muted} />}
                          {item.status === 'error' && <Text style={s.itemMeta}>{t(nativeLanguage, 'importStatusFailed')}</Text>}
                          {item.status === 'ambiguous' && <Text style={s.itemMeta}>{t(nativeLanguage, 'importStatusAmbiguous')}</Text>}
                          {item.status === 'success' && item.data && (
                            <Text style={s.itemMeta} numberOfLines={1}>
                              {item.data[langConfig.studyField]} · {item.data[langConfig.backField]}
                            </Text>
                          )}
                        </View>
                        {item.status === 'success' && item.data?.briefDefinition && (
                          <Text style={s.itemDef} numberOfLines={2}>{item.data.briefDefinition}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {step === 'done' && selected.size > 0 && (
                  <TouchableOpacity style={s.primaryBtn} onPress={handleSave} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color={C.bg} size="small" />
                      : <Text style={s.primaryBtnText}>
                          {t(nativeLanguage, selected.size === 1 ? 'importSaveCardsOne' : 'importSaveCards', { count: selected.size })}
                        </Text>}
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
    sheet: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, maxHeight: '85%', overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
    title: { fontSize: 19, fontWeight: '700', color: C.highlight },
    close: { fontSize: 28, color: C.muted, lineHeight: 30 },
    body: { paddingHorizontal: 20, paddingBottom: 24 },
    prompt: { fontSize: 13, color: C.muted, marginBottom: 12 },
    textarea: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.bg,
      padding: 12, fontSize: 15, color: C.text, minHeight: 160,
    },
    count: { fontSize: 12, color: C.muted, marginTop: 8 },
    primaryBtn: { backgroundColor: C.highlight, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
    primaryBtnDisabled: { opacity: 0.4 },
    primaryBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
    item: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.bg, marginBottom: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    checkboxOn: { backgroundColor: C.highlight, borderColor: C.highlight },
    checkboxHidden: { opacity: 0 },
    checkmark: { color: C.bg, fontSize: 12, fontWeight: '900' },
    itemMain: { flex: 1 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    itemWord: { fontSize: 14, fontWeight: '600', color: C.text },
    itemMeta: { fontSize: 12, color: C.muted, flexShrink: 1 },
    itemDef: { fontSize: 12, color: C.muted, marginTop: 2 },
  });
}
