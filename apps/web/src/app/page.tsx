'use client';

import { useEffect, useState } from 'react';
import {
  getTermExplanation,
  getDepthTarget,
  TermCore,
  TermDepth,
  TermAmbiguous,
  ExamplePair,
} from '@/services/gemini';
import Markdown from '@/components/Markdown';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { getExampleSides, getStudyLanguageConfig, getVocabPacks, parseStreamedExamples } from '@amgi/core';
import type { WordOfTheDay } from '@amgi/core';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';
import SaveFlashcardModal from '@/components/SaveFlashcardModal';
import PacksModal from '@/components/PacksModal';
import PronounceButton from '@/components/PronounceButton';
import Spinner from '@/components/Spinner';
import React from 'react';

const EXAMPLE_TERMS: Record<string, string[]> = {
  Korean: ['배', 'longing', '눈치', 'awkward', '사랑'],
  Swedish: ['lagom', 'fika', 'mysig', 'serendipity', 'lagstiftning'],
  English: ['serendipity', '아쉽다', 'procrastinate', '답답하다', 'nuance'],
  French: ['dépaysement', 'flâner', 'retrouvailles', 'longing', 'terroir'],
  Japanese: ['木漏れ日', '積ん読', 'nostalgia', 'awkward', '侘寂'],
};

