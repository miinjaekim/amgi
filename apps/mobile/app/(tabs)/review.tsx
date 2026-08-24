import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '../../src/context/UserContext';
import { useCardEnrichment } from '../../src/hooks/useCardEnrichment';
import {
  archiveFlashcard, updateFlashcardFields, subscribeToActiveUserFlashcards,
} from '../../src/services/firestore';
import type { Flashcard, ReviewTracking } from '../../src/services/firestore';
import {
  replayPendingOver, persistReviewSnapshot, readCachedReviewCards,
  warmKnownLanguages, withTimeout, SNAPSHOT_WRITE_DEBOUNCE_MS,
} from '../../src/services/reviewSync';
import { REQUEST_TIMEOUT_MS } from '../../src/services/withTimeout';
import { enqueueReview } from '../../src/services/offlineReview';
import { usePendingReviewSync } from '../../src/hooks/usePendingReviewSync';
import { refreshReminders } from '../../src/services/reminders';
import {
  DIRECTION_FILTERS, applyPendingReviews, buildReviewCollections,
  buildReviewQueue, collectionKey, dueReviewItems, filterByDirection,
  getBackSide, getCollectionId, getNextReviewDate,
  getNextReviewData, getStudyLangSide, getStudyLanguageConfig, getBackSideConfig,
  directionLabel, directionPrompt, getCharacterBreakdown, getExampleSides,
  removeCardFromQueue, t,
  gradeTypedAnswer, promptsForTyping, typedAnswerPlaceholder,
} from '@amgi/core';
import type {
  CardSideField, DirectionFilter, PendingReview, ReviewQueueItem,
  TypedAnswerGrade,
} from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import PageHeader from '../../src/components/PageHeader';
import Markdown from '../../src/components/Markdown';
import { SkeletonBar, SkeletonGroup, SkeletonRows } from '../../src/components/Skeleton';
import type { Palette } from '../../src/theme';

type Rating = 'again' | 'hard' | 'good' | 'easy';

