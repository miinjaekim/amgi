'use client';

import { useState, useEffect } from 'react';
import { getTermExplanation, TermExplanation } from '@/services/gemini';
import { db } from '@/config/firebase';
import { saveFlashcardToFirestore, fetchUserFlashcards, Flashcard } from '@/services/firestore';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { useUser } from '@/components/UserContext';

function isDue(card: Flashcard) {
  if (!card.nextReview) return true;
  const now = new Date();
  const reviewDate = card.nextReview instanceof Date ? card.nextReview : new Date(card.nextReview);
  return reviewDate <= now;
}

export default function Home() {
  const { user } = useUser();
  const [term, setTerm] = useState('');
  const [explanation, setExplanation] = useState<TermExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFlashcardForm, setShowFlashcardForm] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<Flashcard | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentReviewIdx, setCurrentReviewIdx] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Flashcard> | null>(null);

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
  }, [user, saveSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowFlashcardForm(false);
    setSaveSuccess(false);
    try {
      const result = await getTermExplanation(term);
      setExplanation(result);
    } catch (err) {
      setError('Failed to get explanation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlashcard = async () => {
    if (flashcardDraft && user) {
      setSaving(true);
      setError(null);
      try {
        await saveFlashcardToFirestore({ ...flashcardDraft, uid: user.uid });
        setShowFlashcardForm(false);
        setSaveSuccess(true);
      } catch (err) {
        setError('Failed to save flashcard to Firestore.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleStartReview = () => {
    setReviewMode(true);
    setCurrentReviewIdx(0);
    setReviewComplete(false);
  };

  const handleReviewResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
    const card = dueCards[currentReviewIdx];
    if (!card || !card.id) return;
    // Calculate next review data
    const { interval, ease, repetitions, nextReview } = getNextReviewData(card, response);
    // Update in Firestore
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
    // Move to next card
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

  const handleEditClick = (card: Flashcard) => {
    setEditingCardId(card.id || null);
    setEditDraft({ ...card });
  };

  const handleEditChange = (field: keyof Flashcard, value: any) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (card: Flashcard) => {
    if (!card.id || !editDraft) return;
    try {
      await updateDoc(doc(db, 'cards', card.id), {
        term: editDraft.term,
        definition: editDraft.definition,
        examples: (editDraft.examples as string[] | undefined) || [],
        notes: editDraft.notes,
      });
      setEditingCardId(null);
      setEditDraft(null);
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to save changes.');
    }
  };

  const handleEditCancel = () => {
    setEditingCardId(null);
    setEditDraft(null);
  };

  const handleDeleteCard = async (card: Flashcard) => {
    if (!card.id) return;
    if (!window.confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      await deleteDoc(doc(db, 'cards', card.id));
      setSaveSuccess(true);
    } catch (err) {
      setError('Failed to delete flashcard.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: '#E9E0D2' }}>
      {/* Input Area */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Enter a term..."
            className="flex-1 p-3 rounded-lg bg-[#173F35] border border-[#418E7B] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] text-[#E9E0D2] placeholder-[#418E7B]"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? '...' : 'Learn'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-[#EAA09C] text-[#173F35] font-semibold">
          {error}
        </div>
      )}

      {/* Explanation Card */}
      {explanation && (
        <div className="mt-10 p-6 rounded-xl bg-[#1e5246] shadow-lg border border-[#418E7B]">
          <h2 className="text-2xl font-bold mb-4 text-[#EAA09C]">{explanation.term}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#E9E0D2]">Definition</h3>
              <p className="text-[#E9E0D2] opacity-80">{explanation.definition}</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#E9E0D2]">Examples</h3>
              <ul className="list-disc list-inside text-[#E9E0D2] opacity-80">
                {explanation.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
            {explanation.notes && (
              <div>
                <h3 className="font-semibold text-[#E9E0D2]">Notes</h3>
                <p className="text-[#E9E0D2] opacity-70">{explanation.notes}</p>
              </div>
            )}
          </div>
          <button
            className="mt-6 px-4 py-2 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => {
              setFlashcardDraft(explanation as Flashcard);
              setShowFlashcardForm(true);
              setSaveSuccess(false);
            }}
            disabled={!user}
          >
            Save as Flashcard
          </button>
          {!user && (
            <div className="mt-2 text-sm text-[#E9E0D2] opacity-60">Sign in to save flashcards.</div>
          )}
        </div>
      )}

      {/* Flashcard Edit/Save Form */}
      {showFlashcardForm && flashcardDraft && (
        <div className="mt-10 p-6 rounded-xl bg-[#173F35] border border-[#418E7B] shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-[#EAA09C]">Review & Edit Flashcard</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">Term</label>
              <input
                type="text"
                value={flashcardDraft.term}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, term: e.target.value })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">Definition</label>
              <textarea
                value={flashcardDraft.definition}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, definition: e.target.value })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
                rows={2}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">Examples</label>
              <textarea
                value={flashcardDraft.examples.join('\n')}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, examples: e.target.value.split('\n') })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">Notes</label>
              <textarea
                value={flashcardDraft.notes}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, notes: e.target.value })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
                rows={2}
              />
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSaveFlashcard}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Flashcard Save Success Message */}
      {saveSuccess && (
        <div className="mt-4 p-4 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-semibold">
          Flashcard saved!
        </div>
      )}

      {/* Saved Flashcards List */}
      {user && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-4 text-[#EAA09C]">Your Saved Flashcards</h2>
          {flashcardsLoading ? (
            <div className="text-[#418E7B]">Loading flashcards...</div>
          ) : userFlashcards.length === 0 ? (
            <div className="text-[#418E7B]">No flashcards saved yet.</div>
          ) : (
            <ul className="space-y-4">
              {userFlashcards.map((card, idx) => (
                <li key={idx} className="p-4 rounded-xl bg-[#1e5246] border border-[#418E7B] shadow flex flex-col gap-2">
                  {editingCardId === card.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editDraft?.term || ''}
                        onChange={e => handleEditChange('term', e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#173F35] border border-[#418E7B] text-[#E9E0D2]"
                      />
                      <textarea
                        value={editDraft?.definition || ''}
                        onChange={e => handleEditChange('definition', e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#173F35] border border-[#418E7B] text-[#E9E0D2]"
                        rows={2}
                      />
                      <textarea
                        value={(editDraft?.examples || []).join('\n')}
                        onChange={e => handleEditChange('examples', e.target.value.split('\n'))}
                        className="w-full p-2 rounded-lg bg-[#173F35] border border-[#418E7B] text-[#E9E0D2]"
                        rows={3}
                      />
                      <textarea
                        value={editDraft?.notes || ''}
                        onChange={e => handleEditChange('notes', e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#173F35] border border-[#418E7B] text-[#E9E0D2]"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-4 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35]"
                          onClick={() => handleEditSave(card)}
                        >
                          Save
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35]"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-lg text-[#E9E0D2]">{card.term}</div>
                      <div className="text-[#E9E0D2] opacity-80">{card.definition}</div>
                      {card.examples && card.examples.length > 0 && (
                        <ul className="list-disc list-inside text-[#E9E0D2] opacity-80 mb-1">
                          {card.examples.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      )}
                      {card.notes && (
                        <div className="text-[#E9E0D2] opacity-60 text-sm">{card.notes}</div>
                      )}
                      <div className="text-xs text-[#418E7B] mt-2">
                        Saved: {card.createdAt instanceof Date ? card.createdAt.toLocaleString() : String(card.createdAt)}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35]"
                          onClick={() => handleEditClick(card)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35]"
                          onClick={() => handleDeleteCard(card)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Review Mode UI */}
      {user && reviewMode && (
        <div className="mt-12 p-6 bg-white rounded-lg shadow-md">
          {reviewComplete ? (
            <>
              <h2 className="text-2xl font-bold mb-4">Review Complete!</h2>
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={handleExitReview}
              >
                Exit Review
              </button>
            </>
          ) : dueCards.length === 0 ? (
            <div className="text-gray-500">No cards due for review.</div>
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
          )}
        </div>
      )}

      {/* Button to start review mode */}
      {user && !reviewMode && dueCards.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-lg font-semibold"
            onClick={handleStartReview}
          >
            Review {dueCards.length} Card{dueCards.length > 1 ? 's' : ''} Due
          </button>
        </div>
      )}
    </div>
  );
}
