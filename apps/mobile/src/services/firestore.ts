import {
  collection, addDoc, Timestamp, query, where, orderBy,
  getDocsFromServer, onSnapshot, doc, updateDoc, deleteDoc, writeBatch,
  type Query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getStudyLanguageConfig } from '@amgi/core';
import { recordNewCards } from './progress';
import type { Flashcard, ReviewTracking, StudyLanguage } from '@amgi/core';

export type { Flashcard, ReviewTracking, StudyLanguage } from '@amgi/core';

/** Firestore collection holding a given study language's cards. */
export function getCardsCollection(studyLanguage?: StudyLanguage): string {
  return getStudyLanguageConfig(studyLanguage).collection;
}

function processTimestamp(ts: any): Date {
  return ts?.toDate?.() ?? (ts ? new Date(ts) : new Date());
}

function mapDoc(snap: any, studyLanguage?: StudyLanguage): Flashcard {
  const d = snap.data();
  return {
    id: snap.id,
    ...(d as Omit<Flashcard, 'createdAt' | 'id'>),
    studyLanguage: d.studyLanguage ?? studyLanguage ?? 'Korean',
    createdAt: processTimestamp(d.createdAt),
    nextReview: processTimestamp(d.nextReview),
    frontToBack: d.frontToBack ? { ...d.frontToBack, nextReview: processTimestamp(d.frontToBack.nextReview) } : undefined,
    backToFront: d.backToFront ? { ...d.backToFront, nextReview: processTimestamp(d.backToFront.nextReview) } : undefined,
  };
}

const DEFAULT_TRACKING: ReviewTracking = {
  nextReview: new Date(),
  interval: 0,
  ease: 2.5,
  repetitions: 0,
};

function buildFlashcardDoc(
  flashcard: Omit<Flashcard, 'createdAt' | 'id'>,
  studyLanguage?: StudyLanguage,
) {
  const frontToBack = flashcard.frontToBack ?? DEFAULT_TRACKING;
  const backToFront = flashcard.backToFront ?? DEFAULT_TRACKING;
  const fbDate = new Date(frontToBack.nextReview);
  const bfDate = new Date(backToFront.nextReview);

  const rawData = {
    ...flashcard,
    studyLanguage: studyLanguage ?? 'Korean',
    createdAt: Timestamp.now(),
    archived: false,
    frontToBack,
    backToFront,
    nextReview: fbDate < bfDate ? fbDate : bfDate,
    interval: frontToBack.interval,
    ease: frontToBack.ease,
    repetitions: frontToBack.repetitions,
  };

  // Firebase v9 throws on explicit `undefined` field values.
  return Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined)
  );
}

export async function saveFlashcardToFirestore(
  flashcard: Omit<Flashcard, 'createdAt' | 'id'>,
  studyLanguage?: StudyLanguage,
): Promise<string> {
  const ref = await addDoc(
    collection(db, getCardsCollection(studyLanguage)),
    buildFlashcardDoc(flashcard, studyLanguage),
  );
  // Counted here rather than at the call sites, so a surface added later gets
  // it without anyone remembering — a counter with an invisible gap in it is
  // worse than no counter.
  void recordNewCards(flashcard.uid, studyLanguage, 1, 'lookup');
  return ref.id;
}

/**
 * Save many cards at once — enrolling in a whole deck, which is one action to
 * the user and should be one round trip. Chunked because a Firestore batch
 * holds 500 writes and a pack has no ceiling; the chunks are sequential so a
 * hundred-odd cards don't arrive as a hundred parallel connections.
 */
export async function saveFlashcardsBatch(
  flashcards: Omit<Flashcard, 'createdAt' | 'id'>[],
  studyLanguage?: StudyLanguage,
): Promise<number> {
  const collectionName = getCardsCollection(studyLanguage);
  for (let i = 0; i < flashcards.length; i += 400) {
    const batch = writeBatch(db);
    for (const flashcard of flashcards.slice(i, i + 400)) {
      batch.set(doc(collection(db, collectionName)), buildFlashcardDoc(flashcard, studyLanguage));
    }
    await batch.commit();
  }
  // `packCards`, not `newCards`: a 474-card pack import and a single lookup are
  // both "cards added" and nothing alike, and a heatmap one import can swamp is
  // worse than no heatmap.
  void recordNewCards(flashcards[0]?.uid, studyLanguage, flashcards.length, 'pack');
  return flashcards.length;
}

function allCardsQuery(uid: string, studyLanguage?: StudyLanguage) {
  return query(
    collection(db, getCardsCollection(studyLanguage)),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
  );
}

function activeCardsQuery(uid: string, studyLanguage?: StudyLanguage) {
  return query(
    collection(db, getCardsCollection(studyLanguage)),
    where('uid', '==', uid),
    where('archived', '!=', true),
    orderBy('archived'),
    orderBy('createdAt', 'desc'),
  );
}

