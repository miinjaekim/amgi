'use client';

import { useState } from 'react';
import {
  buildWritingCardDraft,
  getStudyLanguageConfig,
  getWritingReview,
  WRITING_MAX_CHARS,
} from '@amgi/core';
import type { FindingKind, TranslationKey, WritingCardCandidate, WritingReview } from '@amgi/core';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';
import PronounceButton from '@/components/PronounceButton';

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
    try {
      setReview(await getWritingReview(text.trim(), nativeLanguage ?? 'English', studyLanguage));
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
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                {t(nativeLanguage, 'writingRewriteHeading')}
              </h2>
              <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} />
            </div>
            <p className="text-lg leading-relaxed whitespace-pre-wrap text-[var(--color-text)]">{review.rewrite}</p>

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

                      {finding.card && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-muted)' }}>
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
