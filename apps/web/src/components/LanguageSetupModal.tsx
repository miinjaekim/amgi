'use client';
import React, { useState } from 'react';
import { SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';
import { getStudyLanguageConfig, nativeOptionsFor } from '@amgi/core';
import { t } from '@/lib/i18n';
import type { StudyLanguage } from '@amgi/core';

/**
 * First run: three language questions, then one pass over what the app does.
 *
 * ⚠️ **Three, not two.** The old flow asked for a native language and a study
 * language and inferred everything else from the pair. That inference is what
 * this change removes: the language the app speaks and the language a deck is
 * explained in are separate choices, and a first run that asks only once has to
 * guess one of them.
 *
 * So: the app's language, then what you want to learn, then what to explain it
 * in. The third step is prefilled with the first — answering it the same way is
 * one tap, and the question is still *asked*, which is what makes the answer a
 * choice rather than a default nobody was shown.
 *
 * The tour is the last step of this modal rather than its own surface because
 * that is what keeps it to a single showing with nothing to record.
 *
 * Every answer is held locally and committed together on the last tap, not as
 * it is given. That is what lets the caller gate on `interfaceLanguage === null`
 * and nothing else: committing earlier would falsify the gate while the tour was
 * still on screen, and the caller would need a latch to keep this mounted
 * through its own final step. Quitting mid-flow therefore saves nothing, which
 * is the honest outcome — setup was not finished.
 */
export default function LanguageSetupModal() {
  const { setInterfaceLanguage, addLanguage } = useUser();
  const [step, setStep] = useState<'interface' | 'study' | 'native' | 'tour'>('interface');
  const [pendingInterface, setPendingInterface] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);
  const [pendingNative, setPendingNative] = useState<string | null>(null);

  // Deliberately not awaited. Both setters apply to state and localStorage
  // before their Firestore write, and that write does not reject when the
  // connection is gone — it never settles. Awaiting it would hold this modal
  // open behind a promise that may never resolve, and it has no dismiss.
  const handleDone = () => {
    if (!pendingInterface || !pendingStudy || !pendingNative) return;
    void setInterfaceLanguage(pendingInterface);
    void addLanguage({ study: pendingStudy, native: pendingNative });
  };

  const optionClass =
    'w-full py-3 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-sm mx-4 p-8 rounded-2xl shadow-2xl border border-[var(--color-muted)]"
        style={{ background: 'var(--color-surface)' }}
      >
        <p className="text-xs text-[var(--color-text)] opacity-40 mb-6 tracking-wide uppercase">
          Welcome to Amgi · 암기에 오신 것을 환영합니다
        </p>

        {step === 'interface' && (
          <>
            {/* Bilingual, because until this is answered there is no language
                to ask the question in. */}
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">What language should Amgi speak?</h2>
            <h2 className="text-lg font-semibold mb-8 text-[var(--color-text)] opacity-60">앱을 어떤 언어로 볼까요?</h2>
            <div className="flex flex-col gap-3">
              {SUPPORTED_NATIVE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setPendingInterface(lang.code);
                    // The obvious answer to the third question, offered rather
                    // than assumed — the step still runs.
                    setPendingNative(lang.code);
                    setStep('study');
                  }}
                  className={optionClass}
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
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingInterface, 'setupStudyTitle')}</h2>
            <h2 className="text-lg font-semibold mb-8 text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupStudySubtitle')}</h2>
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {SUPPORTED_STUDY_LANGUAGES.map((lang) => {
                const localizedLabel = t(pendingInterface, getStudyLanguageConfig(lang.code).studyLabelKey);
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setPendingStudy(lang.code);
                      // Studying the language you are reading the app in is a
                      // legitimate choice — an English speaker learning
                      // English from Korean backs — but it cannot also be the
                      // explanation language, so the prefill moves off it.
                      const options = nativeOptionsFor(lang.code);
                      setPendingNative(current =>
                        current && options.some(o => o.code === current) ? current : options[0].code,
                      );
                      setStep('native');
                    }}
                    className={optionClass}
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
              onClick={() => setStep('interface')}
              className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(pendingInterface, 'setupBack')}
            </button>
          </>
        )}

        {step === 'native' && pendingStudy && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">
              {t(pendingInterface, 'addLanguageNativeTitle', {
                study: t(pendingInterface, getStudyLanguageConfig(pendingStudy).studyLabelKey),
              })}
            </h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-60">
              {t(pendingInterface, 'addLanguageNativeSubtitle')}
            </p>
            <div className="flex flex-col gap-3">
              {nativeOptionsFor(pendingStudy).map(option => (
                <button
                  key={option.code}
                  onClick={() => { setPendingNative(option.code); setStep('tour'); }}
                  className={optionClass}
                  style={
                    pendingNative === option.code
                      ? { background: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                      : { background: 'var(--color-bg)' }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('study')}
              className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(pendingInterface, 'setupBack')}
            </button>
          </>
        )}

        {step === 'tour' && (
          <>
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-text)]">{t(pendingInterface, 'tourTitle')}</h2>
            <div className="flex flex-col gap-5">
              {TOUR_ROWS.map(({ labelKey, bodyKey }) => (
                <div key={labelKey}>
                  <p className="text-sm font-bold text-[var(--color-highlight)] mb-1">
                    {t(pendingInterface, labelKey)}
                  </p>
                  <p className="text-sm text-[var(--color-text)] opacity-70 leading-relaxed">
                    {t(pendingInterface, bodyKey)}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={handleDone}
              className="mt-8 w-full py-3 rounded-lg font-semibold text-base bg-[var(--color-highlight)] text-[var(--color-bg)] hover:opacity-90 transition-opacity"
            >
              {t(pendingInterface, 'tourStart')}
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
