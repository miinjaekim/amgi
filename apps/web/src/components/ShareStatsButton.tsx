'use client';

import React, { useState } from 'react';
import { shareImageFilename, shareImagePath, type ShareStats } from '@amgi/core';
import { t } from '@/lib/i18n';

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
 */
export default function ShareStatsButton({
  stats,
  nativeLanguage,
}: {
  stats: ShareStats;
  nativeLanguage: string | null | undefined;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const href = shareImagePath(stats, nativeLanguage);
  const filename = shareImageFilename(stats);

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // `canShare` has to be asked with the actual file: a browser can implement
    // `navigator.share` for links and still refuse files, and the only way to
    // find out is to construct one. So the fetch happens before the decision,
    // and anything that goes wrong falls through to the anchor's own download.
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

  return (
    <div className="flex flex-col items-end gap-1">
      <a
        href={href}
        download={filename}
        onClick={handleClick}
        aria-busy={busy}
        className="px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors hover:opacity-80"
        style={{ borderColor: 'var(--color-highlight)', color: 'var(--color-highlight)' }}
      >
        {t(nativeLanguage, 'shareTitle')}
      </a>
      {failed && (
        <span className="text-xs" style={{ color: 'var(--color-error, #FC5D7C)' }}>
          {t(nativeLanguage, 'shareFailed')}
        </span>
      )}
    </div>
  );
}
