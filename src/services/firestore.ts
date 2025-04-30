import { db } from '@/config/firebase';
import { collection, addDoc, Timestamp, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { TermExplanation } from './gemini';

export interface ReviewTracking {
  nextReview: Date | string;
  interval: number;
  ease: number;
  repetitions: number;
}

export interface Flashcard extends TermExplanation {
  id?: string;
  uid: string;
  createdAt: Date;
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
  nextReview?: Date | string;
  interval?: number;
  ease?: number;
  repetitions?: number;
}

export async function saveFlashcardToFirestore(flashcard: Omit<Flashcard, 'createdAt' | 'id'>) {
  // Initialize default review tracking data for both directions
  const defaultTracking: ReviewTracking = {
    nextReview: new Date(),  // Due immediately for first review
    interval: 0,
    ease: 2.5,
    repetitions: 0
  };

  const docRef = await addDoc(collection(db, 'cards'), {
    ...flashcard,
    createdAt: Timestamp.now(),
    // Add bidirectional tracking if not provided
    frontToBack: flashcard.frontToBack || defaultTracking,
    backToFront: flashcard.backToFront || defaultTracking,
    // Also set legacy fields for backwards compatibility
    nextReview: flashcard.nextReview || defaultTracking.nextReview,
    interval: flashcard.interval || defaultTracking.interval,
    ease: flashcard.ease || defaultTracking.ease,
    repetitions: flashcard.repetitions || defaultTracking.repetitions,
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
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Process Firestore Timestamps into JavaScript Dates
      const processTimestamp = (timestamp: any) => timestamp?.toDate?.() || timestamp;
      
      // Process ReviewTracking objects
      const processFrontToBack = data.frontToBack ? {
        ...data.frontToBack,
        nextReview: processTimestamp(data.frontToBack.nextReview)
      } : undefined;
      
      const processBackToFront = data.backToFront ? {
        ...data.backToFront,
        nextReview: processTimestamp(data.backToFront.nextReview)
      } : undefined;
      
      // Create flashcard with properly processed date fields
      return {
        id: doc.id,
        ...(data as Omit<Flashcard, 'createdAt' | 'id'>),
        createdAt: processTimestamp(data.createdAt) || new Date(),
        nextReview: processTimestamp(data.nextReview),
        frontToBack: processFrontToBack,
        backToFront: processBackToFront,
      };
    });
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

/**
 * Migrates existing cards to the new bidirectional tracking schema
 * @param uid The user ID to migrate cards for
 * @returns The number of cards migrated
 */
export async function migrateExistingCards(uid: string): Promise<number> {
  try {
    console.log('[Firestore] Starting migration for uid:', uid);
    const q = query(
      collection(db, 'cards'),
      where('uid', '==', uid)
    );
    const snapshot = await getDocs(q);
    console.log(`[Firestore] Found ${snapshot.docs.length} cards to potentially migrate`);
    
    let migratedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docRef = doc(db, 'cards', docSnapshot.id);
      
      // Only migrate cards that don't already have bidirectional tracking
      if (!data.frontToBack || !data.backToFront) {
        // Create tracking objects based on legacy fields
        const tracking: ReviewTracking = {
          nextReview: data.nextReview || new Date(),
          interval: data.interval || 0,
          ease: data.ease || 2.5,
          repetitions: data.repetitions || 0
        };
        
        // Update the document with new fields
        await updateDoc(docRef, {
          frontToBack: tracking,
          backToFront: tracking
        });
        
        migratedCount++;
        console.log(`[Firestore] Migrated card: ${docSnapshot.id}`);
      }
    }
    
    console.log(`[Firestore] Migration complete. Migrated ${migratedCount} cards`);
    return migratedCount;
  } catch (error) {
    console.error('[Firestore] Error in migrateExistingCards:', error);
    throw error;
  }
} 