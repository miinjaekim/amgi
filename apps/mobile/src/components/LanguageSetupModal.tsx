import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES,
  getStudyLanguageConfig, t,
} from '@amgi/core';
import type { StudyLanguage, TranslationKey } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * Mobile first run — the port of web's `LanguageSetupModal`, blocking for the
 * same reason: filtering the chosen native language out of the study options
 * is what makes "native Korean, studying Korean" unreachable, and it only
 * holds if the questions cannot be walked past. Mobile had no equivalent, so
 * it fell back to two independently chosen defaults that collided.
 *
 * Three steps: native, study, then one pass over what the app does. No
 * dismiss and nothing recorded — it is gated on `nativeLanguage === null`,
 * which finishing it clears for good.
 *
 * Both answers are held locally and committed together on the last tap, not as
 * they are given, so the gate stays true for the whole flow and the caller
 * needs no latch to keep this mounted through its own final step.
 */
export default function LanguageSetupModal() {
  const { setNativeLanguage, setStudyLanguage } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState<'native' | 'study' | 'tour'>('native');
  const [pendingNative, setPendingNative] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);

  // Deliberately not awaited. Both setters apply to state and AsyncStorage
  // before their Firestore write, and that write does not reject offline — it
  // simply never settles. Awaiting it would leave a signed-in user with no
  // connection stuck behind a modal that has no dismiss, which is the one
  // failure a blocking first run cannot afford. Neither setter reads the
  // other's result: the study language was chosen from a list the native
  // language was filtered out of, so the collision resolvers have nothing to
  // correct.
  const handleDone = () => {
    if (!pendingNative || !pendingStudy) return;
    void setNativeLanguage(pendingNative);
    void setStudyLanguage(pendingStudy);
  };

  return (
    // No `onRequestClose`: Android's back button must not dismiss this.
    <Modal visible transparent animationType="fade">
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.welcome}>Welcome to Amgi · 암기에 오신 것을 환영합니다</Text>

          {step === 'native' && (
            <>
              <Text style={s.title}>What is your native language?</Text>
              <Text style={s.subtitle}>모국어가 무엇인가요?</Text>
              <View style={s.options}>
                {SUPPORTED_NATIVE_LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={s.option}
                    onPress={() => { setPendingNative(lang.code); setStep('study'); }}
                  >
                    <Text style={s.optionText}>{lang.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 'study' && (
            <>
              <Text style={s.title}>{t(pendingNative, 'setupStudyTitle')}</Text>
              <Text style={s.subtitle}>{t(pendingNative, 'setupStudySubtitle')}</Text>
              <View style={s.options}>
                {SUPPORTED_STUDY_LANGUAGES.filter(lang => lang.code !== pendingNative).map(lang => {
                  const localizedLabel = t(pendingNative, getStudyLanguageConfig(lang.code).studyLabelKey);
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={s.option}
                      onPress={() => { setPendingStudy(lang.code); setStep('tour'); }}
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
              </View>
              <TouchableOpacity style={s.back} onPress={() => setStep('native')}>
                <Text style={s.backText}>{t(pendingNative, 'setupBack')}</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'tour' && (
            <>
              <Text style={s.title}>{t(pendingNative, 'tourTitle')}</Text>
              <ScrollView style={s.tour} contentContainerStyle={s.tourContent}>
                {TOUR_ROWS.map(({ labelKey, bodyKey }) => (
                  <View key={labelKey} style={s.tourRow}>
                    <Text style={s.tourLabel}>{t(pendingNative, labelKey)}</Text>
                    <Text style={s.tourBody}>{t(pendingNative, bodyKey)}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.startBtn} onPress={handleDone}>
                <Text style={s.startBtnText}>{t(pendingNative, 'tourStart')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Learn, Review and Packs borrow their nav labels; Writing is a mode on Learn
// rather than a tab, so it carries its own.
const TOUR_ROWS: { labelKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { labelKey: 'navLearn', bodyKey: 'tourLearnBody' },
  { labelKey: 'navReview', bodyKey: 'tourReviewBody' },
  { labelKey: 'navDecks', bodyKey: 'tourDecksBody' },
  { labelKey: 'tourWritingLabel', bodyKey: 'tourWritingBody' },
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
    option: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      backgroundColor: C.bg, paddingVertical: 14, alignItems: 'center',
    },
    optionText: { fontSize: 16, fontWeight: '600', color: C.text },
    optionNative: { fontWeight: '400', color: C.muted },
    back: { marginTop: 16, alignSelf: 'flex-start' },
    backText: { fontSize: 14, color: C.muted },
    // The four rows can overflow a small screen; the sheet is height-capped,
    // so let them scroll rather than pushing the button off. `flexShrink` is
    // load-bearing — React Native defaults it to 0, so without it the
    // ScrollView keeps its full content height and the cap clips the button
    // instead of the list.
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
