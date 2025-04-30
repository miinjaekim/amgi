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
  // Direction-specific review tracking
  frontToBack?: ReviewTracking;
  backToFront?: ReviewTracking;
  
  // Legacy fields (deprecated, kept for backward compatibility)
  /** @deprecated Use frontToBack.nextReview or backToFront.nextReview instead */
  nextReview?: Date | string;
  /** @deprecated Use frontToBack.interval or backToFront.interval instead */
  interval?: number;
  /** @deprecated Use frontToBack.ease or backToFront.ease instead */
  ease?: number;
  /** @deprecated Use frontToBack.repetitions or backToFront.repetitions instead */
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

  // Ensure both direction trackers are set
  const frontToBack = flashcard.frontToBack || defaultTracking;
  const backToFront = flashcard.backToFront || defaultTracking;
  
  // For backward compatibility, set legacy fields based on the earliest nextReview
  const fbDate = frontToBack.nextReview instanceof Date ? 
    frontToBack.nextReview : new Date(frontToBack.nextReview);
  const bfDate = backToFront.nextReview instanceof Date ? 
    backToFront.nextReview : new Date(backToFront.nextReview);
  
  // Use the earliest date for the legacy nextReview field
  const legacyNextReview = fbDate < bfDate ? fbDate : bfDate;

  const docRef = await addDoc(collection(db, 'cards'), {
    ...flashcard,
    createdAt: Timestamp.now(),
    // Add bidirectional tracking
    frontToBack,
    backToFront,
    // Also set legacy fields for backwards compatibility
    nextReview: flashcard.nextReview || legacyNextReview,
    interval: flashcard.interval || frontToBack.interval,
    ease: flashcard.ease || frontToBack.ease,
    repetitions: flashcard.repetitions || frontToBack.repetitions,
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
    let updatedCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const docRef = doc(db, 'cards', docSnapshot.id);
      const update: Record<string, any> = {};
      let needsUpdate = false;
      
      // Case 1: Cards without direction tracking need full migration
      if (!data.frontToBack || !data.backToFront) {
        // Create tracking objects based on legacy fields or defaults
        const tracking: ReviewTracking = {
          nextReview: data.nextReview || new Date(),
          interval: data.interval || 0,
          ease: data.ease || 2.5,
          repetitions: data.repetitions || 0
        };
        
        if (!data.frontToBack) {
          update.frontToBack = tracking;
          needsUpdate = true;
        }
        
        if (!data.backToFront) {
          update.backToFront = tracking;
          needsUpdate = true;
        }
        
        migratedCount++;
      }
      
      // Case 2: Cards with inconsistent legacy and direction-specific dates
      // Ensure root nextReview matches the earliest of frontToBack and backToFront
      if (data.frontToBack && data.backToFront) {
        const fbDate = data.frontToBack.nextReview?.toDate?.() || new Date(data.frontToBack.nextReview);
        const bfDate = data.backToFront.nextReview?.toDate?.() || new Date(data.backToFront.nextReview);
        const earliestDate = fbDate < bfDate ? fbDate : bfDate;
        
        const currentLegacyDate = data.nextReview?.toDate?.() || 
                                (data.nextReview ? new Date(data.nextReview) : null);
        
        // If legacy date is missing or doesn't match earliest direction date
        if (!currentLegacyDate || Math.abs(currentLegacyDate.getTime() - earliestDate.getTime()) > 1000) {
          update.nextReview = earliestDate;
          needsUpdate = true;
          updatedCount++;
        }
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await updateDoc(docRef, update);
        console.log(`[Firestore] Updated card: ${docSnapshot.id}`, update);
      }
    }
    
    console.log(`[Firestore] Migration complete. Migrated ${migratedCount} cards, updated ${updatedCount} existing cards.`);
    return migratedCount + updatedCount;
  } catch (error) {
    console.error('[Firestore] Error in migrateExistingCards:', error);
    throw error;
  }
} 