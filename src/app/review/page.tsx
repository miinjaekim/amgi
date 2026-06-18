'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchUserFlashcards, Flashcard, ReviewTracking, migrateExistingCards } from '@/services/firestore';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { ExamplePair } from '@/services/gemini';
import { t } from '@/lib/i18n';
import Markdown from '@/components/Markdown';

// Direction for review
export type ReviewDirection = 'frontToBack' | 'backToFront';

// Check if a card is due in either direction
function isDue(card: Flashcard): { due: boolean, directions: ReviewDirection[] } {
  const now = new Date();
  const directions: ReviewDirection[] = [];

  // Check frontToBack direction
  if (card.frontToBack) {
    const fbReviewDate = card.frontToBack.nextReview instanceof Date ?
      card.frontToBack.nextReview :
      new Date(card.frontToBack.nextReview);
    if (fbReviewDate <= now) {
      directions.push('frontToBack');
    }
  } else if (card.nextReview) {
    const legacyReviewDate = card.nextReview instanceof Date ?
      card.nextReview :
      new Date(card.nextReview);
    if (legacyReviewDate <= now) {
      directions.push('frontToBack');
    }
  } else {
    directions.push('frontToBack');
  }

  // Check backToFront direction
  if (card.backToFront) {
    const bfReviewDate = card.backToFront.nextReview instanceof Date ?
      card.backToFront.nextReview :
      new Date(card.backToFront.nextReview);
    if (bfReviewDate <= now) {
      directions.push('backToFront');
    }
  } else if (card.nextReview && directions.length === 0) {
    const legacyReviewDate = card.nextReview instanceof Date ?
      card.nextReview :
      new Date(card.nextReview);
    if (legacyReviewDate <= now) {
      directions.push('backToFront');
    }
  } else if (!card.frontToBack) {
    directions.push('backToFront');
  }

  return { due: directions.length > 0, directions };
}

// Define a type for cards in the review queue
interface ReviewQueueItem {
  card: Flashcard;
  direction: ReviewDirection;
}

type DirectionFilter = 'both' | 'frontToBack' | 'backToFront';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isExamplePairArray(arr: unknown[]): arr is { korean: string; english: string }[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && 'korean' in arr[0]);
}

function getEarliestNextReview(cards: Flashcard[]): Date | null {
  const now = new Date();
  const dates: Date[] = [];
  for (const card of cards) {
    if (card.frontToBack?.nextReview) dates.push(new Date(card.frontToBack.nextReview as string));
    if (card.backToFront?.nextReview) dates.push(new Date(card.backToFront.nextReview as string));
    if (!card.frontToBack && !card.backToFront && card.nextReview) dates.push(new Date(card.nextReview as string));
  }
  const future = dates.filter(d => d > now);
  if (future.length === 0) return null;
  return new Date(Math.min(...future.map(d => d.getTime())));
}

