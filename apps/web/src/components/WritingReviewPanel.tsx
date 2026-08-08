'use client';

import { useState } from 'react';
import {
  buildPatternDraft,
  buildWritingCardDraft,
  getStudyLanguageConfig,
  getWritingReview,
  patternGloss,
  WRITING_MAX_CHARS,
} from '@amgi/core';
import type {
  FindingKind,
  TranslationKey,
  WritingCardCandidate,
  WritingPatternCandidate,
  WritingReview,
} from '@amgi/core';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { savePattern } from '@/services/patterns';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';
import PronounceButton from '@/components/PronounceButton';
import TextDiff from '@/components/TextDiff';
import CopyButton from '@/components/CopyButton';

const KIND_LABEL_KEY: Record<FindingKind, TranslationKey> = {
  grammar: 'writingKindGrammar',
  naturalness: 'writingKindNaturalness',
  register: 'writingKindRegister',
  vocabulary: 'writingKindVocabulary',
};

/**
 * The passage half of Learn.
 *
 * Owns its own submission, result and card-saving rather than threading them
 * through the page: saving a card here must NOT clear the passage the way
 * saving from a word lookup clears the term — you keep reading the rest of the
 * findings. Sharing the page's `handleSaveFlashcard` would have meant teaching
 * that reset two different meanings.
 */
