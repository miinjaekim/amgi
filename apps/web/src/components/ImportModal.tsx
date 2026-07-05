'use client';

import React, { useState, useRef } from 'react';
import { useUser } from '@/components/UserContext';
import { saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import { TermCore } from '@/services/gemini';
import { getStudyLanguageConfig } from '@amgi/core';
import Spinner from '@/components/Spinner';

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
  const abortRef = useRef(false);

  const words = input.split('\n').map(w => w.trim()).filter(Boolean);

  const generateFromGoal = async () => {
    if (!goal.trim() || generating) return;
    setGenerating(true);
    setGenerateError(false);
    try {
      const res = await fetch('/api/vocab-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), studyLanguage }),
      });
      if (!res.ok) throw new Error('generate failed');
      const data = await res.json();
      if (!Array.isArray(data.words) || data.words.length === 0) throw new Error('empty list');
      setInput(data.words.join('\n'));
    } catch {
      setGenerateError(true);
    } finally {
      setGenerating(false);
    }
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
          <h2 className="text-xl font-bold text-[var(--color-highlight)]">Import Words</h2>
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
              <p className="text-sm text-[var(--color-muted)] mb-2">
                Tell us why you&apos;re learning and we&apos;ll suggest a starter list.
              </p>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generateFromGoal(); } }}
                  placeholder={`e.g. "ordering food on a trip to ${{ Korean: 'Seoul', Swedish: 'Stockholm', English: 'New York', French: 'Paris' }[studyLanguage] ?? 'Seoul'}"`}
                  disabled={generating}
                  className="flex-1 p-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
                />
                <button
                  onClick={generateFromGoal}
                  disabled={!goal.trim() || generating}
                  className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-text)' }}
                >
                  {generating ? <Spinner className="w-4 h-4" /> : 'Generate'}
                </button>
              </div>
              {generateError && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-highlight)' }}>
                  Failed to generate a list. Please try again.
                </p>
              )}
              <p className="text-sm text-[var(--color-muted)] mb-3 mt-3">Or paste words below, one per line.</p>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={'사랑\n행복\nhello\n...'}
                rows={10}
                className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)] text-sm resize-none"
              />
              {words.length > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  {words.length} word{words.length !== 1 ? 's' : ''}
                </p>
              )}
              <button
                onClick={startImport}
                disabled={words.length === 0}
                className="mt-4 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
                style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
              >
                Start Import
              </button>
            </>
          )}

          {(step === 'processing' || step === 'done') && (
            <>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                {step === 'processing'
                  ? `Processing ${doneCount}/${items.length}...`
                  : `Done — ${successCount} of ${items.length} resolved. ${selected.size} selected.`}
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
                        {item.status === 'error' && <span className="text-xs opacity-60" style={{ color: 'var(--color-highlight)' }}>failed</span>}
                        {item.status === 'ambiguous' && <span className="text-xs text-[var(--color-muted)]">ambiguous — skipped</span>}
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
                  {saving ? <><Spinner className="w-4 h-4" /> Saving...</> : `Save ${selected.size} card${selected.size !== 1 ? 's' : ''}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
