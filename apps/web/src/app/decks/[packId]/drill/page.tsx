'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import {
  DRILL_SIZES,
  advanceDrillQueue,
  drillAnswer,
  drillPrompt,
  drillSpokenText,
  getPackText,
  getStudyLanguageConfig,
  getVocabPack,
  startDrillQueue,
} from '@amgi/core';
import type { DrillDirection, PackCard } from '@amgi/core';
import PronounceButton from '@/components/PronounceButton';
import { t } from '@/lib/i18n';

export default function DrillPage() {
  const { packId } = useParams<{ packId: string }>();
  const { nativeLanguage, studyLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const pack = getVocabPack(studyLanguage, packId);

  const [direction, setDirection] = useState<DrillDirection>('studyToBack');
  const [size, setSize] = useState<number | null>(null);
  const [queue, setQueue] = useState<PackCard[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<PackCard[]>([]);

  const backToDeck = (
    <Link
      href={`/decks/${packId}`}
      className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
    >
      ← {t(nativeLanguage, 'drillBackToDeck')}
    </Link>
  );

  // Only a `cards` pack can be drilled: a lookup pack holds words with no back
  // side, because its answers are the explanations Gemini writes at save time.
  if (!pack || pack.kind !== 'cards') {
    return (
      <div className="max-w-xl mx-auto">
        {backToDeck}
        <p className="mt-6 text-[var(--color-muted)]">{t(nativeLanguage, 'deckNotFound')}</p>
      </div>
    );
  }

  function begin(cards: readonly PackCard[], sessionSize: number | null) {
    const next = startDrillQueue(cards, sessionSize);
    setQueue(next);
    setAnswered(new Set());
    setMissed([]);
    setRevealed(false);
  }

  function grade(knew: boolean) {
    if (!queue) return;
    const current = queue[0];
    // Only the first miss counts — a card missed twice is still one card the
    // user didn't know, and the score claims "on the first try".
    if (!knew && !missed.some(c => c.study === current.study)) {
      setMissed(prev => [...prev, current]);
    }
    setAnswered(prev => new Set(prev).add(current.study));
    setQueue(advanceDrillQueue(queue, knew));
    setRevealed(false);
  }

  const sizeOptions = DRILL_SIZES.filter(s => s === null || s < pack.cards.length);

  // Start screen — mirrors Review's, which is the loop this one is a sibling of.
  if (queue === null) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center">
        <div className="self-start">{backToDeck}</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--color-highlight)]">
          {getPackText(pack.name, nativeLanguage)}
        </h1>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {(['studyToBack', 'backToStudy'] as DrillDirection[]).map(dir => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className="px-3 py-2.5 rounded-lg text-sm font-mono border transition-colors"
              style={
                direction === dir
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
              }
            >
              {t(nativeLanguage, dir === 'studyToBack'
                ? langConfig.directionFrontToBackKey
                : langConfig.directionBackToFrontKey)}
            </button>
          ))}
        </div>

        {sizeOptions.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {sizeOptions.map(option => (
              <button
                key={option ?? 'all'}
                onClick={() => setSize(option)}
                className="px-3 py-2 rounded-lg text-sm font-mono border transition-colors"
                style={
                  size === option
                    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                    : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                }
              >
                {option === null
                  ? t(nativeLanguage, 'drillSizeAll', { count: pack.cards.length })
                  : t(nativeLanguage, 'drillSizeCards', { count: option })}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => begin(pack.cards, size)}
          className="mt-6 px-6 py-3 rounded-lg text-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)]"
        >
          {t(nativeLanguage, 'drillStart')}
        </button>

        <p className="mt-4 text-xs text-[var(--color-muted)]">
          {t(nativeLanguage, 'drillNoProgress')}
        </p>
      </div>
    );
  }

  // Summary.
  if (queue.length === 0) {
    const total = answered.size;
    const correct = total - missed.length;
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center text-center">
        <div className="self-start">{backToDeck}</div>
        <h1 className="mt-6 text-2xl font-bold text-[var(--color-highlight)]">
          {t(nativeLanguage, 'drillDoneTitle')}
        </h1>
        {/* Ending a drill before answering anything leaves nothing to score. */}
        {total > 0 && (
          <p className="mt-3 text-[var(--color-text)]">
            {missed.length === 0
              ? t(nativeLanguage, 'drillScorePerfect', { total })
              : t(nativeLanguage, 'drillScore', { correct, total })}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {missed.length > 0 && (
            <button
              onClick={() => begin(missed, null)}
              className="px-5 py-3 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)]"
            >
              {t(nativeLanguage, 'drillMissedAgain', { count: missed.length })}
            </button>
          )}
          <button
            onClick={() => begin(pack.cards, size)}
            className="px-5 py-3 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/30"
          >
            {t(nativeLanguage, 'drillAgain')}
          </button>
        </div>
      </div>
    );
  }

  const current = queue[0];

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center text-center">
      <div className="w-full flex items-center justify-between">
        <span className="text-sm text-[var(--color-muted)]">
          {t(nativeLanguage, 'drillRemaining', { count: queue.length })}
        </span>
        <button
          onClick={() => setQueue([])}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          {t(nativeLanguage, 'drillEnd')}
        </button>
      </div>

      <div className="w-full mt-8 p-8 rounded-2xl border border-[var(--color-muted)] flex flex-col items-center gap-4"
        style={{ background: 'var(--color-surface)' }}
      >
        <span className="text-5xl text-[var(--color-text)] leading-tight">
          {drillPrompt(current, direction)}
        </span>

        {revealed ? (
          <>
            <span className="text-2xl text-[var(--color-highlight)]">
              {drillAnswer(current, direction)}
            </span>
            {pack.pronounceable && (
              <PronounceButton text={drillSpokenText(current)} studyLanguage={studyLanguage} />
            )}
          </>
        ) : (
          // Holds the answer's height so grading buttons don't jump on reveal —
          // the same problem the review buttons had.
          <span className="text-2xl invisible">&nbsp;</span>
        )}
      </div>

      {revealed ? (
        <div className="w-full grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => grade(false)}
            className="px-4 py-3 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] font-semibold hover:bg-[var(--color-muted)]/30"
          >
            {t(nativeLanguage, 'drillMissed')}
          </button>
          <button
            onClick={() => grade(true)}
            className="px-4 py-3 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-semibold hover:bg-[var(--color-text)]"
          >
            {t(nativeLanguage, 'drillKnew')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full mt-4 px-4 py-3 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] text-lg font-semibold hover:bg-[var(--color-muted-dark)]"
        >
          {t(nativeLanguage, 'showAnswer')}
        </button>
      )}
    </div>
  );
}
