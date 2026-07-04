'use client';

import { useEffect } from 'react';
import { Flashcard } from '@/services/firestore';
import { t } from '@/lib/i18n';
import Spinner from '@/components/Spinner';
import type { StudyLanguage } from '@amgi/core';

interface Props {
  draft: Partial<Flashcard>;
  nativeLanguage: string | null | undefined;
  studyLanguage: StudyLanguage;
  saving: boolean;
  onChange: (field: 'korean' | 'english' | 'swedish', value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function SaveFlashcardModal({ draft, nativeLanguage, studyLanguage, saving, onChange, onSave, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isSwedish = studyLanguage === 'Swedish';
  const studyLangLabel = isSwedish ? 'Swedish' : t(nativeLanguage, 'labelKorean');
  const studyLangValue = isSwedish ? (draft.swedish || '') : (draft.korean || '');
  const studyLangField = isSwedish ? 'swedish' : 'korean';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl font-mono"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b" style={{ borderColor: 'var(--color-muted)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-highlight)' }}>
            {t(nativeLanguage, 'reviewEditFlashcard')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--color-muted)]/30 transition-colors"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
              {studyLangLabel}
            </label>
            <input
              type="text"
              value={studyLangValue}
              onChange={e => onChange(studyLangField as 'korean' | 'swedish', e.target.value)}
              className="w-full p-2 rounded-lg border text-[var(--color-text)]"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)' }}>
              {t(nativeLanguage, 'labelEnglish')}
            </label>
            <input
              type="text"
              value={draft.english || ''}
              onChange={e => onChange('english', e.target.value)}
              className="w-full p-2 rounded-lg border text-[var(--color-text)]"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              {saving ? <Spinner /> : t(nativeLanguage, 'save')}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 rounded-lg font-bold transition-colors"
              style={{ background: 'var(--color-muted)', color: 'var(--color-text)' }}
            >
              {t(nativeLanguage, 'cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
