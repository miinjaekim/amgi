import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Keyboard, Platform, useWindowDimensions,
} from 'react-native';
import {
  buildSavedWriting, buildWritingCardDraft, getStudyLanguageConfig, t, writingExample,
  WRITING_MAX_CHARS,
} from '@amgi/core';
import type { WritingCardCandidate, WritingReview } from '@amgi/core';
import { getWritingReview } from '../services/gemini';
import { saveFlashcardToFirestore } from '../services/firestore';
import { newSavedWritingId, saveWriting } from '../services/writings';
import type { Flashcard } from '../services/firestore';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFloatingTabBarHeight } from './FloatingTabBar';
import WritingReviewView from './WritingReviewView';
import type { Palette } from '../theme';

/** Space above the field, and between it and the keyboard while writing. */
const FIELD_TOP = 4;
const FIELD_GAP = 10;
const MIN_FIELD_HEIGHT = 140;

/**
 * The tallest keyboard this device has shown, once one has been. Module-level
 * so a remount starts from it, and stored so a relaunch does.
 */
const KEYBOARD_HEIGHT_KEY = 'writing:keyboardHeight';
let rememberedKeyboardHeight: number | null = null;

/** How far a touch may travel on the field and still be a tap, in points. */
const TAP_SLOP = 8;

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
export default function WritingReviewPanel({ onEditingChange }: {
  /** Told when the passage starts and stops being edited (keyboard up). */
  onEditingChange?: (editing: boolean) => void;
}) {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  // Only until the panel has been measured, which is one frame.
  const { height: windowHeight } = useWindowDimensions();
  const fallbackHeight = Math.round(windowHeight * 0.4);
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
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
  /**
   * Whether this review has been kept. Per review: a new submission is a new
   * thing to save or not.
   */
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Its own flag rather than `error`: that banner is on the writing page, and
  // this button is below the last finding.
  const [saveFailed, setSaveFailed] = useState(false);
  // The id this review saves under, chosen on the first attempt and kept for
  // any retry. The write has a deadline and can still land after it, so a
  // retry must be the same document rather than a second copy.
  const saveId = useRef<string | null>(null);
  /**
   * Writing and feedback are two pages of this tab, and never share one.
   *
   * The field is sized to the room above the keyboard and does not resize,
   * which left the feedback a strip under it. So a review takes the whole
   * page when it arrives, and the passage has the whole page while it is being
   * written. Little is lost by not seeing both: the feedback opens with the
   * passage's own diff.
   *
   * ⚠️ **No switch at the top** — one was tried 2026-10-06 and the user did not
   * like it. The way back to the passage is **Edit**, on the rewrite's own row
   * beside Copy and Final; the way back to the feedback without resubmitting
   * is the link under the Review button. Editing keeps the review: it is
   * feedback on the passage as submitted, until the next submission.
   */
  const [page, setPage] = useState<'write' | 'feedback'>('write');
  /**
   * Reading the passage and editing it are two states, and only a tap moves
   * from the first to the second.
   *
   * ⚠️ **Why the field is not simply always editable.** React Native focuses a
   * `TextInput` from a JS press handler, and a press there survives a drag
   * that stays inside the field. So scrolling a long passage and lifting the
   * finger opened the keyboard (reported 2026-10-06). While reading, the field
   * is `editable={false}`, which still scrolls on iOS and never focuses itself;
   * its `onPress` is ours to judge, and a touch that travelled is a scroll.
   *
   * iOS only. A non-editable field on Android does not scroll, and the report
   * was iOS, so Android keeps the plain always-editable field.
   */
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const touchStartY = useRef<number | null>(null);
  const readOnly = Platform.OS === 'ios' && !editing;
  useEffect(() => {
    // After the commit that made the field editable, never before it.
    if (editing) inputRef.current?.focus();
  }, [editing]);
  useEffect(() => { onEditingChange?.(editing); }, [editing, onEditingChange]);

  /**
   * The field is sized once, to the room above the keyboard, and stays that
   * size whether the keyboard is up or not.
   *
   * The user's calls, 2026-10-06: let the keyboard cover the Review button
   * (writing and submitting are two steps now, and the tick in the header ends
   * the first), and **do not resize the field as the keyboard comes and goes**
   * — a version that grew to meet the keyboard was tried and disliked.
   *
   * iOS does not say how tall the keyboard will be before it first shows, so
   * the height is an estimate until one has been seen, then the real one,
   * remembered across launches. It only ever moves up after that (a taller
   * keyboard, such as emoji), so the field's bottom edge is never under it.
   *
   * `keyboardWillShow` is iOS only; Android resizes the window itself and
   * keeps the estimate.
   */
  const insets = useSafeAreaInsets();
  const [panelHeight, setPanelHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(rememberedKeyboardHeight);
  useEffect(() => {
    const learn = (height: number) => {
      if (!(height > 0)) return;
      if (rememberedKeyboardHeight !== null && height <= rememberedKeyboardHeight) return;
      rememberedKeyboardHeight = height;
      setKeyboardHeight(height);
      void AsyncStorage.setItem(KEYBOARD_HEIGHT_KEY, String(height)).catch(() => {});
    };
    if (rememberedKeyboardHeight === null) {
      void AsyncStorage.getItem(KEYBOARD_HEIGHT_KEY).then(v => learn(Number(v))).catch(() => {});
    }
    const show = Keyboard.addListener('keyboardWillShow', e => learn(e.endCoordinates.height));
    return () => show.remove();
  }, []);
  // Before any keyboard has been seen: the usual portrait heights, with and
  // without a home indicator.
  const assumedKeyboard = keyboardHeight ?? (insets.bottom > 0 ? 336 : 260);
  const writingHeight = panelHeight > 0
    ? Math.max(MIN_FIELD_HEIGHT, panelHeight - assumedKeyboard - FIELD_TOP - FIELD_GAP)
    : fallbackHeight;

  const showing = review ? page : 'write';

  const languageLabel = t(interfaceLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);
  const overLimit = text.length > WRITING_MAX_CHARS;
  /**
   * The worked example, if this study language has one.
   *
   * ⚠️ **A language without an entry shows nothing, and so does a gap word
   * that is absent.** Another language's example would be worse than the empty
   * space it fills, and the sentences are sourced content
   * (`docs/packs/writing-worked-example-draft.md`), not something to invent
   * here.
   */
  const example = writingExample(studyLanguage);
  const gapWord = example?.gap[deckNativeLanguage === 'Korean' ? 'Korean' : 'English'];

  const handleSubmit = async () => {
    if (!text.trim() || overLimit || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    setReview(null);
    setPage('write');
    setSavedCards(new Set());
    setSaveState('idle');
    setSaveFailed(false);
    saveId.current = null;
    try {
      const passage = text.trim();
      const result = await getWritingReview(passage, deckNativeLanguage ?? 'English', studyLanguage);
      setSubmitted(passage);
      setReview(result);
      setPage('feedback');
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


  /**
   * Keep this passage with its feedback.
   *
   * ⚠️ `submitted`, not `text`: the field stays editable after a review, and a
   * record pairing the feedback with a passage it was not written about would
   * be wrong the day it is read back. Needs an account, as a card does.
   */
  const handleSaveWriting = async () => {
    if (!review || saveState !== 'idle') return;
    if (!user) {
      handleSignIn();
      return;
    }
    setSaveState('saving');
    setSaveFailed(false);
    try {
      saveId.current ??= newSavedWritingId(user.uid);
      await saveWriting(
        user.uid,
        saveId.current,
        buildSavedWriting(submitted, review, studyLanguage, deckNativeLanguage),
      );
      setSaveState('saved');
    } catch (err) {
      console.error(err);
      setSaveState('idle');
      setSaveFailed(true);
    }
  };

  return (
    <View style={s.flex}>
      {/* Hidden, not unmounted, while the feedback is up: the passage keeps
          its scroll position and its caret for when you come back. */}
      <View
        style={[s.flex, showing === 'feedback' && s.hidden]}
        onLayout={e => { if (e.nativeEvent.layout.height > 0) setPanelHeight(e.nativeEvent.layout.height); }}
      >
      {/* ⚠️ **The field is held in place and is its own scroller; the page
          below it is a sibling, never a parent.** Reported 2026-10-06:
          scrolling a long passage was "sticky". The field scrolled inside
          itself *inside* a page that also scrolled, so one drag had more than
          one owner. A field that grows with the passage (one scroller, the
          page) was tried the same day and the user preferred the text moving
          inside a box that stays put. So: a fixed-height field, then the
          counter and the submit button, then a ScrollView for everything else.
          A drag on the field moves the passage; a drag below it moves what is
          under it; neither can hand off to the other. */}
      <View style={[s.field, { height: writingHeight }]}>
      <TextInput
        ref={inputRef}
        style={s.input}
        value={text}
        onChangeText={setText}
        placeholder={t(interfaceLanguage, 'writingPlaceholder', { language: languageLabel })}
        placeholderTextColor={C.muted}
        multiline
        textAlignVertical="top"
        editable={!loading && !readOnly}
        onPressIn={e => { touchStartY.current = e.nativeEvent.pageY; }}
        onPress={e => {
          const start = touchStartY.current;
          touchStartY.current = null;
          if (loading || !readOnly) return;
          if (start !== null && Math.abs(e.nativeEvent.pageY - start) > TAP_SLOP) return;
          setEditing(true);
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          // Edit, then done, with nothing changed: the review on file is still
          // the review of this passage, so go back to it rather than leaving
          // them at a Review button with nothing new to review.
          if (review && text.trim() === submitted) setPage('feedback');
        }}
      />
      {/* In the field's corner, so it is still there while the keyboard
          covers everything under the field. */}
      <Text style={[s.counter, overLimit && s.counterOver]} pointerEvents="none">
        {text.length} / {WRITING_MAX_CHARS}
      </Text>
      </View>
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.submitBtn, (loading || !text.trim() || overLimit) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !text.trim() || overLimit}
        >
          {loading
            ? <ActivityIndicator color={C.bg} size="small" />
            : <Text style={s.submitBtnText}>{t(interfaceLanguage, 'writingButton')}</Text>}
        </TouchableOpacity>
        {/* Only after Edit: the review you left is still there, and getting
            back to it should not cost another submission. */}
        {review && !loading && (
          <TouchableOpacity
            style={s.backToFeedback}
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => { Keyboard.dismiss(); setPage('feedback'); }}
          >
            <Text style={s.backToFeedbackText}>{t(interfaceLanguage, 'writingBackToFeedback')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {/**
        * ⚠️ **No `keyboardDismissMode`.** It was `interactive`, and a scroll
        * that wandered over the keyboard put it away, which the user did not
        * want from a scroll. The keyboard goes on a tap outside the field
        * (`keyboardShouldPersistTaps="handled"`), on the tick in the header
        * (`writing.tsx`), or on submit.
        *
        * No keyboard inset either: the field is above the keyboard by
        * construction, and nothing in here takes focus.
        */}
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
      {/* ⚠️ **It demonstrates the gap, deliberately.** The "?" sheet says in
          words that a word you cannot reach can go in in your own language;
          this is the route catching exactly that, which is the one thing about
          Writing a learner will not guess from an empty box. Asked for
          2026-09-22, to use the space rather than leave it blank. */}
      {!review && !error && !!example && !!gapWord && (
        <View style={s.example}>
          <Text style={s.sectionLabel}>{t(interfaceLanguage, 'writingExampleHeading')}</Text>

          <Text style={s.exampleLabel}>{t(interfaceLanguage, 'writingExampleWrote')}</Text>
          <Text style={s.exampleLine}>
            {example.written.split('{gap}')[0]}
            <Text style={s.exampleGap}>{gapWord}</Text>
            {example.written.split('{gap}')[1]}
          </Text>

          <Text style={s.exampleLabel}>{t(interfaceLanguage, 'writingExampleGot')}</Text>
          <Text style={s.exampleLine}>{example.rewrite}</Text>

          {/* The card the finding would offer — the same shape as a real one,
              so what the tab is *for* is legible before anything is submitted. */}
          <View style={s.exampleCard}>
            <View style={s.exampleTag}>
              <Text style={s.exampleTagText}>{t(interfaceLanguage, 'writingWordYouNeeded')}</Text>
            </View>
            <Text style={s.exampleStudy}>{example.study}</Text>
            <Text style={s.exampleBack}>— {gapWord}</Text>
          </View>
        </View>
      )}

      {error && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      </ScrollView>
      </View>

      {showing === 'feedback' && review && (
        <ScrollView style={s.flex} contentContainerStyle={s.scroll}>
          <WritingReviewView
            review={review}
            passage={submitted}
            studyLanguage={studyLanguage}
            nativeLanguage={deckNativeLanguage}
            onEdit={() => { setPage('write'); setEditing(true); }}
            cards={{ saved: savedCards, saving: savingCard, onAdd: handleAddCard }}
          />

          {/* Optional, and only here: nothing about a review is kept unless
              this is pressed. After the findings rather than above them — it is
              a decision about feedback you have read. */}
          <TouchableOpacity
            style={[s.saveBtn, saveState !== 'idle' && s.saveBtnDisabled]}
            onPress={handleSaveWriting}
            disabled={saveState !== 'idle'}
            accessibilityRole="button"
          >
            {saveState === 'saving'
              ? <ActivityIndicator color={C.text} size="small" />
              : <Text style={s.saveBtnText}>
                  {t(interfaceLanguage, saveState === 'saved' ? 'writingSaveDone' : 'writingSave')}
                </Text>}
          </TouchableOpacity>
          {saveFailed ? (
            <Text style={[s.saveBlurb, s.saveFailed]}>{t(interfaceLanguage, 'errorSaveWriting')}</Text>
          ) : saveState !== 'saved' && (
            <Text style={s.saveBlurb}>{t(interfaceLanguage, 'writingSaveBlurb')}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: { padding: 16, paddingBottom: tabBarHeight + 16 },


    hidden: { display: 'none' },
    field: { marginHorizontal: 16, marginTop: FIELD_TOP },
    input: {
      flex: 1,
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 14, paddingTop: 12, fontSize: 16, lineHeight: 23,
      color: C.text, backgroundColor: C.surface,
      // The field's height is its wrapper's: past it the passage scrolls
      // inside the field, which is safe now that no scroller contains it. The
      // bottom padding is the counter's, so the last line clears it.
      paddingBottom: 30,
    },
    // Review across the full width: it is the one thing this screen is for, so
    // it is sized as that rather than as one item in a row.
    actionRow: {
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    counter: {
      position: 'absolute', right: 10, bottom: 8,
      fontSize: 12, color: C.muted, backgroundColor: C.surface,
      paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden',
    },
    counterOver: { color: C.error, fontWeight: '700' },
    submitBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingHorizontal: 20, paddingVertical: 13, alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },

    errorBanner: { backgroundColor: '#fde8e8', borderRadius: 10, padding: 14, marginBottom: 12 },
    errorText: { color: C.error, fontWeight: '600' },

    backToFeedback: { alignSelf: 'center', marginTop: 12 },
    backToFeedbackText: { color: C.highlight, fontSize: 14, fontWeight: '600' },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    // The worked example, in the space an empty passage box leaves.
    example: {
      marginTop: 4, padding: 16, borderRadius: 14,
      borderWidth: 1, borderColor: C.border,
    },
    exampleLabel: { color: C.muted, fontSize: 11, marginTop: 14, marginBottom: 4 },
    exampleLine: { color: C.text, fontSize: 15, lineHeight: 22 },
    exampleGap: { color: C.highlight, fontWeight: '700' },
    exampleCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    exampleTag: {
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 10, borderWidth: 1, borderColor: C.highlight,
    },
    exampleTagText: { color: C.highlight, fontSize: 10, fontWeight: '700' },
    exampleStudy: { color: C.text, fontSize: 14, fontWeight: '600' },
    exampleBack: { color: C.muted, fontSize: 14 },

    saveBtn: {
      alignSelf: 'flex-start', marginTop: 14, minWidth: 120, alignItems: 'center',
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },
    saveBlurb: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
    saveFailed: { color: C.error, fontWeight: '600' },
  });
}
