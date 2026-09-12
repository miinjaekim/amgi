import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import {
  getBackSide,
  getBackSideConfig,
  getCharacterBreakdown,
  getExampleSides,
  getReading,
  getStudyLangSide,
  getStudyLanguageConfig,
  hunEum,
  partOfSpeechLabel,
  resolvePackBack,
  t,
} from '@amgi/core';
import { useCardEnrichment } from '../hooks/useCardEnrichment';
import type { ExamplePair, PackEntry, StudyLanguage } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import PronounceButton from './PronounceButton';
import Markdown from './Markdown';
import {
  archiveFlashcard, deleteFlashcard, restoreFlashcard, updateFlashcardFields,
} from '../services/firestore';
import type { Flashcard } from '../services/firestore';
import type { Palette } from '../theme';

interface Props {
  /** A card the account already holds. */
  card?: Flashcard | null;
  /**
   * A pack entry with no card behind it yet — what the deck screen passes when
   * you tap something you have not saved. Needs `packId` and `uid` alongside,
   * because the first enrichment writes the card before it writes the depth.
   */
  entry?: PackEntry | null;
  packId?: string;
  uid?: string;
  studyLanguage?: StudyLanguage;
  /** Buttons, headings and confirmations — chrome. */
  interfaceLanguage: string | null | undefined;
  /** Everything *on the card*: the back slot, the reading, the badges. */
  deckNativeLanguage: string;
  onClose: () => void;
  /** Fired after anything is written, so the owner can reload its list. */
  onChanged?: () => void;
}

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
}

/**
 * One card, read in full — and the only place a card is deepened.
 *
 * This used to be a read-only view that said "no details" and stopped. That was
 * the whole problem: a card saved from a pack is born with a front and a back
 * and nothing else, so the empty state was the *normal* state for exactly the
 * cards a learner most wanted to understand.
 *
 * Enrichment saves first. Asking what a word means is intent to keep it, and
 * generating against a card that does not exist would spend a model call to
 * show something once.
 */
