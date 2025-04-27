'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { fetchUserFlashcards, Flashcard } from '@/services/firestore';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';

function isDue(card: Flashcard) {
  if (!card.nextReview) return true;
  const now = new Date();
  const reviewDate = card.nextReview instanceof Date ? card.nextReview : new Date(card.nextReview);
  return reviewDate <= now;
}

export default function ReviewPage() {
  const { user } = useUser();
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);

  useEffect(() => {
    if (user) {
      setFlashcardsLoading(true);
      fetchUserFlashcards(user.uid)
        .then(cards => {
          setUserFlashcards(cards);
          setDueCards(cards.filter(isDue));
        })
        .catch(() => {
          setUserFlashcards([]);
          setDueCards([]);
        })
        .finally(() => setFlashcardsLoading(false));
    } else {
      setUserFlashcards([]);
      setDueCards([]);
    }
  }, [user]);

  const handleStartReview = () => {
    setReviewMode(true);
    setCurrentReviewIdx(0);
    setReviewComplete(false);
  };

  const handleReviewResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    const card = dueCards[currentReviewIdx];
    if (!card || !card.id) return;
    const { interval, ease, repetitions, nextReview } = getNextReviewData(card, response);
    try {
      await updateDoc(doc(db, 'cards', card.id), {
        interval,
        ease,
        repetitions,
        nextReview,
      });
    } catch (err) {
      // Optionally show error to user
      console.error('Failed to update card scheduling:', err);
    }
    if (currentReviewIdx + 1 < dueCards.length) {
      setCurrentReviewIdx(currentReviewIdx + 1);
    } else {
      setReviewComplete(true);
    }
  };

  const handleExitReview = () => {
    setReviewMode(false);
    setReviewComplete(false);
    setCurrentReviewIdx(0);
  };

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: '#E9E0D2' }}>
      <h1 className="text-2xl font-bold mb-8 mt-8 text-[#EAA09C]">Review</h1>
      <div className="p-6 rounded-xl bg-[#1e5246] border border-[#418E7B] shadow-lg">
        {user ? (
          flashcardsLoading ? (
            <div className="text-[#418E7B]">Loading flashcards...</div>
          ) : dueCards.length === 0 ? (
            <div className="text-[#418E7B]">No cards due for review.</div>
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
                <h2 className="text-xl font-bold mb-4">Review Card {currentReviewIdx + 1} of {dueCards.length}</h2>
                <div className="mb-4">
                  <div className="font-semibold text-lg mb-1">{dueCards[currentReviewIdx].term}</div>
                  <div className="text-gray-700 mb-1">{dueCards[currentReviewIdx].definition}</div>
                  {dueCards[currentReviewIdx].examples && dueCards[currentReviewIdx].examples.length > 0 && (
                    <ul className="list-disc list-inside text-gray-600 mb-1">
                      {dueCards[currentReviewIdx].examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  )}
                  {dueCards[currentReviewIdx].notes && (
                    <div className="text-gray-500 text-sm">{dueCards[currentReviewIdx].notes}</div>
                  )}
                </div>
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
              </>
            )
          ) : (
            <div className="flex justify-center">
              <button
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-lg font-semibold"
                onClick={handleStartReview}
              >
                Review {dueCards.length} Card{dueCards.length > 1 ? 's' : ''} Due
              </button>
            </div>
          )
        ) : (
          <div className="text-[#418E7B]">Sign in to review your flashcards.</div>
        )}
      </div>
    </div>
  );
} 