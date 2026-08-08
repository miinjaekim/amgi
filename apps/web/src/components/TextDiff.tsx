'use client';

import { useMemo } from 'react';
import { diffText, getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

/**
 * One text with the corrections marked in place, rather than two texts to look
 * between.
 *
 * Unified rather than side-by-side, because this is prose and the point is to
 * read the corrected sentence *as a sentence* while seeing what moved. Two
 * columns would reproduce the up-and-down problem horizontally.
 *
 * `<del>` and `<ins>` are the semantic elements for exactly this, so a screen
 * reader announces the edits as edits without any ARIA scaffolding.
 */
export default function TextDiff({
  before,
  after,
  studyLanguage,
  className = '',
}: {
  before: string;
  after: string;
  studyLanguage: StudyLanguage;
  className?: string;
}) {
  const { locale } = getStudyLanguageConfig(studyLanguage);
  // Quadratic in the token count, so not on every keystroke of an unrelated
  // input — and both texts are stable once a review has come back.
  const segments = useMemo(() => diffText(before, after, locale), [before, after, locale]);

  return (
    <p className={`leading-relaxed whitespace-pre-wrap ${className}`}>
      {segments.map((segment, i) => {
        if (segment.op === 'same') {
          return <span key={i} className="text-[var(--color-text)]">{segment.text}</span>;
        }
        if (segment.op === 'remove') {
          return (
            <del
              key={i}
              className="line-through decoration-2"
              style={{ color: 'rgb(248 113 113)', textDecorationColor: 'rgb(248 113 113)' }}
            >
              {segment.text}
            </del>
          );
        }
        return (
          <ins
            key={i}
            className="no-underline font-semibold"
            style={{ color: 'var(--color-highlight)' }}
          >
            {segment.text}
          </ins>
        );
      })}
    </p>
  );
}