export default function CardDetailModal({
  card, entry, packId, uid, studyLanguage, interfaceLanguage, deckNativeLanguage, onClose, onChanged,
}: Props) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const lang: StudyLanguage = studyLanguage ?? card?.studyLanguage ?? 'Korean';
  const {
    saved, setSaved, isRunning, savingEntry, error, setError, canEnrich,
    save: handleSave, enrich,
  } = useCardEnrichment({
    card, entry, packId, uid, studyLanguage: lang, interfaceLanguage, deckNativeLanguage,
    onChanged: () => onChanged?.(),
  });
  /** Non-null while the back is being edited. */
  const [editDraft, setEditDraft] = useState<string | null>(null);

  // The header reads the same whether or not a card exists behind it, so an
  // unsaved entry is projected onto the two fields it can fill.
  const studySide = saved ? getStudyLangSide(saved) : entry?.study ?? '';
  const backSide = saved
    ? getBackSide(saved, deckNativeLanguage)
    : entry ? resolvePackBack(entry.back, lang, deckNativeLanguage) : '';

  /**
   * A hanja card's back is 훈음 for every reader, and an English native gets
   * the gloss *in addition* — the rule the review screen already follows. Here
   * that needs saying explicitly, because `getBackSide` answers with the slot
   * the language *pair* points at: 물 수 for a Korean native, "water" for an
   * English one, which silently drops the 훈음 for the reader least able to
   * supply it themselves.
   */
  const hunEumLine = lang === 'Hanja'
    ? (saved ? hunEum(saved) : entry?.back.Korean ?? '')
    : '';
  const glossLine = lang === 'Hanja' && deckNativeLanguage !== 'Korean' ? backSide : '';

  const { backField } = getBackSideConfig(lang, deckNativeLanguage);
  const characterBreakdown = saved ? getCharacterBreakdown(saved) : undefined;
  const characterSectionKey = getStudyLanguageConfig(lang).characterSectionKey ?? 'sectionHanja';
  const examples = saved?.examples;
  const hasExamples = !!examples && examples.length > 0;
  const hasDepth = !!(saved?.definition || characterBreakdown || saved?.notes);
  const hasDetails = hasDepth || hasExamples;
  const badges = [
    saved ? partOfSpeechLabel(deckNativeLanguage, saved) : undefined,
    saved?.formality && saved.formality !== 'N/A' ? saved.formality : null,
    saved?.gender,
    saved ? getReading(saved, lang, deckNativeLanguage) : undefined,
  ].filter(Boolean) as string[];

  /**
   * Editing, archiving and deleting live here too, because the deck screen now
   * opens this for every entry — if management stayed on the deck as its own
   * panel there would be two card surfaces again. Only the back is editable:
   * the study side is the pack's own text, and rewriting あ would leave the
   * entry unmatched against its deck.
   */
  const handleEditSave = async () => {
    if (!saved?.id || editDraft === null) return;
    try {
      await updateFlashcardFields(saved.id, { [backField]: editDraft }, lang);
      setSaved(prev => (prev ? { ...prev, [backField]: editDraft } : prev));
      setEditDraft(null);
      onChanged?.();
    } catch {
      setError(t(interfaceLanguage, 'errorSaveChanges'));
    }
  };

  const handleArchiveToggle = () => {
    if (!saved?.id) return;
    const id = saved.id;
    const restoring = !!saved.archived;
    const run = async () => {
      try {
        await (restoring ? restoreFlashcard(id, lang) : archiveFlashcard(id, lang));
        setSaved(prev => (prev ? { ...prev, archived: !restoring } : prev));
        onChanged?.();
      } catch {
        setError(t(interfaceLanguage, restoring ? 'errorRestoreFlashcard' : 'errorArchiveFlashcard'));
      }
    };
    if (restoring) { run(); return; }
    Alert.alert(t(interfaceLanguage, 'confirmArchive'), undefined, [
      { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
      { text: t(interfaceLanguage, 'archive'), style: 'destructive', onPress: run },
    ]);
  };

  const handleDelete = () => {
    if (!saved?.id) return;
    const id = saved.id;
    Alert.alert(t(interfaceLanguage, 'confirmDelete'), undefined, [
      { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(interfaceLanguage, 'delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteFlashcard(id, lang);
            onChanged?.();
            onClose();
          } catch {
            setError(t(interfaceLanguage, 'errorDeleteFlashcard'));
          }
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.header}>
            <View style={s.headerMain}>
              <View style={s.titleRow}>
                <Text style={s.term}>{studySide}</Text>
                <PronounceButton text={studySide} furigana={saved?.furigana} eum={saved?.eum} studyLanguage={lang} />
                {badges.map((b, i) => (
                  <View key={i} style={s.badge}><Text style={s.badgeText}>{b}</Text></View>
                ))}
              </View>
              <Text style={s.back}>{lang === 'Hanja' ? hunEumLine : backSide}</Text>
              {!!glossLine && <Text style={s.backGloss}>{glossLine}</Text>}
              {/* The hint an unsaved entry carries, which is also the sense any
                  generated depth will be pinned to. */}
              {!saved && !!entry?.context && <Text style={s.hint}>{entry.context}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.close}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={s.actions}>
            {!saved && (
              <TouchableOpacity
                style={[s.primaryBtn, (savingEntry || !canEnrich) && s.btnDisabled]}
                onPress={handleSave}
                disabled={savingEntry || !canEnrich}
              >
                <Text style={s.primaryBtnText}>
                  {savingEntry ? t(interfaceLanguage, 'cardSaving') : t(interfaceLanguage, 'cardSaveEntry')}
                </Text>
              </TouchableOpacity>
            )}
            {/* Only offered where the section is missing: a card that already
                has a definition does not need a second one. */}
            {!hasDepth && (
              <TouchableOpacity
                // Only this button waits on this request. Examples stays live.
                style={[s.secondaryBtn, (isRunning('depth') || !canEnrich) && s.btnDisabled]}
                onPress={() => enrich('depth')}
                disabled={isRunning('depth') || !canEnrich}
              >
                <Text style={s.secondaryBtnText}>
                  {isRunning('depth') ? t(interfaceLanguage, 'cardEnriching') : t(interfaceLanguage, 'loadDefinition')}
                </Text>
              </TouchableOpacity>
            )}
            {!hasExamples && (
              <TouchableOpacity
                style={[s.secondaryBtn, (isRunning('examples') || !canEnrich) && s.btnDisabled]}
                onPress={() => enrich('examples')}
                disabled={isRunning('examples') || !canEnrich}
              >
                <Text style={s.secondaryBtnText}>
                  {isRunning('examples') ? t(interfaceLanguage, 'cardEnriching') : t(interfaceLanguage, 'loadExamples')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {saved?.id && editDraft === null && (
            <View style={s.actions}>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => setEditDraft(saved[backField] ?? saved.english ?? saved.translation ?? '')}
                disabled={savingEntry}
              >
                <Text style={s.mutedBtnText}>{t(interfaceLanguage, 'edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleArchiveToggle} disabled={savingEntry}>
                <Text style={s.mutedBtnText}>
                  {t(interfaceLanguage, saved.archived ? 'restore' : 'archive')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleDelete} disabled={savingEntry}>
                <Text style={[s.mutedBtnText, { color: C.error }]}>{t(interfaceLanguage, 'delete')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {editDraft !== null && (
            <View style={s.editRow}>
              <TextInput
                style={s.editInput}
                value={editDraft}
                onChangeText={setEditDraft}
                autoFocus
              />
              <TouchableOpacity style={s.primaryBtn} onPress={handleEditSave} disabled={savingEntry}>
                <Text style={s.primaryBtnText}>{t(interfaceLanguage, 'save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditDraft(null)}>
                <Text style={s.mutedBtnText}>{t(interfaceLanguage, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {(!saved || error) && (
            <Text style={[s.notice, error ? { color: C.error } : null]}>
              {error ?? t(interfaceLanguage, 'cardEnrichHint')}
            </Text>
          )}

          <ScrollView contentContainerStyle={s.body}>
            {!hasDetails ? (
              <Text style={s.muted}>{t(interfaceLanguage, 'noCardDetails')}</Text>
            ) : (
              <>
                {!!saved?.definition && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(interfaceLanguage, 'sectionDefinition')}</Text>
                    <Markdown>{saved.definition}</Markdown>
                  </View>
                )}
                {!!characterBreakdown && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(interfaceLanguage, characterSectionKey)}</Text>
                    <Markdown>{characterBreakdown}</Markdown>
                  </View>
                )}
                {!!saved?.notes && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(interfaceLanguage, 'sectionContext')}</Text>
                    <Markdown>{saved.notes}</Markdown>
                  </View>
                )}
                {hasExamples && (
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>{t(interfaceLanguage, 'sectionExamples')}</Text>
                    {(() => {
                      const raw = examples as unknown[];
                      if (raw.length > 0 && typeof raw[0] === 'string') {
                        return (raw as string[]).map((ex, i) => (
                          <Text key={i} style={s.exampleStudy}>{ex}</Text>
                        ));
                      }
                      if (isExamplePairArray(raw)) {
                        return (raw as ExamplePair[]).map((ex, i) => {
                          const sides = getExampleSides(ex, lang);
                          return (
                            <View key={i} style={s.exampleItem}>
                              <View style={s.exampleStudyRow}>
                                <Text style={[s.exampleStudy, s.exampleStudyText]}>{sides.study}</Text>
                                <PronounceButton text={sides.study} studyLanguage={lang} size="sm" />
                              </View>
                              {sides.back ? <Text style={s.exampleBack}>{sides.back}</Text> : null}
                            </View>
                          );
                        });
                      }
                      return null;
                    })()}
                  </View>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    headerMain: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    term: { fontSize: 24, fontWeight: '700', color: C.highlight },
    badge: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, color: C.muted },
    back: { fontSize: 16, color: C.text, marginTop: 4 },
    // Quieter than the 훈음 above it: a second fact about the character.
    backGloss: { fontSize: 14, color: C.muted, marginTop: 2 },
    hint: { fontSize: 12, color: C.muted, marginTop: 4 },
    close: { fontSize: 28, color: C.muted, lineHeight: 30, marginLeft: 12 },

    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 14 },
    primaryBtn: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    primaryBtnText: { fontSize: 14, fontWeight: '700', color: C.bg },
    secondaryBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
    secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
    mutedBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    btnDisabled: { opacity: 0.5 },
    editRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12 },
    editInput: {
      flexGrow: 1, minWidth: 140, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: C.text, backgroundColor: C.bg,
    },
    notice: { fontSize: 12, color: C.muted, paddingHorizontal: 20, paddingTop: 10 },

    body: { padding: 20 },
    muted: { fontSize: 14, color: C.muted },
    section: { marginBottom: 18 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    exampleItem: { marginBottom: 12 },
    exampleStudyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    exampleStudy: { fontSize: 14, color: C.text, lineHeight: 21 },
    exampleStudyText: { flexShrink: 1 },
    exampleBack: { fontSize: 13, color: C.highlight, marginTop: 2 },
  });
}
