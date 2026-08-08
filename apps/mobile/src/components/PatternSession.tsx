import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Keyboard,
} from 'react-native';
import {
  CLOZE_GAP, PATTERN_MAX_CHARS, getStudyLanguageConfig, gradeCloze, gradeFromReview,
  getNextReviewData, overrideGrade, patternGloss, t,
} from '@amgi/core';
import type {
  GrammarPattern, HintTier, PatternExercise, PatternGrade, PatternVerdict,
  ReviewTracking, StudyLanguage, TranslationKey, WritingReview,
} from '@amgi/core';
import { getPatternExercise, gradePatternAnswer } from '../services/gemini';
import { updatePatternTracking } from '../services/patterns';
import { useTheme } from '../context/ThemeContext';
import { useFloatingTabBarHeight } from './FloatingTabBar';
import PronounceButton from './PronounceButton';
import TextDiff from './TextDiff';
import type { Palette } from '../theme';

/**
 * A grammar-pattern practice session, native side. Mirrors the web component —
 * same core types, same two rungs, same grading.
 *
 * **Two rungs, and the pattern's stage picks between them** (resolved inside
 * `getPatternExercise`). A *cloze* is one sentence with the pattern blanked,
 * graded locally by string comparison. A *production* turn is a situation to
 * express freely, graded through `/api/writing`.
 *
 * Rules from the design enforced here:
 *
 * 1. Nothing offers candidates to pick between — a cloze is cued recall.
 * 2. A production turn never names the pattern; a cloze doesn't either, the
 *    sentence is what disambiguates.
 * 3. Hints cost, clamping the verdict. A cloze's two tiers are the pattern's
 *    own gloss and citation form, so they cost no round trip.
 * 4. A grading failure never loses the typed answer, and nothing writes a
 *    verdict the learner did not earn or assert.
 */

const VERDICT_LABEL: Record<PatternVerdict, TranslationKey> = {
  easy: 'patternVerdictEasy',
  good: 'patternVerdictGood',
  hard: 'patternVerdictHard',
  again: 'patternVerdictAgain',
};

type Phase = 'generating' | 'answering' | 'graded';

interface Props {
  patterns: GrammarPattern[];
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
  onReviewed: () => void;
  onScheduled: (patternId: string, production: ReviewTracking) => void;
  onExit: () => void;
}

