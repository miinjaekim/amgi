import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Keyboard,
} from 'react-native';
import {
  buildWritingCardDraft, getStudyLanguageConfig, offersCard, t, WRITING_MAX_CHARS,
} from '@amgi/core';
import type {
  FindingKind, TranslationKey, WritingCardCandidate, WritingReview,
} from '@amgi/core';
import { getWritingReview } from '../services/gemini';
import { saveFlashcardToFirestore } from '../services/firestore';
import type { Flashcard } from '../services/firestore';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import PronounceButton from './PronounceButton';
import CopyButton from './CopyButton';
import TextDiff from './TextDiff';
import type { Palette } from '../theme';

const KIND_LABEL_KEY: Record<FindingKind, TranslationKey> = {
  grammar: 'writingKindGrammar',
  naturalness: 'writingKindNaturalness',
  register: 'writingKindRegister',
  vocabulary: 'writingKindVocabulary',
};

/**
 * Writing review, native side. Mirrors the web panel — same core types, same
 * `/api/writing` call, same ordered findings, same `offersCard` rule.
 *
 * Restored 2026-09-21 from `1ebdc9b^`, and it moved: this was the passage half
 * of Learn behind a Word/Passage toggle and is now a Munli tool with a surface
 * of its own.
 *
 * Owns its own submission, result and card saving rather than reaching into
 * the Learn screen's state: saving a card here must NOT clear the passage the
 * way saving from a word lookup clears the term, because you keep reading the
 * rest of the findings afterwards.
 */