function animateText(
  accumulatedRef: { current: string },
  streamDoneRef: { current: boolean },
  onUpdate: (slice: string) => void,
  onDone: () => void,
) {
  let revealed = 0;
  const tick = () => {
    const total = accumulatedRef.current.length;
    if (streamDoneRef.current) {
      if (revealed < total) onUpdate(accumulatedRef.current);
      onDone();
      return;
    }
    if (revealed < total) {
      revealed = Math.min(revealed + 6, total);
      onUpdate(accumulatedRef.current.slice(0, revealed));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function parseStreamedDepth(text: string): TermDepth {
  const section = (marker: string, nextMarker?: string) => {
    const start = text.indexOf(`${marker}\n`);
    if (start === -1) return undefined;
    const contentStart = start + marker.length + 1;
    const end = nextMarker ? text.indexOf(`${nextMarker}\n`, contentStart) : text.length;
    const content = text.slice(contentStart, end === -1 ? text.length : end).trim();
    return content && content.toLowerCase() !== 'none' ? content : undefined;
  };
  const result: TermDepth = {};
  const hasHanja = text.includes('HANJA:\n');
  const def = section('DEFINITION:', hasHanja ? 'HANJA:' : 'NOTES:');
  const hanja = hasHanja ? section('HANJA:', 'NOTES:') : undefined;
  const notes = section('NOTES:');
  if (def !== undefined) result.definition = def;
  if (hanja !== undefined) result.hanja = hanja;
  if (notes !== undefined) result.notes = notes;
  return result;
}


export default function Home() {
  const { user, nativeLanguage, studyLanguage, handleSignIn } = useUser();
  const [term, setTerm] = useState('');
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
  const [depth, setDepth] = useState<TermDepth | null>(null);
  const [examples, setExamples] = useState<ExamplePair[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDepth, setLoadingDepth] = useState(false);
  const [streamingDepth, setStreamingDepth] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [streamingExamples, setStreamingExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFlashcardForm, setShowFlashcardForm] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<Partial<Flashcard> | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay | null>(null);
  const [showPacks, setShowPacks] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  const handlePackWord = (word: string, context?: string) => {
    setShowPacks(false);
    setTerm(word);
    resolveExplanation(word, context);
  };

  useEffect(() => {
    if (nativeLanguage === undefined) return; // preferences still loading
    let cancelled = false;
    setWordOfTheDay(null);
    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local timezone
    const params = new URLSearchParams({ date, studyLanguage, nativeLanguage: nativeLanguage ?? 'English' });
    fetch(`/api/word-of-the-day?${params}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data?.term) setWordOfTheDay(data); })
      .catch(() => {}); // non-essential — hide on failure
    return () => { cancelled = true; };
  }, [studyLanguage, nativeLanguage]);

  const resolveExplanation = async (termValue: string, context?: string) => {
    setLoading(true);
    setError(null);
    setCore(null);
    setAmbiguity(null);
    setDepth(null);
    setExamples(null);
    setStreamingExamples(false);
    setShowFlashcardForm(false);
    setSaveSuccess(false);
    setShowContextInput(false);
    setContextInput('');
    try {
      const result = await getTermExplanation(termValue, nativeLanguage ?? 'English', context, '', studyLanguage);
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
    setStreamingDepth(false);
    setDepth(null);

    const accRef = { current: '' };
    const doneRef = { current: false };
    let canceled = false;

    const depthTarget = getDepthTarget(core, studyLanguage);

    try {
      const res = await fetch('/api/explain/depth-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...depthTarget, nativeLanguage, studyLanguage }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      animateText(
        accRef,
        doneRef,
        (slice) => { if (!canceled) setDepth(parseStreamedDepth(slice)); },
        () => { if (!canceled) setStreamingDepth(false); },
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accRef.current += decoder.decode(value, { stream: true });
        if (firstChunk) {
          firstChunk = false;
          setLoadingDepth(false);
          setStreamingDepth(true);
        }
      }
      doneRef.current = true;
    } catch (err) {
      canceled = true;
      setError(t(nativeLanguage, 'errorLoadDepth'));
      console.error(err);
      setLoadingDepth(false);
      setStreamingDepth(false);
    }
  };

  const handleLoadExamples = async () => {
    if (!core) return;
    setLoadingExamples(true);
    setStreamingExamples(false);
    setExamples(null);

    const accRef = { current: '' };
    const doneRef = { current: false };
    let canceled = false;

    const examplesTarget = getDepthTarget(core, studyLanguage);

    try {
      const res = await fetch('/api/explain/examples-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...examplesTarget, nativeLanguage, studyLanguage }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      animateText(
        accRef,
        doneRef,
        (slice) => {
          if (canceled) return;
          const parsed = parseStreamedExamples(slice, studyLanguage);
          if (parsed.length > 0) setExamples(parsed);
        },
        () => { if (!canceled) setStreamingExamples(false); },
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accRef.current += decoder.decode(value, { stream: true });
        if (firstChunk) {
          firstChunk = false;
          setLoadingExamples(false);
          setStreamingExamples(true);
        }
      }
      doneRef.current = true;
    } catch (err) {
      canceled = true;
      setError(t(nativeLanguage, 'errorLoadExamples'));
      console.error(err);
      setLoadingExamples(false);
      setStreamingExamples(false);
    }
  };

  const handleSaveFlashcard = async () => {
    if (flashcardDraft && user) {
      setSaving(true);
      setError(null);
      try {
        await saveFlashcardToFirestore(
          { ...(flashcardDraft as Omit<Flashcard, 'createdAt' | 'id'>), uid: user.uid },
          studyLanguage
        );
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

  const langConfig = getStudyLanguageConfig(studyLanguage);

  const translation = core
    ? (core.termLanguage === studyLanguage ? core[langConfig.backField] : core[langConfig.studyField]) || core.translation
    : null;

  const exampleTerms = EXAMPLE_TERMS[studyLanguage] ?? EXAMPLE_TERMS.Korean;

  return (
    <div className="max-w-2xl mx-auto font-mono text-base" style={{ color: 'var(--color-text)' }}>
      {/* Tagline above the search bar (empty state) — pushes the input toward
          the vertical center; stays during loading to avoid a layout jump */}
      {!core && !ambiguity && !error && (
        <div className="mt-16 sm:mt-28 text-center">
          <p className="text-[var(--color-text)] text-lg font-semibold mb-2">{t(nativeLanguage, 'tagline')}</p>
          <p className="text-[var(--color-text)] opacity-60 text-sm max-w-md mx-auto">{t(nativeLanguage, 'taglineSubtitle')}</p>
        </div>
      )}

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
            {loading ? <Spinner className="w-5 h-5 mx-auto" /> : t(nativeLanguage, 'learnButton')}
          </button>
        </div>
      </form>

      {/* Empty state — word of the day + example terms below the search bar */}
      {!loading && !core && !ambiguity && !error && (
        <div className="mt-10 text-center">
          {wordOfTheDay && (
            <button
              // The card already shows one specific sense, so pin it as context —
              // otherwise /api/explain may come back asking which meaning was meant.
              onClick={() => {
                setTerm(wordOfTheDay.term);
                const senseHint = wordOfTheDay.briefDefinition
                  || (studyLanguage === 'English' ? wordOfTheDay.korean : wordOfTheDay.english);
                resolveExplanation(wordOfTheDay.term, senseHint || undefined);
              }}
              className="block w-full max-w-md mx-auto mb-8 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] text-left hover:border-[var(--color-highlight)] transition-colors"
            >
              <div className="text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">
                {t(nativeLanguage, 'wordOfTheDay')}
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-xl font-bold text-[var(--color-highlight)]">{wordOfTheDay.term}</span>
                <span className="text-[var(--color-text)] opacity-80">
                  {studyLanguage === 'English' ? wordOfTheDay.korean : wordOfTheDay.english}
                </span>
              </div>
              {wordOfTheDay.briefDefinition && (
                <p className="mt-1 text-sm text-[var(--color-text)] opacity-60">{wordOfTheDay.briefDefinition}</p>
              )}
            </button>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-[var(--color-muted)] text-sm mr-1">{t(nativeLanguage, 'exampleTermsLabel')}</span>
            {exampleTerms.map((example) => (
              <button
                key={example}
                onClick={() => { setTerm(example); resolveExplanation(example); }}
                className="px-3 py-1 rounded-full border border-[var(--color-muted)] text-[var(--color-text)] text-sm hover:bg-[var(--color-muted)]/30 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-5 flex-wrap">
            {getVocabPacks(studyLanguage).length > 0 && (
              <button
                onClick={() => setShowPacks(true)}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors underline underline-offset-2"
              >
                {t(nativeLanguage, 'packsLink')}
              </button>
            )}
            <button
              onClick={() => setShowGenerate(true)}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors underline underline-offset-2"
            >
              {t(nativeLanguage, 'generateLink')}
            </button>
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
            {core.termLanguage === studyLanguage && (
              <PronounceButton text={core.term} studyLanguage={studyLanguage} />
            )}
            {core.formality && core.formality !== 'N/A' && (
              <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                {core.formality}
              </span>
            )}
            {core.gender && (
              <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                {core.gender}
              </span>
            )}
            {core.furigana && (
              <span className="px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
                {core.furigana}
              </span>
            )}
          </div>

          {/* Translation + brief definition */}
          <div className="mb-6">
            <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionTranslation')}</h3>
            <div className="flex items-center gap-2">
              <p className="text-[var(--color-text)] opacity-90 text-lg">
                {translation || t(nativeLanguage, 'noTranslation')}
              </p>
              {core.termLanguage !== studyLanguage && translation && (
                <PronounceButton text={translation} studyLanguage={studyLanguage} />
              )}
            </div>
            {core.briefDefinition && (
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
                {core.briefDefinition}
              </p>
            )}
          </div>

          {/* Depth section */}
          {!depth && !loadingDepth ? (
            <button
              className="mb-4 px-4 py-2 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadDepth}
              disabled={loadingDepth}
            >
              {t(nativeLanguage, 'loadDefinition')}
            </button>
          ) : loadingDepth ? (
            <div className="mb-4"><Spinner /></div>
          ) : depth ? (
            <div className="mb-6 space-y-4">
              {depth.definition && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionDefinition')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.definition}</Markdown>
                  {streamingDepth && !depth.hanja && !depth.notes && <span className="animate-pulse text-[var(--color-muted)]">▎</span>}
                </div>
              )}
              {depth.hanja && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionHanja')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.hanja}</Markdown>
                  {streamingDepth && !depth.notes && <span className="animate-pulse text-[var(--color-muted)]">▎</span>}
                </div>
              )}
              {depth.notes && (
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(nativeLanguage, 'sectionContext')}</h3>
                  <Markdown className="text-[var(--color-text)] opacity-80">{depth.notes}</Markdown>
                  {streamingDepth && <span className="animate-pulse text-[var(--color-muted)]">▎</span>}
                </div>
              )}
            </div>
          ) : null}

          {/* Examples section */}
          {!examples && !loadingExamples && !streamingExamples ? (
            <button
              className="mb-6 px-4 py-2 rounded-lg border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 text-sm"
              onClick={handleLoadExamples}
            >
              {t(nativeLanguage, 'loadExamples')}
            </button>
          ) : loadingExamples ? (
            <div className="mb-6"><Spinner /></div>
          ) : (
            <div className="mb-6">
              <h3 className="font-semibold text-[var(--color-text)] mb-2">{t(nativeLanguage, 'sectionExamples')}</h3>
              <ul className="space-y-3">
                {(examples ?? []).map((ex, i) => {
                  const sides = getExampleSides(ex, studyLanguage);
                  return (
                    <li key={i} className="text-[var(--color-text)] opacity-80">
                      {sides.study && (
                        <div>
                          {sides.study}
                          <PronounceButton text={sides.study} studyLanguage={studyLanguage} size="sm" className="ml-1 align-middle" />
                        </div>
                      )}
                      {sides.back && <div className="text-[var(--color-highlight)] text-sm mt-0.5">{sides.back}</div>}
                    </li>
                  );
                })}
                {streamingExamples && (
                  <li><span className="animate-pulse text-[var(--color-muted)]">▎</span></li>
                )}
              </ul>
            </div>
          )}

          {/* Save button */}
          <button
            className="px-4 py-2 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-bold hover:bg-[var(--color-highlight)] hover:text-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={() => {
              const studySide = core.termLanguage === studyLanguage ? core.term : (core[langConfig.studyField] || '');
              const backSide = core.termLanguage === langConfig.backLanguage ? core.term : (core[langConfig.backField] || '');

              setFlashcardDraft({
                ...core,
                ...(depth || {}),
                examples: examples || [],
                studyLanguage,
                [langConfig.studyField]: studySide,
                [langConfig.backField]: backSide,
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
                  {loading ? <Spinner /> : t(nativeLanguage, 'regenerate')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Flashcard Save Success Message */}
      {saveSuccess && (
        <div className="mt-4 p-4 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-semibold">
          {t(nativeLanguage, 'flashcardSaved')}
        </div>
      )}

      {showPacks && <PacksModal onClose={() => setShowPacks(false)} onSelectWord={handlePackWord} />}

      {/* Goal-based word generation — placeholder until the feature lands */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowGenerate(false)}>
          <div
            className="w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-[var(--color-highlight)]">{t(nativeLanguage, 'generateLink')}</h2>
              <button
                onClick={() => setShowGenerate(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <span className="inline-block mb-3 px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]">
              {t(nativeLanguage, 'comingSoon')}
            </span>
            <p className="text-sm text-[var(--color-text)] opacity-80">{t(nativeLanguage, 'generateComingSoon')}</p>
          </div>
        </div>
      )}

      {showFlashcardForm && flashcardDraft && (
        <SaveFlashcardModal
          draft={flashcardDraft}
          nativeLanguage={nativeLanguage}
          studyLanguage={studyLanguage}
          saving={saving}
          onChange={(field, value) => setFlashcardDraft(prev => ({ ...prev, [field]: value }))}
          onSave={handleSaveFlashcard}
          onClose={() => { setShowFlashcardForm(false); setFlashcardDraft(null); }}
        />
      )}
    </div>
  );
}
