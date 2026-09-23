'use client';

import { useState } from 'react';
import {
  buildWritingCardDraft,
  getStudyLanguageConfig,
  getWritingReview,
  offersCard,
  writingExample,
  WRITING_MAX_CHARS,
} from '@amgi/core';
import type {
  FindingKind,
  TranslationKey,
  WritingCardCandidate,
  WritingReview,
} from '@amgi/core';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
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
 * Writing review: a passage in, how a native would have written it out, plus an
 * ordered list of what to notice.
 *
 * Restored 2026-09-21 from `1ebdc9b^` — removed 2026-08, deployed route and
 * parser untouched the whole time. **Its address changed and its behaviour did
 * not**: this used to be the passage half of Learn behind a Word/Passage
 * toggle, and it is now a Munli tool with a surface of its own. The toggle is
 * what was disliked, and a mode with its own writing surface needs no toggle,
 * no auto-growing input, and no way to tell a lookup from a passage — the whole
 * placement problem is gone with the address.
 *
 * ⚠️ **Writing diagnoses; it never practises.** No generated exercises, no
 * model-graded production. The findings are read, and what they yield is
 * vocabulary cards — which belong to the account, not to Munli, so they land in
 * Amgi's deck exactly as a lookup's card does.
 *
 * Owns its own submission, result and card-saving rather than threading them
 * through the page: saving a card here must NOT clear the passage the way
 * saving from a word lookup clears the term — you keep reading the rest of the
 * findings.
 */

