import { db } from '@/config/firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStudyLanguageConfig } from '@amgi/core';
import type { Flashcard, ReviewTracking, StudyLanguage } from '@amgi/core';

export type { Flashcard, ReviewTracking, StudyLanguage } from '@amgi/core';

export function getCardsCollection(studyLanguage?: StudyLanguage) {
  return getStudyLanguageConfig(studyLanguage).collection;
}

export async function saveFlashcardToFirestore(
  flashcard: Omit<Flashcard, 'createdAt' | 'id'>,
  studyLanguage?: StudyLanguage
) {
  const defaultTracking: ReviewTracking = {
    nextReview: new Date(),
    interval: 0,
    ease: 2.5,
    repetitions: 0
  };

  const frontToBack = flashcard.frontToBack || defaultTracking;
  const backToFront = flashcard.backToFront || defaultTracking;

  const fbDate = frontToBack.nextReview instanceof Date ?
    frontToBack.nextReview : new Date(frontToBack.nextReview);
  const bfDate = backToFront.nextReview instanceof Date ?
    backToFront.nextReview : new Date(backToFront.nextReview);
  const legacyNextReview = fbDate < bfDate ? fbDate : bfDate;

  const collectionName = getCardsCollection(studyLanguage);

  const rawData = {
    ...flashcard,
    studyLanguage: studyLanguage ?? 'Korean',
    createdAt: Timestamp.now(),
    archived: false,
    frontToBack,
    backToFront,
    nextReview: flashcard.nextReview || legacyNextReview,
    interval: flashcard.interval || frontToBack.interval,
    ease: flashcard.ease || frontToBack.ease,
    repetitions: flashcard.repetitions || frontToBack.repetitions,
  };

  // Firebase v9 throws on explicit `undefined` field values.
  const docData = Object.fromEntries(
    Object.entries(rawData).filter(([, v]) => v !== undefined)
  );

  const docRef = await addDoc(collection(db, collectionName), docData);
  return docRef.id;
}

function mapDocToFlashcard(docSnapshot: any, studyLanguage?: StudyLanguage): Flashcard {
  const data = docSnapshot.data();
  const processTimestamp = (timestamp: any) => timestamp?.toDate?.() || timestamp;

  const processFrontToBack = data.frontToBack ? {
    ...data.frontToBack,
    nextReview: processTimestamp(data.frontToBack.nextReview)
  } : undefined;

  const processBackToFront = data.backToFront ? {
    ...data.backToFront,
    nextReview: processTimestamp(data.backToFront.nextReview)
  } : undefined;

  return {
    id: docSnapshot.id,
    ...(data as Omit<Flashcard, 'createdAt' | 'id'>),
    studyLanguage: data.studyLanguage ?? studyLanguage ?? 'Korean',
    createdAt: processTimestamp(data.createdAt) || new Date(),
    nextReview: processTimestamp(data.nextReview),
    frontToBack: processFrontToBack,
    backToFront: processBackToFront,
  };
}

export async function fetchUserFlashcards(uid: string, studyLanguage?: StudyLanguage): Promise<Flashcard[]> {
  const collectionName = getCardsCollection(studyLanguage);
  try {
    const q = query(
      collection(db, collectionName),
      where('uid', '==', uid),
      where('archived', '!=', true),
      orderBy('archived'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDocToFlashcard(d, studyLanguage));
  } catch (error) {
    console.error('[Firestore] Error in fetchUserFlashcards:', error);
    throw error;
  }
}

export async function fetchAllUserFlashcards(uid: string, studyLanguage?: StudyLanguage): Promise<Flashcard[]> {
  const collectionName = getCardsCollection(studyLanguage);
  try {
    const q = query(
      collection(db, collectionName),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDocToFlashcard(d, studyLanguage));
  } catch (error) {
    console.error('[Firestore] Error in fetchAllUserFlashcards:', error);
    throw error;
  }
}

export async function fetchArchivedFlashcards(uid: string, studyLanguage?: StudyLanguage): Promise<Flashcard[]> {
  const collectionName = getCardsCollection(studyLanguage);
  try {
    const q = query(
      collection(db, collectionName),
      where('uid', '==', uid),
      where('archived', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDocToFlashcard(d, studyLanguage));
  } catch (error) {
    console.error('[Firestore] Error in fetchArchivedFlashcards:', error);
    throw error;
  }
}

export async function archiveFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  const collectionName = getCardsCollection(studyLanguage);
  await updateDoc(doc(db, collectionName, cardId), { archived: true });
}

export async function restoreFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  const collectionName = getCardsCollection(studyLanguage);
  await updateDoc(doc(db, collectionName, cardId), { archived: false });
}

export async function deleteFlashcard(cardId: string, studyLanguage?: StudyLanguage): Promise<void> {
  const collectionName = getCardsCollection(studyLanguage);
  await deleteDoc(doc(db, collectionName, cardId));
}

export async function migrateExistingCards(uid: string): Promise<number> {
  try {
    const q = query(collection(db, 'cards'), where('uid', '==', uid));
    const snapshot = await getDocs(q);

    let migratedCount = 0;
    let updatedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docRef = doc(db, 'cards', docSnapshot.id);
      const update: Record<string, any> = {};
      let needsUpdate = false;

      if (!data.korean || !data.english) {
        const isKorean = /[가-힣ᄀ-ᇿ㄰-㆏]/.test(data.term || '');
        update.termLanguage = isKorean ? 'Korean' : 'English';
        update.korean = isKorean ? data.term : (data.translation || '');
        update.english = isKorean ? (data.translation || '') : data.term;
        needsUpdate = true;
      }

      if (!data.frontToBack || !data.backToFront) {
        const tracking: ReviewTracking = {
          nextReview: data.nextReview || new Date(),
          interval: data.interval || 0,
          ease: data.ease || 2.5,
          repetitions: data.repetitions || 0
        };

        if (!data.frontToBack) { update.frontToBack = tracking; needsUpdate = true; }
        if (!data.backToFront) { update.backToFront = tracking; needsUpdate = true; }
        migratedCount++;
      }

      if (data.frontToBack && data.backToFront) {
        const fbDate = data.frontToBack.nextReview?.toDate?.() || new Date(data.frontToBack.nextReview);
        const bfDate = data.backToFront.nextReview?.toDate?.() || new Date(data.backToFront.nextReview);
        const earliestDate = fbDate < bfDate ? fbDate : bfDate;

        const currentLegacyDate = data.nextReview?.toDate?.() ||
                                (data.nextReview ? new Date(data.nextReview) : null);

        if (!currentLegacyDate || Math.abs(currentLegacyDate.getTime() - earliestDate.getTime()) > 1000) {
          update.nextReview = earliestDate;
          needsUpdate = true;
          updatedCount++;
        }
      }

      if (needsUpdate) await updateDoc(docRef, update);
    }

    return migratedCount + updatedCount;
  } catch (error) {
    console.error('[Firestore] Error in migrateExistingCards:', error);
    throw error;
  }
}