export default function WritingReviewPanel() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  // Two languages, not one — see the 2026-09-12 decision. Chrome takes the
  // interface language; the model's notes and the card's back slot take the
  // deck's.
  const { user, interfaceLanguage, deckNativeLanguage, studyLanguage, handleSignIn } = useUser();

  const [text, setText] = useState('');
  const [review, setReview] = useState<WritingReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [savingCard, setSavingCard] = useState<string | null>(null);
  /**
   * The passage as submitted, which is what the diff is against — not `text`,
   * which stays editable after a review returns. Diffing the rewrite against a
   * passage the user has since changed would invent edits nobody made.
   */
  const [submitted, setSubmitted] = useState('');
  const [showClean, setShowClean] = useState(false);

  const languageLabel = t(interfaceLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);
  const overLimit = text.length > WRITING_MAX_CHARS;

  const handleSubmit = async () => {
    if (!text.trim() || overLimit || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setReview(null);
    setSavedCards(new Set());
    setShowClean(false);
    try {
      const passage = text.trim();
      const result = await getWritingReview(passage, deckNativeLanguage ?? 'English', studyLanguage);
      setSubmitted(passage);
      setReview(result);
    } catch (err) {
      setError(t(interfaceLanguage, 'errorWritingReview'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (candidate: WritingCardCandidate) => {
    if (!user) {
      handleSignIn();
      return;
    }
    setSavingCard(candidate.study);
    setError(null);
    try {
      const draft = buildWritingCardDraft(candidate, user.uid, studyLanguage);
      await saveFlashcardToFirestore(draft as unknown as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
      setSavedCards(prev => new Set(prev).add(candidate.study));
    } catch {
      setError(t(interfaceLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingCard(null);
    }
  };


  return (
    /**
     * `automaticallyAdjustKeyboardInsets` rather than a `KeyboardAvoidingView`.
     *
     * KAV with `padding` only shrinks the container — it does not scroll the
     * caret back into view, so on a passage longer than a few lines the text
     * you are actively typing ends up under the keyboard. Letting the
     * ScrollView own the keyboard inset keeps the caret visible as the input
     * grows, and the two mechanisms fight each other if both are present.
     */
    <ScrollView
      style={s.flex}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <TextInput
        style={s.input}
        value={text}
        onChangeText={setText}
        placeholder={t(interfaceLanguage, 'writingPlaceholder', { language: languageLabel })}
        placeholderTextColor={C.muted}
        multiline
        textAlignVertical="top"
        editable={!loading}
      />
      <View style={s.actionRow}>
        <Text style={[s.counter, overLimit && s.counterOver]}>
          {text.length} / {WRITING_MAX_CHARS}
        </Text>
        <TouchableOpacity
          style={[s.submitBtn, (loading || !text.trim() || overLimit) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !text.trim() || overLimit}
        >
          {loading
            ? <ActivityIndicator color={C.bg} size="small" />
            : <Text style={s.submitBtnText}>{t(interfaceLanguage, 'writingButton')}</Text>}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {review && (
        <>
          <View style={s.card}>
            <View style={s.rewriteHeaderRow}>
              <Text style={[s.sectionLabel, s.sectionLabelShrink]}>{t(interfaceLanguage, 'writingRewriteHeading')}</Text>
              <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} />
              {/* Always the clean rewrite, never the diff — copying text with
                  the deletions in it would paste the mistakes back. */}
              <CopyButton text={review.rewrite} interfaceLanguage={interfaceLanguage} />
              {/* The clean rewrite stays reachable — it is the version you
                  would read aloud, and a heavily edited passage is hard to read
                  as a sentence through its own diff. */}
              <TouchableOpacity style={s.viewToggle} onPress={() => setShowClean(v => !v)}>
                <Text style={s.viewToggleText}>
                  {t(interfaceLanguage, showClean ? 'writingViewChanges' : 'writingViewFinal')}
                </Text>
              </TouchableOpacity>
            </View>
            {showClean ? (
              <Text style={s.rewriteText}>{review.rewrite}</Text>
            ) : (
              <TextDiff before={submitted} after={review.rewrite} studyLanguage={studyLanguage} />
            )}

            {/* The check that a correction didn't change what they meant.
                Subordinate to the rewrite, but never behind a tap — a check
                nobody opens is a check nobody runs. */}
            {review.rewriteNative && (
              <View style={s.nativeBlock}>
                <Text style={s.sectionLabel}>{t(interfaceLanguage, 'writingRewriteMeaning')}</Text>
                <Text style={s.nativeText}>{review.rewriteNative}</Text>
              </View>
            )}
          </View>

          <Text style={s.findingsHeading}>{t(interfaceLanguage, 'writingFindingsHeading')}</Text>

          {review.findings.length === 0 ? (
            <Text style={s.noFindings}>{t(interfaceLanguage, 'writingNoFindings')}</Text>
          ) : (
            /* One ordered list, never grouped by kind — the order is the
               model's judgement of what this writer most needs, which is what
               makes the feedback meet them at their level. */
            review.findings.map((finding, i) => {
              const saved = finding.card ? savedCards.has(finding.card.study) : false;
              const savingThis = finding.card ? savingCard === finding.card.study : false;

              const showCard = offersCard(finding);
              return (
                <View key={i} style={s.finding}>
                  <View style={s.kindBadge}>
                    <Text style={s.kindText}>{t(interfaceLanguage, KIND_LABEL_KEY[finding.kind])}</Text>
                  </View>

                  {(finding.original || finding.suggested) && (
                    <View style={s.spanRow}>
                      {finding.original && <Text style={s.original}>{finding.original}</Text>}
                      {finding.original && finding.suggested && <Text style={s.arrow}>→</Text>}
                      {finding.suggested && <Text style={s.suggested}>{finding.suggested}</Text>}
                    </View>
                  )}

                  <Text style={s.note}>{finding.note}</Text>

                  {showCard && finding.card && (
                    <View style={s.cardRow}>
                      {/* A word they demonstrably reached for and did not have.
                          Marked, because it is different evidence from every
                          other suggestion: not "this would be worth knowing"
                          but "you needed this and it wasn't there." */}
                      {finding.card.gap && (
                        <View style={s.gapBadge}>
                          <Text style={s.gapBadgeText}>{t(interfaceLanguage, 'writingWordYouNeeded')}</Text>
                        </View>
                      )}
                      <Text style={s.cardStudy}>{finding.card.study}</Text>
                      <PronounceButton text={finding.card.study} studyLanguage={studyLanguage} />
                      <Text style={s.cardBack} numberOfLines={2}>
                        {deckNativeLanguage === 'Korean' ? finding.card.back.Korean : finding.card.back.English}
                      </Text>
                      <TouchableOpacity
                        style={[s.addBtn, (saved || savingThis) && s.addBtnDisabled]}
                        onPress={() => finding.card && handleAddCard(finding.card)}
                        disabled={saved || savingThis}
                      >
                        {savingThis
                          ? <ActivityIndicator color={C.text} size="small" />
                          : <Text style={s.addBtnText}>{t(interfaceLanguage, saved ? 'writingCardSaved' : 'writingAddCard')}</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    flex: { flex: 1 },
    // ⚠️ No tab-bar reserve. This used to sit in Learn, under the floating bar;
    // Munli is a Stack with no bar, so reserving for one would leave a band of
    // dead space under the last finding.
    scroll: { padding: 16, paddingBottom: 40 },


    input: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 23,
      color: C.text, backgroundColor: C.surface,
      // Bounded on both ends. Without a ceiling the field grows with the
      // passage until the counter and the submit button are pushed off screen,
      // so past `maxHeight` the text scrolls inside the field instead.
      minHeight: 150, maxHeight: 260,
    },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 16 },
    counter: { fontSize: 12, color: C.muted },
    counterOver: { color: C.error, fontWeight: '700' },
    submitBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingHorizontal: 20, paddingVertical: 10, minWidth: 80, alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },

    errorBanner: { backgroundColor: '#fde8e8', borderRadius: 10, padding: 14, marginBottom: 12 },
    errorText: { color: C.error, fontWeight: '600' },

    card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 20 },
    // Wraps, because the heading is a full sentence in uppercase and the row
    // also carries a pronounce button and the Changes/Final toggle — on a
    // narrow phone the toggle ran off the edge. Wrapping drops it to its own
    // line rather than truncating a label or shrinking a tap target.
    rewriteHeaderRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    viewToggle: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    viewToggleText: { fontSize: 11, color: C.muted },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    sectionLabelShrink: { flexShrink: 1 },
    rewriteText: { fontSize: 17, color: C.text, lineHeight: 26 },
    nativeBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
    nativeText: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 21 },

    findingsHeading: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    noFindings: { fontSize: 14, color: C.muted, lineHeight: 21 },

    finding: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
    kindBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    kindText: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    spanRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    original: { fontSize: 15, color: C.text, opacity: 0.5, textDecorationLine: 'line-through' },
    arrow: { fontSize: 15, color: C.muted },
    suggested: { fontSize: 15, fontWeight: '700', color: C.highlight },
    note: { fontSize: 14, color: C.text, opacity: 0.8, lineHeight: 21, marginTop: 8 },

    cardRow: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    gapBadge: { backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    gapBadgeText: { fontSize: 9, color: C.bg, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    cardStudy: { fontSize: 15, fontWeight: '700', color: C.text },
    cardBack: { fontSize: 13, color: C.muted, flexShrink: 1 },
    addBtn: {
      marginLeft: 'auto', borderWidth: 1, borderColor: C.border, borderRadius: 16,
      paddingHorizontal: 12, paddingVertical: 5, minWidth: 62, alignItems: 'center',
    },
    addBtnDisabled: { opacity: 0.5 },
    addBtnText: { fontSize: 13, color: C.text },
  });
}