export default function WritingReviewPanel() {
  // ⚠️ Two languages, and they are not interchangeable — see the 2026-09-12
  // decision. `interfaceLanguage` is the app talking (buttons, headings,
  // errors). `deckNativeLanguage` is what this deck is explained in, which is
  // what the model is told to write its notes in and which back slot a saved
  // card reads from.
  const { user, interfaceLanguage, deckNativeLanguage, studyLanguage, handleSignIn } = useUser();
  const [text, setText] = useState('');
  const [review, setReview] = useState<WritingReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyed by the candidate's study text, which is what a card is identified by
  // on this screen. Two findings quoting the same phrase should both read as
  // saved, and they do.
  const [savedCards, setSavedCards] = useState<Set<string>>(new Set());
  const [savingCard, setSavingCard] = useState<string | null>(null);
  /**
   * The passage as it was when it was submitted, which is what the diff is
   * against. Not `text`: the textarea stays editable after a review comes back,
   * and diffing the rewrite against a passage the user has since changed would
   * invent edits nobody made.
   */
  const [submitted, setSubmitted] = useState('');
  const [showClean, setShowClean] = useState(false);

  const langConfig = getStudyLanguageConfig(studyLanguage);
  const languageLabel = t(interfaceLanguage, langConfig.studyLabelKey);
  const overLimit = text.length > WRITING_MAX_CHARS;
  /**
   * The worked example, if this study language has a sourced one.
   *
   * ⚠️ **Most languages have none, and that is the right default.** A learner
   * of Japanese seeing a French example would be worse than the empty space it
   * fills, and one invented for Japanese would be worse still — the sentences
   * are sourced content (`docs/packs/writing-worked-example-draft.md`).
   */
  const example = writingExample(studyLanguage);
  const gapWord = example?.gap[deckNativeLanguage === 'Korean' ? 'Korean' : 'English'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || overLimit) return;
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
    <div>
      {/* Tagline — mirrors the word mode's empty state so switching modes
          doesn't drop the page's vertical rhythm */}
      {!review && !error && (
        <div className="mt-16 sm:mt-28 text-center">
          <p className="text-[var(--color-text)] text-lg font-semibold mb-2">{t(interfaceLanguage, 'writingTagline')}</p>
          <p className="text-[var(--color-text)] opacity-60 text-sm max-w-md mx-auto">
            {t(interfaceLanguage, 'writingTaglineSubtitle')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={t(interfaceLanguage, 'writingPlaceholder', { language: languageLabel })}
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
            {loading ? <Spinner className="w-5 h-5 mx-auto" /> : t(interfaceLanguage, 'writingButton')}
          </button>
        </div>
      </form>

      {/* ⚠️ **It demonstrates the gap, deliberately.** The "?" sheet says in
          words that a word you cannot reach can go in in your own language;
          this is the route catching exactly that, which is the one thing about
          Writing a learner will not guess from an empty box. Asked for
          2026-09-22, to use the space rather than leave it blank. */}
      {!review && !error && example && gapWord && (
        <section className="mt-10 p-5 rounded-xl border" style={{ borderColor: 'var(--color-muted)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'writingExampleHeading')}
          </p>

          <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'writingExampleWrote')}
          </p>
          <p className="text-base mb-4" style={{ color: 'var(--color-text)' }}>
            {example.written.split('{gap}')[0]}
            <span style={{ color: 'var(--color-highlight)', fontWeight: 700 }}>{gapWord}</span>
            {example.written.split('{gap}')[1]}
          </p>

          <p className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'writingExampleGot')}
          </p>
          <p className="text-base" style={{ color: 'var(--color-text)' }}>{example.rewrite}</p>

          {/* The card the finding would offer — the same shape as a real one,
              so what the tab is *for* is legible before anything is submitted. */}
          <div className="mt-4 flex items-center gap-2 flex-wrap text-sm">
            <span className="text-xs px-2 py-0.5 rounded-full border"
                  style={{ color: 'var(--color-highlight)', borderColor: 'var(--color-highlight)' }}>
              {t(interfaceLanguage, 'writingWordYouNeeded')}
            </span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{example.study}</span>
            <span style={{ color: 'var(--color-muted)' }}>— {gapWord}</span>
          </div>
        </section>
      )}

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
                {t(interfaceLanguage, 'writingRewriteHeading')}
              </h2>
              <PronounceButton text={review.rewrite} studyLanguage={studyLanguage} kind="sentence" />
              <div className="ml-auto flex items-center gap-2">
                {/* Always the clean rewrite, never the diff — copying markup
                    with deletions in it would paste back the mistakes. */}
                <CopyButton text={review.rewrite} interfaceLanguage={interfaceLanguage} className="hover:text-[var(--color-text)] hover:border-[var(--color-text)]" />
                {/* The clean rewrite is still worth reaching — it is the
                    version you would read aloud, and a heavily edited passage
                    is hard to read as a sentence through its own diff. */}
                <button
                  onClick={() => setShowClean(v => !v)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                >
                  {t(interfaceLanguage, showClean ? 'writingViewChanges' : 'writingViewFinal')}
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
                  {t(interfaceLanguage, 'writingRewriteMeaning')}
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
              {t(interfaceLanguage, 'writingFindingsHeading')}
            </h2>

            {review.findings.length === 0 ? (
              <p className="text-[var(--color-text)] opacity-60 text-sm">{t(interfaceLanguage, 'writingNoFindings')}</p>
            ) : (
              /* One ordered list, not sections grouped by kind — the order is
                 the model's judgement of what this writer most needs, which is
                 what makes the feedback meet them at their level. */
              <ol className="space-y-3">
                {review.findings.map((finding, i) => {
                  const saved = finding.card ? savedCards.has(finding.card.study) : false;
                  const savingThis = finding.card ? savingCard === finding.card.study : false;
                  const showCard = offersCard(finding);
                  return (
                    <li
                      key={i}
                      className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)]"
                    >
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest border"
                        style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                      >
                        {t(interfaceLanguage, KIND_LABEL_KEY[finding.kind])}
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
                              {t(interfaceLanguage, 'writingWordYouNeeded')}
                            </span>
                          )}
                          <span className="font-bold text-[var(--color-text)]">{finding.card.study}</span>
                          <PronounceButton text={finding.card.study} studyLanguage={studyLanguage} />
                          <span className="text-sm opacity-60 text-[var(--color-text)]">
                            {deckNativeLanguage === 'Korean' ? finding.card.back.Korean : finding.card.back.English}
                          </span>
                          <button
                            onClick={() => handleAddCard(finding.card!)}
                            disabled={saved || savingThis}
                            className="ml-auto px-3 py-1 rounded-full border text-sm transition-colors disabled:opacity-60 disabled:cursor-default hover:bg-[var(--color-muted)]/30"
                            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                          >
                            {savingThis
                              ? <Spinner className="w-4 h-4" />
                              : t(interfaceLanguage, saved ? 'writingCardSaved' : 'writingAddCard')}
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
