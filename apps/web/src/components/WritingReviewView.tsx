'use client';

import { useState } from 'react';
import { offersCard } from '@amgi/core';
import type {
  FindingKind,
  StudyLanguage,
  TranslationKey,
  WritingCardCandidate,
  WritingReview,
} from '@amgi/core';
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

interface Props {
  review: WritingReview;
  /** The passage the review was made against, which is what the diff is from. */
  passage: string;
  studyLanguage: StudyLanguage;
  /** Which back a card candidate is read in. */
  nativeLanguage: string | null | undefined;
  /**
   * Saving a finding's card. Absent where the review is only being read (a
   * saved writing), and the candidate is then shown without its button.
   */
  cards?: {
    saved: Set<string>;
    saving: string | null;
    onAdd: (candidate: WritingCardCandidate) => void;
  };
}

/**
 * A writing review, drawn: the rewrite against the passage, what it means, and
 * the ordered findings.
 *
 * Lifted out of `WritingReviewPanel` so a saved writing opens **as it looked**
 * — one drawing of a review, used fresh and from Saved, rather than a second
 * one that drifts.
 */
export default function WritingReviewView({ review, passage, studyLanguage, nativeLanguage, cards }: Props) {
  const { interfaceLanguage } = useUser();
  const [showClean, setShowClean] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-muted)]">
        {/* Wraps: the heading is a full sentence in uppercase and the row
            also carries a pronounce button, a copy control and the
            Changes/Final toggle. Narrow enough and they ran off the edge —
            found on a phone, and the same row on mobile had it too. */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-xs font-semibold uppercase tracking-widest shrink" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'writingRewriteHeading')}
          </h2>
          {/* ⚠️ No pronounce button on the rewrite (the user's call,
            2026-10-06, made on mobile and carried here): this tool is for
            writing, not listening. The ones on the findings stay: hearing
            the one new word is worth more than hearing back the passage you
            just wrote. */}
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
            before={passage}
            after={review.rewrite}
            studyLanguage={studyLanguage}
            className="text-lg"
          />
        )}

        {/* The check that a correction didn't change what they meant.
            ⚠️ Behind a click since 2026-10-06, on the user's call: open it
            when you are curious what the rewrite says. It was always shown
            before, on the argument that a check nobody opens is a check
            nobody runs; the user weighed that against the room it takes on
            every review and chose the click. */}
        {review.rewriteNative && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-muted)' }}>
            <button
              onClick={() => setShowMeaning(v => !v)}
              aria-expanded={showMeaning}
              className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-widest transition-colors hover:text-[var(--color-text)]"
              style={{ color: 'var(--color-muted)' }}
            >
              <span>{t(interfaceLanguage, 'writingRewriteMeaning')}</span>
              <span aria-hidden>{showMeaning ? '▴' : '▾'}</span>
            </button>
            {showMeaning && (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text)] opacity-70">
                {review.rewriteNative}
              </p>
            )}
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
              const saved = finding.card ? !!cards?.saved.has(finding.card.study) : false;
              const savingThis = finding.card ? cards?.saving === finding.card.study : false;
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
                        {nativeLanguage === 'Korean' ? finding.card.back.Korean : finding.card.back.English}
                      </span>
                      {cards && (
                        <button
                          onClick={() => cards.onAdd(finding.card!)}
                          disabled={saved || savingThis}
                          className="ml-auto px-3 py-1 rounded-full border text-sm transition-colors disabled:opacity-60 disabled:cursor-default hover:bg-[var(--color-muted)]/30"
                          style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                        >
                          {savingThis
                            ? <Spinner className="w-4 h-4" />
                            : t(interfaceLanguage, saved ? 'writingCardSaved' : 'writingAddCard')}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
