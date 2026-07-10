'use client';
import { useEffect } from 'react';
import { Flashcard } from '@/services/firestore';
import { ExamplePair } from '@/services/gemini';
import { getBackSide, getExampleSides, getStudyLangSide } from '@amgi/core';
import Markdown from '@/components/Markdown';
import { t } from '@/lib/i18n';
import PronounceButton from '@/components/PronounceButton';

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
}

interface Props {
  card: Flashcard;
  nativeLanguage: string | null | undefined;
  onClose: () => void;
}

export default function CardDetailModal({ card, nativeLanguage, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const hasDetails = card.definition || card.hanja || card.notes || (card.examples && card.examples.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl font-mono"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b" style={{ borderColor: 'var(--color-muted)' }}>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-highlight)' }}>{getStudyLangSide(card)}</h2>
              <PronounceButton text={getStudyLangSide(card)} studyLanguage={card.studyLanguage ?? 'Korean'} />
              {card.formality && card.formality !== 'N/A' && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {card.formality}
                </span>
              )}
              {card.gender && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {card.gender}
                </span>
              )}
              {card.furigana && (
                <span className="px-2 py-0.5 text-xs rounded-full border" style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}>
                  {card.furigana}
                </span>
              )}
            </div>
            <p className="text-base mt-1" style={{ color: 'var(--color-text)' }}>{getBackSide(card)}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-1 p-1 rounded-lg hover:bg-[var(--color-muted)]/30 transition-colors flex-shrink-0"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!hasDetails ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {t(nativeLanguage, 'noCardDetails')}
            </p>
          ) : (
            <>
              {card.definition && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'sectionDefinition')}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{card.definition}</Markdown>
                </div>
              )}

              {card.hanja && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'sectionHanja')}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{card.hanja}</Markdown>
                </div>
              )}

              {card.notes && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'sectionContext')}
                  </h3>
                  <Markdown className="text-sm text-[var(--color-text)]">{card.notes}</Markdown>
                </div>
              )}

              {card.examples && card.examples.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'sectionExamples')}
                  </h3>
                  <ul className="space-y-3">
                    {(() => {
                      const raw = card.examples as unknown[];
                      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
                        return (raw as string[]).map((ex, i) => (
                          <li key={i} className="text-sm" style={{ color: 'var(--color-text)' }}>{ex}</li>
                        ));
                      } else if (Array.isArray(raw) && isExamplePairArray(raw)) {
                        return (raw as ExamplePair[]).map((ex, i) => {
                          const sides = getExampleSides(ex, card.studyLanguage);
                          return (
                            <li key={i}>
                              <div className="text-sm" style={{ color: 'var(--color-text)' }}>{sides.study}</div>
                              <div className="text-sm mt-0.5" style={{ color: 'var(--color-highlight)' }}>{sides.back}</div>
                            </li>
                          );
                        });
                      }
                      return null;
                    })()}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
