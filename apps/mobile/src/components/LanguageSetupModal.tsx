import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES,
  getStudyLanguageConfig, nativeOptionsFor, t,
} from '@amgi/core';
import type { StudyLanguage, TranslationKey } from '@amgi/core';
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
 * Blocking, with no dismiss, gated on `interfaceLanguage === null`. Every
 * answer is held locally and committed together on the last tap, so the gate
 * stays true for the whole flow and the caller needs no latch to keep this
 * mounted through its own final step.
 */
export default function LanguageSetupModal() {
  const { setInterfaceLanguage, addLanguage } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState<'interface' | 'study' | 'native' | 'tour'>('interface');
  const [pendingInterface, setPendingInterface] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);
  const [pendingNative, setPendingNative] = useState<string | null>(null);

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

  return (
    // No `onRequestClose`: Android's back button must not dismiss this.
    <Modal visible transparent animationType="fade">
      <View style={s.backdrop}>
        <View style={s.sheet}>
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
                    onPress={() => { setPendingNative(option.code); setStep('tour'); }}
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

          {step === 'tour' && (
            <>
              <Text style={s.title}>{t(pendingInterface, 'tourTitle')}</Text>
              <ScrollView style={s.tour} contentContainerStyle={s.tourContent}>
                {TOUR_ROWS.map(({ labelKey, bodyKey }) => (
                  <View key={labelKey} style={s.tourRow}>
                    <Text style={s.tourLabel}>{t(pendingInterface, labelKey)}</Text>
                    <Text style={s.tourBody}>{t(pendingInterface, bodyKey)}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.startBtn} onPress={handleDone}>
                <Text style={s.startBtnText}>{t(pendingInterface, 'tourStart')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Every row borrows its nav label, so what the tour names is exactly what the
// nav is called.
const TOUR_ROWS: { labelKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { labelKey: 'navLearn', bodyKey: 'tourLearnBody' },
  { labelKey: 'navReview', bodyKey: 'tourReviewBody' },
  { labelKey: 'navDecks', bodyKey: 'tourDecksBody' },
];

function makeStyles(C: Palette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    sheet: {
      width: '100%', maxHeight: '85%', backgroundColor: C.surface,
      borderRadius: 20, padding: 28, borderWidth: 1, borderColor: C.border,
    },
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
      backgroundColor: C.bg, paddingVertical: 14, alignItems: 'center',
    },
    optionOn: { borderColor: C.highlight },
    optionText: { fontSize: 16, fontWeight: '600', color: C.text },
    optionNative: { fontWeight: '400', color: C.muted },
    back: { marginTop: 16, alignSelf: 'flex-start' },
    backText: { fontSize: 14, color: C.muted },
    tour: { marginTop: 20, flexShrink: 1 },
    tourContent: { gap: 20 },
    tourRow: { gap: 4 },
    tourLabel: { fontSize: 14, fontWeight: '700', color: C.highlight },
    tourBody: { fontSize: 14, lineHeight: 21, color: C.text, opacity: 0.75 },
    startBtn: {
      marginTop: 28, backgroundColor: C.highlight, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    startBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
  });
}
