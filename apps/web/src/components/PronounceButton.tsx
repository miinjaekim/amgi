'use client';

import { useState } from 'react';
import { getPronunciationUrl } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

interface Props {
  text: string;
  studyLanguage: StudyLanguage;
  className?: string;
}

type Status = 'idle' | 'loading' | 'playing' | 'error';

export default function PronounceButton({ text, studyLanguage, className = '' }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  const disabled = !text.trim() || status === 'loading' || status === 'playing';

  async function handleClick() {
    setStatus('loading');
    try {
      const url = await getPronunciationUrl(text, studyLanguage);
      const audio = new Audio(url);
      audio.onended = () => setStatus('idle');
      audio.onerror = () => setStatus('error');
      await audio.play();
      setStatus('playing');
    } catch {
      setStatus('error');
    }
  }

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`p-1 rounded-lg hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 ${className}`}
      style={{ color: status === 'error' ? '#e57373' : 'var(--color-muted)' }}
      aria-label={status === 'error' ? 'Failed to play pronunciation' : 'Play pronunciation'}
    >
      {status === 'loading' ? (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73" />
        </svg>
      )}
    </button>
  );
}
