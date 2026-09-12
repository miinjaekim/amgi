'use client';
import React, { useState } from 'react';
import { useUser } from '@/components/UserContext';
import {
  availableStudyLanguages,
  getStudyLanguageConfig,
  nativeOptionsFor,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';
import { t } from '@/lib/i18n';

/**
 * Adding a language, as the two questions it actually is.
 *
 * **Both are asked, every time.** The second one is the whole reason this
 * exists: a deck is a study language *plus* the language it is explained in,
 * and defaulting the second to whatever the last deck used is how a Korean
 * speaker ends up with Spanish cards glossed in Korean because their first deck
 * happened to be Japanese.
 *
 * The options are filtered rather than validated:
 *
 * - `availableStudyLanguages` drops what is already added, so the same deck
 *   cannot be created twice — cards shard one collection per study language,
 *   and a second entry would point at the same cards through a different back.
 * - `nativeOptionsFor` drops the study language itself, which is what makes
 *   "studying Korean, explained in Korean" unreachable. That used to be a
 *   collision repaired after the fact by `resolveStudyLanguage`; there is
 *   nothing left to repair.
 */
export default function AddLanguageModal({ onClose }: { onClose: () => void }) {
  const { interfaceLanguage, languages, addLanguage } = useUser();
  const [study, setStudy] = useState<StudyLanguage | null>(null);
  const [busy, setBusy] = useState(false);

  const available = availableStudyLanguages(languages);

  const choose = async (native: string) => {
    if (!study || busy) return;
    setBusy(true);
    // Awaited so the modal stays up until the deck exists — closing first would
    // drop the user on a screen that has not switched yet.
    try {
      await addLanguage({ study, native });
      onClose();
    } catch {
      // The write is offline-tolerant everywhere else in the app; here the
      // local state has already moved, so closing is still the honest result.
      onClose();
    }
  };

  const optionClass =
    'w-full py-3 px-4 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors text-left';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
        style={{ background: 'var(--color-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        {available.length === 0 ? (
          <>
            <h2 className="text-xl font-bold mb-2 text-[var(--color-text)]">
              {t(interfaceLanguage, 'addLanguage')}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              {t(interfaceLanguage, 'addLanguageAllAdded')}
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)]"
            >
              {t(interfaceLanguage, 'helpClose')}
            </button>
          </>
        ) : study === null ? (
          <>
            <h2 className="text-xl font-bold mb-1 text-[var(--color-text)]">
              {t(interfaceLanguage, 'addLanguageStudyTitle')}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-6">
              {t(interfaceLanguage, 'addLanguageStudySubtitle')}
            </p>
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {available.map(lang => {
                const localized = t(interfaceLanguage, getStudyLanguageConfig(lang.code).studyLabelKey);
                return (
                  <button key={lang.code} onClick={() => setStudy(lang.code)} className={optionClass}>
                    <span>{localized}</span>
                    {lang.labelNative !== localized && (
                      <span className="ml-2 opacity-60 font-normal">{lang.labelNative}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(interfaceLanguage, 'cancel')}
            </button>
          </>
        ) : (
          <>
            {/* Names the language being added: on a phone the first question has
                scrolled away, and "which language?" alone is ambiguous between
                the two this flow asks. */}
            <h2 className="text-xl font-bold mb-1 text-[var(--color-text)]">
              {t(interfaceLanguage, 'addLanguageNativeTitle', {
                study: t(interfaceLanguage, getStudyLanguageConfig(study).studyLabelKey),
              })}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mb-6">
              {t(interfaceLanguage, 'addLanguageNativeSubtitle')}
            </p>
            <div className="flex flex-col gap-3">
              {nativeOptionsFor(study).map(option => (
                <button
                  key={option.code}
                  onClick={() => choose(option.code)}
                  disabled={busy}
                  className={`${optionClass} disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStudy(null)}
              disabled={busy}
              className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              {t(interfaceLanguage, 'setupBack')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
