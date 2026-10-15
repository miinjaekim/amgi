'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  advancePreviewQueue,
  getBackSide,
  getReading,
  getStudyLangSide,
  hanjaFaces,
  startPreviewQueue,
} from '@amgi/core';
import type { Flashcard, PreviewScope } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import PronounceButton from '@/components/PronounceButton';
import ReviewDetailsPanel from '@/components/ReviewDetailsPanel';
import { t, partOfSpeechLabel } from '@/lib/i18n';

interface PreviewSessionProps {
  /** The collection's cards. Which of them the scope takes is decided here, once, on start. */
  cards: readonly Flashcard[];
  /** New cards, due ones, or both. */
  scope: PreviewScope;
  /** Shown above the card when the user has more than one collection to tell apart. */
  collectionName?: string;
  onExit: () => void;
}

/**
 * Preview: a pass through a deck's new or due cards before reviewing them, with
 * nothing at stake. See `preview.ts` in core for the rules; the short of it is
 * that nothing here writes anything.
 *
 * **Web's controls are its own, not mobile's swipe carried over.** Two buttons
 * under the card, and the keyboard: space or Enter flips, → is "got it" and ←
 * is "again", which is the swipe's direction mapped onto the keys that already
 * mean right and left. A dragged card is a phone gesture; on a desk it is a
 * mouse held down across the screen to do what one click does.
 *
 * The card flips the way Review's does, with the same `card-turn-*` classes,
 * so it reads as the same card. Unlike Review the answers are there before the
 * flip: getting familiar can be as little as glancing at the front.
 */
