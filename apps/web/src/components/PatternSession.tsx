'use client';

import { useEffect, useRef, useState } from 'react';
import {
  PATTERN_MAX_CHARS,
  getPatternExercise,
  getStudyLanguageConfig,
  gradeFromReview,
  gradePatternAnswer,
  patternGloss,
} from '@amgi/core';
import type {
  GrammarPattern,
  HintTier,
  PatternExercise,
  PatternGrade,
  ReviewTracking,
  StudyLanguage,
  TranslationKey,
  WritingReview,
} from '@amgi/core';
import { getNextReviewData } from '@/services/sm2';
import { updatePatternTracking } from '@/services/patterns';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';
import PronounceButton from '@/components/PronounceButton';

/**
 * A grammar-pattern practice session.
 *
 * Its own component rather than another branch of the review page, because it
 * is a different verb: the review page flips a card in three seconds, and this
 * asks for forty seconds of production and then grades it. The two share a
 * surface — the Review picker — and nothing else.
 *
 * Four rules from the design are enforced here and are the ones to check
 * against before changing this file:
 *
 * 1. **The prompt never names the pattern.** Nothing on screen during the
 *    answering phase says which pattern is being practised. "Use `-다가` in a
 *    sentence" teaches the label; reaching for it is the skill.
 * 2. **Every turn is production.** No candidates are offered — selecting
 *    between near-neighbours is recognition wearing production's clothes.
 * 3. **The hint has two tiers and it costs.** Which is what keeps rule 2 from
 *    having a cliff behind it.
 * 4. **A grading failure never loses the typed sentence.** Forty seconds of
 *    the learner's writing is the one thing ruled out losing, and a 500 on
 *    turn 3 of 6 is not the offline case.
 */

const VERDICT_LABEL: Record<PatternGrade['verdict'], TranslationKey> = {
  good: 'patternVerdictGood',
  hard: 'patternVerdictHard',
  again: 'patternVerdictAgain',
};

const VERDICT_COLOR: Record<PatternGrade['verdict'], string> = {
  good: 'var(--color-highlight)',
  hard: 'var(--color-text)',
  again: 'rgb(248 113 113)',
};

type Phase = 'generating' | 'answering' | 'graded';

interface Props {
  patterns: GrammarPattern[];
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
  /** Streak bookkeeping — a production turn is a review like any other. */
  onReviewed: () => void;
  /** Lets the picker's due count stay honest without a refetch. */
  onScheduled: (patternId: string, production: ReviewTracking) => void;
  onExit: () => void;
}

