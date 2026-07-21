import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Pressable,
  Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { getTermExplanation, getTermDepth, getTermExamples, getWordOfTheDay } from '../../src/services/gemini';
import { getDepthTarget, getStudyLanguageConfig, getExampleSides, getVocabPacks } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import type { TermCore, TermDepth, TermAmbiguous, ExamplePair, WordOfTheDay } from '../../src/services/gemini';
import { saveFlashcardToFirestore } from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import SaveFlashcardModal from '../../src/components/SaveFlashcardModal';
import PacksModal from '../../src/components/PacksModal';
import PronounceButton from '../../src/components/PronounceButton';
import { t } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import type { Palette } from '../../src/theme';

const EXAMPLE_TERMS: Record<StudyLanguage, string[]> = {
  Korean: ['배', 'longing', '눈치', 'awkward', '사랑'],
  Swedish: ['lagom', 'fika', 'mysig', 'serendipity', 'lagstiftning'],
  English: ['serendipity', '아쉽다', 'procrastinate', '답답하다', 'nuance'],
  French: ['dépaysement', 'flâner', 'retrouvailles', 'longing', 'terroir'],
  Japanese: ['木漏れ日', '積ん読', 'nostalgia', 'awkward', '侘寂'],
};

export default function LearnScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const searchRestingBottom = Dimensions.get('window').height * 0.40;
  const { user, nativeLanguage, studyLanguage, authLoading, handleSignIn, streak, reviewedToday } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const exampleTerms = EXAMPLE_TERMS[studyLanguage] ?? EXAMPLE_TERMS.Korean;

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
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay | null>(null);
  const [showPacks, setShowPacks] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  // Word of the day — refreshes when the language pair changes. Non-essential:
  // any failure just hides the card (getWordOfTheDay returns null).
  useEffect(() => {
    if (nativeLanguage === undefined) return; // preferences still loading
    let cancelled = false;
    setWordOfTheDay(null);
    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local timezone
    getWordOfTheDay(date, studyLanguage, nativeLanguage ?? 'English')
      .then(data => { if (!cancelled) setWordOfTheDay(data); });
    return () => { cancelled = true; };
  }, [studyLanguage, nativeLanguage]);

  const handlePackWord = (word: string, context?: string) => {
    setShowPacks(false);
    setTerm(word);
    resolveExplanation(word, context);
  };

  const reset = () => {
    setCore(null); setAmbiguity(null); setDepth(null); setExamples(null);
    setError(null); setShowSaveModal(false); setFlashcardDraft(null);
    setSaveSuccess(false); setShowContextInput(false); setContextInput('');
  };

  const resolveExplanation = async (termValue: string, context?: string) => {
    setLoading(true);
    reset();
    try {
      const result = await getTermExplanation(termValue, nativeLanguage ?? 'English', context, studyLanguage);
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
      const target = getDepthTarget(core, studyLanguage);
      setDepth(await getTermDepth(target.term, target.termLanguage, nativeLanguage ?? 'English', {
        translation: target.translation,
        briefDefinition: target.briefDefinition,
      }, studyLanguage));
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
      const target = getDepthTarget(core, studyLanguage);
      setExamples(await getTermExamples(target.term, target.termLanguage, nativeLanguage ?? 'English', {
        translation: target.translation,
        briefDefinition: target.briefDefinition,
      }, studyLanguage));
    } catch {
      setError(t(nativeLanguage, 'errorLoadExamples'));
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleOpenSave = () => {
    if (!core) return;
    const studySide = core.termLanguage === studyLanguage ? core.term : (core[langConfig.studyField] ?? '');
    const backSide = core.termLanguage === langConfig.backLanguage ? core.term : (core[langConfig.backField] ?? '');
    setFlashcardDraft({
      ...core,
      ...(depth ?? {}),
      examples: examples ?? [],
      studyLanguage,
      [langConfig.studyField]: studySide,
      [langConfig.backField]: backSide,
    });
    setShowSaveModal(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!flashcardDraft || !user) return;
    setSaving(true);
    try {
      await saveFlashcardToFirestore({ ...(flashcardDraft as Omit<Flashcard, 'createdAt' | 'id'>), uid: user.uid }, studyLanguage);
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
    ? (core.termLanguage === studyLanguage ? core[langConfig.backField] : core[langConfig.studyField]) || core.translation
    : null;

  if (authLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={C.highlight} />
      </SafeAreaView>
    );
  }

  const isEmpty = !loading && !core && !ambiguity && !error && !saveSuccess;

  const saveModal = showSaveModal && flashcardDraft && (
    <SaveFlashcardModal
      draft={flashcardDraft}
      nativeLanguage={nativeLanguage}
      studyLanguage={studyLanguage}
      saving={saving}
      onChange={(field, value) => setFlashcardDraft(prev => ({ ...prev, [field]: value }))}
      onSave={handleSave}
      onClose={() => { setShowSaveModal(false); setFlashcardDraft(null); }}
    />
  );

  const packsModal = showPacks && (
    <PacksModal
      studyLanguage={studyLanguage}
      onClose={() => setShowPacks(false)}
      onSelectWord={handlePackWord}
    />
  );

  // Goal-based word generation — placeholder until the feature lands.
  const generateModal = showGenerate && (
    <Modal visible transparent animationType="fade" onRequestClose={() => setShowGenerate(false)}>
      <Pressable style={s.genBackdrop} onPress={() => setShowGenerate(false)}>
        <Pressable style={s.genSheet} onPress={() => {}}>
          <View style={s.genHeader}>
            <Text style={s.genTitle}>{t(nativeLanguage, 'generateLink')}</Text>
            <TouchableOpacity onPress={() => setShowGenerate(false)} hitSlop={12}>
              <Text style={s.genClose}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={s.genBadge}>
            <Text style={s.genBadgeText}>{t(nativeLanguage, 'comingSoon')}</Text>
          </View>
          <Text style={s.genBody}>{t(nativeLanguage, 'generateComingSoon')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const streakBadge = user && streak > 0 ? (
    <View style={s.streakBadge}>
      <Text style={s.streakFlame}>🔥</Text>
      <Text style={s.streakText}>
        {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
      </Text>
      <Text style={s.streakSep}>·</Text>
      <Text style={s.streakMuted}>
        {nativeLanguage === 'Korean' ? `오늘 ${reviewedToday}개` : `${reviewedToday} ${reviewedToday === 1 ? 'card' : 'cards'} today`}
      </Text>
    </View>
  ) : null;

  // ── Empty state: tagline fills screen, search + chips pinned to bottom ──
  if (isEmpty) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        {streakBadge}
        <Pressable style={s.hero} onPress={Keyboard.dismiss}>
          <Text style={s.tagline}>{t(nativeLanguage, 'tagline')}</Text>
          <Text style={s.taglineSub}>{t(nativeLanguage, 'taglineSubtitle')}</Text>
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={-(searchRestingBottom - 8)}
        >
        <View style={[s.bottomBar, { paddingBottom: searchRestingBottom }]}>
            {wordOfTheDay && (
              <TouchableOpacity
                style={s.wotdCard}
                onPress={() => {
                  setTerm(wordOfTheDay.term);
                  // The card shows one specific sense — pin it as context so
                  // /api/explain doesn't come back asking which meaning we meant.
                  const senseHint = wordOfTheDay.briefDefinition
                    || (studyLanguage === 'English' ? wordOfTheDay.korean : wordOfTheDay.english);
                  resolveExplanation(wordOfTheDay.term, senseHint || undefined);
                }}
              >
                <Text style={s.wotdLabel}>{t(nativeLanguage, 'wordOfTheDay')}</Text>
                <View style={s.wotdRow}>
                  <Text style={s.wotdTerm}>{wordOfTheDay.term}</Text>
                  <Text style={s.wotdTranslation}>
                    {studyLanguage === 'English' ? wordOfTheDay.korean : wordOfTheDay.english}
                  </Text>
                </View>
                {wordOfTheDay.briefDefinition && (
                  <Text style={s.wotdDef}>{wordOfTheDay.briefDefinition}</Text>
                )}
              </TouchableOpacity>
            )}
            <View style={s.exampleRow}>
              <Text style={s.exampleLabel}>{t(nativeLanguage, 'exampleTermsLabel')}</Text>
              {exampleTerms.map(ex => (
                <TouchableOpacity key={ex} style={s.chip} onPress={() => { setTerm(ex); resolveExplanation(ex); }}>
                  <Text style={s.chipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.searchRow}>
              <TextInput
                style={s.searchInput}
                value={term}
                onChangeText={setTerm}
                placeholder={t(nativeLanguage, 'inputPlaceholder')}
                placeholderTextColor={C.muted}
                returnKeyType="search"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity style={s.searchBtn} onPress={handleSubmit}>
                <Text style={s.searchBtnText}>{t(nativeLanguage, 'learnButton')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.linksRow}>
              {getVocabPacks(studyLanguage).length > 0 && (
                <TouchableOpacity onPress={() => setShowPacks(true)}>
                  <Text style={s.linkText}>{t(nativeLanguage, 'packsLink')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowGenerate(true)}>
                <Text style={s.linkText}>{t(nativeLanguage, 'generateLink')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        {packsModal}
        {generateModal}
        {saveModal}
      </SafeAreaView>
    );
  }

  // ── Results state: search at top, results scroll below ──
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {streakBadge}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
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

          {saveSuccess && (
            <View style={s.successBanner}>
              <Text style={s.successText}>{t(nativeLanguage, 'flashcardSaved')}</Text>
            </View>
          )}

          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

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

          {core && (
            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTerm}>{core.term}</Text>
                {core.termLanguage === studyLanguage && (
                  <PronounceButton text={core.term} studyLanguage={studyLanguage} />
                )}
                {core.formality && core.formality !== 'N/A' && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{core.formality}</Text>
                  </View>
                )}
                {core.gender && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{core.gender}</Text>
                  </View>
                )}
                {core.furigana && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{core.furigana}</Text>
                  </View>
                )}
              </View>

              <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionTranslation')}</Text>
              <View style={s.translationRow}>
                <Text style={s.translationText}>{translation || t(nativeLanguage, 'noTranslation')}</Text>
                {core.termLanguage !== studyLanguage && translation && (
                  <PronounceButton text={translation} studyLanguage={studyLanguage} />
                )}
              </View>

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

              {!examples ? (
                <TouchableOpacity style={s.loadBtn} onPress={handleLoadExamples} disabled={loadingExamples}>
                  {loadingExamples
                    ? <ActivityIndicator color={C.text} size="small" />
                    : <Text style={s.loadBtnText}>{t(nativeLanguage, 'loadExamples')}</Text>}
                </TouchableOpacity>
              ) : (
                <View style={s.examplesSection}>
                  <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionExamples')}</Text>
                  {examples.map((ex, i) => {
                    const sides = getExampleSides(ex, studyLanguage);
                    return (
                      <View key={i} style={s.exampleItem}>
                        {sides.study ? (
                          <View style={s.exampleStudyRow}>
                            <Text style={[s.bodyText, s.exampleStudyText]}>{sides.study}</Text>
                            <PronounceButton text={sides.study} studyLanguage={studyLanguage} size="sm" />
                          </View>
                        ) : null}
                        {sides.back ? <Text style={s.exampleTranslation}>{sides.back}</Text> : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={s.divider} />
              <TouchableOpacity
                style={[s.saveBtn, !user && s.saveBtnDisabled]}
                onPress={user ? handleOpenSave : handleSignIn}
              >
                <Text style={s.saveBtnText}>
                  {user ? t(nativeLanguage, 'saveAsFlashcard') : t(nativeLanguage, 'signInToSave')}
                </Text>
              </TouchableOpacity>

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
      {packsModal}
      {generateModal}
      {saveModal}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: tabBarHeight, flexGrow: 1 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  streakFlame: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '700', color: C.text },
  streakSep: { fontSize: 13, color: C.muted },
  streakMuted: { fontSize: 13, color: C.muted },

  // Empty state layout
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, minHeight: 80 },
  bottomBar: { paddingHorizontal: 16, paddingBottom: tabBarHeight },

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

  tagline: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' },
  taglineSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 },
  exampleLabel: { fontSize: 13, color: C.muted, alignSelf: 'center' },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 14, color: C.text },

  // Word of the day
  wotdCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 16,
  },
  wotdLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  wotdRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  wotdTerm: { fontSize: 20, fontWeight: '700', color: C.highlight },
  wotdTranslation: { fontSize: 15, color: C.text, opacity: 0.85 },
  wotdDef: { fontSize: 13, color: C.muted, marginTop: 4 },

  // Packs / generate links
  linksRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 20, marginTop: 4 },
  linkText: { fontSize: 13, color: C.muted, textDecorationLine: 'underline' },

  // Generate coming-soon modal
  genBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  genSheet: { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24 },
  genHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  genTitle: { fontSize: 17, fontWeight: '700', color: C.highlight },
  genClose: { fontSize: 26, color: C.muted, lineHeight: 28 },
  genBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 12 },
  genBadgeText: { fontSize: 11, color: C.muted },
  genBody: { fontSize: 14, color: C.text, opacity: 0.85, lineHeight: 20 },

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
  translationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  translationText: { fontSize: 18, color: C.text, lineHeight: 26 },
  bodyText: { fontSize: 15, color: C.text, lineHeight: 22, opacity: 0.85 },
  exampleStudyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exampleStudyText: { flexShrink: 1 },
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
