'use client';

import { useState } from 'react';
import { getPronunciationUrl, getStudyLanguageConfig } from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

interface Props {
  text: string;
  studyLanguage: StudyLanguage;
  className?: string;
  size?: 'sm' | 'md';
}

type Status = 'idle' | 'loading' | 'playing' | 'error';

export default function PronounceButton({ text, studyLanguage, className = '', size = 'md' }: Props) {
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

  // No voice configured for this language yet — don't render a button that
  // can only fail on click.
  const { ttsLanguageCode, ttsVoiceName } = getStudyLanguageConfig(studyLanguage);
  if (!ttsLanguageCode || !ttsVoiceName) return null;

  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${size === 'sm' ? 'p-0.5' : 'p-1'} rounded-lg hover:bg-[var(--color-muted)]/30 transition-colors disabled:opacity-50 ${className}`}
      style={{ color: status === 'error' ? '#e57373' : 'var(--color-muted)' }}
      aria-label={status === 'error' ? 'Failed to play pronunciation' : 'Play pronunciation'}
    >
      {status === 'loading' ? (
        <svg className={`${iconClass} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a9 9 0 010 12.73" />
        </svg>
      )}
    </button>
  );
}
