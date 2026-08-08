'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CLOZE_GAP,
  PATTERN_MAX_CHARS,
  getPatternExercise,
  getStudyLanguageConfig,
  gradeCloze,
  gradeFromReview,
  gradePatternAnswer,
  overrideGrade,
  patternGloss,
} from '@amgi/core';
import type {
  GrammarPattern,
  HintTier,
  PatternExercise,
  PatternGrade,
  PatternVerdict,
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
 * is a different verb: the review page flips a card, and this asks for a
 * produced form and then grades it. The two share a surface — the Review
 * picker — and nothing else.
 *
 * **Two rungs, and the pattern's stage picks between them** (`exerciseFormat`,
 * resolved inside `getPatternExercise`). A *cloze* is one sentence with the
 * pattern blanked, graded locally by string comparison. A *production* turn is
 * a situation to express freely, graded through `/api/writing`. Practice runs
 * controlled → free and the first cut of this screen opened at free, which is
 * where the ambiguity and grading variance both came from; see
 * `docs/grammar-research.md`.
 *
 * Rules from the design enforced here, and the ones to check against before
 * changing this file:
 *
 * 1. **Nothing offers candidates to pick between.** A cloze is cued recall, not
 *    recognition — the learner types the form.
 * 2. **A production turn never names the pattern.** Nothing on screen during
 *    the answering phase says which pattern is being practised. A cloze does
 *    not name it either; the sentence is what disambiguates.
 * 3. **Hints cost.** Two tiers, clamping the verdict. On a cloze both tiers are
 *    the pattern's own stored gloss and citation form, so they cost no round
 *    trip and no generation.
 * 4. **A grading failure never loses the typed answer**, and nothing writes a
 *    verdict the learner did not earn or assert.
 */

const VERDICT_LABEL: Record<PatternVerdict, TranslationKey> = {
  easy: 'patternVerdictEasy',
  good: 'patternVerdictGood',
  hard: 'patternVerdictHard',
  again: 'patternVerdictAgain',
};

const VERDICT_COLOR: Record<PatternVerdict, string> = {
  easy: 'var(--color-highlight)',
  good: 'var(--color-highlight)',
  hard: 'var(--color-text)',
  again: 'rgb(248 113 113)',
};

type Phase = 'generating' | 'answering' | 'graded';

