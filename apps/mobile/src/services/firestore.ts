import {
  collection, addDoc, Timestamp, query, where, orderBy,
  getDocs, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Flashcard, ReviewTracking } from '@amgi/core';

export type { Flashcard, ReviewTracking } from '@amgi/core';

function processTimestamp(ts: any): Date {
  return ts?.toDate?.() ?? (ts ? new Date(ts) : new Date());
}

function mapDoc(snap: any): Flashcard {
  const d = snap.data();
  return {
    id: snap.id,
    ...(d as Omit<Flashcard, 'createdAt' | 'id'>),
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

export async function saveFlashcardToFirestore(flashcard: Omit<Flashcard, 'createdAt' | 'id'>): Promise<string> {
  const frontToBack = flashcard.frontToBack ?? DEFAULT_TRACKING;
  const backToFront = flashcard.backToFront ?? DEFAULT_TRACKING;
  const fbDate = new Date(frontToBack.nextReview);
  const bfDate = new Date(backToFront.nextReview);
  const ref = await addDoc(collection(db, 'cards'), {
    ...flashcard,
    createdAt: Timestamp.now(),
    archived: false,
    frontToBack,
    backToFront,
    nextReview: fbDate < bfDate ? fbDate : bfDate,
    interval: frontToBack.interval,
    ease: frontToBack.ease,
    repetitions: frontToBack.repetitions,
  });
  return ref.id;
}

export async function fetchAllUserFlashcards(uid: string): Promise<Flashcard[]> {
  const q = query(collection(db, 'cards'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function fetchUserFlashcards(uid: string): Promise<Flashcard[]> {
  const q = query(
    collection(db, 'cards'),
    where('uid', '==', uid),
    where('archived', '!=', true),
    orderBy('archived'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function archiveFlashcard(cardId: string): Promise<void> {
  await updateDoc(doc(db, 'cards', cardId), { archived: true });
}

export async function restoreFlashcard(cardId: string): Promise<void> {
  await updateDoc(doc(db, 'cards', cardId), { archived: false });
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  await deleteDoc(doc(db, 'cards', cardId));
}

export async function updateFlashcardFields(
  cardId: string,
  fields: Partial<Pick<Flashcard, 'korean' | 'english'>>,
): Promise<void> {
  await updateDoc(doc(db, 'cards', cardId), fields);
}

export async function updateFlashcardReview(
  cardId: string,
  direction: 'frontToBack' | 'backToFront',
  tracking: ReviewTracking,
  otherTracking?: ReviewTracking,
): Promise<void> {
  const otherDate = otherTracking ? new Date(otherTracking.nextReview) : null;
  const thisDate = new Date(tracking.nextReview);
  const legacyNext = otherDate && otherDate < thisDate ? otherDate : thisDate;
  await updateDoc(doc(db, 'cards', cardId), {
    [direction]: tracking,
    nextReview: legacyNext,
    interval: tracking.interval,
    ease: tracking.ease,
    repetitions: tracking.repetitions,
  });
}
