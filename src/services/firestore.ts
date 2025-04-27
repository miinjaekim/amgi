import { db } from '@/config/firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { TermExplanation } from './gemini';

export interface Flashcard extends TermExplanation {
  id?: string;
  uid: string;
  createdAt: Date;
  nextReview?: Date | string;
  interval?: number;
  ease?: number;
  repetitions?: number;
}

export async function saveFlashcardToFirestore(flashcard: Omit<Flashcard, 'createdAt' | 'id'>) {
  const docRef = await addDoc(collection(db, 'cards'), {
    ...flashcard,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function fetchUserFlashcards(uid: string): Promise<Flashcard[]> {
  try {
    console.log('[Firestore] Fetching flashcards for uid:', uid);
    const q = query(
      collection(db, 'cards'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    console.log('[Firestore] Query snapshot:', snapshot);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Flashcard, 'createdAt' | 'id'>),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      nextReview: doc.data().nextReview?.toDate?.() || doc.data().nextReview,
      interval: doc.data().interval,
      ease: doc.data().ease,
      repetitions: doc.data().repetitions,
    }));
  } catch (error) {
    console.error('[Firestore] Error in fetchUserFlashcards:', error);
    throw error;
  }
}

// Debug: Fetch all cards without filters
export async function testFetchAllCards(): Promise<any[]> {
  try {
    console.log('[Firestore] Fetching ALL cards (no filters)');
    const snapshot = await getDocs(collection(db, 'cards'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Firestore] Error in testFetchAllCards:', error);
    throw error;
  }
} 