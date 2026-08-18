'use client';
import React, { useState } from 'react';
import { SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';
import { getStudyLanguageConfig } from '@amgi/core';
import { t } from '@/lib/i18n';
import type { StudyLanguage } from '@amgi/core';

/**
 * First run: two language questions, then one pass over what the app does.
 *
 * The tour is the third step of this modal rather than its own surface because
 * that is what keeps it to a single showing with nothing to record.
 *
 * Both answers are held locally and committed together on the last tap, not as
 * they are given. That is what lets the caller gate on `nativeLanguage ===
 * null` and nothing else: committing earlier would falsify the gate while the
 * tour was still on screen, and the caller would need a latch to keep this
 * mounted through its own final step. Quitting mid-flow therefore saves
 * nothing, which is the honest outcome — setup was not finished.
 */
export default function LanguageSetupModal() {
  const { setNativeLanguage, setStudyLanguage } = useUser();
  const [step, setStep] = useState<'native' | 'study' | 'tour'>('native');
  const [pendingNative, setPendingNative] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);

  const handleNativeSelect = (lang: string) => {
    setPendingNative(lang);
    setStep('study');
  };

  const handleStudySelect = (lang: StudyLanguage) => {
    setPendingStudy(lang);
    setStep('tour');
  };

  // Deliberately not awaited. Both setters apply to state and localStorage
  // before their Firestore write, and that write does not reject when the
  // connection is gone — it never settles. Awaiting it would hold this modal
  // open behind a promise that may never resolve, and it has no dismiss.
  // Neither setter reads the other's result: the study language was chosen
  // from a list the native language was filtered out of, so the collision
  // resolvers have nothing to correct.
  const handleDone = () => {
    if (!pendingNative || !pendingStudy) return;
    void setNativeLanguage(pendingNative);
    void setStudyLanguage(pendingStudy);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
        style={{ background: 'var(--color-surface)' }}
      >
        <p className="text-xs text-[var(--color-text)] opacity-40 mb-6 tracking-wide uppercase">
          Welcome to Amgi · 암기에 오신 것을 환영합니다
        </p>

        {step === 'native' && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">What is your native language?</h2>
            <h2 className="text-lg font-semibold mb-8 text-[var(--color-text)] opacity-60">모국어가 무엇인가요?</h2>
            <div className="flex flex-col gap-3">
              {SUPPORTED_NATIVE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleNativeSelect(lang.code)}
                  className="w-full py-3 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors"
                  style={{ background: 'var(--color-bg)' }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'study' && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingNative, 'setupStudyTitle')}</h2>
            <h2 className="text-lg font-semibold mb-8 text-[var(--color-text)] opacity-60">{t(pendingNative, 'setupStudySubtitle')}</h2>
            <div className="flex flex-col gap-3">
              {SUPPORTED_STUDY_LANGUAGES.filter((lang) => lang.code !== pendingNative).map((lang) => {
                const localizedLabel = t(pendingNative, getStudyLanguageConfig(lang.code).studyLabelKey);
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleStudySelect(lang.code)}
                    className="w-full py-3 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors"
                    style={{ background: 'var(--color-bg)' }}
                  >
                    <span>{localizedLabel}</span>
                    {lang.labelNative !== localizedLabel && (
                      <span className="ml-2 opacity-60 font-normal">{lang.labelNative}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep('native')}
              className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(pendingNative, 'setupBack')}
            </button>
          </>
        )}

        {step === 'tour' && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-text)]">{t(pendingNative, 'tourTitle')}</h2>
            <div className="flex flex-col gap-5">
              {TOUR_ROWS.map(({ labelKey, bodyKey }) => (
                <div key={labelKey}>
                  <p className="text-sm font-bold text-[var(--color-highlight)] mb-1">
                    {t(pendingNative, labelKey)}
                  </p>
                  <p className="text-sm text-[var(--color-text)] opacity-70 leading-relaxed">
                    {t(pendingNative, bodyKey)}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={handleDone}
              className="mt-8 w-full py-3 rounded-lg font-semibold text-base bg-[var(--color-highlight)] text-[var(--color-bg)] hover:opacity-90 transition-opacity"
            >
              {t(pendingNative, 'tourStart')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Every row borrows its nav label, so what the tour names is exactly what the
// nav is called.
const TOUR_ROWS = [
  { labelKey: 'navLearn', bodyKey: 'tourLearnBody' },
  { labelKey: 'navReview', bodyKey: 'tourReviewBody' },
  { labelKey: 'navDecks', bodyKey: 'tourDecksBody' },
] as const;