export default function WritingReviewPanel() {
  const { user, nativeLanguage, studyLanguage, handleSignIn } = useUser();
  const [text, setText] = useState('');
  const [review, setReview] = useState<WritingReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyed by the candidate's study text, which is what a card is identified by
  // on this screen. Two findings quoting the same phrase should both read as
  // saved, and they do.
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [savingCard, setSavingCard] = useState<string | null>(null);
  // Patterns keep their own two, keyed by citation form. Kept apart from the
  // card sets rather than pooled: a finding can offer both, and one of them
  // being saved says nothing about the other.
  const [savedPatterns, setSavedPatterns] = useState<Set<string>>(new Set());
  const [savingPattern, setSavingPattern] = useState<string | null>(null);
  /**
   * The passage as it was when it was submitted, which is what the diff is
   * against. Not `text`: the textarea stays editable after a review comes back,
   * and diffing the rewrite against a passage the user has since changed would
   * invent edits nobody made.
   */
  const [submitted, setSubmitted] = useState('');
  const [showClean, setShowClean] = useState(false);

  const langConfig = getStudyLanguageConfig(studyLanguage);
  const languageLabel = t(nativeLanguage, langConfig.studyLabelKey);
  const overLimit = text.length > WRITING_MAX_CHARS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || overLimit) return;
    setLoading(true);
    setError(null);
    setReview(null);
    setSavedCards(new Set());
    setSavedPatterns(new Set());
    setShowClean(false);
    try {
      const passage = text.trim();
      const result = await getWritingReview(passage, nativeLanguage ?? 'English', studyLanguage);
      setSubmitted(passage);
      setReview(result);
    } catch (err) {
      setError(t(nativeLanguage, 'errorWritingReview'));
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
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingCard(null);
    }
  };

  /**
   * Takes a pattern into practice rather than saving it as a card.
   *
   * This is the emergent door the design wanted: the patterns you practise are
   * the ones your own writing showed you needed, not an ordered curriculum
   * somebody configured. Nothing here enrols you in anything — one finding, one
   * pattern, chosen because you just got it wrong.
   */
  const handleAddPattern = async (candidate: WritingPatternCandidate) => {
    if (!user) {
      handleSignIn();
      return;
    }
    setSavingPattern(candidate.pattern);
    setError(null);
    try {
      await savePattern(buildPatternDraft(candidate, user.uid, studyLanguage));
      setSavedPatterns(prev => new Set(prev).add(candidate.pattern));
    } catch {
      setError(t(nativeLanguage, 'errorSavePattern'));
    } finally {
      setSavingPattern(null);
    }
  };

  return (
    <div>
      {/* Tagline — mirrors the word mode's empty state so switching modes
          doesn't drop the page's vertical rhythm */}
      {!review && !error && (
        <div className="mt-16 sm:mt-28 text-center">
          <p className="text-[var(--color-text)] text-lg font-semibold mb-2">{t(nativeLanguage, 'writingTagline')}</p>
          <p className="text-[var(--color-text)] opacity-60 text-sm max-w-md mx-auto">
            {t(nativeLanguage, 'writingTaglineSubtitle')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t(nativeLanguage, 'writingPlaceholder', { language: languageLabel })}
          rows={6}
          disabled={loading}
          className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] resize-y"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span
            className="text-xs tabular-nums"
            style={{ color: overLimit ? 'var(--color-highlight)' : 'var(--color-muted)' }}
          >
            {text.length} / {WRITING_MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={loading || !text.trim() || overLimit}
            className="px-5 py-2 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-bold hover:bg-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Spinner className="w-5 h-5 mx-auto" /> : t(nativeLanguage, 'writingButton')}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-semibold">
          {error}
        </div>
      )}

      {review && (
        <div className="mt-8 space-y-6">
          <section className="p-6 rounded-xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-muted)]">
            {/* Wraps: the heading is a full sentence in uppercase and the row
                also carries a pronounce button, a copy control and the
                Changes/Final toggle. Narrow enough and they ran off the edge —
                found on a phone, and the same row on mobile had it too. */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-widest shrink" style={{ color: 'var(--color-muted)' }}>
                {t(nativeLanguage, 'writingRewriteHeading')}
              </h2>
              <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} />
              <div className="ml-auto flex items-center gap-2">
                {/* Always the clean rewrite, never the diff — copying markup
                    with deletions in it would paste back the mistakes. */}
                <CopyButton text={review.rewrite} nativeLanguage={nativeLanguage} className="hover:text-[var(--color-text)] hover:border-[var(--color-text)]" />
                {/* The clean rewrite is still worth reaching — it is the
                    version you would read aloud, and a heavily edited passage
                    is hard to read as a sentence through its own diff. */}
                <button
                  onClick={() => setShowClean(v => !v)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                >
                  {t(nativeLanguage, showClean ? 'writingViewChanges' : 'writingViewFinal')}
                </button>
              </div>
            </div>
            {showClean ? (
              <p className="text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">{review.rewrite}</p>
            ) : (
              <TextDiff
                before={submitted}
                after={review.rewrite}
                studyLanguage={studyLanguage}
                className="text-lg"
              />
            )}

            {/* Subordinate to the rewrite, not hidden behind a tap: it is how
                the user verifies a correction didn't change what they meant,
                and a check nobody opens is a check nobody runs. */}
            {review.rewriteNative && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-muted)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted)' }}>
                  {t(nativeLanguage, 'writingRewriteMeaning')}
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)] opacity-70">
                  {review.rewriteNative}
                </p>
              </div>
            )}
          </section>

          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-muted)' }}
            >
              {t(nativeLanguage, 'writingFindingsHeading')}
            </h2>

            {review.findings.length === 0 ? (
              <p className="text-[var(--color-text)] opacity-60 text-sm">{t(nativeLanguage, 'writingNoFindings')}</p>
            ) : (
              /* One ordered list, not sections grouped by kind — the order is
                 the model's judgement of what this writer most needs, which is
                 what makes the feedback meet them at their level. */
              <ol className="space-y-3">
                {review.findings.map((finding, i) => {
                  const saved = finding.card ? savedCards.has(finding.card.study) : false;
                  const savingThis = finding.card ? savingCard === finding.card.study : false;
                  const patternSaved = finding.pattern ? savedPatterns.has(finding.pattern.pattern) : false;
                  const savingThisPattern = finding.pattern
                    ? savingPattern === finding.pattern.pattern
                    : false;
                  // A pattern offer normally stands alone: where both are
                  // present the card is a fallback for clients that cannot
                  // practise patterns, and on a grammar finding it is often a
                  // *description* rather than a card front — "accord du
                  // participe passé avec être" is a heading, not something you
                  // want in your deck. Measured, not feared.
                  //
                  // A gap card is the exception, and it is the whole point of
                  // the flag. A word the learner reached for and did not have
                  // is a different object from the pattern the same sentence
                  // happened to illustrate, and wanting both is not a choice
                  // the app should make for them.
                  const showCard =
                    !!finding.card && (!finding.pattern || finding.card.gap === true);
                  return (
                    <li
                      key={i}
                      className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)]"
                    >
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border"
                        style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                      >
                        {t(nativeLanguage, KIND_LABEL_KEY[finding.kind])}
                      </span>

                      {(finding.original || finding.suggested) && (
                        <p className="mt-2 flex flex-wrap items-baseline gap-2">
                          {finding.original && (
                            <span className="line-through opacity-50 text-[var(--color-text)]">{finding.original}</span>
                          )}
                          {finding.original && finding.suggested && (
                            <span style={{ color: 'var(--color-muted)' }}>→</span>
                          )}
                          {finding.suggested && (
                            <span className="font-bold" style={{ color: 'var(--color-highlight)' }}>
                              {finding.suggested}
                            </span>
                          )}
                        </p>
                      )}

                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)] opacity-80">{finding.note}</p>

                      {finding.pattern && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-muted)' }}>
                          <span className="font-bold text-[var(--color-text)]">{finding.pattern.pattern}</span>
                          {patternGloss(finding.pattern, nativeLanguage) && (
                            <span className="text-sm opacity-60 text-[var(--color-text)]">
                              {patternGloss(finding.pattern, nativeLanguage)}
                            </span>
                          )}
                          <button
                            onClick={() => handleAddPattern(finding.pattern!)}
                            disabled={patternSaved || savingThisPattern}
                            className="ml-auto px-3 py-1 rounded-full border text-sm transition-colors disabled:opacity-60 disabled:cursor-default hover:bg-[var(--color-muted)]/30"
                            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                          >
                            {savingThisPattern
                              ? <Spinner className="w-4 h-4" />
                              : t(nativeLanguage, patternSaved ? 'patternAdded' : 'patternPractise')}
                          </button>
                        </div>
                      )}

                      {showCard && finding.card && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-muted)' }}>
                          {/* A word they demonstrably reached for and did not
                              have. Marked, because it is different evidence
                              from every other suggestion on the page: not "this
                              would be worth knowing" but "you needed this and
                              it wasn't there." */}
                          {finding.card.gap && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest"
                              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                            >
                              {t(nativeLanguage, 'writingWordYouNeeded')}
                            </span>
                          )}
                          <span className="font-bold text-[var(--color-text)]">{finding.card.study}</span>
                          <PronounceButton text={finding.card.study} studyLanguage={studyLanguage} />
                          <span className="text-sm opacity-60 text-[var(--color-text)]">
                            {nativeLanguage === 'Korean' ? finding.card.back.Korean : finding.card.back.English}
                          </span>
                          <button
                            onClick={() => handleAddCard(finding.card!)}
                            disabled={saved || savingThis}
                            className="ml-auto px-3 py-1 rounded-full border text-sm transition-colors disabled:opacity-60 disabled:cursor-default hover:bg-[var(--color-muted)]/30"
                            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                          >
                            {savingThis
                              ? <Spinner className="w-4 h-4" />
                              : t(nativeLanguage, saved ? 'writingCardSaved' : 'writingAddCard')}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