export default function PatternSession({
  patterns,
  studyLanguage,
  nativeLanguage,
  onReviewed,
  onScheduled,
  onExit,
}: Props) {
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const languageLabel = t(nativeLanguage, langConfig.studyLabelKey);

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
   * Deliberately outside the per-turn reset below: a skip is reported on the
   * turn *after* the one that was skipped, so resetting it with everything else
   * would mean the message never appeared at all.
   */
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);

  const pattern = patterns[index];
  const overLimit = answer.length > PATTERN_MAX_CHARS;

  /**
   * Guards against a stale generation landing on the turn after it.
   *
   * Generation is a model call of a second or two, so exiting or skipping
   * mid-flight is entirely reachable — and an exercise for the pattern you just
   * left would otherwise arrive and overwrite the one you are now looking at.
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

  // Keyed on the turn, not on a `useCallback` identity. `patterns` is a prop,
  // and a parent that rebuilt that array on every render would make a memoized
  // `generate` change identity every render too — which here would mean a
  // fresh model call on every render rather than a stale closure.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pattern?.id]);

  const advance = () => {
    // Answer state belongs to the turn, and it is cleared on the way out of one
    // rather than on the way into the next: doing it in the effect would mean
    // the graded turn's answer surviving one render into the new turn, and the
    // learner watching their last sentence flash up under a fresh situation.
    setAnswer('');
    setHintTier(0);
    setGradeError(false);
    setReview(null);
    setGrade(null);
    if (index + 1 < patterns.length) setIndex(index + 1);
    else setDone(true);
  };

  const handleCheck = async () => {
    if (!answer.trim() || overLimit || !exercise || !pattern) return;
    setGrading(true);
    setGradeError(false);
    setSkipped(false);
    try {
      const result = await gradePatternAnswer(
        answer.trim(),
        nativeLanguage ?? 'English',
        studyLanguage,
      );
      const graded = gradeFromReview(result, answer.trim(), exercise, hintTier);

      // The write happens only now, on a verdict the model actually produced.
      // Everything else on this screen — a skip, a grading failure, an exit —
      // writes nothing and leaves the pattern due.
      const { interval, ease, repetitions, nextReview } = getNextReviewData(
        pattern.production ?? {},
        graded.verdict,
      );
      const production: ReviewTracking = { interval, ease, repetitions, nextReview };

      if (pattern.id) {
        // Fire-and-forget, as the card path does: Firestore queues the write
        // and syncs on reconnect, and the learner should not wait on it to see
        // their feedback.
        updatePatternTracking(pattern.id, production).catch(err => {
          console.error('[patterns] failed to write scheduling:', err);
        });
        onScheduled(pattern.id, production);
      }

      onReviewed();
      setReview(result);
      setGrade(graded);
      setReviewedCount(n => n + 1);
      setPhase('graded');
    } catch (err) {
      console.error('[patterns] grading failed:', err);
      // Note what is NOT done here: `answer` is untouched, and no verdict is
      // written. The learner keeps their sentence and the pattern stays due.
      setGradeError(true);
    } finally {
      setGrading(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
    advance();
  };

  if (done || !pattern) {
    return (
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold mb-2">{t(nativeLanguage, 'patternSessionDone')}</h2>
        <p className="text-[var(--color-muted)] text-sm mb-6">
          {t(nativeLanguage, 'patternSessionDoneCount', { count: reviewedCount })}
        </p>
        <button
          className="px-5 py-2.5 rounded-lg font-semibold transition-colors"
          style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          onClick={onExit}
        >
          {t(nativeLanguage, 'exitReview')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {t(nativeLanguage, 'patternSessionProgress', {
            index: index + 1,
            total: patterns.length,
          })}
        </h2>
        <button
          onClick={onExit}
          aria-label={t(nativeLanguage, 'exitReview')}
          title={t(nativeLanguage, 'exitReview')}
          className="text-lg leading-none px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
        >
          ✕
        </button>
      </div>

      {skipped && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] text-sm">
          {t(nativeLanguage, 'patternSkipped')}
        </div>
      )}

      <div className="mb-4 p-6 rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg min-h-[14rem]">
        {exerciseError ? (
          <div className="py-4">
            <p className="text-[var(--color-text)] mb-4">{t(nativeLanguage, 'patternExerciseFailed')}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={generate}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {t(nativeLanguage, 'patternRetry')}
              </button>
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 rounded-lg text-sm border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]"
              >
                {t(nativeLanguage, 'patternSkip')}
              </button>
            </div>
          </div>
        ) : phase === 'generating' || !exercise ? (
          <div className="flex items-center gap-3 py-8 text-[var(--color-muted)]">
            <Spinner className="w-5 h-5" />
            <span>{t(nativeLanguage, 'patternGenerating')}</span>
          </div>
        ) : (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
              {t(nativeLanguage, 'patternSituationHeading')}
            </h3>
            <p className="text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
              {exercise.situation}
            </p>

            {/* Hints, revealed in order and never before they are asked for.
                Both tiers arrived with the situation, so asking costs no round
                trip — what it costs is the ceiling on the verdict. */}
            {hintTier >= 1 && (
              <div className="mt-4 pt-4 border-t text-sm" style={{ borderColor: 'var(--color-muted)' }}>
                <p className="text-[var(--color-text)] opacity-80">{exercise.hintShape}</p>
                {hintTier >= 2 && (
                  <p className="mt-2 font-bold" style={{ color: 'var(--color-highlight)' }}>
                    {exercise.hintName}
                  </p>
                )}
                <p className="mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                  {t(nativeLanguage, hintTier >= 2 ? 'patternHintCostAgain' : 'patternHintCostHard')}
                </p>
              </div>
            )}

            {phase === 'graded' && grade && review ? (
              <div className="mt-4 pt-4 border-t space-y-4" style={{ borderColor: 'var(--color-muted)' }}>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-lg font-bold" style={{ color: VERDICT_COLOR[grade.verdict] }}>
                    {t(nativeLanguage, VERDICT_LABEL[grade.verdict])}
                  </span>
                  {/* The pattern is named only now. Before the answer it would
                      have been the prompt doing the reaching. */}
                  <span className="font-bold text-[var(--color-text)]">{pattern.pattern}</span>
                  {patternGloss(pattern, nativeLanguage) && (
                    <span className="text-sm opacity-60 text-[var(--color-text)]">
                      {patternGloss(pattern, nativeLanguage)}
                    </span>
                  )}
                </div>

                {!grade.reached && (
                  <p className="text-sm text-[var(--color-text)] opacity-80">
                    {t(nativeLanguage, 'patternNotReached')}
                  </p>
                )}

                {/* The learner's own sentence stays on screen beside the
                    rewrite. The textarea is gone by now, and a correction you
                    cannot compare against what you wrote is a correction you
                    read rather than learn from. */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'patternYourSentence')}
                  </h4>
                  <p className="leading-relaxed text-[var(--color-text)] opacity-70">{answer.trim()}</p>
                </div>

                {/* The rewrite shows on every verdict, including `good`. A
                    sentence that got the pattern right and still differs from
                    how a native would put it is worth seeing — the same
                    reasoning `rewriteNative` exists for on writing review. */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                      {t(nativeLanguage, 'writingRewriteHeading')}
                    </h4>
                    <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} />
                  </div>
                  <p className="text-lg leading-relaxed text-[var(--color-text)]">{review.rewrite}</p>
                  {review.rewriteNative && (
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)] opacity-70">
                      {review.rewriteNative}
                    </p>
                  )}
                </div>

                {review.findings.length > 0 && (
                  <ol className="space-y-2">
                    {review.findings.map((finding, i) => (
                      <li key={i} className="text-sm text-[var(--color-text)] opacity-80">
                        {(finding.original || finding.suggested) && (
                          <span className="mr-2">
                            {finding.original && <span className="line-through opacity-50">{finding.original}</span>}
                            {finding.original && finding.suggested && <span className="mx-1">→</span>}
                            {finding.suggested && (
                              <span className="font-bold" style={{ color: 'var(--color-highlight)' }}>
                                {finding.suggested}
                              </span>
                            )}
                          </span>
                        )}
                        {finding.note}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {!exerciseError && exercise && phase === 'answering' && (
        <>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder={t(nativeLanguage, 'patternAnswerPlaceholder', { language: languageLabel })}
            rows={3}
            disabled={grading}
            className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] resize-y"
          />

          {gradeError && (
            <div className="mt-3 p-3 rounded-lg border text-sm" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}>
              <p className="mb-2">{t(nativeLanguage, 'patternGradeFailed')}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCheck}
                  disabled={grading}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                >
                  {t(nativeLanguage, 'patternRetry')}
                </button>
                <button
                  onClick={handleSkip}
                  className="px-3 py-1.5 rounded-lg text-sm border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)]"
                >
                  {t(nativeLanguage, 'patternSkip')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <span
              className="text-xs tabular-nums"
              style={{ color: overLimit ? 'var(--color-highlight)' : 'var(--color-muted)' }}
            >
              {answer.length} / {PATTERN_MAX_CHARS}
            </span>
            <div className="flex items-center gap-2">
              {hintTier < 2 && (
                <button
                  onClick={() => setHintTier(tier => (tier + 1) as HintTier)}
                  disabled={grading}
                  className="px-3 py-2 rounded-lg text-sm border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                >
                  {t(nativeLanguage, hintTier === 0 ? 'patternHint' : 'patternHintAgain')}
                </button>
              )}
              <button
                onClick={handleCheck}
                disabled={grading || !answer.trim() || overLimit}
                className="px-5 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {grading ? <Spinner className="w-5 h-5 mx-auto" /> : t(nativeLanguage, 'patternCheck')}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === 'graded' && (
        <button
          className="w-full mt-4 px-4 py-3 rounded-lg text-lg font-semibold"
          style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
          onClick={advance}
        >
          {index + 1 < patterns.length
            ? t(nativeLanguage, 'patternNext')
            : t(nativeLanguage, 'patternFinish')}
        </button>
      )}
    </>
  );
}
