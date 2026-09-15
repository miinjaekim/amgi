'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '@/components/UserContext';
import { t } from '@/lib/i18n';

/**
 * The ⓘ beside the streak chip, and the panel behind it.
 *
 * **Why it exists:** "12 reviews today" looks too high until you know it counts
 * *directions* — a card studied both ways contributes two. That is the same
 * thing `reviews` counts on the Progress tab, and the number people compare it
 * against; without a sentence saying so, the two look like a discrepancy rather
 * than one measure.
 *
 * **One component for both chips.** `SideNav` and `Header` render the same
 * streak, so the explanation would otherwise be written twice and drift — the
 * argument that made mobile's `StreakBadge` shared.
 *
 * Its own control rather than making the chip itself open this: the chip is a
 * link into Progress, and one target that navigates or explains depending on
 * which glyph you hit is worse than two targets.
 */
export default function StreakInfo() {
  const { interfaceLanguage } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dismissed by clicking away, matching the two popovers already in SideNav.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-label={t(interfaceLanguage, 'progressInfoOpen')}
        title={t(interfaceLanguage, 'progressInfoOpen')}
        className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-muted)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5" />
          <path strokeLinecap="round" d="M12 7.75h.01" />
        </svg>
      </button>

      {open && (
        // Anchored to the bottom of the button rather than the top: this sits in
        // a sidebar footer on desktop and a top bar on mobile, and `bottom-full`
        // would run off screen in the second.
        <div
          className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-xl shadow-lg text-xs leading-relaxed"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-muted)',
            color: 'var(--color-text)',
          }}
        >
          <div className="font-bold mb-2">{t(interfaceLanguage, 'progressInfoTitle')}</div>
          <p className="mb-2" style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'progressInfoStreak')}
          </p>
          <p style={{ color: 'var(--color-muted)' }}>
            {t(interfaceLanguage, 'progressInfoReviews')}
          </p>
        </div>
      )}
    </div>
  );
}