export default function ReviewScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage, recordReview } = useUser();
  const config = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  const { isOnline, pendingCount, sync } = usePendingReviewSync(user?.uid);
  const [cards, setCards] = useState<Flashcard[]>([]);
  /**
   * Offline *and* this device has never loaded this language. Distinct from an
   * empty deck: the cards exist, they just aren't here. Saying "no flashcards"
   * would read as though they had been lost.
   */
  const [uncachedLanguage, setUncachedLanguage] = useState(false);
  /**
   * The chosen row, as a `collectionKey` — `undefined` is "hasn't picked yet",
   * which is distinct from `''` for the cards you made yourself.
   */
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);
  /**
   * Deliberately per-session and not remembered: it resets to `both` with the
   * collection, so a one-off drill in one direction never quietly becomes how
   * you review from then on.
   */
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('both');
  /**
   * Typing is a property of the session, chosen on the start screen beside the
   * direction filter, and per-session for the same reason that one is: a
   * one-off drill should not quietly become how you review from then on.
   */
  const [typingEnabled, setTypingEnabled] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  /**
   * The graded answer, or null when nothing was asserted — which covers both
   * "hasn't answered yet" and "revealed instead of typing". Both want the same
   * thing: no verdict, and no rating preselected.
   */
  const [typedGrade, setTypedGrade] = useState<TypedAnswerGrade | null>(null);
  /** False on the start screen, true once a queue is running. */
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  /**
   * Which collection `queue` was built for. Changing collection renders once
   * before the effect below clears the session, and on that frame every piece
   * of session state still belongs to the previous collection — the last
   * deck's queue, or its `done`. Reading either is wrong, so the session only
   * renders once the two agree.
   */
  const [queueFor, setQueueFor] = useState<string | null | undefined>(undefined);
  const [index, setIndex] = useState(0);

  // Enrichment for whichever card is in front of the reviewer. Declared up here
  // rather than beside its button because the render body returns early on
  // several paths, and a hook cannot follow a conditional return.
  const {
    saved: enrichedCard, isRunning: enrichRunning, error: enrichError, enrich,
  } = useCardEnrichment({
    card: queue[index]?.card,
    studyLanguage,
    nativeLanguage,
    // The queue owns the card, so the queue has to store what enrichment
    // wrote — the reveal panel is remounted on every advance and on every
    // hide, and anything held inside it dies with it.
    onChanged: card => {
      setQueue(prev => prev.map(item =>
        item.card.id === card.id ? { ...item, card: { ...item.card, ...card } } : item
      ));
      setCards(prev => prev.map(c => (c.id === card.id ? { ...c, ...card } : c)));
    },
  });
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [done, setDone] = useState(false);
  /**
   * The user stopped early. Distinct from `done`, which means the queue ran
   * out — telling someone who quit at card 8 of 30 that they are "all caught
   * up" would be plainly untrue.
   */
  const [stopped, setStopped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const revealAnim = useRef(new Animated.Value(0)).current;

  // Card options (⋯ menu)
  const [showOptions, setShowOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Record<CardSideField, string>> | null>(null);
  const [submitting, setSubmitting] = useState<Rating | null>(null);

  /**
   * The cards this language holds, read live, plus the offline copy underneath.
   *
   * This replaced re-reading the whole collection every time the tab was
   * focused. That reload had to be suppressed mid-session, because it reset the
   * pick and would rebuild the queue under someone eight cards into thirty. A
   * listener needs no such guard, and the reason is a property of this screen
   * rather than of Firestore: **`cards` is not what the session runs on.** The
   * queue is built from it on the Start tap and owns its copy from then on, so
   * a snapshot landing mid-session moves the picker's due counts and leaves the
   * cards in front of the learner alone. That is the same reason `cards` is
   * deliberately absent from the queue-building effect's dependencies.
   *
   * Order of what the screen shows: the device's own snapshot first, so a
   * session opens instantly and, underground, at all — then live data over the
   * top as it arrives. The cached read stays behind `delivered` so a slow disk
   * cannot flash a stale list over a snapshot that already landed.
   *
   * `sessionRatings` is cleared here and *not* per snapshot. Every snapshot has
   * the unsent queue replayed over it by `replayPendingOver`, so ratings are
   * never lost by keeping them — but clearing them on a snapshot that raced a
   * rating would drag an answered card back into the counts.
   */
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let active = true;
    let delivered = false;
    let hasCached = false;
    // Snapshots arrive in order, but each one's replay is an async storage read
    // — so without this, two changes in quick succession could resolve the
    // other way round and leave the older set on screen.
    let latest = 0;

    setLoading(true);
    // Packs belong to one study language, so a deck is not a choice that
    // survives switching to another one — the pick resets with the cards. Note
    // this runs on a language or account change and no longer on every visit,
    // which is what used to make suppressing it mid-session necessary.
    setSelectedKey(undefined);
    setUncachedLanguage(false);
    setSessionRatings([]);

    void (async () => {
      const cached = await readCachedReviewCards(uid, studyLanguage);
      if (!active) return;
      hasCached = cached !== null;
      if (cached && !delivered) {
        setCards(cached);
        setLoading(false);
      }
    })();

    /**
     * Offline with a cold cache, the listener says *nothing at all* — it has no
     * data to report and no reason to error, and `subscribeToActiveUserFlashcards`
     * drops the empty cache-backed snapshot that would otherwise arrive as a
     * lie. Without a deadline the screen would spin on it forever. This is the
     * one thing the old `withTimeout` fetch gave us for free.
     */
    const deadline = setTimeout(() => {
      if (!active || delivered) return;
      setLoading(false);
      if (!hasCached) { setCards([]); setUncachedLanguage(true); }
    }, REQUEST_TIMEOUT_MS);

    /**
     * Storing the snapshot runs on a slower clock than showing it.
     *
     * Every rating in a session comes back as its own snapshot, so writing the
     * offline copy on each would re-serialise the whole collection once per
     * card. The screen still updates immediately; only the durable copy waits,
     * and the pending queue — not this — is what protects unsent ratings.
     * Held in the effect rather than in the module because module-scope state
     * does not survive Fast Refresh, which this screen has been bitten by.
     */
    let storeTimer: ReturnType<typeof setTimeout> | null = null;
    let toStore: Flashcard[] | null = null;
    const storeSoon = (fresh: Flashcard[]) => {
      toStore = fresh;
      if (storeTimer) return;
      storeTimer = setTimeout(() => {
        storeTimer = null;
        const next = toStore;
        toStore = null;
        if (next) void persistReviewSnapshot(uid, studyLanguage, next);
      }, SNAPSHOT_WRITE_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeToActiveUserFlashcards(
      uid,
      studyLanguage,
      (fresh, { fromCache }) => {
        delivered = true;
        clearTimeout(deadline);
        // Only the server's word is allowed to replace the durable copy.
        if (!fromCache) storeSoon(fresh);
        const seq = ++latest;
        void (async () => {
          const replayed = await replayPendingOver(uid, studyLanguage, fresh);
          if (!active || seq !== latest) return;
          setCards(replayed);
          setUncachedLanguage(false);
          setLoading(false);
        })();
      },
      () => {
        // A dead listener leaves whatever is on screen: the cached snapshot if
        // there is one, and otherwise the same "never loaded here" state the
        // failed fetch used to produce.
        if (!active || delivered) return;
        setLoading(false);
        if (!hasCached) { setCards([]); setUncachedLanguage(true); }
      },
    );

    return () => {
      active = false;
      clearTimeout(deadline);
      unsubscribe();
      // Leaving the language is the one moment the delay must not swallow a
      // write: nothing will report these cards again until the user comes back.
      if (storeTimer) {
        clearTimeout(storeTimer);
        if (toStore) void persistReviewSnapshot(uid, studyLanguage, toStore);
      }
    };
  }, [user, studyLanguage]);

  // Keep the other languages this device studies ready for a switch made
  // offline. Best-effort and in the background — nothing waits on it.
  useEffect(() => {
    if (!user || !isOnline) return;
    void warmKnownLanguages(user.uid, studyLanguage);
  }, [user, isOnline, studyLanguage]);

  /**
   * Ratings made since the cards were loaded, kept apart from `cards` on
   * purpose. Folding them into `cards` would retrigger the queue-building
   * effect below on every answer, reshuffling the deck and dropping the user
   * back to the first card. As an overlay they do the one job they are needed
   * for — keeping the collection picker's due counts honest after a session —
   * without touching the queue that is mid-flight.
   */
  const [sessionRatings, setSessionRatings] = useState<PendingReview[]>([]);

  /** The cards as they now stand: loaded, plus everything rated this visit. */
  const reviewedCards = useMemo(
    () => applyPendingReviews(cards, sessionRatings, studyLanguage),
    [cards, sessionRatings, studyLanguage]
  );

  const collections = useMemo(
    () => buildReviewCollections(reviewedCards, studyLanguage, nativeLanguage),
    [reviewedCards, studyLanguage, nativeLanguage]
  );

  const selected = selectedKey === undefined
    ? undefined
    : collections.find(c => collectionKey(c) === selectedKey);
  /** The card collection in play, or `undefined` when none is. */
  const collectionId = selected ? selected.id : undefined;

  /**
   * What is due in the chosen collection right now, both ways round. Derived
   * from `reviewedCards`, so it stays honest after a session without a refetch.
   */
  const dueItems = useMemo(
    () => collectionId === undefined
      ? []
      : dueReviewItems(reviewedCards.filter(card => getCollectionId(card) === collectionId)),
    [reviewedCards, collectionId]
  );

  /** How many of those the chosen direction would actually serve. */
  const filteredDueCount = useMemo(
    () => filterByDirection(dueItems, directionFilter).length,
    [dueItems, directionFilter]
  );

  /**
   * When this collection next comes back. Derived rather than captured at
   * session start, which used to leave it stale — it was only ever assigned
   * for a session that began with nothing due.
   */
  const nextDate = useMemo(
    () => getNextReviewDate(reviewedCards.filter(card => getCollectionId(card) === collectionId)),
    [reviewedCards, collectionId]
  );

  // A deck screen hands the choice over as `collection`; `nonce` makes a second
  // handoff of the same deck re-fire. One collection means there is no choice to
  // make — every Korean-only session — so nobody pays a tap for it.
  const { collection: requested, nonce } = useLocalSearchParams<{ collection?: string; nonce?: string }>();
  const consumedNonce = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (collections.length === 0 || selectedKey !== undefined) return;
    // The param outlives the handoff, so it is consumed once — otherwise
    // "change collection" would be dragged straight back to the deck.
    const handoff = requested
      ? collections.find(c => c.id === requested)
      : undefined;
    if (handoff && consumedNonce.current !== nonce) {
      consumedNonce.current = nonce;
      setSelectedKey(collectionKey(handoff));
    } else if (collections.length === 1) {
      setSelectedKey(collectionKey(collections[0]));
    }
  }, [collections, selectedKey, requested, nonce]);

  /**
   * Begin a session over whatever is due in a collection right now, one way
   * round or both. Also the "review those again" path: a card rated `again`
   * stays due, so rebuilding from the current cards yields exactly what was
   * missed and nothing else — in the direction it was missed in.
   */
  const startSession = useCallback((
    sourceCards: Flashcard[],
    collection: string | null,
    filter: DirectionFilter,
  ) => {
    const q = buildReviewQueue(sourceCards.filter(card => getCollectionId(card) === collection), filter);
    setQueue(q);
    setQueueFor(collection);
    setStarted(true);
    setIndex(0);
    setDone(q.length === 0);
    setStopped(false);
    setReviewedCount(0);
  }, []);

  /** Back to the start screen, where both choices can be made again. */
  const endSession = useCallback(() => {
    setStarted(false);
    setQueue([]);
    setIndex(0);
    setDone(false);
    setStopped(false);
    setReviewedCount(0);
  }, []);

  // Changing collection drops whatever session was running back to the start
  // screen. Direction goes with it: it belongs to the session that just ended,
  // not to the next collection.
  //
  // `cards` is deliberately not a dependency. The queue is built on the Start
  // tap, from the freshest cards there are — so unlike when a session began the
  // moment a collection was picked, there is nothing to rebuild when the
  // background fetch lands, and rebuilding would throw away a direction the
  // user had just chosen and a session they were part-way through.
  useEffect(() => {
    endSession();
    setDirectionFilter('both');
  }, [collectionId, endSession]);

  const resetCardState = () => {
    setRevealed(false);
    setTypedAnswer('');
    setTypedGrade(null);
    setShowDetails(false);
    setShowOptions(false);
    setEditing(false);
    setEditDraft(null);
    revealAnim.setValue(0);
  };

  const handleReveal = () => {
    setRevealed(true);
    Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  /**
   * Grade what was typed, then reveal.
   *
   * Local and synchronous — no network, which is the point on a phone: review
   * happens on a commute, and a grader that needs a signal is a grader that
   * stops working exactly where the feature is used. The verdict only
   * preselects a rating; all four stay live, with both strings on screen.
   */
  const handleSubmitTyped = () => {
    const item = queue[index];
    if (!item || !typedAnswer.trim()) return;
    setTypedGrade(gradeTypedAnswer(typedAnswer, item.card));
    handleReveal();
  };

  const handleRate = async (rating: Rating) => {
    if (submitting) return;
    const item = queue[index];
    const cardId = item?.card.id;
    if (!item || !cardId || !user) return;
    recordReview(rating);
    setSubmitting(rating);
    const { card, direction } = item;
    const tracking: ReviewTracking = card[direction] ?? {
      nextReview: new Date(), interval: 0, ease: 2.5, repetitions: 0,
    };
    const next = getNextReviewData(tracking, rating);
    const otherDir = direction === 'frontToBack' ? 'backToFront' : 'frontToBack';

    const entry: PendingReview = {
      cardId,
      studyLanguage,
      direction,
      tracking: next,
      otherTracking: card[otherDir],
      reviewedAt: new Date().toISOString(),
    };

    // Durable before anything else. SM-2 already ran locally, so the rating is
    // complete the moment it is on disk; the network write is delivery, not
    // commitment. The old code awaited Firestore and swallowed the failure,
    // which is why a rating made underground quietly never happened.
    await enqueueReview(user.uid, entry);
    setSessionRatings(prev => [...prev, entry]);
    setReviewedCount(n => n + 1);

    // Deliver in the background. Nothing here waits on the network — the rating
    // is already safe, so the next card comes up immediately whether or not
    // there is a signal.
    void sync();
    // The reminder exists because cards were due and today had no review; both
    // may have just stopped being true, so it is re-planned rather than left
    // to fire for work already done.
    void refreshReminders(user.uid, nativeLanguage);

    setSubmitting(null);
    resetCardState();
    // A missed card is not put back into this session. It stays due, so the
    // completion screen offers it back as a fresh one — finishing is the
    // user's to declare, not something withheld until they get everything right.
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  const handleEditSave = async () => {
    const item = queue[index];
    if (!item?.card.id || !editDraft) return;
    try {
      // Unlike a rating, an edit is not queued — so offline it must fail
      // visibly. Firestore's write promise simply never settles without a
      // connection, which would leave the form hanging with no explanation.
      await withTimeout(updateFlashcardFields(item.card.id, editDraft, studyLanguage));
      setQueue(prev => prev.map((qi, i) =>
        i === index ? { ...qi, card: { ...qi.card, ...editDraft } } : qi
      ));
      setEditing(false);
      setEditDraft(null);
      setShowOptions(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const handleArchive = () => {
    const item = queue[index];
    if (!item?.card.id) return;
    Alert.alert('Archive card?', 'This card will be removed from your active deck.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          try {
            // Not queued either; see handleEditSave.
            await withTimeout(archiveFlashcard(item.card.id!, studyLanguage));
            // By card, not by index: the queue holds one entry per due
            // direction, so filtering by index left the card queued the other
            // way round and it came back after being archived.
            const { queue: newQueue, index: newIndex } =
              removeCardFromQueue(queue, item.card.id!, index);
            // The due counts on the picker derive from `cards`, so an archived
            // card would still be counted as due until the next fetch.
            setCards(prev => prev.filter(c => c.id !== item.card.id));
            setQueue(newQueue);
            resetCardState();
            if (newQueue.length === 0) setDone(true);
            else setIndex(newIndex);
          } catch {
            Alert.alert('Error', 'Failed to archive card.');
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.emptyText}>{t(nativeLanguage, 'signInToReview')}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    // Shaped as the collection picker, which is where a signed-in account with
    // cards always lands. The two other outcomes — no cards at all, or straight
    // into a session — are rarer than this one and cost only a redraw when they
    // do happen, which is what a spinner cost every time.
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <PageHeader
          titleKey="reviewPageTitle"
          helpTitleKey="helpReviewTitle"
          helpLeadKey="helpReviewLead"
          helpPointsKey="helpReviewPoints"
        />
        <SkeletonGroup label={t(nativeLanguage, 'loadingFlashcards')} style={s.pickerScroll}>
          <SkeletonBar width={150} height={15} />
          <SkeletonRows count={3} render={() => (
            <View style={s.pickerRow}>
              <View style={s.pickerRowTop}>
                <SkeletonBar width={120} height={16} />
                <SkeletonBar width={54} height={12} />
              </View>
              <SkeletonBar width={64} height={12} style={s.skelCount} />
            </View>
          )} />
        </SkeletonGroup>
      </SafeAreaView>
    );
  }

  // A new user with nothing saved lands here, not on the picker below — which
  // makes this the one Review surface where "what is this page for?" is most
  // likely to be asked, and the only one the picker's help would never reach.
  if (cards.length === 0) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <PageHeader
          titleKey="reviewPageTitle"
          helpTitleKey="helpReviewTitle"
          helpLeadKey="helpReviewLead"
          helpPointsKey="helpReviewPoints"
        />
        <View style={s.centerFill}>
          <Text style={s.emptyText}>
            {uncachedLanguage
              ? t(nativeLanguage, 'offlineNoCachedCards', {
                  language: t(nativeLanguage, config.studyLabelKey),
                })
              : t(nativeLanguage, 'noFlashcardsForReview')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Shown on every review surface, because "did my subway session count?"
  // shouldn't need faith. Offline explains why the cards look frozen; the
  // pending count stays up while online too, until the queue actually drains.
  const offlineNotice = (!isOnline || pendingCount > 0) && (
    <View style={s.offlineNotice}>
      {!isOnline && (
        <Text style={s.offlineNoticeText}>{t(nativeLanguage, 'offlineReviewBanner')}</Text>
      )}
      {pendingCount > 0 && (
        <Text style={s.offlineNoticePending}>
          {t(nativeLanguage, 'offlinePendingReviews', { count: pendingCount })}
        </Text>
      )}
    </View>
  );

  // Your own cards and each pack are reviewed apart — katakana arriving mid-way
  // through Japanese vocabulary is worse review than either done alone — so the
  // landing is a choice of collection, not a filter over one pool.
  if (selectedKey === undefined || !selected) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <PageHeader
          titleKey="reviewPageTitle"
          helpTitleKey="helpReviewTitle"
          helpLeadKey="helpReviewLead"
          helpPointsKey="helpReviewPoints"
        />
        <ScrollView contentContainerStyle={s.pickerScroll}>
          {offlineNotice}
          <Text style={s.pickerTitle}>{t(nativeLanguage, 'reviewPickCollection')}</Text>
          {collections.map(collection => (
            <TouchableOpacity
              key={collectionKey(collection)}
              style={s.pickerRow}
              onPress={() => setSelectedKey(collectionKey(collection))}
            >
              <View style={s.pickerRowTop}>
                <Text style={s.pickerName}>{collection.name}</Text>
                <Text style={[s.pickerDue, collection.dueCount > 0 && { color: C.highlight }]}>
                  {collection.dueCount > 0
                    ? t(nativeLanguage, 'reviewCollectionDue', { count: collection.dueCount })
                    : t(nativeLanguage, 'reviewCollectionCaughtUp')}
                </Text>
              </View>
              <Text style={s.pickerCount}>
                {t(nativeLanguage, 'deckEntryCount', { count: collection.cardCount })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Only offered when there is something else to change to — a single
  // collection is not a choice, and a control for it would only be noise.
  const changeCollectionButton = collections.length > 1 && (
    <TouchableOpacity style={s.changeBtn} onPress={() => setSelectedKey(undefined)}>
      <Text style={s.changeBtnText}>{t(nativeLanguage, 'reviewChangeCollection')}</Text>
    </TouchableOpacity>
  );

  const collectionName = selected.name;

  // The picker returned above, so a row is selected and its id is a value
  // rather than "nothing picked". Restated for the type system.
  const cardsCollectionId: string | null = selected.id;

  // No session running. `queueFor` also catches the single frame after a
  // collection change, where `started` still belongs to the collection just
  // left and reading its queue would show the wrong deck.
  if (!started || queueFor !== collectionId) {
    // Nothing due is a state to report, not a choice to offer — a direction
    // picker over an empty collection is a control with no outcome.
    if (dueItems.length === 0) {
      return (
        <SafeAreaView style={s.root} edges={['top']}>
          <PageHeader
            titleKey="reviewPageTitle"
            helpTitleKey="helpReviewTitle"
            helpLeadKey="helpReviewLead"
            helpPointsKey="helpReviewPoints"
          />
          <View style={s.centerFill}>
            {offlineNotice}
            {collections.length > 1 && <Text style={s.collectionLabel}>{collectionName}</Text>}
            <Text style={s.doneTitle}>{t(nativeLanguage, 'allCaughtUp')}</Text>
            <Text style={s.doneBody}>{t(nativeLanguage, 'reviewCompleteMessage')}</Text>
            {nextDate && (
              <Text style={s.nextDate}>
                {t(nativeLanguage, 'nextReviewOn')} {nextDate.toLocaleDateString()}
              </Text>
            )}
            {changeCollectionButton}
          </View>
        </SafeAreaView>
      );
    }

    // Which cards, then which way round — a separate axis, asked after the
    // collection rather than folded into it, because one chip row covering both
    // would multiply out.
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <PageHeader
          titleKey="reviewPageTitle"
          helpTitleKey="helpReviewTitle"
          helpLeadKey="helpReviewLead"
          helpPointsKey="helpReviewPoints"
        />
        <ScrollView contentContainerStyle={s.startScroll}>
          {offlineNotice}
          <Text style={s.startTitle}>{collectionName}</Text>
          <View style={s.pillRow}>
            {DIRECTION_FILTERS.map(dir => (
              <TouchableOpacity
                key={dir}
                onPress={() => setDirectionFilter(dir)}
                style={[s.pill, directionFilter === dir && s.pillOn]}
              >
                <Text style={[s.pillText, directionFilter === dir && s.pillTextOn]}>
                  {dir === 'both'
                    ? t(nativeLanguage, 'directionBoth')
                    : directionLabel(nativeLanguage, studyLanguage, dir)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Same axis as the direction pills above: how the session asks, not
              what it asks about. Only the produce-the-word half of a `both`
              session is typed. */}
          <TouchableOpacity
            style={[s.pill, s.typingPill, typingEnabled && s.pillOn]}
            onPress={() => setTypingEnabled(v => !v)}
          >
            <Text style={[s.pillText, typingEnabled && s.pillTextOn]}>
              {t(nativeLanguage, 'typedReviewToggle')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.startBtn, filteredDueCount === 0 && s.startBtnOff]}
            disabled={filteredDueCount === 0}
            onPress={() => startSession(reviewedCards, cardsCollectionId, directionFilter)}
          >
            <Text style={s.startBtnText}>
              {t(nativeLanguage, 'reviewStartCount', { count: filteredDueCount })}
            </Text>
          </TouchableOpacity>
          {/* Only the other direction has cards left. Saying so beats a dead
              button with no explanation. */}
          {filteredDueCount === 0 && (
            <Text style={s.startNote}>{t(nativeLanguage, 'reviewNothingInDirection')}</Text>
          )}
          {changeCollectionButton}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Stopping early is a normal way to finish — a queue is however many cards
  // happen to be due, not a commitment. So this reports what was done rather
  // than what is left undone, and offers the way back in.
  if (stopped) {
    const remaining = queue.length - index;
    return (
      <SafeAreaView style={s.center}>
        {offlineNotice}
        {collections.length > 1 && <Text style={s.collectionLabel}>{collectionName}</Text>}
        <Text style={s.stoppedTitle}>{t(nativeLanguage, 'reviewStoppedTitle')}</Text>
        <Text style={s.doneBody}>
          {reviewedCount > 0
            ? t(nativeLanguage, 'reviewStoppedSummary', { count: reviewedCount })
            : t(nativeLanguage, 'reviewStoppedNone')}
        </Text>
        {remaining > 0 && (
          <Text style={s.nextDate}>
            {t(nativeLanguage, 'reviewStoppedRemaining', { count: remaining })}
          </Text>
        )}
        <TouchableOpacity style={s.resumeBtn} onPress={() => setStopped(false)}>
          <Text style={s.resumeBtnText}>{t(nativeLanguage, 'reviewResume')}</Text>
        </TouchableOpacity>
        {/* Back to the start screen rather than out of Review — that is where
            the direction and the collection are both changeable. */}
        <TouchableOpacity style={s.changeBtn} onPress={endSession}>
          <Text style={s.changeBtnText}>{t(nativeLanguage, 'exitReview')}</Text>
        </TouchableOpacity>
        {changeCollectionButton}
      </SafeAreaView>
    );
  }

  if (done) {
    // Everything answered correctly is scheduled out, so whatever is still due
    // is what was missed. Claiming the session was simply complete over the top
    // of that would hide work, and it is the one moment where offering it back
    // costs a tap. Counted within the direction just reviewed — cards due the
    // other way round were never part of this session to miss.
    return (
      <SafeAreaView style={s.center}>
        {offlineNotice}
        {collections.length > 1 && <Text style={s.collectionLabel}>{collectionName}</Text>}
        {filteredDueCount > 0 ? (
          <>
            <Text style={s.stoppedTitle}>{t(nativeLanguage, 'reviewSessionFinished')}</Text>
            <Text style={s.doneBody}>
              {t(nativeLanguage, 'reviewMissedStillDue', { count: filteredDueCount })}
            </Text>
            <TouchableOpacity
              style={s.resumeBtn}
              onPress={() => startSession(reviewedCards, cardsCollectionId, directionFilter)}
            >
              <Text style={s.resumeBtnText}>{t(nativeLanguage, 'reviewAgainMissed')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Finishing a direction is not the same as being caught up — the
          // other way round may still hold cards. "All caught up" is claimed
          // one tap later, on the start screen, and only when it is true.
          <>
            <Text style={s.doneTitle}>{t(nativeLanguage, 'reviewComplete')}</Text>
            <Text style={s.doneBody}>{t(nativeLanguage, 'reviewCompleteMessage')}</Text>
          </>
        )}
        <TouchableOpacity style={s.changeBtn} onPress={endSession}>
          <Text style={s.changeBtnText}>{t(nativeLanguage, 'exitReview')}</Text>
        </TouchableOpacity>
        {changeCollectionButton}
      </SafeAreaView>
    );
  }

  const { card, direction } = queue[index];
  const isFront = direction === 'frontToBack';
  const studySide = getStudyLangSide(card);
  const backSide = getBackSide(card, nativeLanguage);
  const frontText = isFront ? studySide : backSide;
  const backText = isFront ? backSide : studySide;
  const prompt = directionPrompt(nativeLanguage, studyLanguage, isFront ? 'frontToBack' : 'backToFront');
  /** Only `backToFront` is ever typed — see `promptsForTyping`. */
  const typingThisCard = promptsForTyping(typingEnabled, direction);
  // The enriched copy when something was just generated, the queue's otherwise.
  const shownCard = enrichedCard ?? card;
  const definition = shownCard.definition;
  const characterBreakdown = getCharacterBreakdown(shownCard);
  const characterSectionKey = config.characterSectionKey ?? 'sectionHanja';
  const hasExamples = !!shownCard.examples && shownCard.examples.length > 0;
  const hasDepth = !!(definition || characterBreakdown || shownCard.notes);

  const revealStyle = {
    opacity: revealAnim,
    transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  const RATINGS: { key: Rating; label: string; color: string }[] = [
    { key: 'again', label: t(nativeLanguage, 'ratingAgain'), color: '#c0392b' },
    { key: 'hard', label: t(nativeLanguage, 'ratingHard'), color: '#e67e22' },
    { key: 'good', label: t(nativeLanguage, 'ratingGood'), color: C.highlight },
    { key: 'easy', label: t(nativeLanguage, 'ratingEasy'), color: '#2980b9' },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Lifts the bottom action row above the keyboard, which otherwise
          covers both Check and the reveal-instead escape hatch on a typed
          card. A no-op when nothing is focused, so an untyped session is
          unaffected. Same shape the Learn screen uses. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.sessionFlex}
      >
        {offlineNotice}
        {/* Progress */}
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(index / queue.length) * 100}%` }]} />
        </View>
        {/* Two different exits, side by side and deliberately distinct: the name
            switches which collection you are in — without it, picking the wrong
            one would mean working through the whole queue to escape it — while
            the ✕ ends the session outright. The ✕ is the only one that shows on
            a single collection, where there is nothing to switch to. */}
        <View style={s.progressRow}>
          <View style={s.progressLabelWrap}>
            {collections.length > 1 ? (
              <TouchableOpacity onPress={() => setSelectedKey(undefined)} hitSlop={8}>
                <Text style={s.progressText}>
                  {collectionName} · {index + 1} / {queue.length}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.progressText}>{index + 1} / {queue.length}</Text>
            )}
          </View>
          <TouchableOpacity
            style={s.stopBtn}
            onPress={() => setStopped(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t(nativeLanguage, 'exitReview')}
          >
            <Text style={s.stopBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Direction label */}
        <Text style={s.directionLabel}>
          {directionLabel(nativeLanguage, studyLanguage, isFront ? 'frontToBack' : 'backToFront')}
        </Text>

        {/* Card */}
        <View style={s.cardWrap}>
          {/* Card header: term + options button */}
          <View style={s.cardHeader}>
            <Text style={s.prompt}>{prompt}</Text>
            <TouchableOpacity
              style={s.optionsBtn}
              onPress={() => {
                if (editing) {
                  setEditing(false);
                  setEditDraft(null);
                }
                setShowOptions(v => !v);
              }}
            >
              <Text style={s.optionsBtnText}>···</Text>
            </TouchableOpacity>
          </View>

          {/* Options menu */}
          {showOptions && !editing && (
            <View style={s.optionsMenu}>
              <TouchableOpacity
                style={s.optionsMenuItem}
                onPress={() => {
                  setEditDraft({ [config.studyField]: studySide, [backConfig.backField]: backSide });
                  setEditing(true);
                  setShowOptions(false);
                }}
              >
                <Text style={s.optionsMenuText}>Edit</Text>
              </TouchableOpacity>
              <View style={s.optionsMenuDivider} />
              <TouchableOpacity style={s.optionsMenuItem} onPress={handleArchive}>
                <Text style={[s.optionsMenuText, { color: C.error }]}>Archive</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Edit form */}
          {editing && editDraft ? (
            <View style={s.editForm}>
              <Text style={s.editLabel}>{t(nativeLanguage, config.studyLabelKey)}</Text>
              <TextInput
                style={s.editInput}
                value={editDraft[config.studyField] ?? ''}
                onChangeText={v => setEditDraft(d => d ? { ...d, [config.studyField]: v } : d)}
                autoFocus
              />
              <Text style={s.editLabel}>{t(nativeLanguage, backConfig.backLabelKey)}</Text>
              <TextInput
                style={s.editInput}
                value={editDraft[backConfig.backField] ?? ''}
                onChangeText={v => setEditDraft(d => d ? { ...d, [backConfig.backField]: v } : d)}
              />
              <View style={s.editActions}>
                <TouchableOpacity style={s.editSaveBtn} onPress={handleEditSave}>
                  <Text style={s.editSaveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editCancelBtn} onPress={() => { setEditing(false); setEditDraft(null); }}>
                  <Text style={s.editCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Scrollable: a generated definition plus notes and three examples is
            // far taller than a card front, and the fixed-height card used to
            // simply clip it with no way to reach the rest.
            <ScrollView
              style={s.cardScroll}
              contentContainerStyle={s.cardScrollContent}
              showsVerticalScrollIndicator={false}
              // Or the first tap on anything in the card only dismisses the
              // keyboard raised by the typed-answer field.
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.frontText}>{frontText}</Text>

              {typingThisCard && !revealed && (
                <TextInput
                  // Remounted per card: `autoFocus` fires on mount only, and
                  // this input holds the same slot from one card to the next.
                  key={index}
                  style={s.typedInput}
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  onSubmitEditing={handleSubmitTyped}
                  placeholder={typedAnswerPlaceholder(nativeLanguage, studyLanguage)}
                  placeholderTextColor={C.muted}
                  autoFocus
                  returnKeyType="done"
                  // Off on purpose: a phone completing the word being recalled
                  // does the exercise for the learner.
                  autoCorrect={false}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              )}

              {revealed && (
                <Animated.View style={[s.revealWrap, revealStyle]}>
                  <View style={s.divider} />
                  <Text style={s.backText}>{backText}</Text>

                  {/* Both strings on screen. This is what lets the grader be
                      strict: the learner is not appealing a judgement they
                      cannot see, they are reading two answers and rating. */}
                  {typedGrade && (
                    <Text style={s.typedVerdict}>
                      <Text style={typedGrade.correct ? s.typedVerdictOk : s.typedVerdictMiss}>
                        {t(nativeLanguage, typedGrade.correct ? 'typedAnswerCorrect' : 'typedAnswerMissed')}
                      </Text>
                      {!typedGrade.correct && (
                        <Text>{` · ${t(nativeLanguage, 'typedAnswerYours')}: ${typedAnswer}`}</Text>
                      )}
                    </Text>
                  )}

                  {/* One toggle for everything, shown whenever there is either
                      something to read or something to write. */}
                  <TouchableOpacity style={s.detailsBtn} onPress={() => setShowDetails(v => !v)}>
                    <Text style={s.detailsBtnText}>
                      {t(nativeLanguage, showDetails ? 'hideDetails' : 'showDetails')}
                    </Text>
                  </TouchableOpacity>

                  {showDetails && (
                    <View style={s.definitionWrap}>
                      {!!definition && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>{t(nativeLanguage, 'sectionDefinition')}</Text>
                          <Markdown style={s.definitionText}>{definition}</Markdown>
                        </View>
                      )}
                      {!!characterBreakdown && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>{t(nativeLanguage, characterSectionKey)}</Text>
                          <Markdown style={s.definitionText}>{characterBreakdown}</Markdown>
                        </View>
                      )}
                      {!!shownCard.notes && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>{t(nativeLanguage, 'sectionNotes')}</Text>
                          <Markdown style={s.definitionText}>{shownCard.notes}</Markdown>
                        </View>
                      )}
                      {hasExamples && (
                        <View style={s.detailSection}>
                          <Text style={s.detailLabel}>{t(nativeLanguage, 'sectionExamples')}</Text>
                          {shownCard.examples!.map((ex, i) => {
                            const sides = getExampleSides(ex, studyLanguage, nativeLanguage);
                            return (
                              <View key={i} style={s.exampleItem}>
                                <Text style={s.exampleStudy}>{sides.study}</Text>
                                {sides.back ? <Text style={s.exampleBack}>{sides.back}</Text> : null}
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Mid-review is where a one-line gloss most often turns out
                          not to be enough — you find out at the moment you fail to
                          recall it. Offering the write here means that discovery
                          does not cost you the session. Each button waits only on
                          its own request. */}
                      {(!hasDepth || !hasExamples) && (
                        <View style={s.enrichRow}>
                          {!hasDepth && (
                            <TouchableOpacity
                              style={[s.detailsBtn, enrichRunning('depth') && s.btnDisabled]}
                              onPress={() => enrich('depth')}
                              disabled={enrichRunning('depth')}
                            >
                              <Text style={s.detailsBtnText}>
                                {enrichRunning('depth')
                                  ? t(nativeLanguage, 'cardEnriching')
                                  : t(nativeLanguage, 'loadDefinition')}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {!hasExamples && (
                            <TouchableOpacity
                              style={[s.detailsBtn, enrichRunning('examples') && s.btnDisabled]}
                              onPress={() => enrich('examples')}
                              disabled={enrichRunning('examples')}
                            >
                              <Text style={s.detailsBtnText}>
                                {enrichRunning('examples')
                                  ? t(nativeLanguage, 'cardEnriching')
                                  : t(nativeLanguage, 'loadExamples')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      {enrichError && <Text style={s.enrichError}>{enrichError}</Text>}
                    </View>
                  )}
                </Animated.View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Bottom action row — same position for both show-answer and ratings */}
        {!editing && (
          revealed ? (
            <View style={s.ratingRow}>
              {RATINGS.map(r => (
                <TouchableOpacity
                  key={r.key}
                  // A ring on what the typed answer earned. Emphasis only —
                  // every button stays live, because the whole point is that the
                  // learner can disagree with the grader.
                  style={[
                    s.ratingBtn,
                    { borderColor: r.color },
                    typedGrade?.suggested === r.key && s.ratingBtnSuggested,
                  ]}
                  onPress={() => handleRate(r.key)}
                  disabled={!!submitting}
                >
                  <Text style={[s.ratingBtnText, { color: r.color, opacity: submitting && submitting !== r.key ? 0.4 : submitting === r.key ? 0 : 1 }]}>
                    {r.label}
                  </Text>
                  {submitting === r.key && (
                    <ActivityIndicator size="small" color={r.color} style={StyleSheet.absoluteFill} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : typingThisCard ? (
            <View style={s.typedActions}>
              <TouchableOpacity
                style={[s.showBtn, !typedAnswer.trim() && s.showBtnOff]}
                onPress={handleSubmitTyped}
                disabled={!typedAnswer.trim()}
              >
                <Text style={s.showBtnText}>{t(nativeLanguage, 'typedAnswerCheck')}</Text>
              </TouchableOpacity>
              {/* The per-card way out. A card you cannot type — no IME to hand,
                  or you simply don't want to — flips exactly as it would with
                  typing off, and grades nothing, because nothing was asserted. */}
              <TouchableOpacity onPress={handleReveal} hitSlop={8}>
                <Text style={s.typedRevealText}>{t(nativeLanguage, 'typedAnswerReveal')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.showBtn} onPress={handleReveal}>
              <Text style={s.showBtnText}>{t(nativeLanguage, 'showAnswer')}</Text>
            </TouchableOpacity>
          )
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingBottom: tabBarHeight },
  sessionFlex: { flex: 1 },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  // `center` owns the whole screen; this centers within what a header leaves.
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Muted rather than an alert colour: being offline is a state to explain,
  // not an error to apologise for — the session works either way.
  offlineNotice: {
    marginHorizontal: 16, marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    gap: 3,
  },
  offlineNoticeText: { fontSize: 12, color: C.muted, lineHeight: 17 },
  offlineNoticePending: { fontSize: 12, color: C.muted, fontWeight: '600' },

  progressBar: { height: 3, backgroundColor: C.border, marginTop: 8 },
  progressFill: { height: 3, backgroundColor: C.highlight },
  progressText: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 6 },
  // The label stays centred on the screen rather than in the space left over
  // beside the ✕, so it doesn't shift when the collection name appears.
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressLabelWrap: { flex: 1, marginLeft: 44 },
  stopBtn: { width: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  stopBtnText: { fontSize: 21, color: C.muted, lineHeight: 24 },
  directionLabel: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },

  cardWrap: {
    flex: 1, margin: 16, backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    padding: 28,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  prompt: { fontSize: 13, color: C.muted, flex: 1 },
  optionsBtn: { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  optionsBtnText: { fontSize: 20, color: C.muted, letterSpacing: 2 },

  optionsMenu: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    marginBottom: 16, overflow: 'hidden',
  },
  optionsMenuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  optionsMenuText: { fontSize: 15, color: C.text, fontWeight: '500' },
  optionsMenuDivider: { height: 1, backgroundColor: C.border },

  editForm: { gap: 8, marginTop: 4 },
  editLabel: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  editInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.text,
    backgroundColor: C.bg,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editSaveBtn: { flex: 1, backgroundColor: C.highlight, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editSaveBtnText: { color: C.bg, fontWeight: '700', fontSize: 15 },
  editCancelBtn: { flex: 1, backgroundColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editCancelBtnText: { color: C.text, fontWeight: '600', fontSize: 15 },

  frontText: { fontSize: 32, fontWeight: '700', color: C.text, lineHeight: 40 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
  backText: { fontSize: 22, fontWeight: '600', color: C.highlight, lineHeight: 30 },
  detailsBtn: {
    marginTop: 14, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
  },
  detailsBtnText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  btnDisabled: { opacity: 0.5 },
  enrichError: { fontSize: 12, color: C.error, marginTop: 8, textAlign: 'center' },
  cardScroll: { flex: 1 },
  cardScrollContent: { paddingBottom: 8 },
  definitionWrap: { marginTop: 14 },
  detailSection: { marginBottom: 16 },
  detailLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },
  exampleItem: { marginBottom: 10 },
  exampleStudy: { fontSize: 14, color: C.text, lineHeight: 21 },
  exampleBack: { fontSize: 13, color: C.highlight, marginTop: 2 },
  enrichRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  definitionText: { fontSize: 14, color: C.text, opacity: 0.7, lineHeight: 20 },
  revealWrap: {},
  showBtn: {
    marginHorizontal: 16, paddingBottom: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  showBtnText: { fontSize: 16, color: C.text, fontWeight: '600' },
  showBtnOff: { opacity: 0.4 },

  // Typed responses
  typedInput: {
    marginTop: 20,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 20, color: C.text,
    backgroundColor: C.bg,
  },
  typedVerdict: { fontSize: 13, color: C.muted, marginTop: 10 },
  typedVerdictOk: { color: C.highlight, fontWeight: '700' },
  // The same red the `again` rating uses, since that is the rating this
  // verdict preselects.
  typedVerdictMiss: { color: '#c0392b', fontWeight: '700' },
  typedActions: { paddingBottom: 8 },
  typedRevealText: {
    fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 10,
  },

  ratingRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8,
  },
  ratingBtn: {
    flex: 1, borderWidth: 2, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  ratingBtnText: { fontSize: 13, fontWeight: '700' },
  // A neutral fill on the rating the typed answer earned — emphasis, not a
  // lock: the other three are still tappable.
  ratingBtnSuggested: { backgroundColor: C.border },

  pickerScroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },
  pickerTitle: { fontSize: 15, color: C.muted, marginBottom: 4 },
  pickerRow: { padding: 16, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  pickerRowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  pickerName: { fontSize: 16, fontWeight: '700', color: C.text, flexShrink: 1 },
  pickerDue: { fontSize: 12, color: C.muted },
  pickerCount: { fontSize: 12, color: C.muted, marginTop: 4 },
  skelCount: { marginTop: 8 },
  collectionLabel: { fontSize: 13, color: C.muted, marginBottom: 8 },

  // Start screen — same pill vocabulary as the deck drill's start screen, so
  // the two ways into a session look like the same app.
  startScroll: {
    flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  startTitle: { fontSize: 20, fontWeight: '700', color: C.text, textAlign: 'center' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 },
  pill: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  pillOn: { backgroundColor: C.highlight, borderColor: C.highlight },
  pillText: { fontSize: 13, color: C.text },
  pillTextOn: { color: C.bg, fontWeight: '700' },
  typingPill: { marginTop: 12, alignSelf: 'center' },
  startBtn: {
    marginTop: 24, backgroundColor: C.highlight,
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13,
  },
  startBtnOff: { opacity: 0.4 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: C.bg },
    pickerRowDisabled: { opacity: 0.45 },
  startNote: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 12 },

  changeBtn: {
    marginTop: 20, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
  },
  changeBtnText: { fontSize: 14, fontWeight: '600', color: C.text },

  emptyText: { fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 24 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: C.highlight, marginBottom: 12, textAlign: 'center' },
  // Not the highlight colour the completion screen uses — stopping early is
  // fine, but it isn't the small celebration that finishing is.
  stoppedTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 12, textAlign: 'center' },
  resumeBtn: {
    marginTop: 20, backgroundColor: C.highlight,
    borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11,
  },
  resumeBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
  doneBody: { fontSize: 15, color: C.text, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  nextDate: { fontSize: 13, color: C.muted, textAlign: 'center' },
  });
}
