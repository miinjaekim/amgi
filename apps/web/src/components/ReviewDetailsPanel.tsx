'use client';
import { getCharacterBreakdown, getExampleSides, getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import type { Flashcard } from '@/services/firestore';
import type { ExamplePair } from '@/services/gemini';
import { useCardEnrichment } from '@/hooks/useCardEnrichment';
import Markdown from '@/components/Markdown';
import PronounceButton from '@/components/PronounceButton';
import { t } from '@/lib/i18n';

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
}

interface Props {
  card: Flashcard;
  studyLanguage: StudyLanguage;
  nativeLanguage: string | null | undefined;
  /** Fired after enrichment writes, so the queue's copy of the card follows. */
  onChanged?: (card: Flashcard) => void;
}

/**
 * The details a reviewer can pull up on the card in front of them — and, when a
 * section isn't there yet, write it.
 *
 * Extracted because review renders this twice, once per direction, and adding
 * generate actions inline would have made that four copies of the same logic.
 *
 * Mid-review is the moment this matters most. A pack card arrives in the queue
 * with a gloss and nothing else, and the point at which you discover a gloss is
 * not enough is precisely when you fail to recall it — so the fix belongs here
 * rather than only on a screen you would have to leave the session to reach.
 */
export default function ReviewDetailsPanel({ card, studyLanguage, nativeLanguage, onChanged }: Props) {
  const { saved, working, error, busy, enrich } = useCardEnrichment({
    card,
    studyLanguage,
    nativeLanguage,
    onChanged: () => {},
  });
  // `saved` is the card plus anything just generated; fall back to the prop so
  // the first render is never empty.
  const shown = saved ?? card;
  const characterBreakdown = getCharacterBreakdown(shown);
  const characterSectionKey = getStudyLanguageConfig(studyLanguage).characterSectionKey ?? 'sectionHanja';
  const examples = shown.examples;
  const hasExamples = !!examples && examples.length > 0;
  const hasDepth = !!(shown.definition || characterBreakdown || shown.notes);

  async function run(kind: 'depth' | 'examples') {
    await enrich(kind);
    onChanged?.(shown);
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
      {shown.formality && shown.formality !== 'N/A' && (
        <div className="mb-3">
          <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
            {shown.formality}
          </span>
        </div>
      )}

      {shown.definition && (
        <div className="mb-4">
          <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionDefinition')}</div>
          <Markdown className="text-[var(--color-text)] opacity-90">{shown.definition}</Markdown>
        </div>
      )}

      {characterBreakdown && (
        <div className="mb-4">
          <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, characterSectionKey)}</div>
          <Markdown className="text-[var(--color-text)] opacity-90">{characterBreakdown}</Markdown>
        </div>
      )}

      {hasExamples && (
        <div className="mb-4">
          <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionExamples')}</div>
          <ul className="list-disc list-inside text-[var(--color-text)] opacity-90 space-y-2">
            {(() => {
              const raw = examples as unknown[];
              if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
                return (raw as string[]).map((ex, i) => <li key={i}>{ex}</li>);
              } else if (Array.isArray(raw) && isExamplePairArray(raw)) {
                return (raw as ExamplePair[]).map((ex, i) => {
                  const sides = getExampleSides(ex, studyLanguage, nativeLanguage);
                  return (
                    <li key={i}>
                      <div>
                        {sides.study}
                        <PronounceButton text={sides.study} studyLanguage={studyLanguage} size="sm" className="ml-1 align-middle" />
                      </div>
                      <div className="text-[var(--color-highlight)] text-sm">{sides.back}</div>
                    </li>
                  );
                });
              }
              return null;
            })()}
          </ul>
        </div>
      )}

      {shown.notes && (
        <div className="mt-2">
          <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionNotes')}</div>
          <Markdown className="text-[var(--color-text)] opacity-70 text-sm">{shown.notes}</Markdown>
        </div>
      )}

      {/* Offered only where the section is missing, so a card that already has
          a definition shows no button at all and this stays out of the way of
          the reviewing. */}
      {(!hasDepth || !hasExamples) && (
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {!hasDepth && (
            <button
              onClick={() => run('depth')}
              disabled={busy}
              className="px-3 py-1 rounded text-sm border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors disabled:opacity-50"
            >
              {working === 'depth' ? t(nativeLanguage, 'cardEnriching') : t(nativeLanguage, 'loadDefinition')}
            </button>
          )}
          {!hasExamples && (
            <button
              onClick={() => run('examples')}
              disabled={busy}
              className="px-3 py-1 rounded text-sm border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors disabled:opacity-50"
            >
              {working === 'examples' ? t(nativeLanguage, 'cardEnriching') : t(nativeLanguage, 'loadExamples')}
            </button>
          )}
          {error && <span className="text-xs text-[var(--color-muted)]">{error}</span>}
        </div>
      )}
    </div>
  );
}