interface Props {
  patterns: GrammarPattern[];
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
  /** Streak bookkeeping — a practice turn is a review like any other. */
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
   * Deliberately outside the per-turn reset: a skip is reported on the turn
   * *after* the one that was skipped, so resetting it with everything else
   * would mean the message never appeared at all.
   */
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);

  const pattern = patterns[index];
  const isCloze = exercise?.format === 'cloze';
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

  /**
   * Writes the scheduling one graded turn produced.
   *
   * Separate from the grading paths because the override re-runs it with a
   * corrected verdict, and because it is the one place a `ReviewTracking` is
   * written at all — a skip, a grading failure and an exit all deliberately
   * reach nothing here, leaving the pattern due.
   *
   * `pattern.production` is the value from *before* this turn on every call,
   * including the override's: the queue holds the objects loaded at session
   * start and `onScheduled` updates the page's copy, not this one. So a
   * re-grade schedules from the same baseline as the first grade rather than
   * compounding on top of it.
   */
  const writeGrade = (graded: PatternGrade) => {
    if (!pattern) return;
    const { interval, ease, repetitions, nextReview } = getNextReviewData(
      pattern.production ?? {},
      graded.verdict,
    );
    const production: ReviewTracking = { interval, ease, repetitions, nextReview };
    if (pattern.id) {
      // Fire-and-forget, as the card path does: Firestore queues the write and
      // syncs on reconnect, and the learner should not wait on it to see their
      // feedback.
      updatePatternTracking(pattern.id, production).catch(err => {
        console.error('[patterns] failed to write scheduling:', err);
      });
      onScheduled(pattern.id, production);
    }
  };

  const handleCheck = async () => {
    if (!answer.trim() || overLimit || !exercise || !pattern) return;
    setSkipped(false);

    // Cloze grades locally: an exact comparison against what generation
    // supplied. No round trip, so no failure path and no variance — the whole
    // reason the controlled rung is cheap.
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
      const result = await gradePatternAnswer(
        answer.trim(),
        nativeLanguage ?? 'English',
        studyLanguage,
      );
      const graded = gradeFromReview(result, answer.trim(), exercise, hintTier);
      writeGrade(graded);
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

  /**
   * The learner says the grader was wrong.
   *
   * Legitimate because they can see both strings — on a cloze the expected
   * answer is on screen beside what they typed, so this is not appealing a
   * hidden judgement, it is reporting that the generated `alternates` list was
   * short. Re-grades correctness, not effort: the hint clamp still applies.
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

  /** The gloss and citation form, which are what a cloze uses for its hints. */
  const clozeHintOne = patternGloss(pattern ?? { gloss: {} }, nativeLanguage) || pattern?.pattern || '';
  const clozeHintTwo = pattern?.pattern ?? '';

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

  /** The cloze sentence, with the gap rendered as a blank rather than text. */
  const renderGappedSentence = (sentence: string) => {
    const [before, ...rest] = sentence.split(CLOZE_GAP);
    return (
      <p className="text-lg leading-relaxed text-[var(--color-text)]">
        {before}
        <span
          className="inline-block align-baseline mx-1 px-6 border-b-2"
          style={{ borderColor: 'var(--color-highlight)' }}
        />
        {rest.join(CLOZE_GAP)}
      </p>
    );
  };

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
              {t(nativeLanguage, exercise.format === 'cloze' ? 'patternClozeHeading' : 'patternSituationHeading')}
            </h3>

            {exercise.format === 'cloze' ? (
              <>
                {renderGappedSentence(exercise.sentence)}
                {/* The meaning is not a hint — it is half the prompt. A gap
                    filled without understanding the sentence is mechanical
                    practice, which is the one drill type the research does not
                    support. */}
                {exercise.meaning && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)] opacity-70">
                    {exercise.meaning}
                  </p>
                )}
                {exercise.input && (
                  <p className="mt-3 text-sm" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'patternClozeFrom')}{' '}
                    <span className="font-bold text-[var(--color-text)]">{exercise.input}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">
                {exercise.situation}
              </p>
            )}

            {/* Hints, revealed in order and never before they are asked for.
                A production turn's tiers were generated with the situation, so
                asking costs no round trip; a cloze's are the pattern's own
                gloss and citation form, so they cost nothing at all. What
                asking costs, in both cases, is the ceiling on the verdict. */}
            {hintTier >= 1 && (
              <div className="mt-4 pt-4 border-t text-sm" style={{ borderColor: 'var(--color-muted)' }}>
                {isCloze ? (
                  <p className="text-[var(--color-text)] opacity-80">
                    {t(nativeLanguage, 'patternHintPointMeans')}{' '}
                    <span className="font-semibold">{clozeHintOne}</span>
                  </p>
                ) : (
                  <p className="text-[var(--color-text)] opacity-80">{exercise.hintShape}</p>
                )}
                {hintTier >= 2 && (
                  <p className="mt-2 font-bold" style={{ color: 'var(--color-highlight)' }}>
                    {isCloze ? clozeHintTwo : exercise.hintName}
                  </p>
                )}
                <p className="mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                  {t(nativeLanguage, hintTier >= 2 ? 'patternHintCostAgain' : 'patternHintCostHard')}
                </p>
              </div>
            )}

            {phase === 'graded' && grade && (
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

                {grade.overridden && (
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'patternOverridden')}
                  </p>
                )}

                {exercise.format === 'cloze' ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                          {t(nativeLanguage, 'patternYourSentence')}
                        </h4>
                        <span
                          className="text-lg"
                          style={{ color: grade.reached ? 'var(--color-text)' : 'rgb(248 113 113)' }}
                        >
                          {answer.trim()}
                        </span>
                      </div>
                      {!grade.reached && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                            {t(nativeLanguage, 'patternExpected')}
                          </h4>
                          <span className="text-lg font-bold" style={{ color: 'var(--color-highlight)' }}>
                            {exercise.expected}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* The whole sentence, filled in, so the turn ends on the
                        thing being learned rather than on a fragment. */}
                    <div className="flex items-center gap-2">
                      <p className="text-lg text-[var(--color-text)]">{exercise.full}</p>
                      <PronounceButton text={exercise.full} studyLanguage={studyLanguage} />
                    </div>
                  </>
                ) : (
                  <>
                    {!grade.reached && (
                      <p className="text-sm text-[var(--color-text)] opacity-80">
                        {t(nativeLanguage, 'patternNotReached')}
                      </p>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                        {t(nativeLanguage, 'patternYourSentence')}
                      </h4>
                      <p className="leading-relaxed text-[var(--color-text)] opacity-70">{answer.trim()}</p>
                    </div>

                    {/* The rewrite shows on every verdict, including `good`. A
                        sentence that got the pattern right and still differs
                        from how a native would put it is worth seeing — the
                        same reasoning `rewriteNative` exists for. */}
                    {review && (
                      <>
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
                      </>
                    )}
                  </>
                )}

                {/* The escape hatch for a short `alternates` or `targetForms`
                    list. Only offered where it can change something: at tier 2
                    the clamp already pins the verdict at `again`, so a control
                    that did nothing would be worse than none. */}
                {!grade.overridden && grade.verdict !== 'good' && grade.verdict !== 'easy' && hintTier < 2 && (
                  <button
                    onClick={handleOverride}
                    className="text-sm px-3 py-1.5 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                  >
                    {t(nativeLanguage, 'patternOverride')}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!exerciseError && exercise && phase === 'answering' && (
        <>
          {exercise.format === 'cloze' ? (
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
              placeholder={t(nativeLanguage, 'patternClozePlaceholder')}
              className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] text-lg"
            />
          ) : (
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder={t(nativeLanguage, 'patternAnswerPlaceholder', { language: languageLabel })}
              rows={3}
              disabled={grading}
              className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] resize-y"
            />
          )}

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
            {/* The counter is a ceiling on a paragraph, which only a free
                production turn can approach. A one-word cloze answer showing
                "4 / 300" is noise. */}
            <span
              className="text-xs tabular-nums"
              style={{ color: overLimit ? 'var(--color-highlight)' : 'var(--color-muted)' }}
            >
              {isCloze ? '' : `${answer.length} / ${PATTERN_MAX_CHARS}`}
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
