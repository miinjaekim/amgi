'use client';

import { useState, useEffect } from 'react';
import { getTermExplanation, TermExplanation, ExamplePair } from '@/services/gemini';
import { db } from '@/config/firebase';
import { saveFlashcardToFirestore, fetchUserFlashcards, Flashcard } from '@/services/firestore';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import React from 'react';

function isExamplePairArray(arr: unknown[]): arr is ExamplePair[] {
  return arr.length === 0 || (typeof arr[0] === 'object' && arr[0] !== null && 'korean' in arr[0]);
}

export default function Home() {
  const { user, nativeLanguage } = useUser();
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
        })
        .catch(() => {
          setUserFlashcards([]);
        })
        .finally(() => setFlashcardsLoading(false));
    } else {
      setUserFlashcards([]);
    }
  }, [user, saveSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowFlashcardForm(false);
    setSaveSuccess(false);
    try {
      const result = await getTermExplanation(term, nativeLanguage ?? 'English');
      setExplanation(result);
    } catch (err) {
      setError(t(nativeLanguage, 'errorExplanation'));
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
        setError(t(nativeLanguage, 'errorSaveFlashcard'));
      } finally {
        setSaving(false);
      }
    }
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
      setError(t(nativeLanguage, 'errorSaveChanges'));
    }
  };

  const handleEditCancel = () => {
    setEditingCardId(null);
    setEditDraft(null);
  };

  const handleDeleteCard = async (card: Flashcard) => {
    if (!card.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'cards', card.id));
      setSaveSuccess(true);
    } catch (err) {
      setError(t(nativeLanguage, 'errorDeleteFlashcard'));
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
            placeholder={t(nativeLanguage, 'inputPlaceholder')}
            className="flex-1 p-3 rounded-lg bg-[#173F35] border border-[#418E7B] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] text-[#E9E0D2] placeholder-[#418E7B]"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? '...' : t(nativeLanguage, 'learnButton')}
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
        (() => {
          let mappedExamples: ExamplePair[] = [];
          const rawExamples = explanation.examples as unknown[];
          if (Array.isArray(rawExamples) && rawExamples.length > 0 && typeof rawExamples[0] === 'string') {
            mappedExamples = (rawExamples as string[]).filter(Boolean).map(korean => ({ korean, english: '' }));
          } else if (Array.isArray(rawExamples) && isExamplePairArray(rawExamples)) {
            mappedExamples = (rawExamples as ExamplePair[]).filter(Boolean);
          }
          return (
            <div className="mt-10 p-6 rounded-xl bg-[#1e5246] shadow-lg border border-[#418E7B]">
              <h2 className="text-2xl font-bold mb-4 text-[#EAA09C]">{explanation.term}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-[#E9E0D2]">{t(nativeLanguage, 'sectionTranslation')}</h3>
                  <p className="text-[#E9E0D2] opacity-90">{explanation.translation || t(nativeLanguage, 'noTranslation')}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[#E9E0D2]">{t(nativeLanguage, 'sectionDefinition')}</h3>
                  <p className="text-[#E9E0D2] opacity-80">{explanation.definition}</p>
                </div>
                <div>
                  <button
                    className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                    onClick={() => setShowContext((v) => !v)}
                  >
                    {showContext ? '▼' : '▶'} {t(nativeLanguage, 'sectionContext')}
                  </button>
                  {showContext && (
                    <div className="mt-2 text-[#E9E0D2] opacity-80">
                      {explanation.notes || t(nativeLanguage, 'noContext')}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                    onClick={() => setShowHanja((v) => !v)}
                  >
                    {showHanja ? '▼' : '▶'} {t(nativeLanguage, 'sectionHanja')}
                  </button>
                  {showHanja && (
                    <div className="mt-2 text-[#E9E0D2] opacity-80">
                      {explanation.hanja ? explanation.hanja : t(nativeLanguage, 'noHanja')}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                    onClick={() => setShowExamples((v) => !v)}
                  >
                    {showExamples ? '▼' : '▶'} {t(nativeLanguage, 'sectionExamples')}
                  </button>
                  {showExamples && mappedExamples.length > 0 && (
                    <ul className="list-disc list-inside text-[#E9E0D2] opacity-80 mt-2 space-y-2">
                      {mappedExamples.map((ex, index) => (
                        <li key={index}>
                          {ex.korean && <div>{ex.korean}</div>}
                          {ex.english && <div className="text-[#EAA09C] text-sm">{ex.english}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <button
                    className="flex items-center gap-2 text-[#EAA09C] font-semibold focus:outline-none"
                    onClick={() => setShowFlashcard((v) => !v)}
                  >
                    {showFlashcard ? '▼' : '▶'} {t(nativeLanguage, 'sectionSuggestedFlashcard')}
                  </button>
                  {showFlashcard && (
                    <div className="mt-2 text-[#E9E0D2] opacity-80">
                      <div className="mb-1 font-semibold">{t(nativeLanguage, 'flashcardFront')}</div>
                      <div className="mb-2 bg-[#173F35] rounded p-2">{explanation.term}</div>
                      <div className="mb-1 font-semibold">{t(nativeLanguage, 'flashcardBack')}</div>
                      <div className="bg-[#173F35] rounded p-2">{explanation.translation}</div>
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
                {t(nativeLanguage, 'saveAsFlashcard')}
              </button>
              {!user && (
                <div className="mt-2 text-sm text-[#E9E0D2] opacity-60">{t(nativeLanguage, 'signInToSave')}</div>
              )}
            </div>
          );
        })()
      )}

      {/* Flashcard Edit/Save Form */}
      {showFlashcardForm && flashcardDraft && (
        <div className="mt-10 p-6 rounded-xl bg-[#173F35] border border-[#418E7B] shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-[#EAA09C]">{t(nativeLanguage, 'reviewEditFlashcard')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">{t(nativeLanguage, 'labelTerm')}</label>
              <input
                type="text"
                value={flashcardDraft.term}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, term: e.target.value })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[#E9E0D2]">{t(nativeLanguage, 'labelTranslation')}</label>
              <input
                type="text"
                value={flashcardDraft.translation || ''}
                onChange={e => setFlashcardDraft({ ...flashcardDraft, translation: e.target.value })}
                className="w-full p-2 rounded-lg bg-[#1e5246] border border-[#418E7B] text-[#E9E0D2]"
              />
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSaveFlashcard}
              disabled={saving}
            >
              {saving ? t(nativeLanguage, 'saving') : t(nativeLanguage, 'save')}
            </button>
          </div>
        </div>
      )}

      {/* Flashcard Save Success Message */}
      {saveSuccess && (
        <div className="mt-4 p-4 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-semibold">
          {t(nativeLanguage, 'flashcardSaved')}
        </div>
      )}

      {/* Saved Flashcards List */}
      {user && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-4 text-[#EAA09C]">{t(nativeLanguage, 'savedFlashcardsHeading')}</h2>
          {flashcardsLoading ? (
            <div className="text-[#418E7B]">{t(nativeLanguage, 'loadingFlashcards')}</div>
          ) : userFlashcards.length === 0 ? (
            <div className="text-[#418E7B]">{t(nativeLanguage, 'noFlashcardsSaved')}</div>
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
                      <input
                        type="text"
                        value={editDraft?.translation || ''}
                        onChange={e => handleEditChange('translation', e.target.value)}
                        className="w-full p-2 rounded-lg bg-[#173F35] border border-[#418E7B] text-[#E9E0D2]"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-4 py-2 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35]"
                          onClick={() => handleEditSave(card)}
                        >
                          {t(nativeLanguage, 'save')}
                        </button>
                        <button
                          className="px-4 py-2 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35]"
                          onClick={handleEditCancel}
                        >
                          {t(nativeLanguage, 'cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-lg text-[#E9E0D2]">{card.term}</div>
                      <div className="text-[#EAA09C] text-base">{card.translation}</div>
                      <div className="text-xs text-[#418E7B] mt-2">
                        {t(nativeLanguage, 'savedAt')} {card.createdAt instanceof Date ? card.createdAt.toLocaleString() : String(card.createdAt)}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 rounded-lg bg-[#EAA09C] text-[#173F35] font-bold hover:bg-[#E9E0D2] hover:text-[#173F35]"
                          onClick={() => handleEditClick(card)}
                        >
                          {t(nativeLanguage, 'edit')}
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35]"
                          onClick={() => handleDeleteCard(card)}
                        >
                          {t(nativeLanguage, 'delete')}
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
