'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

type State = 'idle' | 'copied' | 'failed';

/**
 * Copies text to the clipboard, with the one thing a copy control cannot do
 * without: visible confirmation.
 *
 * A copy that succeeds silently is indistinguishable from one that did nothing,
 * and the usual result is the user pressing it again and then checking by
 * pasting somewhere. The label swaps for two seconds instead.
 */
export default function CopyButton({
  text,
  nativeLanguage,
  className = '',
}: {
  text: string;
  nativeLanguage: string | null | undefined;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const handleCopy = async () => {
    // Called straight out of the click handler with nothing awaited first:
    // Safari ties clipboard access to the user gesture, and an `await` before
    // the write is enough to lose it.
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      return;
    } catch {
      // Falls through to the legacy path rather than failing here. The
      // Clipboard API needs a secure context and can be refused outright, and
      // this control exists mostly for phones — where that is likeliest and
      // where selecting the text by hand is the thing being avoided.
    }

    try {
      const scratch = document.createElement('textarea');
      scratch.value = text;
      // Kept in the layout but out of sight: `display: none` is not selectable,
      // and iOS will not copy from an element it cannot render.
      scratch.setAttribute('readonly', '');
      scratch.style.position = 'fixed';
      scratch.style.top = '-9999px';
      document.body.appendChild(scratch);
      scratch.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(scratch);
      setState(ok ? 'copied' : 'failed');
    } catch {
      setState('failed');
    }
  };

  const label = state === 'copied' ? 'copied' : state === 'failed' ? 'copyFailed' : 'copy';

  return (
    <button
      onClick={handleCopy}
      aria-live="polite"
      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${className}`}
      style={
        state === 'copied'
          ? { borderColor: 'var(--color-highlight)', color: 'var(--color-highlight)' }
          : { borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }
      }
    >
      {t(nativeLanguage, label)}
    </button>
  );
}
