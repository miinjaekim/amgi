import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, TextInput, Alert, ScrollView,
  Keyboard, Pressable,
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
  directionLabel, getCharacterBreakdown, getExampleSides,
  removeCardFromQueue, t, trackingFor,
  gradeTypedAnswer, promptsForTyping, typedAnswerPlaceholder,
} from '@amgi/core';
import type {
  CardSideField, DirectionFilter, PendingReview, ReviewDirection, ReviewQueueItem,
  TypedAnswerGrade,
} from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import PageHeader from '../../src/components/PageHeader';
import Markdown from '../../src/components/Markdown';
import PronounceButton from '../../src/components/PronounceButton';
import { SkeletonBar, SkeletonGroup, SkeletonRows } from '../../src/components/Skeleton';
import type { Palette } from '../../src/theme';

type Rating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Everything needed to put the last rating back.
 *
 * Captured at rating time rather than reconstructed on undo, because half of
 * it no longer exists by then: the typed answer has been cleared and the card
 * in `reviewedCards` has already been rewritten by the overlay. A single slot
 * rather than a stack — this exists for the misclick you notice immediately,
 * and walking backwards through a whole session is a different feature with a
 * different failure mode.
 */
interface UndoableRating {
  index: number;
  cardId: string;
  direction: ReviewDirection;
  /** The direction's tracking as it stood *before* the rating. */
  tracking: ReviewTracking;
  /** The other direction, which the legacy top-level `nextReview` derives from. */
  otherTracking?: ReviewTracking;
  verdict: Rating;
  /** The day the tally mark went on, which may not be today by now. */
  countedOn: string;
  typedAnswer: string;
  typedGrade: TypedAnswerGrade | null;
}