/**
 * A one-shot read that fails instead of falling back to the local cache.
 *
 * `getDocs` offline resolves against Firestore's cache — which on React Native
 * is memory-only and usually empty — so it hands back an *empty* result rather
 * than an error. That is indistinguishable from "this user has no cards", and
 * feeding it to `writeCachedCards` would wipe a perfectly good offline snapshot
 * the moment the user opened review underground. Refreshing the snapshot must
 * therefore use a read that can actually fail.
 *
 * The screens all subscribe now; what is left for this is warming the snapshot
 * of a language nobody is looking at, which has no listener to ride on.
 */
export async function fetchUserFlashcardsFromServer(
  uid: string,
  studyLanguage?: StudyLanguage,
): Promise<Flashcard[]> {
  const snap = await getDocsFromServer(activeCardsQuery(uid, studyLanguage));
  return snap.docs.map(d => mapDoc(d, studyLanguage));
}

/** What a live card read hands back alongside the cards. */
export interface CardSnapshotMeta {
  /**
   * True when Firestore answered from its own cache rather than the server.
   * Callers that persist the result — anything touching `writeCachedCards` —
   * must not treat a cached answer as the server's word.
   */
  fromCache: boolean;
}

export type CardSnapshotHandler = (cards: Flashcard[], meta: CardSnapshotMeta) => void;

/**
 * A live card query, with the one guard React Native forces on it.
 *
 * **An empty snapshot from the cache is dropped, not delivered.** This is the
 * listener form of the trap `fetchUserFlashcardsFromServer` above was written
 * to dodge: Firestore's cache here is memory-only, so before the server answers
 * it has nothing, and "nothing" is returned as an ordinary empty result rather
 * than an error. Delivered as-is it is indistinguishable from "this account has
 * no cards" — it would blank the list on every cold start and, worse, overwrite
 * a perfectly good offline snapshot with nothing.
 *
 * Only *empty* cached snapshots are dropped. A non-empty one is real data the
 * server already gave us this session, and it is what makes a listener keep
 * working after the connection goes away.
 *
 * The consequence to know: **offline with a cold cache, this calls nothing at
 * all** — no data, no error, just silence, because a listener has nothing to
 * report and no reason to fail. A caller that shows a spinner has to time out
 * on its own; `review.tsx` is the one that does.
 */
function subscribeToCards(
  cardsQuery: Query,
  studyLanguage: StudyLanguage | undefined,
  onChange: CardSnapshotHandler,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    cardsQuery,
    snap => {
      if (snap.empty && snap.metadata.fromCache) return;
      onChange(
        snap.docs.map(d => mapDoc(d, studyLanguage)),
        { fromCache: snap.metadata.fromCache },
      );
    },
    onError,
  );
}

/** Every card for this language, archived included — what the Cards tab lists. */
export function subscribeToAllUserFlashcards(
  uid: string,
  studyLanguage: StudyLanguage | undefined,
  onChange: CardSnapshotHandler,
  onError: (error: Error) => void,
): () => void {
  return subscribeToCards(allCardsQuery(uid, studyLanguage), studyLanguage, onChange, onError);
}

/** The reviewable cards — archived excluded, as review and its counts want. */
export function subscribeToActiveUserFlashcards(
  uid: string,
  studyLanguage: StudyLanguage | undefined,
  onChange: CardSnapshotHandler,
  onError: (error: Error) => void,
): () => void {
  return subscribeToCards(activeCardsQuery(uid, studyLanguage), studyLanguage, onChange, onError);
}

export async function archiveFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  await updateDoc(doc(db, getCardsCollection(studyLanguage), cardId), { archived: true });
}

export async function restoreFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  await updateDoc(doc(db, getCardsCollection(studyLanguage), cardId), { archived: false });
}

export async function deleteFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  await deleteDoc(doc(db, getCardsCollection(studyLanguage), cardId));
}

/**
 * Merge arbitrary fields into a card. Widened from the card-side fields it was
 * written for: enrichment writes `definition`, `characterBreakdown`, `notes`
 * and `examples`, none of which are language sides.
 */
export async function updateFlashcardFields(
  cardId: string,
  fields: Record<string, unknown>,
  studyLanguage?: StudyLanguage,
): Promise<void> {
  await updateDoc(doc(db, getCardsCollection(studyLanguage), cardId), fields);
}

export async function updateFlashcardReview(
  cardId: string,
  direction: 'frontToBack' | 'backToFront',
  tracking: ReviewTracking,
  otherTracking?: ReviewTracking,
  studyLanguage?: StudyLanguage,
): Promise<void> {
  const otherDate = otherTracking ? new Date(otherTracking.nextReview) : null;
  const thisDate = new Date(tracking.nextReview);
  const legacyNext = otherDate && otherDate < thisDate ? otherDate : thisDate;
  await updateDoc(doc(db, getCardsCollection(studyLanguage), cardId), {
    [direction]: tracking,
    nextReview: legacyNext,
    interval: tracking.interval,
    ease: tracking.ease,
    repetitions: tracking.repetitions,
  });
}
