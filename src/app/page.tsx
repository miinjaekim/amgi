'use client';

import { useState, useEffect } from 'react';
import {
  getTermExplanation,
  getTermDepth,
  getTermExamples,
  TermCore,
  TermDepth,
  ExamplePair,
} from '@/services/gemini';
import Markdown from '@/components/Markdown';
import { db } from '@/config/firebase';
import { saveFlashcardToFirestore, fetchUserFlashcards, Flashcard } from '@/services/firestore';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import React from 'react';

export default function Home() {
  const { user, nativeLanguage } = useUser();
  const [term, setTerm] = useState('');
  const [core, setCore] = useState<TermCore | null>(null);
  const [depth, setDepth] = useState<TermDepth | null>(null);
  const [examples, setExamples] = useState<ExamplePair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepth, setLoadingDepth] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFlashcardForm, setShowFlashcardForm] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<Partial<Flashcard> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userFlashcards, setUserFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Flashcard> | null>(null);
  const [cardOrder, setCardOrder] = useState<'korean-first' | 'english-first'>('korean-first');

  useEffect(() => {
    if (user) {
      setFlashcardsLoading(true);
      fetchUserFlashcards(user.uid)
        .then(cards => setUserFlashcards(cards))
        .catch(() => setUserFlashcards([]))
        .finally(() => setFlashcardsLoading(false));
    } else {
      setUserFlashcards([]);
    }
  }, [user, saveSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setLoading(true);
    setError(null);
    setCore(null);
    setDepth(null);
    setExamples(null);
    setShowFlashcardForm(false);
    setSaveSuccess(false);
    try {
      const result = await getTermExplanation(term.trim(), nativeLanguage ?? 'English');
      setCore(result);
    } catch (err) {
      setError(t(nativeLanguage, 'errorExplanation'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDepth = async () => {
    if (!core) return;
    setLoadingDepth(true);
    try {
      const result = await getTermDepth(core.term, core.termLanguage, nativeLanguage ?? 'English');
      setDepth(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDepth(false);
    }
  };

  const handleLoadExamples = async () => {
    if (!core) return;
    setLoadingExamples(true);
    try {
      const result = await getTermExamples(core.term, core.termLanguage, nativeLanguage ?? 'English');
      setExamples(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExamples(false);
    }
  };

  const handleSaveFlashcard = async () => {
    if (flashcardDraft && user) {
      setSaving(true);
      setError(null);
      try {
        await saveFlashcardToFirestore({ ...(flashcardDraft as Omit<Flashcard, 'createdAt' | 'id'>), uid: user.uid });
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
        translation: editDraft.translation,
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

  const translation = core
    ? (core.termLanguage === 'Korean' ? core.english : core.korean) || core.translation
    : null;

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
      {core && (
        <div className="mt-10 p-6 rounded-xl bg-[#1e5246] shadow-lg border border-[#418E7B]">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-2xl font-bold text-[#EAA09C]">{core.term}</h2>
            {core.formality && core.formality !== 'N/A' && (
              <span className="px-2 py-0.5 text-xs rounded-full border border-[#418E7B] text-[#418E7B]">
                {core.formality}
              </span>
            )}
          </div>

          {/* Translation — always shown */}
          <div className="mb-6">
            <h3 className="font-semibold text-[#E9E0D2] mb-1">{t(nativeLanguage, 'sectionTranslation')}</h3>
            <p className="text-[#E9E0D2] opacity-90 text-lg">
              {translation || t(nativeLanguage, 'noTranslation')}
            </p>
          </div>

          {/* Depth section — user-triggered */}
          {!depth ? (
            <button
              className="mb-4 px-4 py-2 rounded-lg border border-[#418E7B] text-[#E9E0D2] hover:bg-[#418E7B]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadDepth}
              disabled={loadingDepth}
            >
              {loadingDepth ? t(nativeLanguage, 'loadingDefinition') : t(nativeLanguage, 'loadDefinition')}
            </button>
          ) : (
            <div className="mb-6 space-y-4">
              {depth.definition && (
                <div>
                  <h3 className="font-semibold text-[#E9E0D2] mb-1">{t(nativeLanguage, 'sectionDefinition')}</h3>
                  <Markdown className="text-[#E9E0D2] opacity-80">{depth.definition}</Markdown>
                </div>
              )}
              {depth.hanja && (
                <div>
                  <h3 className="font-semibold text-[#E9E0D2] mb-1">{t(nativeLanguage, 'sectionHanja')}</h3>
                  <Markdown className="text-[#E9E0D2] opacity-80">{depth.hanja}</Markdown>
                </div>
              )}
              {depth.notes && (
                <div>
                  <h3 className="font-semibold text-[#E9E0D2] mb-1">{t(nativeLanguage, 'sectionContext')}</h3>
                  <Markdown className="text-[#E9E0D2] opacity-80">{depth.notes}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* Examples section — user-triggered */}
          {!examples ? (
            <button
              className="mb-6 px-4 py-2 rounded-lg border border-[#418E7B] text-[#E9E0D2] hover:bg-[#418E7B]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadExamples}
              disabled={loadingExamples}
            >
              {loadingExamples ? t(nativeLanguage, 'loadingExamples') : t(nativeLanguage, 'loadExamples')}
            </button>
          ) : (
            <div className="mb-6">
              <h3 className="font-semibold text-[#E9E0D2] mb-2">{t(nativeLanguage, 'sectionExamples')}</h3>
              <ul className="space-y-3">
                {examples.map((ex, i) => (
                  <li key={i} className="text-[#E9E0D2] opacity-80">
                    {ex.korean && <div>{ex.korean}</div>}
                    {ex.english && <div className="text-[#EAA09C] text-sm mt-0.5">{ex.english}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save button */}
          <button
            className="px-4 py-2 rounded-lg bg-[#418E7B] text-[#E9E0D2] font-bold hover:bg-[#EAA09C] hover:text-[#173F35] focus:outline-none focus:ring-2 focus:ring-[#EAA09C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => {
              setFlashcardDraft({
                ...core,
                ...(depth || {}),
                examples: examples || [],
              });
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
                value={flashcardDraft.term || ''}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#EAA09C]">{t(nativeLanguage, 'savedFlashcardsHeading')}</h2>
            <button
              onClick={() => setCardOrder(o => o === 'korean-first' ? 'english-first' : 'korean-first')}
              className="text-sm font-mono px-3 py-1 rounded-lg border border-[#418E7B] text-[#E9E0D2] hover:bg-[#418E7B]/30 transition-colors"
            >
              {cardOrder === 'korean-first' ? t(nativeLanguage, 'koreanOnTop') : t(nativeLanguage, 'englishOnTop')}
            </button>
          </div>
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
                      <div className="font-semibold text-lg text-[#E9E0D2]">
                        {cardOrder === 'korean-first' ? (card.korean || card.term) : (card.english || card.translation)}
                      </div>
                      <div className="text-[#EAA09C] text-base">
                        {cardOrder === 'korean-first' ? (card.english || card.translation) : (card.korean || card.term)}
                      </div>
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
