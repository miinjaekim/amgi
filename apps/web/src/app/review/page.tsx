'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import { fetchUserFlashcards, getCardsCollection, Flashcard, migrateExistingCards, archiveFlashcard, deleteFlashcard } from '@/services/firestore';
import {
  DIRECTION_FILTERS,
  buildReviewCollections,
  buildReviewQueue,
  collectionKey,
  dueReviewItems,
  duePatterns,
  filterByDirection,
  getBackSide,
  getCollectionId,
  getNextReviewDate,
  getReading,
  getStudyLanguageConfig,
  getBackSideConfig,
  directionLabel,
  directionPrompt,
} from '@amgi/core';
import type {
  DirectionFilter,
  GrammarPattern,
  ReviewCollection,
  ReviewQueueItem,
  ReviewTracking,
} from '@amgi/core';
import { fetchUserPatterns } from '@/services/patterns';
import PatternSession from '@/components/PatternSession';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { t } from '@/lib/i18n';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import PronounceButton from '@/components/PronounceButton';
import ReviewDetailsPanel from '@/components/ReviewDetailsPanel';

// Direction for review — re-exported from core, where `isDue` lives too.
export type { ReviewDirection } from '@amgi/core';

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
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [patterns, setPatterns] = useState<GrammarPattern[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  /**
   * The chosen row, as a `collectionKey` — `undefined` is "hasn't picked yet".
   *
   * A key rather than an id, because an id stopped identifying a row when
   * patterns arrived: your own cards and your grammar patterns are both
   * `id: null`, and only `kind` separates them.
   */
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  /** Non-null while a pattern practice session is running; the session queue. */
  const [patternQueue, setPatternQueue] = useState<GrammarPattern[] | null>(null);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('both');
  const [activeQueue, setActiveQueue] = useState<ReviewQueueItem[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  /**
   * The user stopped early. Kept apart from `reviewComplete`, which means the
   * queue ran out — telling someone who quit at card 8 of 30 that they had
   * finished would be untrue.
   */
  const [reviewStopped, setReviewStopped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
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
  // changes — loadCards itself only runs the legacy migration once. The
  // collection resets too: packs belong to one language, so a Japanese deck is
  // not a choice that survives switching to Korean.
  useEffect(() => {
    setSelectedKey(undefined);
    if (user) {
      handleExitReview();
    } else {
      setUserFlashcards([]);
      setPatterns([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studyLanguage]);

  const collections = useMemo(
    () => buildReviewCollections(userFlashcards, patterns, studyLanguage, nativeLanguage),
    [userFlashcards, patterns, studyLanguage, nativeLanguage]
  );

  const selected = collections.find(c => collectionKey(c) === selectedKey);
  const isPatternCollection = selected?.kind === 'patterns';

  // One collection means there is no choice to make — every Korean-only session
  // — so nobody pays a tap for it. Coming from a deck's "Review this deck", the
  // choice was already made on the way here.
  // `?collection=` is stripped once used, so "Change collection" isn't fighting
  // a handoff the user has already moved past.
  const requestedCollection = React.useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (selectedKey !== undefined || collections.length === 0) return;
    if (requestedCollection.current === undefined) {
      requestedCollection.current = new URLSearchParams(window.location.search).get('collection');
      if (requestedCollection.current !== null) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    const requested = requestedCollection.current;
    // `?collection=` still carries a pack id, which is what "Review this deck"
    // hands over — so it only ever selects a cards row.
    const handoff = requested
      ? collections.find(c => c.kind === 'cards' && c.id === requested)
      : undefined;
    if (handoff) setSelectedKey(collectionKey(handoff));
    else if (collections.length === 1) setSelectedKey(collectionKey(collections[0]));
    requestedCollection.current = null;
  }, [collections, selectedKey]);

  const collectionCards = useMemo(
    () => !selected || selected.kind !== 'cards'
      ? []
      : userFlashcards.filter(card => getCollectionId(card) === selected.id),
    [userFlashcards, selected]
  );

  const dueCards = useMemo(() => dueReviewItems(collectionCards), [collectionCards]);

  useEffect(() => {
    setNextReviewDate(dueCards.length === 0 ? getNextReviewDate(collectionCards) : null);
  }, [collectionCards, dueCards]);

  const loadCards = async (forceMigration = false) => {
    if (!user) return;

    setFlashcardsLoading(true);
    try {
      if (forceMigration || !migrationComplete) {
        const count = await migrateExistingCards(user.uid);
        console.log(`Migrated/updated ${count} cards to bidirectional tracking`);
        setMigrationComplete(true);
      }

      setUserFlashcards(await fetchUserFlashcards(user.uid, studyLanguage));
      // Patterns are their own collection and their own failure. A patterns
      // read that throws must not cost the user their cards — the patterns row
      // simply doesn't appear, which is also what an account with no patterns
      // sees.
      try {
        setPatterns(await fetchUserPatterns(user.uid, studyLanguage));
      } catch (error) {
        console.error('Error fetching grammar patterns:', error);
        setPatterns([]);
      }
    } catch (error) {
      console.error('Error during migration or fetching cards:', error);
      setUserFlashcards([]);
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
    setActiveQueue(buildReviewQueue(collectionCards, directionFilter));
    setReviewMode(true);
    setCurrentReviewIdx(0);
    setReviewComplete(false);
    setReviewStopped(false);
    setReviewedCount(0);
    setShowAnswer(false);
    setShowDetails(false);
  };

  const duePatternList = useMemo(
    () => (isPatternCollection ? duePatterns(patterns) : []),
    [isPatternCollection, patterns]
  );

  /**
   * Fixed at session start and held in state, like `activeQueue`.
   *
   * Not derived from `patterns`, because scheduling written mid-session flows
   * back into `patterns` to keep the picker's counts honest — and a derived
   * queue would shrink out from under the learner as they answered.
   */
  const handleStartPatterns = () => {
    setPatternQueue([...duePatternList]);
  };

  const handlePatternScheduled = (patternId: string, production: ReviewTracking) => {
    setPatterns(prev => prev.map(p => (p.id === patternId ? { ...p, production } : p)));
  };

  const handleExitPatterns = () => {
    setPatternQueue(null);
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

    const update: Record<string, unknown> = {};
    update[`${direction}.interval`] = interval;
    update[`${direction}.ease`] = ease;
    update[`${direction}.repetitions`] = repetitions;
    // `getNextReviewData` now keeps a lapsed card due now, so the special case
    // that used to live here has moved into the scheduler — where mobile gets
    // it too.
    update[`${direction}.nextReview`] = nextReview;
    update.nextReview = nextReview;

    const collectionName = getCardsCollection(studyLanguage);
    // Fire-and-forget: Firestore queues writes offline and syncs when reconnected.
    updateDoc(doc(db, collectionName, card.id), update).catch(err => {
      console.error('Failed to update card scheduling:', err);
    });

    // Mirror the write locally. `dueCards` derives from `userFlashcards`, which
    // nothing updated during a session — so the due count stayed at whatever it
    // was on load, and starting a second review re-served the whole deck
    // instead of just what was missed. Safe mid-session because `activeQueue`
    // is its own state rather than derived from this, so the queue in progress
    // is untouched.
    setUserFlashcards(prev => prev.map(existing => existing.id === card.id
      ? { ...existing, [direction]: { interval, ease, repetitions, nextReview } }
      : existing));
    setReviewedCount(n => n + 1);

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
    setPatternQueue(null);
    setReviewMode(false);
    setReviewComplete(false);
    setReviewStopped(false);
    setReviewedCount(0);
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
    setManageEditDraft({ studySide: getStudySide(card), backSide: getBackSide(card, nativeLanguage) });
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
      [backConfig.backField]: manageEditDraft.backSide,
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

  /**
   * Store a card that enrichment just wrote to.
   *
   * The details panel unmounts whenever details are hidden, so anything it held
   * would be lost — generating a definition, hiding details and reopening them
   * came back empty even though the write had succeeded. The queue is the owner
   * of the card, so the queue is what has to be updated. `userFlashcards` too,
   * or the generated content vanishes again the moment the queue is rebuilt.
   */
  const handleCardEnriched = useCallback((card: Flashcard) => {
    setActiveQueue(prev => prev.map(item =>
      item.card.id === card.id ? { ...item, card: { ...item.card, ...card } } : item
    ));
    setUserFlashcards(prev => prev.map(c => (c.id === card.id ? { ...c, ...card } : c)));
  }, []);

  const currentReview = activeQueue[currentReviewIdx];

  // Only offered when there is something else to change to — a single
  // collection is not a choice, and a control for it would only be noise.
  const canChangeCollection = collections.length > 1;
  const changeCollectionButton = canChangeCollection && (
    <button
      onClick={() => { setSelectedKey(undefined); setPatternQueue(null); setDirectionFilter('both'); }}
      className="mt-4 text-sm px-3 py-1.5 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
    >
      {t(nativeLanguage, 'reviewChangeCollection')}
    </button>
  );

  const collectionName = selected?.name;

  const renderCollectionPicker = (list: ReviewCollection[]) => (
    <div>
      <p className="text-sm text-[var(--color-muted)] mb-4">{t(nativeLanguage, 'reviewPickCollection')}</p>
      <ul className="flex flex-col gap-3">
        {list.map(collection => {
          // Model-graded production cannot work offline, and offline review is
          // shipped — so the row is disabled rather than left to fail on the
          // first turn. The resolution path is produce-offline /
          // evaluate-on-reconnect, which is recorded and not built.
          const disabled = collection.kind === 'patterns' && !isOnline;
          return (
            <li key={collectionKey(collection)}>
              <button
                onClick={() => setSelectedKey(collectionKey(collection))}
                disabled={disabled}
                className="w-full text-left p-4 rounded-xl border border-[var(--color-muted)] hover:bg-[var(--color-muted)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-bold text-[var(--color-text)]">{collection.name}</span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: collection.dueCount > 0 ? 'var(--color-highlight)' : 'var(--color-muted)' }}
                  >
                    {collection.dueCount > 0
                      ? t(nativeLanguage, 'reviewCollectionDue', { count: collection.dueCount })
                      : t(nativeLanguage, 'reviewCollectionCaughtUp')}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  {collection.kind === 'patterns'
                    ? t(nativeLanguage, 'patternCollectionCount', { count: collection.cardCount })
                    : t(nativeLanguage, 'deckEntryCount', { count: collection.cardCount })}
                </p>
                {disabled && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                    {t(nativeLanguage, 'patternOffline')}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  /**
   * The patterns branch: a start screen, then the session.
   *
   * Kept whole here rather than threaded through the card branches below,
   * because almost nothing is shared — no direction filter, no show-answer, no
   * four-way self-rating. What they share is the picker that got you here.
   */
  const renderPatterns = () => {
    if (patternQueue) {
      return (
        <PatternSession
          patterns={patternQueue}
          studyLanguage={studyLanguage}
          nativeLanguage={nativeLanguage}
          onReviewed={recordReview}
          onScheduled={handlePatternScheduled}
          onExit={handleExitPatterns}
        />
      );
    }
    return (
      <div className="flex flex-col items-center text-center py-4">
        {canChangeCollection && (
          <p className="text-sm font-bold text-[var(--color-text)] mb-4">{collectionName}</p>
        )}
        {duePatternList.length === 0 ? (
          <p className="text-[var(--color-muted)] mb-2">{t(nativeLanguage, 'patternSessionCaughtUp')}</p>
        ) : (
          <>
            <p className="text-sm text-[var(--color-muted)] mb-6 max-w-sm">
              {t(nativeLanguage, 'patternSessionBlurb')}
            </p>
            <button
              className="px-6 py-3 rounded-lg text-lg font-semibold mb-4 bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleStartPatterns}
              disabled={!isOnline}
            >
              {t(nativeLanguage, 'patternStart', { count: duePatternList.length })}
            </button>
            {!isOnline && (
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                {t(nativeLanguage, 'patternOffline')}
              </p>
            )}
          </>
        )}
        {changeCollectionButton}
      </div>
    );
  };

  const filteredCount = filterByDirection(dueCards, directionFilter).length;

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
          ) : /* `collections`, not `userFlashcards`: an account with no cards
                 but some grammar patterns has something to review, and telling
                 it to go make a flashcard first would hide the row it does
                 have. */
          collections.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-[var(--color-muted)] mb-6">{t(nativeLanguage, 'noFlashcardsForReview')}</p>
              <Link
                href="/"
                className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {t(nativeLanguage, 'goToLearnPage')}
              </Link>
            </div>
          ) : selectedKey === undefined || !selected ? (
            renderCollectionPicker(collections)
          ) : isPatternCollection ? (
            renderPatterns()
          ) : /* A session in progress outranks the due count. Ratings now feed
                 straight back into `dueCards`, so finishing one cleanly drops
                 it to zero — and if that were checked first, the last answer
                 would replace the completion screen with the caught-up
                 landing before the user ever saw it. */
          !reviewMode && dueCards.length === 0 ? (
            <div className="text-center py-4">
              {canChangeCollection && (
                <p className="text-xs text-[var(--color-muted)] mb-2">{collectionName}</p>
              )}
              <p className="text-xl font-bold mb-2">{t(nativeLanguage, 'allCaughtUp')}</p>
              {nextReviewDate && clientNow && (
                <p className="text-[var(--color-muted)] text-sm">
                  {t(nativeLanguage, 'nextReviewOn')} {formatRelativeDate(nextReviewDate, nativeLanguage, clientNow)}
                </p>
              )}
              <div>{changeCollectionButton}</div>
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
                {/* Everything answered correctly is scheduled out, so whatever
                    is still due is what was missed. Claiming the session was
                    simply complete over the top of that hides work the user
                    has left to do, and this is the one moment where offering
                    it back costs a single click. */}
                {filteredCount > 0 ? (
                  <>
                    <h2 className="text-2xl font-bold mb-2">{t(nativeLanguage, 'reviewSessionFinished')}</h2>
                    <p className="text-[var(--color-muted)] text-sm mb-6">
                      {t(nativeLanguage, 'reviewMissedStillDue', { count: filteredCount })}
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        className="px-5 py-2.5 rounded-lg font-semibold transition-colors"
                        style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                        onClick={handleStartReview}
                      >
                        {t(nativeLanguage, 'reviewAgainMissed')}
                      </button>
                      <button
                        className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
                        style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                        onClick={handleExitReview}
                      >
                        {t(nativeLanguage, 'exitReview')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-2">{t(nativeLanguage, 'reviewComplete')}</h2>
                    <p className="text-[var(--color-muted)] text-sm mb-1">
                      {nativeLanguage === 'Korean'
                        ? `${reviewedCount}개 카드를 복습했습니다.`
                        : `You reviewed ${reviewedCount} card${reviewedCount !== 1 ? 's' : ''}.`}
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
                      <Link
                        href="/"
                        className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
                        style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                      >
                        {t(nativeLanguage, 'navLearn')}
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : reviewStopped ? (
              <div className="text-center py-4">
                {canChangeCollection && (
                  <p className="text-xs text-[var(--color-muted)] mb-2">{collectionName}</p>
                )}
                <h2 className="text-2xl font-bold mb-2">{t(nativeLanguage, 'reviewStoppedTitle')}</h2>
                <p className="text-[var(--color-muted)] text-sm mb-1">
                  {reviewedCount > 0
                    ? t(nativeLanguage, 'reviewStoppedSummary', { count: reviewedCount })
                    : t(nativeLanguage, 'reviewStoppedNone')}
                </p>
                {activeQueue.length - currentReviewIdx > 0 && (
                  <p className="text-[var(--color-muted)] text-sm mb-6">
                    {t(nativeLanguage, 'reviewStoppedRemaining', {
                      count: activeQueue.length - currentReviewIdx,
                    })}
                  </p>
                )}
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    className="px-5 py-2.5 rounded-lg font-semibold transition-colors"
                    style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                    onClick={() => setReviewStopped(false)}
                  >
                    {t(nativeLanguage, 'reviewResume')}
                  </button>
                  <button
                    className="px-5 py-2.5 rounded-lg border font-semibold transition-colors hover:bg-[var(--color-muted)]/20"
                    style={{ borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}
                    onClick={handleExitReview}
                  >
                    {t(nativeLanguage, 'exitReview')}
                  </button>
                </div>
                <div>{changeCollectionButton}</div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {reviewCardProgressLabel}
                    <span className="ml-2 px-2 py-1 text-sm bg-[var(--color-muted)] rounded-md">
                      {directionLabel(nativeLanguage, studyLanguage, currentReview.direction)}
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => showManage ? setShowManage(false) : handleOpenManage(currentReview.card)}
                      className="text-sm px-3 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                    >
                      {t(nativeLanguage, 'reviewManageCard')}
                    </button>
                    {/* Until now there was no way out of a session on web short
                        of navigating away — the only Exit Review button lived
                        on the completion screen, which you reach by answering
                        every card. */}
                    <button
                      onClick={() => { setShowManage(false); setReviewStopped(true); }}
                      aria-label={t(nativeLanguage, 'exitReview')}
                      title={t(nativeLanguage, 'exitReview')}
                      className="text-lg leading-none px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
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
                      <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">{t(nativeLanguage, backConfig.backLabelKey)}</label>
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

                <div className="mb-4 p-6 rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg min-h-[14rem]">
                  {currentReview.direction === 'frontToBack' ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-semibold text-2xl text-[var(--color-highlight)]">{getStudySide(currentReview.card)}</div>
                        <PronounceButton text={getStudySide(currentReview.card)} furigana={currentReview.card.furigana} studyLanguage={studyLanguage} />
                      </div>

                      {showAnswer ? (
                        <>
                          {getBackSide(currentReview.card, nativeLanguage) && (
                            <div className="text-lg mb-3 text-[var(--color-text)] font-semibold">{getBackSide(currentReview.card, nativeLanguage)}</div>
                          )}

                          {(currentReview.card.gender || getReading(currentReview.card)) && (
                            <div className="mb-3 flex gap-2 flex-wrap">
                              {currentReview.card.gender && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.gender}
                                </span>
                              )}
                              {getReading(currentReview.card) && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {getReading(currentReview.card)}
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
                            <ReviewDetailsPanel
                              card={currentReview.card}
                              studyLanguage={studyLanguage}
                              nativeLanguage={nativeLanguage}
                              onChanged={handleCardEnriched}
                            />
                          )}
                        </>
                      ) : (
                        <div className="text-[var(--color-muted)] text-lg mt-4 italic">
                          {directionPrompt(nativeLanguage, studyLanguage, 'frontToBack')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {getBackSide(currentReview.card, nativeLanguage) && (
                        <div className="text-lg mb-2 text-[var(--color-text)]">{getBackSide(currentReview.card, nativeLanguage)}</div>
                      )}

                      {showAnswer ? (
                        <>
                          <div className="flex items-center gap-2 mb-3 mt-4">
                            <div className="font-semibold text-2xl text-[var(--color-highlight)]">{getStudySide(currentReview.card)}</div>
                            <PronounceButton text={getStudySide(currentReview.card)} furigana={currentReview.card.furigana} studyLanguage={studyLanguage} />
                          </div>

                          {(currentReview.card.gender || getReading(currentReview.card)) && (
                            <div className="mb-3 flex gap-2 flex-wrap">
                              {currentReview.card.gender && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {currentReview.card.gender}
                                </span>
                              )}
                              {getReading(currentReview.card) && (
                                <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                                  {getReading(currentReview.card)}
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
                            <ReviewDetailsPanel
                              card={currentReview.card}
                              studyLanguage={studyLanguage}
                              nativeLanguage={nativeLanguage}
                              onChanged={handleCardEnriched}
                            />
                          )}
                        </>
                      ) : (
                        <div className="text-[var(--color-muted)] text-lg mt-4 italic">
                          {directionPrompt(nativeLanguage, studyLanguage, 'backToFront')}
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
              {canChangeCollection && (
                <p className="text-sm font-bold text-[var(--color-text)] mb-4">{collectionName}</p>
              )}
              {/* Direction is a separate axis from collection — which cards you
                  are studying, then how you want to be asked. Collapsing the two
                  into one chip row would multiply out. */}
              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {DIRECTION_FILTERS.map(dir => (
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
                      : directionLabel(nativeLanguage, studyLanguage, dir)}
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

              {changeCollectionButton && <div className="mb-4 -mt-2">{changeCollectionButton}</div>}

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