export default function PreviewSession({ cards, scope, collectionName, onExit }: PreviewSessionProps) {
  const { interfaceLanguage, deckNativeLanguage, studyLanguage, hanjaPartition } = useUser();
  // Built once. The card list behind it is live, but nothing a preview does
  // changes it, and a snapshot landing mid-session must not reshuffle the pass.
  const [queue, setQueue] = useState<Flashcard[]>(() => startPreviewQueue(cards, scope));
  const [showingBack, setShowingBack] = useState(false);
  const [turn, setTurn] = useState<'out' | 'in' | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  /**
   * The queue and face as they stood before the last answer, for undo. One
   * slot, as in Review: it is for the click you regret straight away. Nothing
   * was saved by the answer, so putting this back is all undo has to do.
   */
  const [lastAnswer, setLastAnswer] = useState<{ queue: Flashcard[]; showingBack: boolean } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = queue[0];

  const restart = () => {
    setQueue(startPreviewQueue(cards, scope));
    setLastAnswer(null);
    setShowingBack(false);
    setShowDetails(false);
    setTurn(null);
  };

  // A turn in progress finishes first.
  const flip = useCallback(() => setTurn(turning => turning ?? 'out'), []);

  const answer = useCallback((gotIt: boolean) => {
    if (queue.length === 0) return;
    setLastAnswer({ queue, showingBack });
    setQueue(advancePreviewQueue(queue, gotIt));
    setShowingBack(false);
    setShowDetails(false);
    setTurn(null);
  }, [queue, showingBack]);

  /** Back onto the card just answered, on the face it was answered from. */
  const undo = () => {
    if (!lastAnswer) return;
    setQueue(lastAnswer.queue);
    setShowingBack(lastAnswer.showingBack);
    setShowDetails(false);
    setTurn(null);
    setLastAnswer(null);
  };

  const headerButtonClass = 'text-lg leading-none px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors';

  /**
   * Getting to know a card is exactly when its definition and examples help,
   * so the back has Review's details panel, generating on demand through the
   * same routes. That writes content onto the card, as it does from Review;
   * it is the card's content, not its schedule, so Preview still saves no
   * study. The queue stores what was written, so a card seen again keeps it.
   */
  const handleCardEnriched = useCallback((card: Flashcard) => {
    setQueue(prev => prev.map(c => (c.id === card.id ? { ...c, ...card } : c)));
  }, []);

  const handleTurnEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (turn === 'out') {
      setShowingBack(back => !back);
      setTurn('in');
    } else {
      setTurn(null);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
    if (window.getSelection()?.toString()) return;
    flip();
  };

  // On the window rather than the card, so the keys work without first
  // clicking into it. Anything typed into a field is left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); answer(true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); answer(false); }
      else if (e.key === ' ' || e.key === 'Enter') {
        // A focused button already answers Enter and space with its own click.
        if (target?.closest('button, a')) return;
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, flip]);

  // Focus follows the card, so a screen reader lands on each new one.
  useEffect(() => { cardRef.current?.focus({ preventScroll: true }); }, [current]);

  const collectionLabel = collectionName && (
    <p className="text-xs text-[var(--color-muted)] mb-2">{collectionName}</p>
  );

  if (!current) {
    return (
      <div className="text-center py-4">
        {collectionLabel}
        <h2 className="text-2xl font-bold mb-2">{t(interfaceLanguage, 'previewDoneTitle')}</h2>
        <p className="text-[var(--color-muted)] text-sm mb-6">{t(interfaceLanguage, 'previewDoneBody')}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className="px-5 py-2.5 rounded-lg font-semibold transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            onClick={onExit}
          >
            {t(interfaceLanguage, 'previewBackToReview')}
          </button>
          <button
            className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
            style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
            onClick={restart}
          >
            {t(interfaceLanguage, 'previewRestart')}
          </button>
          {/* The last card is where a stray answer has no other way back: it
              ends the pass. */}
          {lastAnswer && (
            <button
              className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
              style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
              onClick={undo}
            >
              ↺ {t(interfaceLanguage, 'previewUndo')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const study = getStudyLangSide(current);
  // Front is the study side wherever there is one, so a preview always opens on
  // the word being learned. Hanja follows the learner's chosen partition, as
  // Review's forward direction does.
  const { front, back } = studyLanguage === 'Hanja'
    ? hanjaFaces(current, hanjaPartition)
    : { front: study, back: getBackSide(current, deckNativeLanguage) };
  const gloss = studyLanguage === 'Hanja' && deckNativeLanguage !== 'Korean' ? current.english : undefined;
  const partOfSpeech = partOfSpeechLabel(deckNativeLanguage, current);
  const reading = getReading(current, studyLanguage, deckNativeLanguage);
  const chipClass = 'px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]';

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          {collectionLabel}
          <h2 className="text-xl font-bold">
            {t(interfaceLanguage, 'previewTitle')}
            <span className="ml-2 text-sm font-normal text-[var(--color-muted)]">
              {t(interfaceLanguage, 'previewRemaining', { count: queue.length })}
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Only while there is something to undo: a control that is
              usually inert reads as broken. */}
          {lastAnswer && (
            <button
              onClick={undo}
              aria-label={t(interfaceLanguage, 'previewUndo')}
              title={t(interfaceLanguage, 'previewUndo')}
              className={headerButtonClass}
            >
              ↺
            </button>
          )}
          <button
            onClick={onExit}
            aria-label={t(interfaceLanguage, 'previewEnd')}
            title={t(interfaceLanguage, 'previewEnd')}
            className={headerButtonClass}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        tabIndex={0}
        onClick={handleCardClick}
        onAnimationEnd={handleTurnEnd}
        style={{ '--card-turn': (turn === 'out') !== showingBack ? 1 : -1 } as React.CSSProperties}
        className={`mb-4 h-[20rem] rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg cursor-pointer hover:border-[var(--color-highlight)] focus-visible:border-[var(--color-highlight)] focus-visible:outline-none transition-colors ${turn ? `card-turn-${turn}` : ''}`}
      >
        <div key={showingBack ? 'back' : 'front'} className="h-full overflow-y-auto p-6">
          {showingBack ? (
            <>
              {back && <div dir="auto" className="text-lg mb-3 text-[var(--color-text)] font-semibold">{back}</div>}
              {gloss && <div className="text-base mb-3 text-[var(--color-muted)]">{gloss}</div>}
              {current.briefDefinition && (
                <p className="text-sm mb-3 text-[var(--color-muted)]">{current.briefDefinition}</p>
              )}
              {current.formsNote && (
                <p className="text-xs mb-3 text-[var(--color-muted)]">{current.formsNote}</p>
              )}
              {(partOfSpeech || current.gender || reading) && (
                <div className="mb-3 flex gap-2 flex-wrap">
                  {partOfSpeech && <span className={chipClass}>{partOfSpeech}</span>}
                  {current.gender && <span className={chipClass}>{current.gender}</span>}
                  {reading && <span className={chipClass}>{reading}</span>}
                </div>
              )}
              <button
                onClick={() => setShowDetails(v => !v)}
                className="text-sm px-3 py-1 bg-[var(--color-muted-dark)] text-[var(--color-text)] rounded hover:bg-[var(--color-muted)] mb-4"
              >
                {showDetails ? t(interfaceLanguage, 'hideDetails') : t(interfaceLanguage, 'showDetails')}
              </button>
              {showDetails && (
                <ReviewDetailsPanel
                  card={current}
                  studyLanguage={studyLanguage}
                  interfaceLanguage={interfaceLanguage}
                  deckNativeLanguage={deckNativeLanguage}
                  onChanged={handleCardEnriched}
                />
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div dir="auto" className="font-semibold text-2xl text-[var(--color-highlight)]">{front}</div>
              <PronounceButton text={front} furigana={current.furigana} eum={current.eum} studyLanguage={studyLanguage} />
            </div>
          )}
        </div>
      </div>

      {/* Left and right, the way the keys and mobile's swipe run. */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => answer(false)}
          className="px-4 py-3 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] font-semibold hover:bg-[var(--color-muted)]/30"
        >
          ← {t(interfaceLanguage, 'previewAgain')}
        </button>
        <button
          onClick={() => answer(true)}
          className="px-4 py-3 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-semibold hover:bg-[var(--color-text)]"
        >
          {t(interfaceLanguage, 'previewGotIt')} →
        </button>
      </div>
      <p className="mt-3 text-xs text-center text-[var(--color-muted)]">{t(interfaceLanguage, 'previewKeyHint')}</p>
    </>
  );
}
