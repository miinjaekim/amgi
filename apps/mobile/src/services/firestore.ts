import {
  collection, addDoc, Timestamp, query, where, orderBy,
  getDocs, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getStudyLanguageConfig } from '@amgi/core';
import type { Flashcard, ReviewTracking, StudyLanguage, CardSideField } from '@amgi/core';

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

export async function saveFlashcardToFirestore(
  flashcard: Omit<Flashcard, 'createdAt' | 'id'>,
  studyLanguage?: StudyLanguage,
): Promise<string> {
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
  const docData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined)
  );

  const ref = await addDoc(collection(db, getCardsCollection(studyLanguage)), docData);
  return ref.id;
}

export async function fetchAllUserFlashcards(uid: string, studyLanguage?: StudyLanguage): Promise<Flashcard[]> {
  const q = query(collection(db, getCardsCollection(studyLanguage)), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc(d, studyLanguage));
}

export async function fetchUserFlashcards(uid: string, studyLanguage?: StudyLanguage): Promise<Flashcard[]> {
  const q = query(
    collection(db, getCardsCollection(studyLanguage)),
    where('uid', '==', uid),
    where('archived', '!=', true),
    orderBy('archived'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDoc(d, studyLanguage));
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

export async function updateFlashcardFields(
  cardId: string,
  fields: Partial<Record<CardSideField, string>>,
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
