'use client';

import React, { useState } from 'react';
import {
  shareImageFilename, shareImagePath,
  type ShareStats, type ShareVariant,
} from '@amgi/core';
import { t } from '@/lib/i18n';

export interface ShareOption {
  variant: ShareVariant;
  stats: ShareStats;
}

/**
 * Share the stats image.
 *
 * **An anchor, not a button.** The base case is a same-origin link with
 * `download`, which needs no JavaScript, no fetch and no permissions — it
 * cannot fail in a way that leaves the user with nothing. The Web Share path
 * below is an enhancement layered on top of that, so a browser without it (or a
 * user who cancels) still lands on a working download.
 *
 * **Why Web Share matters here at all:** a story is posted from a phone, and on
 * mobile Safari and Chrome `navigator.share` with a file opens the real share
 * sheet — Instagram, KakaoTalk — where a download only reaches the camera roll.
 * Desktop mostly cannot share files, which is why the fallback is the default
 * rather than an error path.
 *
 * **Choosing between pictures keeps that property.** With more than one on
 * offer the control becomes a `<details>` disclosure whose every row is its own
 * anchor to its own URL — so the no-JS download survives the chooser instead of
 * being traded for it. A menu built out of buttons and an onClick would not.
 */
export default function ShareStatsButton({
  options,
  nativeLanguage,
}: {
  options: ShareOption[];
  nativeLanguage: string | null | undefined;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * Try the share sheet, fall back to the anchor's own download.
   *
   * `canShare` has to be asked with the actual file: a browser can implement
   * `navigator.share` for links and still refuse files, and the only way to
   * find out is to construct one. So the fetch happens before the decision, and
   * anything that goes wrong falls through to the anchor's default action.
   */
  const handleClick = (href: string, filename: string) =>
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof navigator === 'undefined' || !navigator.canShare) return;

      event.preventDefault();
      setBusy(true);
      setFailed(false);
      try {
        const response = await fetch(href);
        if (!response.ok) throw new Error(`render failed: ${response.status}`);
        const file = new File([await response.blob()], filename, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
        // Shareable API, unshareable file — save it instead rather than telling
        // the user something went wrong, because nothing did.
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        // A cancelled share sheet rejects with AbortError. That is the user
        // saying no, not a failure, and must not raise an error message.
        if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true);
      } finally {
        setBusy(false);
      }
    };

  const linkFor = (option: ShareOption, label: string, className: string) => {
    const href = shareImagePath(option.stats, nativeLanguage, option.variant);
    const filename = shareImageFilename(option.stats, option.variant);
    return (
      <a
        key={option.variant}
        href={href}
        download={filename}
        onClick={handleClick(href, filename)}
        aria-busy={busy}
        className={className}
      >
        {label}
      </a>
    );
  };

  const label = (option: ShareOption) => t(
    nativeLanguage,
    option.variant === 'today' ? 'shareVariantToday' : 'shareVariantWindow',
  );

  const chip = 'px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors hover:opacity-80';
  const chipStyle = 'border-[var(--color-highlight)] text-[var(--color-highlight)]';

  if (options.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      {options.length === 1
        // One picture, one link — no disclosure to open first.
        ? linkFor(options[0], t(nativeLanguage, 'shareTitle'), `${chip} ${chipStyle}`)
        : (
          <details className="relative">
            <summary
              className={`${chip} ${chipStyle} cursor-pointer list-none`}
              aria-label={t(nativeLanguage, 'shareChoose')}
            >
              {t(nativeLanguage, 'shareTitle')}
            </summary>
            <div className="absolute right-0 mt-1 z-10 flex flex-col gap-1 p-1 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] whitespace-nowrap">
              {options.map(option => linkFor(
                option,
                label(option),
                'px-3 py-1.5 rounded-lg text-sm font-mono text-left hover:opacity-80 text-[var(--color-text)]',
              ))}
            </div>
          </details>
        )}
      {failed && (
        <span className="text-xs" style={{ color: 'var(--color-error, #FC5D7C)' }}>
          {t(nativeLanguage, 'shareFailed')}
        </span>
      )}
    </div>
  );
}
