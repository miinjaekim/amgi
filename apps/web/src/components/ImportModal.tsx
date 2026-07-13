'use client';

import React, { useState, useRef } from 'react';
import { useUser } from '@/components/UserContext';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { TermCore } from '@/services/gemini';
import { getStudyLanguageConfig, STARTER_PACKS } from '@amgi/core';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';

// Example city for the goal placeholder, per study language, in the user's native language
const PLACEHOLDER_CITIES: Record<string, { en: string; ko: string }> = {
  Korean: { en: 'Seoul', ko: '서울' },
  Swedish: { en: 'Stockholm', ko: '스톡홀름' },
  English: { en: 'New York', ko: '뉴욕' },
  French: { en: 'Paris', ko: '파리' },
  Japanese: { en: 'Tokyo', ko: '도쿄' },
};

// Canonical feedback strings for the refine quick-chips — sent to the API in
// English regardless of UI language so prompt behavior stays consistent
const REFINE_CHIPS = [
  { labelKey: 'importRefineTooBasic', feedback: 'These words are too basic — make the list more advanced.' },
  { labelKey: 'importRefineTooAdvanced', feedback: 'These words are too advanced — make the list more beginner-friendly.' },
  { labelKey: 'importRefineNotRelevant', feedback: 'Some words are not relevant to my goal — replace them with more relevant ones.' },
] as const;

type ImportStatus = 'pending' | 'loading' | 'success' | 'ambiguous' | 'error';

interface ImportItem {
  word: string;
  status: ImportStatus;
  data?: TermCore;
}

