import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUser } from '../../src/context/UserContext';
import {
  getTermExplanation, getTermDepth, getTermExamples, getWordOfTheDay,
  streamTermDepth, streamTermExamples, applySpellingCorrection,
} from '../../src/services/gemini';
import {
  getCharacterBreakdown, getDepthTarget, getReading, getStudyLanguageConfig, getBackSideConfig,
  getTermBackSide, getExampleSides,
  parseStreamedDepth, parseStreamedExamples, wordOfTheDayCore,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import type { TermCore, TermDepth, TermAmbiguous, ExamplePair, SpellingCorrection, WordOfTheDay } from '../../src/services/gemini';
import { saveFlashcardToFirestore } from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import SaveFlashcardModal from '../../src/components/SaveFlashcardModal';
import PronounceButton from '../../src/components/PronounceButton';
import PageHeader from '../../src/components/PageHeader';
import Markdown from '../../src/components/Markdown';
import { SkeletonBar, SkeletonGroup } from '../../src/components/Skeleton';
import { t, partOfSpeechLabel } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import type { Palette } from '../../src/theme';

// Reveals streamed text a few characters per frame for a typewriter effect,
// then flushes whatever remains once the network stream is done.
function animateText(
  accRef: { current: string },
  doneRef: { current: boolean },
  onUpdate: (slice: string) => void,
  onDone: () => void,
) {
  let revealed = 0;
  const tick = () => {
    const total = accRef.current.length;
    if (doneRef.current) {
      if (revealed < total) onUpdate(accRef.current);
      onDone();
      return;
    }
    if (revealed < total) {
      revealed = Math.min(revealed + 6, total);
      onUpdate(accRef.current.slice(0, revealed));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const EXAMPLE_TERMS: Record<StudyLanguage, string[]> = {
  Korean: ['배', 'longing', '눈치', 'awkward', '사랑'],
  Swedish: ['lagom', 'fika', 'mysig', 'serendipity', 'lagstiftning'],
  English: ['serendipity', '아쉽다', 'procrastinate', '답답하다', 'nuance'],
  French: ['dépaysement', 'flâner', 'retrouvailles', 'longing', 'terroir'],
  Spanish: ['sobremesa', 'madrugar', 'empalagoso', 'awkward', 'duende'],
  Japanese: ['木漏れ日', '積ん読', 'nostalgia', 'awkward', '侘寂'],
  TraditionalChinese: ['緣分', '撒嬌', 'nostalgia', 'awkward', '將就'],
};

export default function LearnScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  /**
   * How much room to hold open below the search bar for the keyboard.
   *
   * A tuned constant rather than a measurement, because measuring means
   * reacting, and reacting means the field moves the first time you tap it.
   * iOS keyboards with the predictive bar land near 39-40% of screen height
   * across the current range, so 46% clears them with margin to spare and puts
   * the field close to the middle of the screen — which is where it wants to be
   * anyway.
   *
   * If a keyboard ever exceeds this, the field goes back under it. Raising the
   * number is the fix; it costs nothing but a slightly higher resting position.
   */
  const keyboardReserve = Dimensions.get('window').height * 0.46;
  const { user, nativeLanguage, studyLanguage, authLoading, handleSignIn, streak, reviewedToday } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  const exampleTerms = EXAMPLE_TERMS[studyLanguage] ?? EXAMPLE_TERMS.Korean;

  const [term, setTerm] = useState('');
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
  const [depth, setDepth] = useState<TermDepth | null>(null);
  const [examples, setExamples] = useState<ExamplePair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepth, setLoadingDepth] = useState(false);
  const [streamingDepth, setStreamingDepth] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [streamingExamples, setStreamingExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<Partial<Flashcard> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay | null>(null);
  const [wotdLoading, setWotdLoading] = useState(true);
  /**
   * The spelling question for the lookup on screen, once it has one.
   * `applied` is which way round it was answered — corrected by default, as
   * typed after the learner overrides — because the banner has to say which
   * word these results are about either way, and offer the other one.
   */
  const [correction, setCorrection] = useState<(SpellingCorrection & { applied: boolean }) | null>(null);

  // Word of the day — refreshes when the language pair changes. Non-essential:
  // any failure just hides the card (getWordOfTheDay returns null).
  useEffect(() => {
    if (nativeLanguage === undefined) return; // preferences still loading
    let cancelled = false;
    setWordOfTheDay(null);
    setWotdLoading(true);
    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local timezone
    // Never rejects — resolves to null on any failure, so the skeleton always
    // resolves to either the tile or nothing.
    getWordOfTheDay(date, studyLanguage, nativeLanguage ?? 'English')
      .then(data => { if (!cancelled) { setWordOfTheDay(data); setWotdLoading(false); } });
    return () => { cancelled = true; };
  }, [studyLanguage, nativeLanguage]);

  // A word tapped on a deck screen arrives as a route param, because looking it
  // up is this screen's job. `nonce` changes on every tap so the same word twice
  // still re-fires; waiting on `nativeLanguage` matters because preferences load
  // after mount and `studyLanguage` reads 'Korean' until they do.
  const { term: packTerm, context: packContext, nonce } = useLocalSearchParams<{
    term?: string; context?: string; nonce?: string;
  }>();
  useEffect(() => {
    if (nativeLanguage === undefined || !packTerm) return;
    setTerm(packTerm);
    resolveExplanation(packTerm, packContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packTerm, nonce, nativeLanguage]);

  const reset = () => {
    setCore(null); setAmbiguity(null); setDepth(null); setExamples(null);
    setCorrection(null);
    setError(null); setShowSaveModal(false); setFlashcardDraft(null);
    setSaveSuccess(false); setShowContextInput(false); setContextInput('');
    setLoadingDepth(false); setStreamingDepth(false);
    setLoadingExamples(false); setStreamingExamples(false);
  };

  /**
   * Identifies the lookup currently on screen. Every new lookup and every
   * clear bumps it, and the async writers below check it before touching
   * state — otherwise a request the user has walked away from still lands,
   * repopulating results they dismissed or pasting one term's depth under
   * another's translation.
   */
  const runId = useRef(0);

  /** Back to the empty state, abandoning whatever is on screen or in flight. */
  const clearSearch = () => {
    runId.current += 1;
    reset();
    setTerm('');
    setLoading(false);
    Keyboard.dismiss();
  };

  // A second tap on the Learn tab means "start over". Nothing else on this
  // screen goes back: the search bar sits above the results rather than
  // replacing them, so a term you looked up and decided against stays put
  // until you save it or restart the app. Re-tapping the tab you are already
  // on is where people reach for that, so it is what clears it.
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      // Only a re-tap. Arriving from another tab should leave your lookup
      // where you left it.
      if (!navigation.isFocused()) return;
      // Spelled out rather than reusing `isEmpty`: that is declared past the
      // authLoading early return, so it does not exist on every render, and
      // the success banner counts as something to clear even though it sits
      // in the empty state.
      if (loading || core || ambiguity || error || saveSuccess) clearSearch();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, loading, core, ambiguity, error, saveSuccess]);

  /**
   * @param exact Look the term up as typed, skipping spellcheck — the
   *   "search instead for…" override.
   * @param keptCorrection Carried over from the lookup this one follows on
   *   from: a declined correction, or the one still in force when a context
   *   lookup re-asks about a word that was already corrected. Context lookups
   *   never spellcheck, so without this the banner — and the way back to what
   *   was typed — would disappear on disambiguating.
   */
  const resolveExplanation = async (
    termValue: string,
    context?: string,
    exact = false,
    keptCorrection?: SpellingCorrection & { applied: boolean },
  ) => {
    const run = ++runId.current;
    setLoading(true);
    reset();
    try {
      const raw = await getTermExplanation(termValue, nativeLanguage ?? 'English', context, studyLanguage, exact);
      if (run !== runId.current) return;
      const { result, correction: spelling } = applySpellingCorrection(raw, termValue);
      if (spelling) setCorrection({ ...spelling, applied: true });
      else if (keptCorrection) setCorrection(keptCorrection);
      if ('ambiguous' in result && result.ambiguous) {
        setAmbiguity(result as TermAmbiguous);
      } else {
        setCore(result as TermCore);
      }
    } catch (e) {
      if (run !== runId.current) return;
      setError(t(nativeLanguage, 'errorExplanation'));
    } finally {
      if (run === runId.current) setLoading(false);
    }
  };

  /**
   * Opens the word of the day using the explanation stored with it, rather
   * than generating a second one. The card and the panel are then the same
   * text, so what gets saved is what was tapped.
   */
  const showWordOfTheDay = (wotd: WordOfTheDay) => {
    runId.current += 1;
    reset();
    setTerm(wotd.term);
    setCore(wordOfTheDayCore(wotd, studyLanguage, nativeLanguage));
  };

  const handleSubmit = () => {
    if (!term.trim()) return;
    resolveExplanation(term.trim());
  };

  const handleDisambiguate = (label: string) => {
    if (!ambiguity) return;
    resolveExplanation(ambiguity.term, label, false, correction ?? undefined);
  };

  /**
   * The escape hatch: look up the other spelling. Overriding a correction is
   * `exact`, so the model cannot simply correct it again; going back to the
   * correction is an ordinary lookup of a word already known to be spelled
   * right, so it stays a normal one.
   */
  const handleSwitchSpelling = () => {
    if (!correction) return;
    const declined = correction.applied;
    resolveExplanation(
      declined ? correction.typed : correction.corrected,
      undefined,
      declined,
      { ...correction, applied: !declined },
    );
  };

  const handleLoadDepth = async () => {
    if (!core) return;
    const run = runId.current;
    setLoadingDepth(true);
    setStreamingDepth(false);
    setDepth(null);
    const target = getDepthTarget(core, studyLanguage, nativeLanguage);
    const sense = { translation: target.translation, briefDefinition: target.briefDefinition };
    try {
      const res = await streamTermDepth({ ...target, nativeLanguage, studyLanguage });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const accRef = { current: '' };
      const doneRef = { current: false };
      let firstChunk = true;
      animateText(
        accRef, doneRef,
        slice => { if (run === runId.current) setDepth(parseStreamedDepth(slice)); },
        () => { if (run === runId.current) setStreamingDepth(false); },
      );
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accRef.current += decoder.decode(value, { stream: true });
        if (firstChunk && run === runId.current) { firstChunk = false; setLoadingDepth(false); setStreamingDepth(true); }
      }
      doneRef.current = true;
    } catch {
      // Streaming can fail (offline, proxy buffering) — fall back to the
      // non-streamed endpoint so digging deeper still works.
      try {
        const fallback = await getTermDepth(target.term, target.termLanguage, nativeLanguage ?? 'English', sense, studyLanguage);
        if (run === runId.current) setDepth(fallback);
      } catch {
        if (run === runId.current) setError(t(nativeLanguage, 'errorLoadDepth'));
      }
      if (run !== runId.current) return;
      setLoadingDepth(false);
      setStreamingDepth(false);
    }
  };

  const handleLoadExamples = async () => {
    if (!core) return;
    const run = runId.current;
    setLoadingExamples(true);
    setStreamingExamples(false);
    setExamples(null);
    const target = getDepthTarget(core, studyLanguage, nativeLanguage);
    const sense = { translation: target.translation, briefDefinition: target.briefDefinition };
    try {
      const res = await streamTermExamples({ ...target, nativeLanguage, studyLanguage });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const accRef = { current: '' };
      const doneRef = { current: false };
      let firstChunk = true;
      animateText(
        accRef, doneRef,
        slice => {
          if (run !== runId.current) return;
          const parsed = parseStreamedExamples(slice, studyLanguage, nativeLanguage);
          if (parsed.length > 0) setExamples(parsed);
        },
        () => { if (run === runId.current) setStreamingExamples(false); },
      );
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accRef.current += decoder.decode(value, { stream: true });
        if (firstChunk && run === runId.current) { firstChunk = false; setLoadingExamples(false); setStreamingExamples(true); }
      }
      doneRef.current = true;
    } catch {
      try {
        const fallback = await getTermExamples(target.term, target.termLanguage, nativeLanguage ?? 'English', sense, studyLanguage);
        if (run === runId.current) setExamples(fallback);
      } catch {
        if (run === runId.current) setError(t(nativeLanguage, 'errorLoadExamples'));
      }
      if (run !== runId.current) return;
      setLoadingExamples(false);
      setStreamingExamples(false);
    }
  };

  const handleOpenSave = () => {
    if (!core) return;
    const studySide = core.termLanguage === studyLanguage ? core.term : (core[langConfig.studyField] ?? '');
    const backSide = core.termLanguage === backConfig.backLanguage
      ? core.term
      : getTermBackSide(core, studyLanguage, nativeLanguage);
    setFlashcardDraft({
      ...core,
      ...(depth ?? {}),
      examples: examples ?? [],
      studyLanguage,
      [langConfig.studyField]: studySide,
      [backConfig.backField]: backSide,
    });
    setShowSaveModal(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!flashcardDraft || !user) return;
    setSaving(true);
    try {
      await saveFlashcardToFirestore({ ...(flashcardDraft as Omit<Flashcard, 'createdAt' | 'id'>), uid: user.uid }, studyLanguage);
      // A save clears the screen like any other exit, so a depth or examples
      // stream still running for this term must not write into the next one.
      runId.current += 1;
      setShowSaveModal(false);
      setFlashcardDraft(null);
      setCore(null); setDepth(null); setExamples(null); setAmbiguity(null);
      setTerm('');
      // Clears any stale error from this term (a failed depth/examples load).
      // Left set, it would keep the empty state suppressed after the save.
      setError(null);
      setSaveSuccess(true);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (!core || !contextInput.trim()) return;
    resolveExplanation(core.term, contextInput.trim(), false, correction ?? undefined);
  };

  const translation = core
    ? (core.termLanguage === studyLanguage
        ? getTermBackSide(core, studyLanguage, nativeLanguage)
        : core[langConfig.studyField]) || core.translation
    : null;

  // The first thing a cold launch shows, so it is the one placeholder that has
  // to look like the app. Laid out as the empty state below — chips and search
  // bar resting low, word of the day under them — so the launch resolves into
  // position instead of replacing a centred spinner with a full screen.
  //
  // Text-free on purpose, and not only because skeletons are: `nativeLanguage`
  // is still undefined here, so every label would render in English first and
  // correct itself a moment later for a Korean reader.
  if (authLoading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        {/* Sized from PageHeader's title, which is what lands here. */}
        <View style={s.skelHeader}>
          <SkeletonBar width={104} height={22} />
        </View>
        <SkeletonGroup label="Loading" style={s.flex}>
          <View style={s.topSpacer} />
          <View style={s.bottomBar}>
            <View style={s.exampleRow}>
              <SkeletonBar width={62} height={15} />
              <SkeletonBar width={54} height={30} />
              <SkeletonBar width={70} height={30} />
              <SkeletonBar width={58} height={30} />
            </View>
            <View style={s.searchRow}>
              <SkeletonBar height={44} style={s.flex} />
              <SkeletonBar width={72} height={44} />
            </View>
          </View>
          <View style={[s.keyboardReserve, { height: keyboardReserve }]}>
            <View style={s.wotdCard}>
              <SkeletonBar width={88} height={11} />
              <View style={[s.wotdRow, s.skelWotdRow]}>
                <SkeletonBar width={92} height={24} />
                <SkeletonBar width={120} height={18} />
              </View>
              <SkeletonBar width="70%" height={16} style={s.skelDef} />
            </View>
          </View>
        </SkeletonGroup>
      </SafeAreaView>
    );
  }

  // Deliberately not gated on saveSuccess: a save clears the result, so the
  // empty state is where you land afterwards. The success banner renders
  // inside it rather than suppressing it — otherwise saving leaves you on a
  // bare search field with no way back to packs or the word of the day.
  const isEmpty = !loading && !core && !ambiguity && !error;

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

  // The badge is the way into the progress screen — it is already the thing on
  // screen that means "how am I doing", and promoting it beats a sixth tab.
  const streakBadge = user && streak > 0 ? (
    <TouchableOpacity
      style={s.streakBadge}
      onPress={() => router.push('/progress')}
      accessibilityRole="button"
      accessibilityLabel={t(nativeLanguage, 'progressTitle')}
      hitSlop={8}
    >
      <Text style={s.streakFlame}>🔥</Text>
      <Text style={s.streakText}>
        {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
      </Text>
      <Text style={s.streakSep}>·</Text>
      <Text style={s.streakMuted}>
        {nativeLanguage === 'Korean' ? `오늘 ${reviewedToday}개` : `${reviewedToday} ${reviewedToday === 1 ? 'card' : 'cards'} today`}
      </Text>
    </TouchableOpacity>
  ) : null;

  // ── Empty state: search + chips resting in the lower part of the screen ──
  if (isEmpty) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <PageHeader
          titleKey="navLearn"
          helpTitleKey="helpLearnTitle"
          helpLeadKey="helpLearnLead"
          helpPointsKey="helpLearnPoints"
        />
        {streakBadge}
        {/* One big dismiss target. With the bar pinned rather than lifted,
            there is no guarantee of a large empty spacer to aim at, and a
            keyboard you cannot put away is worse than one that covers things.
            Children with their own handlers still take their taps first. */}
        <Pressable style={s.flex} onPress={Keyboard.dismiss}>
          <View style={s.topSpacer} />

          <View style={s.bottomBar}>
            {saveSuccess && (
              <View style={s.successBanner}>
                <Text style={s.successText}>{t(nativeLanguage, 'flashcardSaved')}</Text>
              </View>
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
          </View>

          {/* The space the keyboard will take, held open whether or not it is
              up, so the field sits in exactly one place either way. Nothing
              lifts on focus — a search bar that jumps as you tap it is the
              thing being fixed here, and KeyboardAvoidingView cannot help
              without moving something.

              Word of the day lives inside this band: below the field where it
              belongs when you are browsing, and simply covered by the keyboard
              once you start typing. */}
          <View style={[s.keyboardReserve, { height: keyboardReserve }]}>
            {wotdLoading && (
              // Sized from the real tile's rows so nothing shifts when the word
              // of the day arrives. Keeps its label: unlike the cold-launch
              // placeholder above, the rest of the screen is already here and
              // the tile is only saying what is filling it in.
              <SkeletonGroup label={t(nativeLanguage, 'wordOfTheDay')} style={s.wotdCard}>
                <Text style={s.wotdLabel}>{t(nativeLanguage, 'wordOfTheDay')}</Text>
                <View style={s.wotdRow}>
                  <SkeletonBar width={92} height={24} />
                  <SkeletonBar width={120} height={18} />
                </View>
                <SkeletonBar width="70%" height={16} style={s.skelDef} />
              </SkeletonGroup>
            )}
            {wordOfTheDay && (
              <TouchableOpacity
                style={s.wotdCard}
                onPress={() => showWordOfTheDay(wordOfTheDay)}
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
          </View>
        </Pressable>
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

          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Spelling correction — above whichever of the two results follows,
              so the learner reads which word this is about before reading
              about it. Muted rather than a warning: being wrong here is
              expected often enough that the way out sits right beside it. */}
          {correction && (core || ambiguity) && (
            <View style={s.correctionRow}>
              <Text style={s.correctionText}>
                {t(nativeLanguage, 'showingResultsFor', {
                  term: correction.applied ? correction.corrected : correction.typed,
                })}
              </Text>
              <TouchableOpacity onPress={handleSwitchSpelling} disabled={loading}>
                <Text style={[s.correctionLink, loading && s.correctionLinkDisabled]}>
                  {t(nativeLanguage, 'searchInsteadFor', {
                    term: correction.applied ? correction.typed : correction.corrected,
                  })}
                </Text>
              </TouchableOpacity>
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
                  <PronounceButton text={core.term} furigana={core.furigana} studyLanguage={studyLanguage} />
                )}
                {partOfSpeechLabel(nativeLanguage, core) && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{partOfSpeechLabel(nativeLanguage, core)}</Text>
                  </View>
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
                {getReading(core) && (
                  <View style={s.formalityBadge}>
                    <Text style={s.formalityText}>{getReading(core)}</Text>
                  </View>
                )}
              </View>

              <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionTranslation')}</Text>
              <View style={s.translationRow}>
                <Text style={s.translationText}>{translation || t(nativeLanguage, 'noTranslation')}</Text>
                {core.termLanguage !== studyLanguage && translation && (
                  <PronounceButton text={translation} furigana={core.furigana} studyLanguage={studyLanguage} />
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
                      <Markdown>{depth.definition}</Markdown>
                    </>
                  )}
                  {getCharacterBreakdown(depth) && (
                    <>
                      <Text style={s.sectionLabel}>
                        {t(nativeLanguage, langConfig.characterSectionKey ?? 'sectionHanja')}
                      </Text>
                      <Markdown>{getCharacterBreakdown(depth)!}</Markdown>
                    </>
                  )}
                  {depth.notes && (
                    <>
                      <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionContext')}</Text>
                      <Markdown>{depth.notes}</Markdown>
                    </>
                  )}
                  {streamingDepth && <Text style={s.cursor}>▎</Text>}
                </View>
              )}

              {!examples && !streamingExamples ? (
                <TouchableOpacity style={s.loadBtn} onPress={handleLoadExamples} disabled={loadingExamples}>
                  {loadingExamples
                    ? <ActivityIndicator color={C.text} size="small" />
                    : <Text style={s.loadBtnText}>{t(nativeLanguage, 'loadExamples')}</Text>}
                </TouchableOpacity>
              ) : (
                <View style={s.examplesSection}>
                  <Text style={s.sectionLabel}>{t(nativeLanguage, 'sectionExamples')}</Text>
                  {(examples ?? []).map((ex, i) => {
                    const sides = getExampleSides(ex, studyLanguage, nativeLanguage);
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
                  {streamingExamples && <Text style={s.cursor}>▎</Text>}
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
      {saveModal}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: tabBarHeight, flexGrow: 1 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  streakFlame: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '700', color: C.text },
  streakSep: { fontSize: 13, color: C.muted },
  streakMuted: { fontSize: 13, color: C.muted },

  // Empty state layout. Absorbs the space above the bottom bar; shrinks to
  // nothing rather than pushing the bar off screen.
  topSpacer: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  bottomBar: { paddingHorizontal: 16 },
  // Fixed height, never shrinks: the whole point is that this band does not
  // change size when the keyboard appears in it.
  keyboardReserve: { flexShrink: 0, paddingHorizontal: 16 },

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

  // Skeleton bars stand in for the term/translation/definition rows at the
  // same heights, so the card occupies its final height before the fetch lands.
  skelDef: { marginTop: 4 },
  // Cold launch only, where there is no real label above the row to space it.
  skelWotdRow: { marginTop: 6 },
  // Matches PageHeader's own padding, since that is what replaces this.
  skelHeader: { paddingHorizontal: 20, paddingVertical: 12 },


  successBanner: { backgroundColor: C.border, borderRadius: 10, padding: 14, marginBottom: 12 },
  successText: { color: C.text, fontWeight: '600' },
  errorBanner: { backgroundColor: '#fde8e8', borderRadius: 10, padding: 14, marginBottom: 12 },
  errorText: { color: C.error, fontWeight: '600' },

  // Wraps rather than truncates: the two spellings are the whole point of the
  // row, and on a narrow screen they will not sit on one line.
  correctionRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  correctionText: { fontSize: 14, color: C.muted },
  correctionLink: { fontSize: 14, color: C.highlight, textDecorationLine: 'underline' },
  correctionLinkDisabled: { opacity: 0.5 },

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
  cursor: { color: C.muted, fontSize: 15, marginTop: 4 },

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