export default function ReviewScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage, recordReview, undoReview } = useUser();
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
  const [lastRating, setLastRating] = useState<UndoableRating | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  /**
   * The keyboard's real height, from the event rather than inferred.
   *
   * `KeyboardAvoidingView` was here first and got it wrong: it derives the
   * overlap from its own frame, and inside a screen that already pads for the
   * floating tab bar it lifted by ~90pt too little — enough that 확인 was cut
   * in half and the reveal link was gone entirely. Reserving the measured
   * height leaves no arithmetic to be wrong about, which is also why the Learn
   * screen does it this way.
   */
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    // `will` rather than `did`, so the layout moves with the keyboard's own
    // animation instead of snapping after it.
    const show = Keyboard.addListener('keyboardWillShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
    setLastRating(null);
  }, []);

  /** Back to the start screen, where both choices can be made again. */
  const endSession = useCallback(() => {
    setStarted(false);
    setQueue([]);
    setIndex(0);
    setDone(false);
    setStopped(false);
    setReviewedCount(0);
    setLastRating(null);
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

  const handleRate = async (
    rating: Rating,
    // The grade behind the rating, for the undo snapshot. A correct typed
    // answer is rated without ever being put into `typedGrade`, so it has to be
    // passed rather than read — otherwise undoing one loses the ring saying
    // which rating the grader applied.
    grade: TypedAnswerGrade | null = typedGrade,
  ) => {
    if (submitting) return;
    const item = queue[index];
    const cardId = item?.card.id;
    if (!item || !cardId || !user) return;
    const countedOn = recordReview(rating);
    setSubmitting(rating);
    const { card, direction } = item;
    // What the rating reads from is also what undoing it puts back, so it is
    // taken once and kept. `trackingFor` is shared with web, which used to read
    // the pre-bidirectional fields here where this did not.
    const tracking = trackingFor(card, direction);
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
    setLastRating({
      index,
      cardId,
      direction,
      tracking,
      otherTracking: card[otherDir],
      verdict: rating,
      countedOn,
      typedAnswer,
      typedGrade: grade,
    });

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

  /**
   * Put the last rating back — the misclick after a flip, which until now had
   * no way out short of archiving the card.
   *
   * Sent as an *inverse rating* rather than by pulling the original out of the
   * queue, because by now it may already have reached Firestore.
   * `collapsePendingReviews` keeps the last entry per card and direction, so
   * this one supersedes the rating whether it flushed or not — and being an
   * ordinary queue entry, an undo made underground survives the app being
   * killed exactly as the rating did.
   *
   * Pushed onto `sessionRatings` too, which is what `reviewedCards` replays, so
   * the picker's due counts come back with it.
   */
  const handleUndo = async () => {
    if (!lastRating || submitting || !user) return;
    const { cardId, direction, tracking, otherTracking, verdict, countedOn } = lastRating;

    const entry: PendingReview = {
      cardId,
      studyLanguage,
      direction,
      tracking,
      otherTracking,
      reviewedAt: new Date().toISOString(),
    };
    // Durable before anything else, on the same terms as a rating.
    await enqueueReview(user.uid, entry);
    setSessionRatings(prev => [...prev, entry]);
    undoReview(verdict, countedOn);
    setReviewedCount(n => Math.max(0, n - 1));
    void sync();
    // The card is due again, so what the reminders were planned around has
    // moved back.
    void refreshReminders(user.uid, nativeLanguage);

    // Back onto the card, flipped, with the typed answer and its grade as they
    // were — the point is to re-rate, not to answer it again.
    setLastRating(null);
    setIndex(lastRating.index);
    setDone(false);
    setShowDetails(false);
    setShowOptions(false);
    setEditing(false);
    setEditDraft(null);
    setTypedAnswer(lastRating.typedAnswer);
    setTypedGrade(lastRating.typedGrade);
    setRevealed(true);
    revealAnim.setValue(1);
  };

  /**
   * Grade what was typed. A hit is rated and gone; only a miss stops to ask.
   *
   * Local and synchronous — no network, which is the point on a phone: review
   * happens on a commute, and a grader that needs a signal is a grader that
   * stops working exactly where the feature is used.
   *
   * The asymmetry is deliberate. Producing the word from memory and spelling
   * it correctly is not a judgement the learner can improve on, so `easy` is
   * applied rather than offered, and the session moves on. A miss is the
   * opposite — the grader may simply not know the answer was also right — so
   * it reveals both strings and keeps the full rating row, which is where the
   * override lives.
   *
   * Declared below `handleRate` rather than above it: an earlier version of
   * this file taught us that referencing a later `const` from a handler is
   * what the React Compiler flags.
   */
  const handleSubmitTyped = () => {
    const item = queue[index];
    if (!item || !typedAnswer.trim()) return;
    const grade = gradeTypedAnswer(typedAnswer, item.card);
    if (grade.correct) {
      void handleRate(grade.suggested, grade);
      return;
    }
    setTypedGrade(grade);
    handleReveal();
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
            // Undo is anchored to a position in the queue, and the queue has
            // just shifted under it — the slot that held the rated card may now
            // hold a different one.
            setLastRating(null);
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

  /**
   * The same two facts as `offlineNotice`, sized for the progress line.
   *
   * A running session has no row to spare. The banner is a bordered block with
   * its own margins, and with the keyboard up it pushed the card down far
   * enough that the submit button was drawn over the card's own border. Here
   * the state rides a line that already exists and costs nothing, and
   * `numberOfLines={1}` on that line keeps it that way when the count is long
   * or the collection name is.
   */
  const sessionSyncSuffix = [
    !isOnline ? t(nativeLanguage, 'offlineShort') : null,
    pendingCount > 0 ? t(nativeLanguage, 'offlinePendingShort', { count: pendingCount }) : null,
  ].filter(Boolean).join(' · ');

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
        {/* The last card of a session is exactly where a misclick had no
            recourse: answering it ends the session, and the card is gone. */}
        {lastRating && (
          <TouchableOpacity style={s.changeBtn} onPress={handleUndo}>
            <Text style={s.changeBtnText}>↺ {t(nativeLanguage, 'undoRating')}</Text>
          </TouchableOpacity>
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
  /**
   * Rides the study side wherever that lands — the front on `frontToBack`, the
   * revealed back on `backToFront` — which is what web does, and the only
   * placement that makes sense: the gloss is in a language you already have.
   *
   * **Hidden while offline rather than left to fail.** This is the one thing
   * web never had to answer: review here is the offline-first surface — cached
   * cards, queued ratings — while `/api/pronounce` is a network call with no
   * local cache, so offline the button can only fail. And it fails *badly*:
   * `getPronunciationUrl` (`core/tts.ts`) is a bare `fetch` with no
   * `withTimeout` around it, unlike everything else this screen calls, so the
   * spinner has no deadline of our own and waits out the platform's.
   * `PronounceButton` already declines to render for a language with no voice
   * on exactly that reasoning; offline is the same condition, temporally. The
   * progress line above the card carries `offlineShort`, so the missing button
   * is explained on screen rather than looking like a bug.
   */
  const pronounceButton = isOnline ? (
    <PronounceButton text={studySide} furigana={card.furigana} studyLanguage={studyLanguage} />
  ) : null;
  /** Only `backToFront` is ever typed — see `promptsForTyping`. */
  const typingThisCard = promptsForTyping(typingEnabled, direction);

  // Only the typed field before the reveal and the edit form can raise the
  // keyboard, and those are exactly the two branches that render no
  // ScrollView. So the scrolling card never needs a tap-to-dismiss ancestor —
  // and must not have one.
  const canRaiseKeyboard = (typingThisCard && !revealed) || editing;
  /**
   * While the keyboard is up on a typed card, the action row under it is gone
   * and the keyboard's own return key is what submits.
   *
   * The row was the last fixed thing competing for height on a screen that has
   * none to give: the front of a typed card is the *gloss*, and a gloss is
   * routinely a phrase — three lines at 32pt — so 확인 and 그냥 정답 보기 ended
   * up drawn across the card and the input. Nothing in that branch scrolls or
   * shrinks by design (the ScrollView that used to be there is what carried the
   * word off the top when the field took focus), so the fix has to be *fewer
   * things on screen*, not tighter ones — the padding lever was already pulled
   * and this is the same bug coming back.
   *
   * Both controls are still reachable: tapping the card puts the keyboard away
   * and the row returns, which is the gesture this screen already taught for
   * dismissing it.
   */
  const typedKeyboardUp = typingThisCard && !revealed && keyboardHeight > 0;
  // Module-level component references, so this switches identity only when the
  // branch really changes and does not remount the card on every render.
  const DismissArea = canRaiseKeyboard ? Pressable : View;
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
      {/* `root` already pads for the floating tab bar, so only the difference
          is reserved here — together they come to exactly the keyboard. */}
      <View style={[s.sessionFlex, { paddingBottom: Math.max(0, keyboardHeight - tabBarHeight) }]}>
        {/* No `offlineNotice` here on purpose — it rides the progress line
            below as `sessionSyncSuffix`. The block form costs a row this
            screen does not have. The other five render sites keep it: the
            picker, both start screens and the two end screens all have room,
            and that is where someone actually goes looking. */}
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
          {/* Mirrors the ✕ across the label, and holds its slot as a spacer
              when there is nothing to undo — the count stays put rather than
              jumping sideways on the first rating of a session. */}
          {lastRating ? (
            <TouchableOpacity
              style={s.undoBtn}
              onPress={handleUndo}
              disabled={!!submitting}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t(nativeLanguage, 'undoRating')}
            >
              <Text style={s.undoBtnText}>↺</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.undoBtn} />
          )}
          <View style={s.progressLabelWrap}>
            {collections.length > 1 ? (
              <TouchableOpacity onPress={() => setSelectedKey(undefined)} hitSlop={8}>
                <Text style={s.progressText} numberOfLines={1}>
                  {collectionName} · {index + 1} / {queue.length}
                  {sessionSyncSuffix ? ` · ${sessionSyncSuffix}` : ''}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={s.progressText} numberOfLines={1}>
                {index + 1} / {queue.length}
                {sessionSyncSuffix ? ` · ${sessionSyncSuffix}` : ''}
              </Text>
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

        {/* The card and the space under it are one dismiss target, the way
            Learn's is. It has to be the card and not just the spacer: with the
            keyboard up the spacer is nearly nothing, and a keyboard you cannot
            put away is worse than one that covers something. Children with
            their own handlers — the ⋯, the field, the details buttons — still
            take their taps first.

            **But only while a keyboard can actually be up.** With no keyboard
            this was a no-op that still cost something: an enclosing press
            handler and a scroll gesture compete for the same touch, so the
            details panel inside the card would not scroll (lessons.md records
            this exact class). `pointerEvents="box-none"` does not settle it —
            that decides hit-testing, while the responder negotiation still
            bubbles through every ancestor. Dropping to a plain View when there
            is nothing to dismiss takes it out of the negotiation entirely. */}
        <DismissArea
          style={s.dismissArea}
          {...(canRaiseKeyboard ? { onPress: Keyboard.dismiss } : null)}
        >
          {/* Card */}
          <View style={[s.cardWrap, typingThisCard && !revealed && s.cardWrapSnug]}>
            {/* Card header: the options button alone. The question the card is
                asking used to be spelled out here — "이것을 영어로 어떻게
                말하나요?" — and it was saying a third time what the direction
                label above the card already says and what the front text itself
                makes obvious. On a typed card it also stood between the word and
                the field. */}
            <View style={[s.cardHeader, typingThisCard && !revealed && s.cardHeaderSnug]}>
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
            ) : typingThisCard && !revealed ? (
              // **No scroll container, and the card is sized to these two
              // children rather than stretched** (`cardWrapSnug`). A ScrollView
              // here is what broke the exercise: focusing the field made it
              // auto-scroll to bring the input into view, and that carried the
              // word off the top of the card — the learner was asked to
              // translate a word they could no longer see. Before the reveal
              // there is nothing to scroll, so there is nothing to scroll away.
              <>
                <Text style={s.frontText}>{frontText}</Text>
                <TextInput
                  // Remounted per card: `autoFocus` fires on mount only, and
                  // this input holds the same slot from one card to the next.
                  key={index}
                  style={s.typedInput}
                  value={typedAnswer}
                  onChangeText={setTypedAnswer}
                  // The submit path whenever the keyboard is up, since 확인 is
                  // not on screen then — see `typedKeyboardUp`. Blurring on
                  // submit is what brings the row back for the reveal.
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
              </>
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
                <View style={s.termRow}>
                  <Text style={[s.frontText, s.rowText]}>{frontText}</Text>
                  {isFront && pronounceButton}
                </View>

                {revealed && (
                  <Animated.View style={[s.revealWrap, revealStyle]}>
                    <View style={s.divider} />
                    <View style={s.termRow}>
                      <Text style={[s.backText, s.rowText]}>{backText}</Text>
                      {!isFront && pronounceButton}
                    </View>

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
                                  <View style={s.exampleStudyRow}>
                                    <Text style={[s.exampleStudy, s.rowText]}>{sides.study}</Text>
                                    {/* Offline-gated for the same reason as the
                                        term's button above. */}
                                    {isOnline && (
                                      <PronounceButton
                                        text={sides.study}
                                        studyLanguage={studyLanguage}
                                        size="sm"
                                      />
                                    )}
                                  </View>
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

          {/* Takes the height the card gave up, so 확인 stays at the bottom and
              the word keeps its position whether or not the keyboard is up — the
              keyboard eats this, not the card. */}
          {typingThisCard && !revealed && <View style={s.typedSpacer} />}
        </DismissArea>

        {/* Bottom action row — same position for both show-answer and ratings.
            Hidden while the typed card's keyboard is up: the return key submits
            there, and the height this row was holding is what a multi-line
            gloss needs. */}
        {!editing && !typedKeyboardUp && (
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
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingBottom: tabBarHeight },
  sessionFlex: { flex: 1 },
  dismissArea: { flex: 1 },
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
  // beside the ✕, so it doesn't shift when the collection name appears. The
  // undo slot on the left is what balances it — rendered empty when there is
  // nothing to undo, for the same reason.
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressLabelWrap: { flex: 1 },
  stopBtn: { width: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  stopBtnText: { fontSize: 21, color: C.muted, lineHeight: 24 },
  undoBtn: { width: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  undoBtnText: { fontSize: 21, color: C.muted, lineHeight: 24 },
  directionLabel: { fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 },

  cardWrap: {
    flex: 1, margin: 16, backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    padding: 28,
  },
  // Before the reveal a typed card holds a word and a field, so it hugs them
  // instead of stretching. Stretched, it left ~500pt of empty card below the
  // field with the keyboard down, and collapsed onto its own ScrollView with
  // the keyboard up.
  //
  // The tighter vertical padding is not decoration: with the keyboard up the
  // fixed content came to ~22pt more than the screen had, and since nothing
  // here scrolls or shrinks, the overflow was drawn *over* the card — 확인
  // sitting across its bottom border. This and `cardHeaderSnug` give back
  // ~36pt of padding that was holding nothing.
  cardWrapSnug: { flex: 0, paddingVertical: 16 },
  cardHeaderSnug: { marginBottom: 4 },
  typedSpacer: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 16 },
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
  // Shared by the term rows and the example rows. `flexShrink` is what keeps
  // a long term wrapping inside its row instead of pushing the pronounce
  // button off the card. The term row is unconditional so the word sits in
  // the same place in both directions and on a language with no voice.
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flexShrink: 1 },
  exampleStudyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    marginTop: 14,
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
    fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 8,
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
