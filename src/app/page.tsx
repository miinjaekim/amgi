'use client';

import { useState } from 'react';
import {
  getTermExplanation,
  getTermDepth,
  getTermExamples,
  TermCore,
  TermDepth,
  TermAmbiguous,
  ExamplePair,
} from '@/services/gemini';
import Markdown from '@/components/Markdown';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import React from 'react';

export default function Home() {
  const { user, nativeLanguage, handleSignIn } = useUser();
  const [term, setTerm] = useState('');
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
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
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextInput, setContextInput] = useState('');

  const resolveExplanation = async (termValue: string, context?: string) => {
    setLoading(true);
    setError(null);
    setCore(null);
    setAmbiguity(null);
    setDepth(null);
    setExamples(null);
    setShowFlashcardForm(false);
    setSaveSuccess(false);
    setShowContextInput(false);
    setContextInput('');
    try {
      const result = await getTermExplanation(termValue, nativeLanguage ?? 'English', context);
      if ('ambiguous' in result && result.ambiguous) {
        setAmbiguity(result);
      } else {
        setCore(result as TermCore);
      }
    } catch (err) {
      setError(t(nativeLanguage, 'errorExplanation'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    await resolveExplanation(term.trim());
  };

  const handleDisambiguate = async (meaningLabel: string) => {
    if (!ambiguity) return;
    await resolveExplanation(ambiguity.term, meaningLabel);
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!core || !contextInput.trim()) return;
    await resolveExplanation(core.term, contextInput.trim());
  };

  const handleLoadDepth = async () => {
    if (!core) return;
    setLoadingDepth(true);
    try {
      const result = await getTermDepth(core.term, core.termLanguage, nativeLanguage ?? 'English');
      setDepth(result);
    } catch (err) {
      setError(t(nativeLanguage, 'errorLoadDepth'));
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
      setError(t(nativeLanguage, 'errorLoadExamples'));
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
        setCore(null);
        setDepth(null);
        setExamples(null);
        setAmbiguity(null);
        setTerm('');
        setShowFlashcardForm(false);
        setFlashcardDraft(null);
        setShowContextInput(false);
        setContextInput('');
        setSaveSuccess(true);
      } catch (err) {
        setError(t(nativeLanguage, 'errorSaveFlashcard'));
      } finally {
        setSaving(false);
      }
    }
  };

  const translation = core
    ? (core.termLanguage === 'Korean' ? core.english : core.korean) || core.translation
    : null;

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: 'var(--color-text)' }}>
      {/* Input Area */}
      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t(nativeLanguage, 'inputPlaceholder')}
            className="flex-1 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-bold hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? '...' : t(nativeLanguage, 'learnButton')}
          </button>
        </div>
      </form>

      {/* Empty state — shown before any search */}
      {!loading && !core && !ambiguity && !error && (
        <div className="mt-12 text-center">
          <p className="text-[var(--color-text)] text-lg font-semibold mb-2">{t(nativeLanguage, 'tagline')}</p>
          <p className="text-[var(--color-text)] opacity-60 text-sm mb-8 max-w-md mx-auto">{t(nativeLanguage, 'taglineSubtitle')}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-[var(--color-muted)] text-sm mr-1">{t(nativeLanguage, 'exampleTermsLabel')}</span>
            {['배', 'longing', '눈치', 'awkward', '사랑'].map((example) => (
              <button
                key={example}
                onClick={() => { setTerm(example); resolveExplanation(example); }}
                className="px-3 py-1 rounded-full border border-[var(--color-muted)] text-[var(--color-text)] text-sm hover:bg-[var(--color-muted)]/30 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-semibold">
          {error}
        </div>
      )}

      {/* Disambiguation Picker */}
      {ambiguity && (
        <div className="mt-10 p-6 rounded-xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-muted)]">
          <h2 className="text-2xl font-bold text-[var(--color-highlight)] mb-2">{ambiguity.term}</h2>
          <p className="text-[var(--color-text)] opacity-70 text-sm mb-5">{t(nativeLanguage, 'disambiguationPrompt')}</p>
          <ul className="space-y-3">
            {ambiguity.meanings.map((meaning, i) => (
              <li key={i}>
                <button
                  className="w-full text-left px-4 py-3 rounded-lg border border-[var(--color-muted)] hover:bg-[var(--color-muted)]/30 transition-colors"
                  onClick={() => handleDisambiguate(meaning.label)}
                  disabled={loading}
                >
                  <div className="font-semibold text-[var(--color-highlight)]">{meaning.label}</div>
                  <div className="text-sm text-[var(--color-text)] opacity-70 mt-0.5">{meaning.hint}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explanation Card */}
      {core && (
        <div className="mt-10 p-6 rounded-xl bg-[var(--color-surface)] shadow-lg border border-[var(--color-muted)]">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-2xl font-bold text-[var(--color-highlight)]">{core.term}</h2>
            {core.formality && core.formality !== 'N/A' && (
              <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                {core.formality}
              </span>
            )}
          </div>

          {/* Translation — always shown */}
          <div className="mb-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionTranslation')}</h3>
            <p className="text-[var(--color-text)] opacity-90 text-lg">
              {translation || t(nativeLanguage, 'noTranslation')}
            </p>
          </div>

          {/* Depth section — user-triggered */}
          {!depth ? (
            <button
              className="mb-4 px-4 py-2 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadDepth}
              disabled={loadingDepth}
            >
              {loadingDepth ? t(nativeLanguage, 'loadingDefinition') : t(nativeLanguage, 'loadDefinition')}
            </button>
          ) : (
            <div className="mb-6 space-y-4">
              {depth.definition && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionDefinition')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.definition}</Markdown>
                </div>
              )}
              {depth.hanja && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionHanja')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.hanja}</Markdown>
                </div>
              )}
              {depth.notes && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionContext')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.notes}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* Examples section — user-triggered */}
          {!examples ? (
            <button
              className="mb-6 px-4 py-2 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadExamples}
              disabled={loadingExamples}
            >
              {loadingExamples ? t(nativeLanguage, 'loadingExamples') : t(nativeLanguage, 'loadExamples')}
            </button>
          ) : (
            <div className="mb-6">
              <h3 className="font-semibold text-[var(--color-text)] mb-2">{t(nativeLanguage, 'sectionExamples')}</h3>
              <ul className="space-y-3">
                {examples.map((ex, i) => (
                  <li key={i} className="text-[var(--color-text)] opacity-80">
                    {ex.korean && <div>{ex.korean}</div>}
                    {ex.english && <div className="text-[var(--color-highlight)] text-sm mt-0.5">{ex.english}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save button */}
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-bold hover:bg-[var(--color-highlight)] hover:text-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => {
              const koreanSide = core.termLanguage === 'Korean' ? core.term : (core.korean || '');
              const englishSide = core.termLanguage === 'English' ? core.term : (core.english || '');
              setFlashcardDraft({
                ...core,
                ...(depth || {}),
                examples: examples || [],
                korean: koreanSide,
                english: englishSide,
              });
              setShowFlashcardForm(true);
              setSaveSuccess(false);
            }}
            disabled={!user}
          >
            {t(nativeLanguage, 'saveAsFlashcard')}
          </button>
          {!user && (
            <button
              onClick={handleSignIn}
              className="mt-2 block text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors underline underline-offset-2"
            >
              {t(nativeLanguage, 'signInToSave')}
            </button>
          )}

          {/* Not what you meant? */}
          <div className="mt-5 pt-4 border-t border-[var(--color-muted)]/40">
            {!showContextInput ? (
              <button
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors underline underline-offset-2"
                onClick={() => setShowContextInput(true)}
              >
                {t(nativeLanguage, 'notWhatYouMeant')}
              </button>
            ) : (
              <form onSubmit={handleRegenerate} className="flex gap-2">
                <input
                  type="text"
                  value={contextInput}
                  onChange={e => setContextInput(e.target.value)}
                  placeholder={t(nativeLanguage, 'addContextPlaceholder')}
                  className="flex-1 p-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-bold hover:bg-[var(--color-highlight)] hover:text-[var(--color-bg)] disabled:opacity-50 transition-colors"
                  disabled={loading || !contextInput.trim()}
                >
                  {loading ? '...' : t(nativeLanguage, 'regenerate')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Flashcard Edit/Save Form */}
      {showFlashcardForm && flashcardDraft && (
        <div className="mt-10 p-6 rounded-xl bg-[var(--color-bg)] border border-[var(--color-muted)] shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-[var(--color-highlight)]">{t(nativeLanguage, 'reviewEditFlashcard')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1 text-[var(--color-text)]">{t(nativeLanguage, 'labelKorean')}</label>
              <input
                type="text"
                value={flashcardDraft.korean || ''}
                onChange={e => setFlashcardDraft(prev => ({ ...prev, korean: e.target.value }))}
                className="w-full p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-muted)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-[var(--color-text)]">{t(nativeLanguage, 'labelEnglish')}</label>
              <input
                type="text"
                value={flashcardDraft.english || ''}
                onChange={e => setFlashcardDraft(prev => ({ ...prev, english: e.target.value }))}
                className="w-full p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-muted)] text-[var(--color-text)]"
              />
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] font-bold hover:bg-[var(--color-text)] hover:text-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="mt-4 p-4 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-semibold">
          {t(nativeLanguage, 'flashcardSaved')}
        </div>
      )}
    </div>
  );
}
