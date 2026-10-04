import React, { useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SETUP_WORDS, SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES,
  getReading, getStudyLanguageConfig, lookupCardFaces, nativeOptionsFor, partOfSpeechLabel, t,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { applySpellingCorrection, getTermExplanation } from '../services/gemini';
import type { TermAmbiguous, TermCore } from '../services/gemini';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * Mobile first run — the port of web's `LanguageSetupModal`.
 *
 * ⚠️ **Three language questions now, not two.** The old flow asked for a native
 * language and a study language and inferred the rest from the pair. That
 * inference is what this change removes: the language Amgi speaks and the
 * language a deck is explained in are separate choices, and asking once means
 * guessing one of them.
 *
 * So: the app's language, what you want to learn, then what to explain it in.
 * The third step is prefilled from the first — answering it the same way is one
 * tap — but it is still *asked*, which is what makes it a choice rather than a
 * default nobody was shown.
 *
 * Then one real lookup, in place of a tour card that only *named* the
 * surfaces: a word, the explanation Learn would give for it, the card that
 * becomes, and one flip. See "Onboarding is not a checklist" in
 * `.scratchpad/decisions/app-shell.md` for why it lives here, full screen and
 * before the app, rather than on Learn.
 *
 * ⚠️ **The lookup is `/api/explain`, through the same client Learn uses** —
 * not a canned response and not a second prompt, which would drift from what
 * the app actually says.
 *
 * ⚠️ **Every walkthrough step can be skipped.** There is no dismiss, so a
 * lookup that fails or hangs must not be the only way forward. Skipping
 * commits the language answers exactly as finishing does.
 *
 * Blocking, with no dismiss, gated on `interfaceLanguage === null`. Every
 * answer is held locally and committed together on the last tap, so the gate
 * stays true for the whole flow and the caller needs no latch to keep this
 * mounted through its own final step.
 */
export default function LanguageSetupModal() {
  const { setInterfaceLanguage, addLanguage } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState<'interface' | 'study' | 'native' | 'word' | 'explain' | 'card'>('interface');
  const [pendingInterface, setPendingInterface] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);
  const [pendingNative, setPendingNative] = useState<string | null>(null);
  const [ownWord, setOwnWord] = useState('');
  const [lookedUp, setLookedUp] = useState<{ term: string; context?: string } | null>(null);
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  // Which lookup is current. Going back to pick another word leaves the old
  // request in flight, and its answer must not land on the new one.
  const request = useRef(0);

  // Deliberately not awaited. Both setters apply to state and AsyncStorage
  // before their Firestore write, and that write does not reject offline — it
  // simply never settles. Awaiting it would leave a signed-in user with no
  // connection stuck behind a modal that has no dismiss, which is the one
  // failure a blocking first run cannot afford.
  const handleDone = () => {
    if (!pendingInterface || !pendingStudy || !pendingNative) return;
    void setInterfaceLanguage(pendingInterface);
    void addLanguage({ study: pendingStudy, native: pendingNative });
  };

  /**
   * The pending answers stand in for the deck here: nothing is committed until
   * the last tap, so `studyLanguage` and `deckNativeLanguage` on the context
   * are still whatever they default to.
   */
  const lookUp = async (term: string, context?: string) => {
    if (!pendingStudy || !pendingNative) return;
    const current = ++request.current;
    setLookedUp({ term, context });
    setCore(null);
    setAmbiguity(null);
    setFailed(false);
    setFlipped(false);
    setLoading(true);
    setStep('explain');
    try {
      const raw = await getTermExplanation(term, pendingNative, context, pendingStudy);
      if (current !== request.current) return;
      // A corrected spelling is taken as the answer, with no banner: there is
      // nothing to decline it *to* in a flow that makes one card and moves on.
      const { result } = applySpellingCorrection(raw, term);
      if ('ambiguous' in result && result.ambiguous) setAmbiguity(result);
      else setCore(result as TermCore);
    } catch {
      if (current === request.current) setFailed(true);
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  const pickAnotherWord = () => {
    request.current++;
    setLoading(false);
    setStep('word');
  };

  const faces = core && pendingStudy ? lookupCardFaces(core, pendingStudy, pendingNative) : null;
  const reading = core && pendingStudy ? getReading(core, pendingStudy, pendingNative) : undefined;
  const partOfSpeech = core ? partOfSpeechLabel(pendingNative, core) : undefined;
  const chips = (partOfSpeech || reading) ? (
    <View style={s.chips}>
      {!!partOfSpeech && <Text style={s.chip}>{partOfSpeech}</Text>}
      {!!reading && <Text style={s.chip}>{reading}</Text>}
    </View>
  ) : null;

  return (
    // No `onRequestClose`: Android's back button must not dismiss this.
    // Opaque and full screen: this comes before the app, not on top of it.
    <Modal visible animationType="fade">
      <SafeAreaView style={s.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <Text style={s.welcome}>Welcome to Amgi · 암기에 오신 것을 환영합니다</Text>

          {step === 'interface' && (
            <>
              {/* Bilingual, because until this is answered there is no language
                  to ask the question in. */}
              <Text style={s.title}>What language should Amgi speak?</Text>
              <Text style={s.subtitle}>앱을 어떤 언어로 볼까요?</Text>
              <View style={s.options}>
                {SUPPORTED_NATIVE_LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={s.option}
                    onPress={() => {
                      setPendingInterface(lang.code);
                      // The obvious answer to the third question, offered
                      // rather than assumed — the step still runs.
                      setPendingNative(lang.code);
                      setStep('study');
                    }}
                  >
                    <Text style={s.optionText}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 'study' && (
            <>
              <Text style={s.title}>{t(pendingInterface, 'setupStudyTitle')}</Text>
              <Text style={s.subtitle}>{t(pendingInterface, 'setupStudySubtitle')}</Text>
              <ScrollView style={s.scroll} contentContainerStyle={s.options}>
                {SUPPORTED_STUDY_LANGUAGES.map(lang => {
                  const localizedLabel = t(pendingInterface, getStudyLanguageConfig(lang.code).studyLabelKey);
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={s.option}
                      onPress={() => {
                        setPendingStudy(lang.code);
                        // Studying the language you read the app in is a
                        // legitimate choice, but it cannot also be the
                        // explanation language — so the prefill moves off it.
                        const options = nativeOptionsFor(lang.code);
                        setPendingNative(current =>
                          current && options.some(o => o.code === current) ? current : options[0].code,
                        );
                        setStep('native');
                      }}
                    >
                      <Text style={s.optionText}>
                        {localizedLabel}
                        {lang.labelNative !== localizedLabel && (
                          <Text style={s.optionNative}>{`  ${lang.labelNative}`}</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={s.back} onPress={() => setStep('interface')}>
                <Text style={s.backText}>{t(pendingInterface, 'setupBack')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'native' && pendingStudy && (
            <>
              <Text style={s.title}>
                {t(pendingInterface, 'addLanguageNativeTitle', {
                  study: t(pendingInterface, getStudyLanguageConfig(pendingStudy).studyLabelKey),
                })}
              </Text>
              <Text style={s.subtitle}>{t(pendingInterface, 'addLanguageNativeSubtitle')}</Text>
              <View style={s.options}>
                {nativeOptionsFor(pendingStudy).map(option => (
                  <TouchableOpacity
                    key={option.code}
                    style={[s.option, pendingNative === option.code && s.optionOn]}
                    onPress={() => { setPendingNative(option.code); setStep('word'); }}
                  >
                    <Text style={s.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.back} onPress={() => setStep('study')}>
                <Text style={s.backText}>{t(pendingInterface, 'setupBack')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'word' && pendingStudy && (
            <>
              <Text style={s.title}>{t(pendingInterface, 'setupWordTitle')}</Text>
              <Text style={s.subtitle}>{t(pendingInterface, 'setupWordSubtitle')}</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => lookUp(SETUP_WORDS[pendingStudy])}>
                <Text style={s.primaryBtnText}>
                  {t(pendingInterface, 'setupWordSuggested', { term: SETUP_WORDS[pendingStudy] })}
                </Text>
              </TouchableOpacity>
              <Text style={s.ownLabel}>{t(pendingInterface, 'setupWordOwn')}</Text>
              <View style={s.ownRow}>
                <TextInput
                  style={s.input}
                  value={ownWord}
                  onChangeText={setOwnWord}
                  placeholder={t(pendingInterface, 'inputPlaceholder')}
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={() => { if (ownWord.trim()) lookUp(ownWord.trim()); }}
                />
                <TouchableOpacity
                  style={[s.option, s.ownBtn, !ownWord.trim() && s.disabled]}
                  disabled={!ownWord.trim()}
                  onPress={() => lookUp(ownWord.trim())}
                >
                  <Text style={s.optionText}>{t(pendingInterface, 'setupLookUp')}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.footer}>
                <TouchableOpacity onPress={() => setStep('native')}>
                  <Text style={s.backText}>{t(pendingInterface, 'setupBack')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={s.backText}>{t(pendingInterface, 'setupSkip')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'explain' && pendingStudy && (
            <>
              {loading && (
                <View style={s.loading}>
                  <ActivityIndicator color={C.highlight} />
                  <Text style={s.cardTerm}>{lookedUp?.term}</Text>
                </View>
              )}

              {failed && (
                <>
                  <Text style={[s.title, s.failedTitle]}>{t(pendingInterface, 'setupLookupFailed')}</Text>
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => lookedUp && lookUp(lookedUp.term, lookedUp.context)}
                  >
                    <Text style={s.primaryBtnText}>{t(pendingInterface, 'setupRetry')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {ambiguity && (
                <ScrollView style={s.scroll} contentContainerStyle={s.options}>
                  <Text style={s.cardTerm}>{ambiguity.term}</Text>
                  <Text style={s.hint}>{t(pendingInterface, 'disambiguationPrompt')}</Text>
                  {ambiguity.meanings.map((m, i) => (
                    <TouchableOpacity key={i} style={s.meaningBtn} onPress={() => lookUp(ambiguity.term, m.label)}>
                      <Text style={s.meaningLabel}>{m.label}</Text>
                      <Text style={s.hint}>{m.hint}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {core && faces && (
                <>
                  {/* The same fields, in the same order, as Learn's result. */}
                  <ScrollView style={s.scroll} contentContainerStyle={s.card}>
                    <Text style={s.cardTerm}>{faces.headword}</Text>
                    {chips}
                    <Text style={s.sectionLabel}>{t(pendingInterface, 'sectionTranslation')}</Text>
                    <Text style={s.translation}>{faces.back || t(pendingInterface, 'noTranslation')}</Text>
                    {!!faces.gloss && <Text style={s.hint}>{faces.gloss}</Text>}
                    {!!core.briefDefinition && <Text style={s.hint}>{core.briefDefinition}</Text>}
                  </ScrollView>
                  <TouchableOpacity style={[s.primaryBtn, s.afterCard]} onPress={() => setStep('card')}>
                    <Text style={s.primaryBtnText}>{t(pendingInterface, 'setupMakeCard')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.footer}>
                <TouchableOpacity onPress={pickAnotherWord}>
                  <Text style={s.backText}>{t(pendingInterface, 'setupOtherWord')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={s.backText}>{t(pendingInterface, 'setupSkip')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'card' && core && faces && (
            <>
              <Text style={s.title}>{t(pendingInterface, 'setupCardTitle')}</Text>
              <Text style={s.subtitle}>{t(pendingInterface, 'setupCardHint')}</Text>
              <TouchableOpacity
                style={[s.card, s.flipCard]}
                activeOpacity={0.8}
                onPress={() => setFlipped(f => !f)}
              >
                {flipped ? (
                  <>
                    <Text style={s.translation}>{faces.back || t(pendingInterface, 'noTranslation')}</Text>
                    {!!faces.gloss && <Text style={s.hint}>{faces.gloss}</Text>}
                    {chips}
                  </>
                ) : (
                  <Text style={s.flipFront}>{faces.headword}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, s.afterCard]} onPress={handleDone}>
                <Text style={s.primaryBtnText}>{t(pendingInterface, 'setupStart')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.back} onPress={() => setStep('explain')}>
                <Text style={s.backText}>{t(pendingInterface, 'setupBack')}</Text>
              </TouchableOpacity>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: C.bg },
    sheet: { flex: 1, justifyContent: 'center', padding: 28 },
    welcome: {
      fontSize: 11, color: C.muted, letterSpacing: 1,
      textTransform: 'uppercase', marginBottom: 20,
    },
    title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 15, fontWeight: '600', color: C.muted, marginBottom: 24 },
    options: { gap: 12 },
    // Nine study languages overflow a small screen; the sheet is height-capped,
    // so let them scroll rather than pushing the back link off. `flexShrink` is
    // load-bearing — React Native defaults it to 0.
    scroll: { flexShrink: 1 },
    option: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      backgroundColor: C.surface, paddingVertical: 14, alignItems: 'center',
    },
    optionOn: { borderColor: C.highlight },
    optionText: { fontSize: 16, fontWeight: '600', color: C.text },
    optionNative: { fontWeight: '400', color: C.muted },
    back: { marginTop: 16, alignSelf: 'flex-start' },
    backText: { fontSize: 14, color: C.muted },
    primaryBtn: {
      backgroundColor: C.highlight, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
    afterCard: { marginTop: 20 },
    ownLabel: { fontSize: 14, color: C.muted, marginTop: 28, marginBottom: 8 },
    ownRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10,
      backgroundColor: C.surface, color: C.text, fontSize: 16,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    ownBtn: { paddingHorizontal: 18 },
    disabled: { opacity: 0.5 },
    footer: { marginTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
    loading: { paddingVertical: 48, alignItems: 'center', gap: 16 },
    failedTitle: { marginBottom: 28 },
    card: {
      backgroundColor: C.surface, borderRadius: 14, padding: 22,
      borderWidth: 1, borderColor: C.border, gap: 8,
    },
    cardTerm: { fontSize: 24, fontWeight: '700', color: C.highlight },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      fontSize: 12, color: C.muted, borderWidth: 1, borderColor: C.border,
      borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
    },
    sectionLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 8 },
    translation: { fontSize: 18, fontWeight: '600', color: C.text },
    hint: { fontSize: 14, lineHeight: 21, color: C.muted },
    meaningBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      backgroundColor: C.surface, padding: 14, gap: 2,
    },
    meaningLabel: { fontSize: 16, fontWeight: '600', color: C.highlight },
    flipCard: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
    flipFront: { fontSize: 30, fontWeight: '700', color: C.highlight },
  });
}