export default function ImportModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const { user, nativeLanguage, studyLanguage } = useUser();
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const [input, setInput] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [step, setStep] = useState<'input' | 'processing' | 'done'>('input');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const abortRef = useRef(false);

  const words = input.split('\n').map(w => w.trim()).filter(Boolean);

  const generateFromGoal = async (feedback?: string) => {
    if (!goal.trim() || generating) return;
    setGenerating(true);
    setGenerateError(false);
    try {
      const res = await fetch('/api/vocab-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          studyLanguage,
          // On refine, send the visible list (including user edits) as context
          ...(feedback ? { feedback, previousWords: words } : {}),
        }),
      });
      if (!res.ok) throw new Error('generate failed');
      const data = await res.json();
      if (!Array.isArray(data.words) || data.words.length === 0) throw new Error('empty list');
      setInput(data.words.join('\n'));
      setGenerated(true);
      setRefineInput('');
    } catch {
      setGenerateError(true);
    } finally {
      setGenerating(false);
    }
  };

  const loadStarterPack = (packWords: string[]) => {
    setInput(packWords.join('\n'));
    setGenerated(false); // refine needs a goal; packs are static lists
  };

  const startImport = async () => {
    if (words.length === 0) return;
    abortRef.current = false;
    setItems(words.map(w => ({ word: w, status: 'pending' })));
    setSelected(new Set());
    setStep('processing');

    for (let i = 0; i < words.length; i++) {
      if (abortRef.current) break;
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'loading' } : item));
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: words[i], nativeLanguage: nativeLanguage ?? 'English', studyLanguage }),
        });
        const data = await res.json();
        if (data.ambiguous) {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'ambiguous' } : item));
        } else {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success', data } : item));
          setSelected(prev => new Set([...prev, i]));
        }
      } catch {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
      }
    }

    setStep('done');
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const defaultTracking = { nextReview: new Date(), interval: 0, ease: 2.5, repetitions: 0 };
    let saved = 0;
    for (const i of selected) {
      const item = items[i];
      if (item.status !== 'success' || !item.data) continue;
      try {
        await saveFlashcardToFirestore({
          ...item.data,
          uid: user.uid,
          frontToBack: defaultTracking,
          backToFront: defaultTracking,
        } as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
        saved++;
      } catch {}
    }
    setSaving(false);
    onSaved(saved);
  };

  const doneCount = items.filter(i => i.status !== 'pending' && i.status !== 'loading').length;
  const successCount = items.filter(i => i.status === 'success').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-[var(--color-muted)] flex flex-col"
        style={{ background: 'var(--color-surface)', maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-[var(--color-highlight)]">{t(nativeLanguage, 'importTitle')}</h2>
          <button
            onClick={() => { abortRef.current = true; onClose(); }}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 'input' && (
            <>
              <p className="text-sm text-[var(--color-muted)] mb-2">{t(nativeLanguage, 'importStarterPacks')}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {(STARTER_PACKS[studyLanguage] ?? []).map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => loadStarterPack(pack.words)}
                    className="px-3 py-1.5 rounded-full border border-[var(--color-muted)] text-[var(--color-text)] text-xs hover:bg-[var(--color-muted)]/30 transition-colors"
                  >
                    {t(nativeLanguage, pack.nameKey)}
                    <span className="ml-1.5 opacity-50">{pack.words.length}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-[var(--color-muted)] mb-2">
                {t(nativeLanguage, 'importGoalPrompt')}
              </p>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void generateFromGoal(); } }}
                  placeholder={t(nativeLanguage, 'importGoalPlaceholder', {
                    city: (PLACEHOLDER_CITIES[studyLanguage] ?? PLACEHOLDER_CITIES.Korean)[nativeLanguage === 'Korean' ? 'ko' : 'en'],
                  })}
                  disabled={generating}
                  className="flex-1 p-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                />
                <button
                  onClick={() => generateFromGoal()}
                  disabled={!goal.trim() || generating}
                  className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-text)' }}
                >
                  {generating ? <Spinner className="w-4 h-4" /> : t(nativeLanguage, 'importGenerate')}
                </button>
              </div>
              {generateError && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-highlight)' }}>
                  {t(nativeLanguage, 'importGenerateError')}
                </p>
              )}
              <p className="text-sm text-[var(--color-muted)] mb-3 mt-3">{t(nativeLanguage, 'importPastePrompt')}</p>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={'사랑\n행복\nhello\n...'}
                rows={10}
                className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm resize-none"
              />
              {words.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  {t(nativeLanguage, words.length === 1 ? 'importWordCountOne' : 'importWordCount', { count: words.length })}
                </p>
              )}
              {generated && words.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-[var(--color-muted)]/50">
                  <p className="text-xs text-[var(--color-muted)] mb-2">{t(nativeLanguage, 'importRefinePrompt')}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {REFINE_CHIPS.map(chip => (
                      <button
                        key={chip.labelKey}
                        onClick={() => generateFromGoal(chip.feedback)}
                        disabled={generating}
                        className="px-3 py-1 rounded-full border border-[var(--color-muted)] text-[var(--color-text)] text-xs hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-40"
                      >
                        {t(nativeLanguage, chip.labelKey)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refineInput}
                      onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && refineInput.trim()) { e.preventDefault(); void generateFromGoal(refineInput.trim()); } }}
                      placeholder={t(nativeLanguage, 'importRefinePlaceholder')}
                      disabled={generating}
                      className="flex-1 p-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                    />
                    <button
                      onClick={() => generateFromGoal(refineInput.trim())}
                      disabled={!refineInput.trim() || generating}
                      className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-text)' }}
                    >
                      {generating ? <Spinner className="w-4 h-4" /> : t(nativeLanguage, 'importRefine')}
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={startImport}
                disabled={words.length === 0}
                className="mt-4 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                {t(nativeLanguage, 'importStart')}
              </button>
            </>
          )}

          {(step === 'processing' || step === 'done') && (
            <>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                {step === 'processing'
                  ? t(nativeLanguage, 'importProcessing', { done: doneCount, total: items.length })
                  : t(nativeLanguage, 'importDoneSummary', { success: successCount, total: items.length, selected: selected.size })}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{ borderColor: 'var(--color-muted)', background: 'var(--color-bg)' }}
                  >
                    <div className="w-4 mt-0.5 shrink-0">
                      {item.status === 'success' && (
                        <input
                          type="checkbox"
                          checked={selected.has(i)}
                          onChange={() => toggleSelect(i)}
                          className="accent-[var(--color-highlight)]"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[var(--color-text)]">{item.word}</span>
                        {item.status === 'loading' && <Spinner className="w-3 h-3" />}
                        {item.status === 'pending' && <span className="text-xs text-[var(--color-muted)]">—</span>}
                        {item.status === 'error' && <span className="text-xs opacity-60" style={{ color: 'var(--color-highlight)' }}>{t(nativeLanguage, 'importStatusFailed')}</span>}
                        {item.status === 'ambiguous' && <span className="text-xs text-[var(--color-muted)]">{t(nativeLanguage, 'importStatusAmbiguous')}</span>}
                        {item.status === 'success' && item.data && (
                          <span className="text-xs text-[var(--color-muted)]">
                            {item.data[langConfig.studyField]} · {item.data[langConfig.backField]}
                            {item.data.formality && item.data.formality !== 'N/A' && ` · ${item.data.formality}`}
                          </span>
                        )}
                      </div>
                      {item.status === 'success' && item.data?.briefDefinition && (
                        <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2">
                          {item.data.briefDefinition}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {step === 'done' && selected.size > 0 && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-4 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                >
                  {saving
                    ? <><Spinner className="w-4 h-4" /> {t(nativeLanguage, 'importSaving')}</>
                    : t(nativeLanguage, selected.size === 1 ? 'importSaveCardsOne' : 'importSaveCards', { count: selected.size })}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