function formatRelativeDate(date: Date, lang: string | null | undefined, now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return lang === 'Korean' ? '오늘' : 'today';
  if (date.toDateString() === tomorrow.toDateString()) return lang === 'Korean' ? '내일' : 'tomorrow';
  return date.toLocaleDateString(lang === 'Korean' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
}

export default function ReviewPage() {
  const { user, nativeLanguage } = useUser();
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [dueCards, setDueCards] = useState<ReviewQueueItem[]>([]);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('both');
  const [activeQueue, setActiveQueue] = useState<ReviewQueueItem[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const [nextReviewDate, setNextReviewDate] = useState<Date | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  useEffect(() => { setClientNow(new Date()); }, []);

  useEffect(() => {
    if (user && !migrationComplete) {
      loadCards();
    } else if (!user) {
      setUserFlashcards([]);
      setDueCards([]);
    }
  }, [user, migrationComplete]);

  useEffect(() => {
    setNextReviewDate(dueCards.length === 0 ? getEarliestNextReview(userFlashcards) : null);
  }, [userFlashcards, dueCards]);

  const loadCards = async (forceMigration = false) => {
    if (!user) return;

    setFlashcardsLoading(true);
    try {
      if (forceMigration || !migrationComplete) {
        const count = await migrateExistingCards(user.uid);
        console.log(`Migrated/updated ${count} cards to bidirectional tracking`);
        setMigrationComplete(true);
      }

      const cards = await fetchUserFlashcards(user.uid);
      setUserFlashcards(cards);

      const queue: ReviewQueueItem[] = [];
      cards.forEach(card => {
        const { due, directions } = isDue(card);
        if (due) {
          directions.forEach(dir => {
            queue.push({ card, direction: dir });
          });
        }
      });
      setDueCards(queue);
    } catch (error) {
      console.error('Error during migration or fetching cards:', error);
      setUserFlashcards([]);
      setDueCards([]);
    } finally {
      setFlashcardsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleForceSynchronize = async () => {
    setIsSyncing(true);
    await loadCards(true);
  };

  const handleStartReview = () => {
    const filtered = directionFilter === 'both'
      ? dueCards
      : dueCards.filter(item => item.direction === directionFilter);
    setActiveQueue(shuffle(filtered));
    setReviewMode(true);
    setCurrentReviewIdx(0);
    setReviewComplete(false);
    setShowAnswer(false);
    setShowDetails(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setShowDetails(false);
  };

  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleReviewResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    const { card, direction } = activeQueue[currentReviewIdx];
    if (!card || !card.id) return;

    const { interval, ease, repetitions, nextReview } = getNextReviewData(
      direction === 'frontToBack' ?
        (card.frontToBack || { interval: card.interval, ease: card.ease, repetitions: card.repetitions }) :
        (card.backToFront || { interval: card.interval, ease: card.ease, repetitions: card.repetitions }),
      response
    );

    try {
      const update: Record<string, any> = {};
      update[`${direction}.interval`] = interval;
      update[`${direction}.ease`] = ease;
      update[`${direction}.repetitions`] = repetitions;

      if (response === 'again') {
        update[`${direction}.nextReview`] = new Date();
        update.nextReview = new Date();
        console.log('Again response:', update);
      } else {
        update[`${direction}.nextReview`] = nextReview;
        update.nextReview = nextReview;
        console.log(`${response} response:`, {
          interval,
          nextReview: nextReview.toISOString(),
          daysFromNow: interval
        });
      }

      await updateDoc(doc(db, 'cards', card.id), update);
    } catch (err) {
      console.error('Failed to update card scheduling:', err);
    }

    if (currentReviewIdx + 1 < activeQueue.length) {
      setCurrentReviewIdx(currentReviewIdx + 1);
      setShowAnswer(false);
      setShowDetails(false);
    } else {
      setReviewComplete(true);
    }
  };

  const handleExitReview = () => {
    setReviewMode(false);
    setReviewComplete(false);
    setCurrentReviewIdx(0);
    setShowAnswer(false);
    setShowDetails(false);
    loadCards();
  };

  const currentReview = activeQueue[currentReviewIdx];

  const filteredCount = directionFilter === 'both'
    ? dueCards.length
    : dueCards.filter(item => item.direction === directionFilter).length;

  const reviewCardsDueLabel = nativeLanguage === 'Korean'
    ? `${filteredCount}개 카드 복습하기`
    : `Review ${filteredCount} Card${filteredCount !== 1 ? 's' : ''} Due`;

  const reviewCardProgressLabel = nativeLanguage === 'Korean'
    ? `카드 ${currentReviewIdx + 1} / ${activeQueue.length}`
    : `Review Card ${currentReviewIdx + 1} of ${activeQueue.length}`;

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: 'var(--color-text)' }}>
      <h1 className="text-2xl font-bold mb-2 mt-8 text-[var(--color-highlight)]">{t(nativeLanguage, 'reviewPageTitle')}</h1>
      <p className="text-sm mb-6 text-[var(--color-muted)]">{t(nativeLanguage, 'reviewPageDescription')}</p>
      <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] shadow-lg">
        {user ? (
          flashcardsLoading ? (
            <div className="text-[var(--color-muted)]">{t(nativeLanguage, 'loadingFlashcards')}</div>
          ) : userFlashcards.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-[var(--color-muted)] mb-6">{t(nativeLanguage, 'noFlashcardsForReview')}</p>
              <a
                href="/"
                className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {t(nativeLanguage, 'goToLearnPage')}
              </a>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xl font-bold mb-2">{t(nativeLanguage, 'allCaughtUp')}</p>
              {nextReviewDate && clientNow && (
                <p className="text-[var(--color-muted)] text-sm">
                  {t(nativeLanguage, 'nextReviewOn')} {formatRelativeDate(nextReviewDate, nativeLanguage, clientNow)}
                </p>
              )}
              {isDevelopment && (
                <button
                  className="mt-4 px-3 py-1 bg-[var(--color-muted)] text-[var(--color-text)] rounded hover:bg-[var(--color-muted-dark)] text-sm"
                  onClick={handleForceSynchronize}
                  disabled={isSyncing}
                >
                  {isSyncing ? t(nativeLanguage, 'synchronizing') : t(nativeLanguage, 'forceSyncCards')}
                </button>
              )}
            </div>
          ) : reviewMode ? (
            reviewComplete ? (
              <div className="text-center py-4">
                <h2 className="text-2xl font-bold mb-2">{t(nativeLanguage, 'reviewComplete')}</h2>
                <p className="text-[var(--color-muted)] text-sm mb-1">
                  {nativeLanguage === 'Korean'
                    ? `${activeQueue.length}개 카드를 복습했습니다.`
                    : `You reviewed ${activeQueue.length} card${activeQueue.length !== 1 ? 's' : ''}.`}
                </p>
                <p className="text-[var(--color-muted)] text-sm mb-6">{t(nativeLanguage, 'reviewCompleteMessage')}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    className="px-5 py-2.5 rounded-lg font-semibold transition-colors"
                    style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                    onClick={handleExitReview}
                  >
                    {t(nativeLanguage, 'exitReview')}
                  </button>
                  <a
                    href="/"
                    className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
                    style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                  >
                    {t(nativeLanguage, 'navLearn')}
                  </a>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">
                  {reviewCardProgressLabel}
                  <span className="ml-2 px-2 py-1 text-sm bg-[var(--color-muted)] rounded-md">
                    {currentReview.direction === 'frontToBack'
                      ? t(nativeLanguage, 'directionKoreanToEnglish')
                      : t(nativeLanguage, 'directionEnglishToKorean')}
                  </span>
                </h2>

                <div className="mb-4 p-6 rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg">
                  {currentReview.direction === 'frontToBack' ? (
                    <>
                      <div className="font-semibold text-2xl mb-2 text-[var(--color-highlight)]">{currentReview.card.korean || currentReview.card.term}</div>

                      {showAnswer ? (
                        <>
                          {(currentReview.card.english || currentReview.card.translation) && (
                            <div className="text-lg mb-3 text-[var(--color-text)] font-semibold">{currentReview.card.english || currentReview.card.translation}</div>
                          )}

                          <button
                            onClick={handleToggleDetails}
                            className="text-sm px-3 py-1 bg-[var(--color-muted-dark)] text-[var(--color-text)] rounded hover:bg-[var(--color-muted)] mb-4"
                          >
                            {showDetails ? t(nativeLanguage, 'hideDetails') : t(nativeLanguage, 'showDetails')}
                          </button>

                          {showDetails && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
                              {currentReview.card.formality && currentReview.card.formality !== 'N/A' && (
                                <div className="mb-3">
                                  <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                    {currentReview.card.formality}
                                  </span>
                                </div>
                              )}
                              {currentReview.card.definition && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionDefinition')}</div>
                                  <Markdown className="text-[var(--color-text)] opacity-90">{currentReview.card.definition}</Markdown>
                                </div>
                              )}

                              {currentReview.card.examples && currentReview.card.examples.length > 0 && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionExamples')}</div>
                                  <ul className="list-disc list-inside text-[var(--color-text)] opacity-90 space-y-2">
                                    {(() => {
                                      const rawExamples = currentReview.card.examples as unknown[];
                                      if (Array.isArray(rawExamples) && rawExamples.length > 0 && typeof rawExamples[0] === 'string') {
                                        return (rawExamples as string[]).map((ex, i) => (
                                          <li key={i}>{ex}</li>
                                        ));
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => (
                                          <li key={i}>
                                            <div>{ex.korean}</div>
                                            <div className="text-[var(--color-highlight)] text-sm">{ex.english}</div>
                                          </li>
                                        ));
                                      } else {
                                        return null;
                                      }
                                    })()}
                                  </ul>
                                </div>
                              )}

                              {currentReview.card.notes && (
                                <div className="mt-2">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionNotes')}</div>
                                  <Markdown className="text-[var(--color-text)] opacity-70 text-sm">{currentReview.card.notes}</Markdown>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[var(--color-muted)] text-lg mt-4 italic">
                          {t(nativeLanguage, 'promptKoreanToEnglish')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(currentReview.card.english || currentReview.card.translation) && (
                        <div className="text-lg mb-2 text-[var(--color-text)]">{currentReview.card.english || currentReview.card.translation}</div>
                      )}

                      {showAnswer ? (
                        <>
                          <div className="font-semibold text-2xl mb-3 text-[var(--color-highlight)] mt-4">{currentReview.card.korean || currentReview.card.term}</div>

                          <button
                            onClick={handleToggleDetails}
                            className="text-sm px-3 py-1 bg-[var(--color-muted-dark)] text-[var(--color-text)] rounded hover:bg-[var(--color-muted)] mb-4"
                          >
                            {showDetails ? t(nativeLanguage, 'hideDetails') : t(nativeLanguage, 'showDetails')}
                          </button>

                          {showDetails && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-muted)]">
                              {currentReview.card.formality && currentReview.card.formality !== 'N/A' && (
                                <div className="mb-3">
                                  <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                    {currentReview.card.formality}
                                  </span>
                                </div>
                              )}
                              {currentReview.card.definition && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionDefinition')}</div>
                                  <Markdown className="text-[var(--color-text)] opacity-90">{currentReview.card.definition}</Markdown>
                                </div>
                              )}

                              {currentReview.card.examples && currentReview.card.examples.length > 0 && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionExamples')}</div>
                                  <ul className="list-disc list-inside text-[var(--color-text)] opacity-90 space-y-2">
                                    {(() => {
                                      const rawExamples = currentReview.card.examples as unknown[];
                                      if (Array.isArray(rawExamples) && rawExamples.length > 0 && typeof rawExamples[0] === 'string') {
                                        return (rawExamples as string[]).map((ex, i) => (
                                          <li key={i}>{ex}</li>
                                        ));
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => (
                                          <li key={i}>
                                            <div>{ex.korean}</div>
                                            <div className="text-[var(--color-highlight)] text-sm">{ex.english}</div>
                                          </li>
                                        ));
                                      } else {
                                        return null;
                                      }
                                    })()}
                                  </ul>
                                </div>
                              )}

                              {currentReview.card.notes && (
                                <div className="mt-2">
                                  <div className="font-semibold text-[var(--color-highlight)] text-sm mb-1">{t(nativeLanguage, 'sectionNotes')}</div>
                                  <Markdown className="text-[var(--color-text)] opacity-70 text-sm">{currentReview.card.notes}</Markdown>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[var(--color-muted)] text-lg mt-4 italic">
                          {t(nativeLanguage, 'promptEnglishToKorean')}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {showAnswer ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                    <button
                      className="px-4 py-3 rounded-lg bg-red-400 text-white hover:bg-red-500 font-semibold"
                      onClick={() => handleReviewResponse('again')}
                    >
                      {t(nativeLanguage, 'ratingAgain')}
                    </button>
                    <button
                      className="px-4 py-3 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] font-semibold"
                      onClick={() => handleReviewResponse('hard')}
                    >
                      {t(nativeLanguage, 'ratingHard')}
                    </button>
                    <button
                      className="px-4 py-3 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted-dark)] font-semibold"
                      onClick={() => handleReviewResponse('good')}
                    >
                      {t(nativeLanguage, 'ratingGood')}
                    </button>
                    <button
                      className="px-4 py-3 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-muted)] hover:bg-[var(--color-muted)] font-semibold"
                      onClick={() => handleReviewResponse('easy')}
                    >
                      {t(nativeLanguage, 'ratingEasy')}
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full mt-4 px-4 py-3 bg-[var(--color-muted)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-muted-dark)] text-lg font-semibold"
                    onClick={handleShowAnswer}
                  >
                    {t(nativeLanguage, 'showAnswer')}
                  </button>
                )}
              </>
            )
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {(['both', 'frontToBack', 'backToFront'] as DirectionFilter[]).map(dir => (
                  <button
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className="px-3 py-2.5 rounded-lg text-sm font-mono border transition-colors"
                    style={
                      directionFilter === dir
                        ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                        : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                    }
                  >
                    {dir === 'both'
                      ? t(nativeLanguage, 'directionBoth')
                      : dir === 'frontToBack'
                        ? t(nativeLanguage, 'directionKoreanToEnglish')
                        : t(nativeLanguage, 'directionEnglishToKorean')}
                  </button>
                ))}
              </div>
              <button
                className="px-6 py-3 rounded-lg text-lg font-semibold mb-4 bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleStartReview}
                disabled={filteredCount === 0}
              >
                {reviewCardsDueLabel}
              </button>

              {isDevelopment && (
                <button
                  className="px-3 py-1 bg-[var(--color-muted)] text-[var(--color-text)] rounded hover:bg-[var(--color-muted-dark)] text-sm"
                  onClick={handleForceSynchronize}
                  disabled={isSyncing}
                >
                  {isSyncing ? t(nativeLanguage, 'synchronizing') : t(nativeLanguage, 'forceSyncCards')}
                </button>
              )}
            </div>
          )
        ) : (
          <div className="text-[var(--color-muted)]">{t(nativeLanguage, 'signInToReview')}</div>
        )}
      </div>
    </div>
  );
}
