import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { getTermExplanation, getTermDepth, getTermExamples } from '../../src/services/gemini';
import type { TermCore, TermDepth, TermAmbiguous, ExamplePair } from '../../src/services/gemini';
import { saveFlashcardToFirestore } from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import SaveFlashcardModal from '../../src/components/SaveFlashcardModal';
import { t } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import type { Palette } from '../../src/theme';

const EXAMPLES = ['배', 'longing', '눈치', 'awkward', '사랑'];

export default function LearnScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, nativeLanguage, authLoading, handleSignIn } = useUser();

  const [term, setTerm] = useState('');
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
  const [depth, setDepth] = useState<TermDepth | null>(null);
  const [examples, setExamples] = useState<ExamplePair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepth, setLoadingDepth] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<Partial<Flashcard> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextInput, setContextInput] = useState('');

  const reset = () => {
    setCore(null); setAmbiguity(null); setDepth(null); setExamples(null);
    setError(null); setShowSaveModal(false); setFlashcardDraft(null);
    setSaveSuccess(false); setShowContextInput(false); setContextInput('');
  };

  const resolveExplanation = async (termValue: string, context?: string) => {
    setLoading(true);
    reset();
    try {
      const result = await getTermExplanation(termValue, nativeLanguage ?? 'English', context);
      if ('ambiguous' in result && result.ambiguous) {
        setAmbiguity(result as TermAmbiguous);
      } else {
        setCore(result as TermCore);
      }
    } catch (e) {
      setError(t(nativeLanguage, 'errorExplanation'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!term.trim()) return;
    resolveExplanation(term.trim());
  };

  const handleDisambiguate = (label: string) => {
    if (!ambiguity) return;
    resolveExplanation(ambiguity.term, label);
  };

  const handleLoadDepth = async () => {
    if (!core) return;
    setLoadingDepth(true);
    try {
      setDepth(await getTermDepth(core.term, core.termLanguage, nativeLanguage ?? 'English'));
    } catch {
      setError(t(nativeLanguage, 'errorLoadDepth'));
    } finally {
      setLoadingDepth(false);
    }
  };

  const handleLoadExamples = async () => {
    if (!core) return;
    setLoadingExamples(true);
    try {
      setExamples(await getTermExamples(core.term, core.termLanguage, nativeLanguage ?? 'English'));
    } catch {
      setError(t(nativeLanguage, 'errorLoadExamples'));
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleOpenSave = () => {
    if (!core) return;
    const korean = core.termLanguage === 'Korean' ? core.term : (core.korean ?? '');
    const english = core.termLanguage === 'English' ? core.term : (core.english ?? '');
    setFlashcardDraft({ ...core, ...(depth ?? {}), examples: examples ?? [], korean, english });
    setShowSaveModal(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!flashcardDraft || !user) return;
    setSaving(true);
    try {
      await saveFlashcardToFirestore({ ...(flashcardDraft as Omit<Flashcard, 'createdAt' | 'id'>), uid: user.uid });
      setShowSaveModal(false);
      setFlashcardDraft(null);
      setCore(null); setDepth(null); setExamples(null); setAmbiguity(null);
      setTerm('');
      setSaveSuccess(true);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (!core || !contextInput.trim()) return;
    resolveExplanation(core.term, contextInput.trim());
  };

  const translation = core
    ? (core.termLanguage === 'Korean' ? core.english : core.korean) || core.translation
    : null;

  if (authLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.highlight} />
      </SafeAreaView>
    );
  }

  const isEmpty = !loading && !core && !ambiguity && !error && !saveSuccess;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search */}
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              value={term}
              onChangeText={setTerm}
              placeholder={t(nativeLanguage, 'inputPlaceholder')}
              placeholderTextColor={C.muted}
              returnKeyType="search"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            <TouchableOpacity style={[s.searchBtn, loading && s.searchBtnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color={C.bg} size="small" />
                : <Text style={s.searchBtnText}>{t(nativeLanguage, 'learnButton')}</Text>}
            </TouchableOpacity>
          </View>

          {/* Empty state */}
          {isEmpty && (
            <View style={s.emptyState}>
              <Text style={s.tagline}>{t(nativeLanguage, 'tagline')}</Text>
              <Text style={s.taglineSub}>{t(nativeLanguage, 'taglineSubtitle')}</Text>
              <View style={s.exampleRow}>
                <Text style={s.exampleLabel}>{t(nativeLanguage, 'exampleTermsLabel')}</Text>
                {EXAMPLES.map(ex => (
                  <TouchableOpacity key={ex} style={s.chip} onPress={() => { setTerm(ex); resolveExplanation(ex); }}>
                    <Text style={s.chipText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Save success */}
          {saveSuccess && (
            <View style={s.successBanner}>
              <Text style={s.successText}>{t(nativeLanguage, 'flashcardSaved')}</Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Disambiguation */}
          {ambiguity && (
            <View style={s.card}>
              <Text style={s.cardTerm}>{ambiguity.term}</Text>
              <Text style={s.cardSubtitle}>{t(nativeLanguage, 'disambiguationPrompt')}</Text>
              {ambiguity.meanings.map((m, i) => (
                <TouchableOpacity key={i} style={s.meaningBtn} onPress={() => handleDisambiguate(m.label)} disabled={loading}>
                  <Text style={s.meaningLabel}>{m.label}</Text>
                  <Text style={s.meaningHint}>{m.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Explanation card */}
          {core && (
            <View style={s.card}>
              {/* Header */}
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTerm}>{core.term}</Text>
                {core.formality && core.formality !== 'N/A' && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{core.formality}</Text>
                  </View>
                )}
              </View>

              {/* Translation */}
              <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionTranslation')}</Text>
              <Text style={s.translationText}>{translation || t(nativeLanguage, 'noTranslation')}</Text>

              {/* Definition */}
              {!depth ? (
                <TouchableOpacity style={s.loadBtn} onPress={handleLoadDepth} disabled={loadingDepth}>
                  {loadingDepth
                    ? <ActivityIndicator color={C.text} size="small" />
                    : <Text style={s.loadBtnText}>{t(nativeLanguage, 'loadDefinition')}</Text>}
                </TouchableOpacity>
              ) : (
                <View style={s.depthSection}>
                  {depth.definition && (
                    <>
                      <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionDefinition')}</Text>
                      <Text style={s.bodyText}>{depth.definition}</Text>
                    </>
                  )}
                  {depth.hanja && (
                    <>
                      <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionHanja')}</Text>
                      <Text style={s.bodyText}>{depth.hanja}</Text>
                    </>
                  )}
                  {depth.notes && (
                    <>
                      <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionContext')}</Text>
                      <Text style={s.bodyText}>{depth.notes}</Text>
                    </>
                  )}
                </View>
              )}

              {/* Examples */}
              {!examples ? (
                <TouchableOpacity style={s.loadBtn} onPress={handleLoadExamples} disabled={loadingExamples}>
                  {loadingExamples
                    ? <ActivityIndicator color={C.text} size="small" />
                    : <Text style={s.loadBtnText}>{t(nativeLanguage, 'loadExamples')}</Text>}
                </TouchableOpacity>
              ) : (
                <View style={s.examplesSection}>
                  <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionExamples')}</Text>
                  {examples.map((ex, i) => (
                    <View key={i} style={s.exampleItem}>
                      {ex.korean ? <Text style={s.bodyText}>{ex.korean}</Text> : null}
                      {ex.english ? <Text style={s.exampleTranslation}>{ex.english}</Text> : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Save */}
              <View style={s.divider} />
              <TouchableOpacity
                style={[s.saveBtn, !user && s.saveBtnDisabled]}
                onPress={user ? handleOpenSave : handleSignIn}
              >
                <Text style={s.saveBtnText}>
                  {user ? t(nativeLanguage, 'saveAsFlashcard') : t(nativeLanguage, 'signInToSave')}
                </Text>
              </TouchableOpacity>

              {/* Not what you meant */}
              <View style={s.contextSection}>
                {!showContextInput ? (
                  <TouchableOpacity onPress={() => setShowContextInput(true)}>
                    <Text style={s.contextToggleText}>{t(nativeLanguage, 'notWhatYouMeant')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.contextRow}>
                    <TextInput
                      style={s.contextInput}
                      value={contextInput}
                      onChangeText={setContextInput}
                      placeholder={t(nativeLanguage, 'addContextPlaceholder')}
                      placeholderTextColor={C.muted}
                      returnKeyType="send"
                      onSubmitEditing={handleRegenerate}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[s.regenBtn, (!contextInput.trim() || loading) && s.regenBtnDisabled]}
                      onPress={handleRegenerate}
                      disabled={!contextInput.trim() || loading}
                    >
                      <Text style={s.regenBtnText}>{t(nativeLanguage, 'regenerate')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {showSaveModal && flashcardDraft && (
        <SaveFlashcardModal
          draft={flashcardDraft}
          nativeLanguage={nativeLanguage}
          saving={saving}
          onChange={(field, value) => setFlashcardDraft(prev => ({ ...prev, [field]: value }))}
          onSave={handleSave}
          onClose={() => { setShowSaveModal(false); setFlashcardDraft(null); }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    color: C.text, backgroundColor: C.surface,
  },
  searchBtn: {
    backgroundColor: C.highlight, borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center', minWidth: 72, alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  tagline: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' },
  taglineSub: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  exampleLabel: { fontSize: 13, color: C.muted, alignSelf: 'center' },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 14, color: C.text },

  successBanner: { backgroundColor: C.border, borderRadius: 10, padding: 14, marginBottom: 12 },
  successText: { color: C.text, fontWeight: '600' },
  errorBanner: { backgroundColor: '#fde8e8', borderRadius: 10, padding: 14, marginBottom: 12 },
  errorText: { color: C.error, fontWeight: '600' },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  cardTerm: { fontSize: 26, fontWeight: '700', color: C.highlight },
  cardSubtitle: { fontSize: 14, color: C.muted, marginBottom: 12 },
  formalityBadge: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  formalityText: { fontSize: 12, color: C.muted },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, marginTop: 12 },
  translationText: { fontSize: 18, color: C.text, lineHeight: 26 },
  bodyText: { fontSize: 15, color: C.text, lineHeight: 22, opacity: 0.85 },
  exampleTranslation: { fontSize: 14, color: C.highlight, marginTop: 2 },

  depthSection: { marginTop: 4 },
  examplesSection: { marginTop: 4 },
  exampleItem: { marginBottom: 10 },

  loadBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', marginTop: 12,
  },
  loadBtnText: { fontSize: 14, color: C.text },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  saveBtn: { backgroundColor: C.highlight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: C.border },
  saveBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },

  contextSection: { marginTop: 16 },
  contextToggleText: { fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
  contextRow: { flexDirection: 'row', gap: 8 },
  contextInput: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.text, backgroundColor: C.bg,
  },
  regenBtn: { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  regenBtnDisabled: { opacity: 0.4 },
  regenBtnText: { fontSize: 14, color: C.text, fontWeight: '600' },

  meaningBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  meaningLabel: { fontSize: 15, fontWeight: '600', color: C.highlight },
  meaningHint: { fontSize: 13, color: C.text, opacity: 0.7, marginTop: 2 },
  });
}
