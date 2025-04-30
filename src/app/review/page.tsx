'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchUserFlashcards, Flashcard, ReviewTracking, migrateExistingCards } from '@/services/firestore';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { ExamplePair } from '@/services/gemini';

// Direction for review
export type ReviewDirection = 'frontToBack' | 'backToFront';

// Check if a card is due in either direction
function isDue(card: Flashcard): { due: boolean, directions: ReviewDirection[] } {
  const now = new Date();
  const directions: ReviewDirection[] = [];
  
  // Check frontToBack direction
  if (card.frontToBack) {
    const fbReviewDate = card.frontToBack.nextReview instanceof Date ? 
      card.frontToBack.nextReview : 
      new Date(card.frontToBack.nextReview);
    if (fbReviewDate <= now) {
      directions.push('frontToBack');
    }
  } else if (card.nextReview) {
    // If no frontToBack tracking but legacy nextReview exists and is due,
    // consider frontToBack due (needs migration)
    const legacyReviewDate = card.nextReview instanceof Date ? 
      card.nextReview : 
      new Date(card.nextReview);
    if (legacyReviewDate <= now) {
      directions.push('frontToBack');
    }
  } else {
    // If no tracking at all, consider it due (needs initialization)
    directions.push('frontToBack');
  }
  
  // Check backToFront direction
  if (card.backToFront) {
    const bfReviewDate = card.backToFront.nextReview instanceof Date ? 
      card.backToFront.nextReview : 
      new Date(card.backToFront.nextReview);
    if (bfReviewDate <= now) {
      directions.push('backToFront');
    }
  } else if (card.nextReview && directions.length === 0) {
    // If no backToFront tracking but legacy nextReview exists and is due,
    // and frontToBack is not already due, consider backToFront due
    const legacyReviewDate = card.nextReview instanceof Date ? 
      card.nextReview : 
      new Date(card.nextReview);
    if (legacyReviewDate <= now) {
      directions.push('backToFront');
    }
  } else if (!card.frontToBack) {
    // If no tracking at all, consider it due (needs initialization)
    directions.push('backToFront');
  }
  
  return { due: directions.length > 0, directions };
}

// Define a type for cards in the review queue
interface ReviewQueueItem {
  card: Flashcard;
  direction: ReviewDirection;
}

function isExamplePairArray(arr: unknown[]): arr is { korean: string; english: string }[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && 'korean' in arr[0]);
}

