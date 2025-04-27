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
  const [showContext, setShowContext] = useState(false);
  const [showHanja, setShowHanja] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showFlashcard, setShowFlashcard] = useState(false);

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
            {/* Always show definition */}
            <div>
              <h3 className="font-semibold text-[#E9E0D2]">Definition</h3>
              <p className="text-[#E9E0D2] opacity-80">{explanation.definition}</p>
            </div>
            {/* Expandable: Cultural/Social Context */}
            <div>
              <button
                className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                onClick={() => setShowContext((v) => !v)}
              >
                {showContext ? '▼' : '▶'} Cultural/Social Context
              </button>
              {showContext && (
                <div className="mt-2 text-[#E9E0D2] opacity-80">
                  {/* Placeholder: Replace with real context from explanation.notes or future API */}
                  {explanation.notes || 'No additional context available.'}
                </div>
              )}
            </div>
            {/* Expandable: Hanja Breakdown */}
            <div>
              <button
                className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                onClick={() => setShowHanja((v) => !v)}
              >
                {showHanja ? '▼' : '▶'} Hanja Breakdown
              </button>
              {showHanja && (
                <div className="mt-2 text-[#E9E0D2] opacity-80">
                  {/* Placeholder: Replace with real hanja breakdown from API */}
                  {'Hanja breakdown coming soon.'}
                </div>
              )}
            </div>
            {/* Expandable: Example Usage */}
            <div>
              <button
                className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                onClick={() => setShowExamples((v) => !v)}
              >
                {showExamples ? '▼' : '▶'} Example Usage
              </button>
              {showExamples && (
                <ul className="list-disc list-inside text-[#E9E0D2] opacity-80 mt-2">
                  {explanation.examples.map((example, index) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              )}
            </div>
            {/* Expandable: Suggested Flashcard */}
            <div>
              <button
                className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                onClick={() => setShowFlashcard((v) => !v)}
              >
                {showFlashcard ? '▼' : '▶'} Suggested Flashcard
              </button>
              {showFlashcard && (
                <div className="mt-2 text-[#E9E0D2] opacity-80">
                  <div className="mb-1 font-semibold">Front:</div>
                  <div className="mb-2 bg-[#173F35] rounded p-2">{explanation.term}</div>
                  <div className="mb-1 font-semibold">Back:</div>
                  <div className="bg-[#173F35] rounded p-2">{explanation.definition}</div>
                </div>
              )}
            </div>
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
    </div>
  );
}
