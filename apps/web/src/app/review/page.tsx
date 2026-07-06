'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchUserFlashcards, getCardsCollection, Flashcard, ReviewTracking, migrateExistingCards, archiveFlashcard, deleteFlashcard } from '@/services/firestore';
import { getBackSide, getExampleSides, getStudyLanguageConfig } from '@amgi/core';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { ExamplePair } from '@/services/gemini';
import { t } from '@/lib/i18n';
import Markdown from '@/components/Markdown';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

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

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && ('korean' in arr[0] || 'swedish' in arr[0] || 'english' in arr[0]));
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
  const { user, nativeLanguage, studyLanguage, recordReview } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
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
  const [showManage, setShowManage] = useState(false);
  const [manageEditDraft, setManageEditDraft] = useState<{ studySide: string; backSide: string } | null>(null);
  const [manageStatus, setManageStatus] = useState<string | null>(null);

  const isOnline = useOnlineStatus();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [nextReviewDate, setNextReviewDate] = useState<Date | null>(null);
  const [clientNow, setClientNow] = useState<Date | null>(null);

  useEffect(() => { setClientNow(new Date()); }, []);

  // Reload (and exit any in-progress session) when the user or study language
  // changes — loadCards itself only runs the legacy migration once.
  useEffect(() => {
    if (user) {
      handleExitReview();
    } else {
      setUserFlashcards([]);
      setDueCards([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studyLanguage]);

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

      const cards = await fetchUserFlashcards(user.uid, studyLanguage);
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

    recordReview();

    const update: Record<string, any> = {};
    update[`${direction}.interval`] = interval;
    update[`${direction}.ease`] = ease;
    update[`${direction}.repetitions`] = repetitions;
    update[`${direction}.nextReview`] = response === 'again' ? new Date() : nextReview;
    update.nextReview = response === 'again' ? new Date() : nextReview;

    const collectionName = getCardsCollection(studyLanguage);
    // Fire-and-forget: Firestore queues writes offline and syncs when reconnected.
    updateDoc(doc(db, collectionName, card.id), update).catch(err => {
      console.error('Failed to update card scheduling:', err);
    });

    if (currentReviewIdx + 1 < activeQueue.length) {
      setCurrentReviewIdx(currentReviewIdx + 1);
      setShowAnswer(false);
      setShowDetails(false);
      setShowManage(false);
      setManageEditDraft(null);
      setManageStatus(null);
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
    setShowManage(false);
    setManageEditDraft(null);
    setManageStatus(null);
    loadCards();
  };

  const getStudySide = (card: Flashcard) =>
    card[langConfig.studyField] ?? card.term ?? '';

  const handleOpenManage = (card: Flashcard) => {
    setManageEditDraft({ studySide: getStudySide(card), backSide: getBackSide(card) });
    setManageStatus(null);
    setShowManage(true);
  };

  const handleManageEditSave = async () => {
    if (!manageEditDraft) return;
    const { card } = activeQueue[currentReviewIdx];
    if (!card.id) return;
    const collectionName = getCardsCollection(studyLanguage);
    const update = {
      [langConfig.studyField]: manageEditDraft.studySide,
      [langConfig.backField]: manageEditDraft.backSide,
    };
    try {
      await updateDoc(doc(db, collectionName, card.id), update);
      setActiveQueue(prev => prev.map((item, i) =>
        i === currentReviewIdx
          ? { ...item, card: { ...item.card, ...update } }
          : item
      ));
      setManageStatus(t(nativeLanguage, 'reviewCardSaved'));
      setShowManage(false);
    } catch {
      setManageStatus(t(nativeLanguage, 'errorSaveChanges'));
    }
  };

  const handleManageArchive = async () => {
    const { card } = activeQueue[currentReviewIdx];
    if (!card.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmArchive'))) return;
    try {
      await archiveFlashcard(card.id, studyLanguage);
      setManageStatus(t(nativeLanguage, 'reviewCardArchived'));
      setShowManage(false);
      advanceAfterManage();
    } catch {
      setManageStatus(t(nativeLanguage, 'errorArchiveFlashcard'));
    }
  };

  const handleManageDelete = async () => {
    const { card } = activeQueue[currentReviewIdx];
    if (!card.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmDelete'))) return;
    try {
      await deleteFlashcard(card.id, studyLanguage);
      setManageStatus(t(nativeLanguage, 'reviewCardDeleted'));
      setShowManage(false);
      advanceAfterManage();
    } catch {
      setManageStatus(t(nativeLanguage, 'errorDeleteFlashcard'));
    }
  };

  const advanceAfterManage = () => {
    const remaining = activeQueue.filter((_, i) => i !== currentReviewIdx);
    if (remaining.length === 0) {
      setReviewComplete(true);
    } else {
      setActiveQueue(remaining);
      setCurrentReviewIdx(idx => Math.min(idx, remaining.length - 1));
      setShowAnswer(false);
      setShowDetails(false);
    }
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
      {!isOnline && (
        <div className="mb-4 mt-4 px-4 py-2.5 rounded-lg text-xs border border-[var(--color-muted)] text-[var(--color-muted)]">
          Offline — showing cached cards. Progress will sync when reconnected.
        </div>
      )}
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
                  disabled={isSyncing || !isOnline}
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {reviewCardProgressLabel}
                    <span className="ml-2 px-2 py-1 text-sm bg-[var(--color-muted)] rounded-md">
                      {currentReview.direction === 'frontToBack'
                        ? t(nativeLanguage, langConfig.directionFrontToBackKey)
                        : t(nativeLanguage, langConfig.directionBackToFrontKey)}
                    </span>
                  </h2>
                  <button
                    onClick={() => showManage ? setShowManage(false) : handleOpenManage(currentReview.card)}
                    className="text-sm px-3 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                  >
                    {t(nativeLanguage, 'reviewManageCard')}
                  </button>
                </div>

                {/* Inline manage panel */}
                {showManage && manageEditDraft && (
                  <div className="mb-4 p-4 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                        {t(nativeLanguage, langConfig.studyLabelKey)}
                      </label>
                      <input
                        type="text"
                        value={manageEditDraft.studySide}
                        onChange={e => setManageEditDraft(d => d ? { ...d, studySide: e.target.value } : d)}
                        className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">{t(nativeLanguage, langConfig.backLabelKey)}</label>
                      <input
                        type="text"
                        value={manageEditDraft.backSide}
                        onChange={e => setManageEditDraft(d => d ? { ...d, backSide: e.target.value } : d)}
                        className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)] text-sm"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleManageEditSave}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                        style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                      >
                        {t(nativeLanguage, 'save')}
                      </button>
                      <button
                        onClick={handleManageArchive}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted-dark)]"
                      >
                        {t(nativeLanguage, 'archive')}
                      </button>
                      <button
                        onClick={handleManageDelete}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-muted)] hover:border-red-400 hover:text-red-400"
                      >
                        {t(nativeLanguage, 'delete')}
                      </button>
                      <button
                        onClick={() => setShowManage(false)}
                        className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
                      >
                        {t(nativeLanguage, 'cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status toast for manage actions */}
                {manageStatus && !showManage && (
                  <div className="mb-3 px-4 py-2 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] text-sm">
                    {manageStatus}
                  </div>
                )}

                <div className="mb-4 p-6 rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg">
                  {currentReview.direction === 'frontToBack' ? (
                    <>
                      <div className="font-semibold text-2xl mb-2 text-[var(--color-highlight)]">{getStudySide(currentReview.card)}</div>

                      {showAnswer ? (
                        <>
                          {getBackSide(currentReview.card) && (
                            <div className="text-lg mb-3 text-[var(--color-text)] font-semibold">{getBackSide(currentReview.card)}</div>
                          )}

                          {(currentReview.card.gender || currentReview.card.furigana) && (
                            <div className="mb-3 flex gap-2 flex-wrap">
                              {currentReview.card.gender && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.gender}
                                </span>
                              )}
                              {currentReview.card.furigana && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.furigana}
                                </span>
                              )}
                            </div>
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
                                        return (rawExamples as string[]).map((ex, i) => <li key={i}>{ex}</li>);
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => {
                                          const sides = getExampleSides(ex, studyLanguage);
                                          return (
                                            <li key={i}>
                                              <div>{sides.study}</div>
                                              <div className="text-[var(--color-highlight)] text-sm">{sides.back}</div>
                                            </li>
                                          );
                                        });
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
                          {t(nativeLanguage, langConfig.promptFrontToBackKey)}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {getBackSide(currentReview.card) && (
                        <div className="text-lg mb-2 text-[var(--color-text)]">{getBackSide(currentReview.card)}</div>
                      )}

                      {showAnswer ? (
                        <>
                          <div className="font-semibold text-2xl mb-3 text-[var(--color-highlight)] mt-4">{getStudySide(currentReview.card)}</div>

                          {(currentReview.card.gender || currentReview.card.furigana) && (
                            <div className="mb-3 flex gap-2 flex-wrap">
                              {currentReview.card.gender && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.gender}
                                </span>
                              )}
                              {currentReview.card.furigana && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.furigana}
                                </span>
                              )}
                            </div>
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
                                        return (rawExamples as string[]).map((ex, i) => <li key={i}>{ex}</li>);
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => {
                                          const sides = getExampleSides(ex, studyLanguage);
                                          return (
                                            <li key={i}>
                                              <div>{sides.study}</div>
                                              <div className="text-[var(--color-highlight)] text-sm">{sides.back}</div>
                                            </li>
                                          );
                                        });
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
                          {t(nativeLanguage, langConfig.promptBackToFrontKey)}
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
                        ? t(nativeLanguage, langConfig.directionFrontToBackKey)
                        : t(nativeLanguage, langConfig.directionBackToFrontKey)}
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
                  disabled={isSyncing || !isOnline}
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