export default function ReviewPage() {
  const { user } = useUser();
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [dueCards, setDueCards] = useState<ReviewQueueItem[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Run migration on initial load for the user
  useEffect(() => {
    if (user && !migrationComplete) {
      loadCards();
    } else if (!user) {
      setUserFlashcards([]);
      setDueCards([]);
    }
  }, [user, migrationComplete]);

  // Load cards with optional force migration
  const loadCards = async (forceMigration = false) => {
    if (!user) return;
    
    setFlashcardsLoading(true);
    try {
      // If forcing migration or not migrated yet, run migration first
      if (forceMigration || !migrationComplete) {
        const count = await migrateExistingCards(user.uid);
        console.log(`Migrated/updated ${count} cards to bidirectional tracking`);
        setMigrationComplete(true);
      }
      
      // Fetch updated cards
      const cards = await fetchUserFlashcards(user.uid);
      setUserFlashcards(cards);
      
      // Create review queue with all due cards and their directions
      const queue: ReviewQueueItem[] = [];
      cards.forEach(card => {
        const { due, directions } = isDue(card);
        if (due) {
          directions.forEach(dir => {
            queue.push({ card, direction: dir });
          });
        }
      });
      setDueCards(queue);
    } catch (error) {
      console.error('Error during migration or fetching cards:', error);
      setUserFlashcards([]);
      setDueCards([]);
    } finally {
      setFlashcardsLoading(false);
      setIsSyncing(false);
    }
  };

  // Force sync all cards to ensure consistency
  const handleForceSynchronize = async () => {
    setIsSyncing(true);
    await loadCards(true);
  };

  const handleStartReview = () => {
    setReviewMode(true);
    setCurrentReviewIdx(0);
    setReviewComplete(false);
    setShowAnswer(false);
    setShowDetails(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setShowDetails(false); // Reset details visibility on new answer
  };
  
  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleReviewResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    const { card, direction } = dueCards[currentReviewIdx];
    if (!card || !card.id) return;
    
    // Get updated scheduling data
    const { interval, ease, repetitions, nextReview } = getNextReviewData(
      // Use the appropriate direction's tracking data
      direction === 'frontToBack' ? 
        (card.frontToBack || { interval: card.interval, ease: card.ease, repetitions: card.repetitions }) : 
        (card.backToFront || { interval: card.interval, ease: card.ease, repetitions: card.repetitions }),
      response
    );
    
    try {
      // Update the specific direction's tracking
      const update: Record<string, any> = {};
      update[`${direction}.interval`] = interval;
      update[`${direction}.ease`] = ease;
      update[`${direction}.repetitions`] = repetitions;
      
      // For "again" responses, override nextReview to be immediate (now)
      // For other responses, use the calculated nextReview from SM-2
      if (response === 'again') {
        // Set next review to now (will be shown in next session)
        update[`${direction}.nextReview`] = new Date();
        
        // Also update legacy nextReview field at the root level
        update.nextReview = new Date();
        
        // For debugging
        console.log('Again response:', update);
      } else {
        // Use the calculated nextReview from SM-2 algorithm (future date)
        update[`${direction}.nextReview`] = nextReview;
        
        // Also update legacy nextReview field at the root level to be the same
        update.nextReview = nextReview;
        
        // For debugging
        console.log(`${response} response:`, {
          interval, 
          nextReview: nextReview.toISOString(),
          daysFromNow: interval
        });
      }
      
      await updateDoc(doc(db, 'cards', card.id), update);
    } catch (err) {
      console.error('Failed to update card scheduling:', err);
    }
    
    // Move to next card
    if (currentReviewIdx + 1 < dueCards.length) {
      setCurrentReviewIdx(currentReviewIdx + 1);
      setShowAnswer(false); // Reset for next card
      setShowDetails(false); // Reset details visibility
    } else {
      setReviewComplete(true);
    }
  };

  const handleExitReview = () => {
    setReviewMode(false);
    setReviewComplete(false);
    setCurrentReviewIdx(0);
    setShowAnswer(false);
    setShowDetails(false);
    
    // Refresh cards to update due cards count
    loadCards();
  };

  // Get the current review item from the queue
  const currentReview = dueCards[currentReviewIdx];

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: '#E9E0D2' }}>
      <h1 className="text-2xl font-bold mb-8 mt-8 text-[#EAA09C]">Review</h1>
      <div className="p-6 rounded-xl bg-[#1e5246] border border-[#418E7B] shadow-lg">
        {user ? (
          flashcardsLoading ? (
            <div className="text-[#418E7B]">Loading flashcards...</div>
          ) : dueCards.length === 0 ? (
            <div>
              <div className="text-[#418E7B] mb-4">No cards due for review.</div>
              
              {/* Sync button only in development mode */}
              {isDevelopment && (
                <button
                  className="px-3 py-1 bg-[#418E7B] text-white rounded hover:bg-[#2d6355] text-sm"
                  onClick={handleForceSynchronize}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Synchronizing...' : 'Force Synchronize Cards'}
                </button>
              )}
            </div>
          ) : reviewMode ? (
            reviewComplete ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Review Complete!</h2>
                <button
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={handleExitReview}
                >
                  Exit Review
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">
                  Review Card {currentReviewIdx + 1} of {dueCards.length}
                  <span className="ml-2 px-2 py-1 text-sm bg-[#418E7B] rounded-md">
                    {currentReview.direction === 'frontToBack' ? 'Korean → English' : 'English → Korean'}
                  </span>
                </h2>
                
                <div className="mb-4 p-6 rounded-xl bg-[#173F35] border border-[#418E7B] shadow-lg">
                  {/* Show different content based on direction and answer reveal state */}
                  {currentReview.direction === 'frontToBack' ? (
                    // Front to Back: Show Korean term, ask for English definition
                    <>
                      <div className="font-semibold text-2xl mb-2 text-[#EAA09C]">{currentReview.card.term}</div>
                      
                      {showAnswer ? (
                        // Show answer content when revealed - just translation initially
                        <>
                          {currentReview.card.translation && (
                            <div className="text-lg mb-3 text-[#E9E0D2] font-semibold">{currentReview.card.translation}</div>
                          )}
                          
                          {/* Show Details button */}
                          <button 
                            onClick={handleToggleDetails}
                            className="text-sm px-3 py-1 bg-[#2d6355] text-[#E9E0D2] rounded hover:bg-[#418E7B] mb-4"
                          >
                            {showDetails ? 'Hide Details' : 'Show Details'}
                          </button>
                          
                          {/* Additional details that can be expanded */}
                          {showDetails && (
                            <div className="mt-3 pt-3 border-t border-[#418E7B]">
                              {currentReview.card.definition && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Definition</div>
                                  <div className="text-[#E9E0D2] opacity-90">{currentReview.card.definition}</div>
                                </div>
                              )}
                              
                              {currentReview.card.examples && currentReview.card.examples.length > 0 && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Example Usage</div>
                                  <ul className="list-disc list-inside text-[#E9E0D2] opacity-90 space-y-2">
                                    {(() => {
                                      const rawExamples = currentReview.card.examples as unknown[];
                                      if (Array.isArray(rawExamples) && rawExamples.length > 0 && typeof rawExamples[0] === 'string') {
                                        return (rawExamples as string[]).map((ex, i) => (
                                          <li key={i}>{ex}</li>
                                        ));
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => (
                                          <li key={i}>
                                            <div>{ex.korean}</div>
                                            <div className="text-[#EAA09C] text-sm">{ex.english}</div>
                                          </li>
                                        ));
                                      } else {
                                        return null;
                                      }
                                    })()}
                                  </ul>
                                </div>
                              )}
                              
                              {currentReview.card.notes && (
                                <div className="mt-2">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Notes</div>
                                  <div className="text-[#E9E0D2] opacity-70 text-sm">{currentReview.card.notes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        // Prompt before revealing answer
                        <div className="text-[#418E7B] text-lg mt-4 italic">
                          What does this mean in English?
                        </div>
                      )}
                    </>
                  ) : (
                    // Back to Front: Show English definition, ask for Korean term
                    <>
                      {currentReview.card.translation && (
                        <div className="text-lg mb-2 text-[#E9E0D2]">{currentReview.card.translation}</div>
                      )}
                      
                      {showAnswer ? (
                        // Show answer content when revealed - just the term initially
                        <>
                          <div className="font-semibold text-2xl mb-3 text-[#EAA09C] mt-4">{currentReview.card.term}</div>
                          
                          {/* Show Details button */}
                          <button 
                            onClick={handleToggleDetails}
                            className="text-sm px-3 py-1 bg-[#2d6355] text-[#E9E0D2] rounded hover:bg-[#418E7B] mb-4"
                          >
                            {showDetails ? 'Hide Details' : 'Show Details'}
                          </button>
                          
                          {/* Additional details that can be expanded */}
                          {showDetails && (
                            <div className="mt-3 pt-3 border-t border-[#418E7B]">
                              {currentReview.card.definition && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Definition</div>
                                  <div className="text-[#E9E0D2] opacity-90">{currentReview.card.definition}</div>
                                </div>
                              )}
                              
                              {currentReview.card.examples && currentReview.card.examples.length > 0 && (
                                <div className="mb-4">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Example Usage</div>
                                  <ul className="list-disc list-inside text-[#E9E0D2] opacity-90 space-y-2">
                                    {(() => {
                                      const rawExamples = currentReview.card.examples as unknown[];
                                      if (Array.isArray(rawExamples) && rawExamples.length > 0 && typeof rawExamples[0] === 'string') {
                                        return (rawExamples as string[]).map((ex, i) => (
                                          <li key={i}>{ex}</li>
                                        ));
                                      } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
                                        return (rawExamples as ExamplePair[]).map((ex, i) => (
                                          <li key={i}>
                                            <div>{ex.korean}</div>
                                            <div className="text-[#EAA09C] text-sm">{ex.english}</div>
                                          </li>
                                        ));
                                      } else {
                                        return null;
                                      }
                                    })()}
                                  </ul>
                                </div>
                              )}
                              
                              {currentReview.card.notes && (
                                <div className="mt-2">
                                  <div className="font-semibold text-[#EAA09C] text-sm mb-1">Notes</div>
                                  <div className="text-[#E9E0D2] opacity-70 text-sm">{currentReview.card.notes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        // Prompt before revealing answer
                        <div className="text-[#418E7B] text-lg mt-4 italic">
                          How do you say this in Korean?
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {showAnswer ? (
                  // Rating buttons when answer is shown
                  <div className="flex gap-2 mt-4">
                    <button
                      className="flex-1 px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500"
                      onClick={() => handleReviewResponse('again')}
                    >
                      Again
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500"
                      onClick={() => handleReviewResponse('hard')}
                    >
                      Hard
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500"
                      onClick={() => handleReviewResponse('good')}
                    >
                      Good
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      onClick={() => handleReviewResponse('easy')}
                    >
                      Easy
                    </button>
                  </div>
                ) : (
                  // Show Answer button when answer is hidden
                  <button
                    className="w-full mt-4 px-4 py-3 bg-[#418E7B] text-white rounded-lg hover:bg-[#2d6355] text-lg font-semibold"
                    onClick={handleShowAnswer}
                  >
                    Show Answer
                  </button>
                )}
              </>
            )
          ) : (
            <div className="flex flex-col items-center">
              <button
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-lg font-semibold mb-4"
                onClick={handleStartReview}
              >
                Review {dueCards.length} Card{dueCards.length > 1 ? 's' : ''} Due
              </button>
              
              {/* Sync button only in development mode */}
              {isDevelopment && (
                <button
                  className="px-3 py-1 bg-[#418E7B] text-white rounded hover:bg-[#2d6355] text-sm"
                  onClick={handleForceSynchronize}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Synchronizing...' : 'Force Synchronize Cards'}
                </button>
              )}
            </div>
          )
        ) : (
          <div className="text-[#418E7B]">Sign in to review your flashcards.</div>
        )}
      </div>
    </div>
  );
} 