export default function PatternSession({
  patterns, studyLanguage, nativeLanguage, onReviewed, onScheduled, onExit,
}: Props) {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const languageLabel = t(nativeLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('generating');
  const [exercise, setExercise] = useState<PatternExercise | null>(null);
  const [exerciseError, setExerciseError] = useState(false);
  const [answer, setAnswer] = useState('');
  const [hintTier, setHintTier] = useState<HintTier>(0);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState(false);
  const [review, setReview] = useState<WritingReview | null>(null);
  const [grade, setGrade] = useState<PatternGrade | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  /**
   * Outside the per-turn reset: a skip is reported on the turn *after* the one
   * skipped, so resetting it with everything else would mean it never showed.
   */
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);

  const pattern = patterns[index];
  const isCloze = exercise?.format === 'cloze';
  const overLimit = answer.length > PATTERN_MAX_CHARS;

  /**
   * Guards against a stale generation landing on the turn after it. Generation
   * is a model call of a second or two, so exiting or skipping mid-flight is
   * reachable — and an exercise for the pattern just left would otherwise
   * arrive and overwrite the one now on screen.
   */
  const generationToken = useRef(0);

  const generate = async () => {
    if (!pattern) return;
    const token = ++generationToken.current;
    setPhase('generating');
    setExercise(null);
    setExerciseError(false);
    try {
      const next = await getPatternExercise(pattern, nativeLanguage ?? 'English');
      if (generationToken.current !== token) return;
      setExercise(next);
      setPhase('answering');
    } catch (err) {
      console.error('[patterns] exercise generation failed:', err);
      if (generationToken.current !== token) return;
      setExerciseError(true);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pattern?.id]);

  const advance = () => {
    // Cleared on the way out of a turn rather than into the next, or the graded
    // answer survives a render into the new turn and flashes under it.
    setAnswer('');
    setHintTier(0);
    setGradeError(false);
    setReview(null);
    setGrade(null);
    if (index + 1 < patterns.length) setIndex(index + 1);
    else setDone(true);
  };

  /**
   * The one place a `ReviewTracking` is written. A skip, a grading failure and
   * an exit all deliberately reach nothing here, leaving the pattern due.
   *
   * `pattern.production` is the pre-turn value on every call including the
   * override's — the queue holds the objects loaded at session start, and
   * `onScheduled` updates the screen's copy, not this one. So a re-grade
   * schedules from the same baseline rather than compounding.
   */
  const writeGrade = (graded: PatternGrade) => {
    if (!pattern) return;
    const { interval, ease, repetitions, nextReview } = getNextReviewData(
      pattern.production ?? {}, graded.verdict,
    );
    const production: ReviewTracking = { interval, ease, repetitions, nextReview };
    if (pattern.id) {
      updatePatternTracking(pattern.id, production).catch(err => {
        console.error('[patterns] failed to write scheduling:', err);
      });
      onScheduled(pattern.id, production);
    }
  };

  const handleCheck = async () => {
    if (!answer.trim() || overLimit || !exercise || !pattern) return;
    Keyboard.dismiss();
    setSkipped(false);

    // Cloze grades locally against what generation supplied. No round trip, so
    // no failure path and no variance — the whole reason this rung is cheap.
    if (exercise.format === 'cloze') {
      const graded = gradeCloze(answer.trim(), exercise, hintTier);
      writeGrade(graded);
      onReviewed();
      setGrade(graded);
      setReviewedCount(n => n + 1);
      setPhase('graded');
      return;
    }

    setGrading(true);
    setGradeError(false);
    try {
      const result = await gradePatternAnswer(answer.trim(), nativeLanguage ?? 'English', studyLanguage);
      const graded = gradeFromReview(result, answer.trim(), exercise, hintTier);
      writeGrade(graded);
      onReviewed();
      setReview(result);
      setGrade(graded);
      setReviewedCount(n => n + 1);
      setPhase('graded');
    } catch (err) {
      console.error('[patterns] grading failed:', err);
      // `answer` is untouched and no verdict is written: the learner keeps
      // their sentence and the pattern stays due.
      setGradeError(true);
    } finally {
      setGrading(false);
    }
  };

  /**
   * The learner says the grader was wrong. Legitimate because they can see both
   * strings — on a cloze the expected answer is on screen beside what they
   * typed, so this reports a short `alternates` list rather than appealing a
   * hidden judgement. Re-grades correctness, not effort: the clamp still holds.
   */
  const handleOverride = () => {
    const graded = overrideGrade(hintTier);
    writeGrade(graded);
    setGrade(graded);
  };

  const handleSkip = () => {
    setSkipped(true);
    advance();
  };

  const clozeHintOne = patternGloss(pattern ?? { gloss: {} }, nativeLanguage) || pattern?.pattern || '';
  const clozeHintTwo = pattern?.pattern ?? '';

  if (done || !pattern) {
    return (
      <View style={s.doneWrap}>
        <Text style={s.doneTitle}>{t(nativeLanguage, 'patternSessionDone')}</Text>
        <Text style={s.doneCount}>
          {t(nativeLanguage, 'patternSessionDoneCount', { count: reviewedCount })}
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={onExit}>
          <Text style={s.primaryBtnText}>{t(nativeLanguage, 'exitReview')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filled = exercise?.format === 'cloze' ? exercise.full : '';

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={s.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <View style={s.headerRow}>
        <Text style={s.progress}>
          {t(nativeLanguage, 'patternSessionProgress', { index: index + 1, total: patterns.length })}
        </Text>
        <TouchableOpacity onPress={onExit} hitSlop={10}>
          <Text style={s.exit}>✕</Text>
        </TouchableOpacity>
      </View>

      {skipped && (
        <View style={s.notice}><Text style={s.noticeText}>{t(nativeLanguage, 'patternSkipped')}</Text></View>
      )}

      <View style={s.card}>
        {exerciseError ? (
          <>
            <Text style={s.bodyText}>{t(nativeLanguage, 'patternExerciseFailed')}</Text>
            <View style={s.btnRow}>
              <TouchableOpacity style={s.primaryBtnSm} onPress={generate}>
                <Text style={s.primaryBtnSmText}>{t(nativeLanguage, 'patternRetry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={handleSkip}>
                <Text style={s.ghostBtnText}>{t(nativeLanguage, 'patternSkip')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : phase === 'generating' || !exercise ? (
          <View style={s.loadingRow}>
            <ActivityIndicator color={C.muted} size="small" />
            <Text style={s.loadingText}>{t(nativeLanguage, 'patternGenerating')}</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>
              {t(nativeLanguage, exercise.format === 'cloze' ? 'patternClozeHeading' : 'patternSituationHeading')}
            </Text>

            {exercise.format === 'cloze' ? (
              <>
                <Text style={s.prompt}>
                  {exercise.sentence.split(CLOZE_GAP)[0]}
                  <Text style={s.gap}>{'        '}</Text>
                  {exercise.sentence.split(CLOZE_GAP).slice(1).join(CLOZE_GAP)}
                </Text>
                {/* Not a hint — half the prompt. A gap filled without
                    understanding the sentence is mechanical practice, the one
                    drill type the research does not support. */}
                {!!exercise.meaning && <Text style={s.meaning}>{exercise.meaning}</Text>}
                {!!exercise.input && (
                  <Text style={s.inputHint}>
                    {t(nativeLanguage, 'patternClozeFrom')} <Text style={s.inputHintWord}>{exercise.input}</Text>
                  </Text>
                )}
              </>
            ) : (
              <Text style={s.prompt}>{exercise.situation}</Text>
            )}

            {hintTier >= 1 && (
              <View style={s.hintBlock}>
                {isCloze ? (
                  <Text style={s.hintText}>
                    {t(nativeLanguage, 'patternHintPointMeans')} <Text style={s.hintStrong}>{clozeHintOne}</Text>
                  </Text>
                ) : (
                  <Text style={s.hintText}>{exercise.hintShape}</Text>
                )}
                {hintTier >= 2 && (
                  <Text style={s.hintReveal}>{isCloze ? clozeHintTwo : exercise.hintName}</Text>
                )}
                <Text style={s.hintCost}>
                  {t(nativeLanguage, hintTier >= 2 ? 'patternHintCostAgain' : 'patternHintCostHard')}
                </Text>
              </View>
            )}

            {phase === 'graded' && grade && (
              <View style={s.gradedBlock}>
                <View style={s.verdictRow}>
                  <Text style={[s.verdict, { color: grade.verdict === 'again' ? C.error : C.highlight }]}>
                    {t(nativeLanguage, VERDICT_LABEL[grade.verdict])}
                  </Text>
                  {/* Named only now — before the answer it would have been the
                      prompt doing the reaching. */}
                  <Text style={s.patternName}>{pattern.pattern}</Text>
                  {!!patternGloss(pattern, nativeLanguage) && (
                    <Text style={s.patternGloss} numberOfLines={2}>{patternGloss(pattern, nativeLanguage)}</Text>
                  )}
                </View>

                {grade.overridden && (
                  <Text style={s.mutedNote}>{t(nativeLanguage, 'patternOverridden')}</Text>
                )}

                {exercise.format === 'cloze' ? (
                  <>
                    <View style={s.answerRow}>
                      <View style={s.answerCol}>
                        <Text style={s.sectionLabel}>{t(nativeLanguage, 'patternYourSentence')}</Text>
                        <Text style={[s.answerText, !grade.reached && { color: C.error }]}>{answer.trim()}</Text>
                      </View>
                      {!grade.reached && (
                        <View style={s.answerCol}>
                          <Text style={s.sectionLabel}>{t(nativeLanguage, 'patternExpected')}</Text>
                          <Text style={[s.answerText, { color: C.highlight, fontWeight: '700' }]}>
                            {exercise.expected}
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Ends on the whole sentence rather than a fragment. */}
                    <View style={s.fullRow}>
                      <Text style={s.fullText}>{filled}</Text>
                      <PronounceButton text={filled} studyLanguage={studyLanguage} />
                    </View>
                  </>
                ) : (
                  <>
                    {!grade.reached && (
                      <Text style={s.mutedNote}>{t(nativeLanguage, 'patternNotReached')}</Text>
                    )}
                    {review && (
                      <>
                        <View style={s.fullRow}>
                          <Text style={s.sectionLabel}>{t(nativeLanguage, 'writingRewriteHeading')}</Text>
                          <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} />
                        </View>
                        {/* A diff rather than two blocks: the edits are the part
                            worth learning and they were never on screen as
                            edits. */}
                        <TextDiff
                          before={answer.trim()}
                          after={review.rewrite}
                          studyLanguage={studyLanguage}
                        />
                        {!!review.rewriteNative && (
                          <Text style={s.meaning}>{review.rewriteNative}</Text>
                        )}
                        {review.findings.map((finding, i) => (
                          <Text key={i} style={s.finding}>
                            {finding.suggested ? `${finding.suggested} — ` : ''}{finding.note}
                          </Text>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* Only where it can change something: at tier 2 the clamp
                    already pins the verdict at `again`. */}
                {!grade.overridden && grade.verdict !== 'good' && grade.verdict !== 'easy' && hintTier < 2 && (
                  <TouchableOpacity style={s.ghostBtn} onPress={handleOverride}>
                    <Text style={s.ghostBtnText}>{t(nativeLanguage, 'patternOverride')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      {!exerciseError && exercise && phase === 'answering' && (
        <>
          <TextInput
            style={[s.input, isCloze && s.inputSingle]}
            value={answer}
            onChangeText={setAnswer}
            placeholder={isCloze
              ? t(nativeLanguage, 'patternClozePlaceholder')
              : t(nativeLanguage, 'patternAnswerPlaceholder', { language: languageLabel })}
            placeholderTextColor={C.muted}
            multiline={!isCloze}
            textAlignVertical={isCloze ? 'center' : 'top'}
            editable={!grading}
            onSubmitEditing={isCloze ? handleCheck : undefined}
            returnKeyType={isCloze ? 'done' : undefined}
          />

          {gradeError && (
            <View style={s.errorBlock}>
              <Text style={s.bodyText}>{t(nativeLanguage, 'patternGradeFailed')}</Text>
              <View style={s.btnRow}>
                <TouchableOpacity style={s.primaryBtnSm} onPress={handleCheck} disabled={grading}>
                  <Text style={s.primaryBtnSmText}>{t(nativeLanguage, 'patternRetry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ghostBtn} onPress={handleSkip}>
                  <Text style={s.ghostBtnText}>{t(nativeLanguage, 'patternSkip')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.actionRow}>
            {/* The counter caps a paragraph, which only a production turn can
                approach. "4 / 300" under a one-word cloze answer is noise. */}
            <Text style={[s.counter, overLimit && s.counterOver]}>
              {isCloze ? '' : `${answer.length} / ${PATTERN_MAX_CHARS}`}
            </Text>
            <View style={s.btnRow}>
              {hintTier < 2 && (
                <TouchableOpacity
                  style={s.ghostBtn}
                  onPress={() => setHintTier(tier => (tier + 1) as HintTier)}
                  disabled={grading}
                >
                  <Text style={s.ghostBtnText}>
                    {t(nativeLanguage, hintTier === 0 ? 'patternHint' : 'patternHintAgain')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.primaryBtn, (grading || !answer.trim() || overLimit) && s.primaryBtnOff]}
                onPress={handleCheck}
                disabled={grading || !answer.trim() || overLimit}
              >
                {grading
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={s.primaryBtnText}>{t(nativeLanguage, 'patternCheck')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {phase === 'graded' && (
        <TouchableOpacity style={s.nextBtn} onPress={advance}>
          <Text style={s.primaryBtnText}>
            {index + 1 < patterns.length
              ? t(nativeLanguage, 'patternNext')
              : t(nativeLanguage, 'patternFinish')}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    flex: { flex: 1 },
    scroll: { padding: 16, paddingBottom: tabBarHeight + 24 },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    progress: { fontSize: 17, fontWeight: '700', color: C.text },
    exit: { fontSize: 20, color: C.muted, paddingHorizontal: 6 },

    notice: { backgroundColor: C.surface, borderRadius: 10, padding: 10, marginBottom: 10 },
    noticeText: { fontSize: 13, color: C.muted },

    card: {
      backgroundColor: C.surface, borderRadius: 16, padding: 18,
      borderWidth: 1, borderColor: C.border, marginBottom: 14, minHeight: 180,
    },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
    prompt: { fontSize: 17, color: C.text, lineHeight: 27, marginTop: 8 },
    // A drawn blank: figure spaces under an underline read as a gap to fill,
    // where the literal "___" reads as characters in the sentence.
    gap: { color: C.highlight, textDecorationLine: 'underline' },
    meaning: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 21, marginTop: 8 },
    inputHint: { fontSize: 13, color: C.muted, marginTop: 10 },
    inputHintWord: { fontWeight: '700', color: C.text },

    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24 },
    loadingText: { fontSize: 14, color: C.muted },
    bodyText: { fontSize: 15, color: C.text, lineHeight: 22 },

    hintBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
    hintText: { fontSize: 14, color: C.text, opacity: 0.85, lineHeight: 21 },
    hintStrong: { fontWeight: '700', opacity: 1 },
    hintReveal: { fontSize: 16, fontWeight: '700', color: C.highlight },
    hintCost: { fontSize: 12, color: C.muted },

    gradedBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 12 },
    verdictRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    verdict: { fontSize: 17, fontWeight: '700' },
    patternName: { fontSize: 16, fontWeight: '700', color: C.text },
    patternGloss: { fontSize: 13, color: C.muted, flexShrink: 1 },
    mutedNote: { fontSize: 14, color: C.text, opacity: 0.8, lineHeight: 21 },

    answerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
    answerCol: { gap: 3 },
    answerText: { fontSize: 17, color: C.text },
    fullRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    fullText: { fontSize: 17, color: C.text, lineHeight: 26, flexShrink: 1 },
    finding: { fontSize: 14, color: C.text, opacity: 0.8, lineHeight: 21 },

    input: {
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 17,
      color: C.text, backgroundColor: C.surface, minHeight: 96, maxHeight: 200,
    },
    inputSingle: { minHeight: 52, maxHeight: 52 },

    errorBlock: {
      marginTop: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, gap: 10,
    },

    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    counter: { fontSize: 12, color: C.muted },
    counterOver: { color: C.error, fontWeight: '700' },
    btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

    primaryBtn: {
      backgroundColor: C.highlight, borderRadius: 12,
      paddingHorizontal: 22, paddingVertical: 11, minWidth: 88, alignItems: 'center',
    },
    primaryBtnOff: { opacity: 0.5 },
    primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
    primaryBtnSm: {
      backgroundColor: C.highlight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    },
    primaryBtnSmText: { fontSize: 13, fontWeight: '700', color: C.bg },
    ghostBtn: {
      alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    ghostBtnText: { fontSize: 13, color: C.muted },
    nextBtn: {
      backgroundColor: C.highlight, borderRadius: 12, paddingVertical: 14,
      alignItems: 'center', marginTop: 4,
    },

    doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
    doneTitle: { fontSize: 22, fontWeight: '700', color: C.text },
    doneCount: { fontSize: 14, color: C.muted, marginBottom: 12 },
  });
}
