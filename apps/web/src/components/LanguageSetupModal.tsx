'use client';
import React, { useRef, useState } from 'react';
import { SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';
import { applySpellingCorrection, getTermExplanation } from '@/services/gemini';
import type { TermAmbiguous, TermCore } from '@/services/gemini';
import { SETUP_WORDS, getReading, getStudyLanguageConfig, lookupCardFaces, nativeOptionsFor } from '@amgi/core';
import { t, partOfSpeechLabel } from '@/lib/i18n';
import Spinner from '@/components/Spinner';
import type { StudyLanguage } from '@amgi/core';

/**
 * First run: three language questions, then one real lookup.
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
 * The walkthrough replaces a tour card that only *named* the surfaces. It does
 * the thing once instead: a word, the explanation Learn would give for it, the
 * card that explanation becomes, and one flip of that card. See "Onboarding is
 * not a checklist" in `.scratchpad/decisions/app-shell.md` for why it lives
 * here, full screen and before the app, rather than on Learn.
 *
 * ⚠️ **The lookup is `/api/explain`, through the same client Learn uses.** Not
 * a canned response and not a second prompt: what a new user sees here has to
 * be what the app will actually say, and a parallel prompt drifts.
 *
 * ⚠️ **Every walkthrough step can be skipped.** This screen has no dismiss, so
 * a lookup that fails or hangs must not be the only way forward. Skipping
 * commits the language answers exactly as finishing does.
 *
 * Every answer is held locally and committed together on the last tap, not as
 * it is given. That is what lets the caller gate on `interfaceLanguage === null`
 * and nothing else: committing earlier would falsify the gate while the walkthrough
 * was still on screen, and the caller would need a latch to keep this mounted
 * through its own final step. Quitting mid-flow therefore saves nothing, which
 * is the honest outcome — setup was not finished.
 */
export default function LanguageSetupModal() {
  const { setInterfaceLanguage, addLanguage } = useUser();
  const [step, setStep] = useState<'interface' | 'study' | 'native' | 'word' | 'explain' | 'card'>('interface');
  const [pendingInterface, setPendingInterface] = useState<string | null>(null);
  const [pendingStudy, setPendingStudy] = useState<StudyLanguage | null>(null);
  const [pendingNative, setPendingNative] = useState<string | null>(null);
  const [ownWord, setOwnWord] = useState('');
  const [lookedUp, setLookedUp] = useState<{ term: string; context?: string } | null>(null);
  const [core, setCore] = useState<TermCore | null>(null);
  const [ambiguity, setAmbiguity] = useState<TermAmbiguous | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  // Which lookup is current. Going back to pick another word leaves the old
  // request in flight, and its answer must not land on the new one.
  const request = useRef(0);

  // Deliberately not awaited. Both setters apply to state and localStorage
  // before their Firestore write, and that write does not reject when the
  // connection is gone — it never settles. Awaiting it would hold this modal
  // open behind a promise that may never resolve, and it has no dismiss.
  const handleDone = () => {
    if (!pendingInterface || !pendingStudy || !pendingNative) return;
    void setInterfaceLanguage(pendingInterface);
    void addLanguage({ study: pendingStudy, native: pendingNative });
  };

  /**
   * The pending answers stand in for the deck here: nothing is committed until
   * the last tap, so `studyLanguage` and `deckNativeLanguage` on the context
   * are still whatever they default to.
   */
  const lookUp = async (term: string, context?: string) => {
    if (!pendingStudy || !pendingNative) return;
    const current = ++request.current;
    setLookedUp({ term, context });
    setCore(null);
    setAmbiguity(null);
    setFailed(false);
    setFlipped(false);
    setLoading(true);
    setStep('explain');
    try {
      const raw = await getTermExplanation(term, pendingNative, context, '', pendingStudy);
      if (current !== request.current) return;
      // A corrected spelling is taken as the answer, with no banner: there is
      // nothing to decline it *to* in a flow that makes one card and moves on.
      const { result } = applySpellingCorrection(raw, term);
      if ('ambiguous' in result && result.ambiguous) setAmbiguity(result);
      else setCore(result as TermCore);
    } catch {
      if (current === request.current) setFailed(true);
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  const pickAnotherWord = () => {
    request.current++;
    setLoading(false);
    setStep('word');
  };

  const faces = core && pendingStudy ? lookupCardFaces(core, pendingStudy, pendingNative) : null;
  const reading = core && pendingStudy ? getReading(core, pendingStudy, pendingNative) : undefined;
  const partOfSpeech = core ? partOfSpeechLabel(pendingNative, core) : undefined;
  const chipClass = 'px-2 py-0.5 text-xs rounded-full border border-[var(--color-muted)] text-[var(--color-muted)]';
  const primaryClass =
    'w-full py-3 rounded-lg font-semibold text-base bg-[var(--color-highlight)] text-[var(--color-bg)] hover:opacity-90 transition-opacity disabled:opacity-50';
  const linkClass = 'text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors';

  const optionClass =
    'w-full py-3 rounded-lg font-semibold text-base border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors';

  return (
    // Full screen and opaque: this comes before the app, not on top of it.
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="min-h-full flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-10">
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
                  style={{ background: 'var(--color-surface)' }}
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
                    style={{ background: 'var(--color-surface)' }}
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
                  onClick={() => { setPendingNative(option.code); setStep('word'); }}
                  className={optionClass}
                  style={
                    pendingNative === option.code
                      ? { background: 'var(--color-surface)', borderColor: 'var(--color-highlight)' }
                      : { background: 'var(--color-surface)' }
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

        {step === 'word' && pendingStudy && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingInterface, 'setupWordTitle')}</h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupWordSubtitle')}</p>
            <button onClick={() => lookUp(SETUP_WORDS[pendingStudy])} className={primaryClass}>
              {t(pendingInterface, 'setupWordSuggested', { term: SETUP_WORDS[pendingStudy] })}
            </button>
            <p className="mt-8 mb-2 text-sm text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupWordOwn')}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (ownWord.trim()) lookUp(ownWord.trim());
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={ownWord}
                onChange={(e) => setOwnWord(e.target.value)}
                placeholder={t(pendingInterface, 'inputPlaceholder')}
                className="flex-1 min-w-0 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
              />
              <button type="submit" disabled={!ownWord.trim()} className={`${optionClass} !w-auto px-5 disabled:opacity-50`} style={{ background: 'var(--color-surface)' }}>
                {t(pendingInterface, 'setupLookUp')}
              </button>
            </form>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep('native')} className={linkClass}>{t(pendingInterface, 'setupBack')}</button>
              <button onClick={handleDone} className={linkClass}>{t(pendingInterface, 'setupSkip')}</button>
            </div>
          </>
        )}

        {step === 'explain' && pendingStudy && (
          <>
            {loading && (
              <div className="py-16 flex flex-col items-center gap-4 text-[var(--color-muted)]">
                <Spinner className="w-6 h-6" />
                <p className="text-xl font-bold text-[var(--color-highlight)]">{lookedUp?.term}</p>
              </div>
            )}

            {failed && (
              <>
                <h2 className="text-2xl font-bold mb-8 text-[var(--color-text)]">{t(pendingInterface, 'setupLookupFailed')}</h2>
                <button onClick={() => lookedUp && lookUp(lookedUp.term, lookedUp.context)} className={primaryClass}>
                  {t(pendingInterface, 'setupRetry')}
                </button>
              </>
            )}

            {ambiguity && (
              <>
                <h2 className="text-2xl font-bold text-[var(--color-highlight)] mb-2">{ambiguity.term}</h2>
                <p className="text-sm mb-5 text-[var(--color-text)] opacity-70">{t(pendingInterface, 'disambiguationPrompt')}</p>
                <ul className="space-y-3">
                  {ambiguity.meanings.map((meaning, i) => (
                    <li key={i}>
                      <button
                        className="w-full text-left px-4 py-3 rounded-lg border border-[var(--color-muted)] hover:bg-[var(--color-muted)]/30 transition-colors"
                        onClick={() => lookUp(ambiguity.term, meaning.label)}
                      >
                        <div className="font-semibold text-[var(--color-highlight)]">{meaning.label}</div>
                        <div className="text-sm text-[var(--color-text)] opacity-70 mt-0.5">{meaning.hint}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {core && faces && (
              <>
                {/* The same fields, in the same order, as Learn's result. */}
                <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)]">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <h2 className="text-2xl font-bold text-[var(--color-highlight)]">{faces.headword}</h2>
                    {partOfSpeech && <span className={chipClass}>{partOfSpeech}</span>}
                    {reading && <span className={chipClass}>{reading}</span>}
                  </div>
                  <h3 className="font-semibold text-[var(--color-text)] mb-1">{t(pendingInterface, 'sectionTranslation')}</h3>
                  <p className="text-[var(--color-text)] opacity-90 text-lg">
                    {faces.back || t(pendingInterface, 'noTranslation')}
                  </p>
                  {faces.gloss && <p className="mt-1 text-base text-[var(--color-text)] opacity-70">{faces.gloss}</p>}
                  {core.briefDefinition && (
                    <p className="mt-2 text-sm text-[var(--color-muted)]">{core.briefDefinition}</p>
                  )}
                </div>
                <button onClick={() => setStep('card')} className={`${primaryClass} mt-6`}>
                  {t(pendingInterface, 'setupMakeCard')}
                </button>
              </>
            )}

            <div className="mt-8 flex justify-between">
              <button onClick={pickAnotherWord} className={linkClass}>{t(pendingInterface, 'setupOtherWord')}</button>
              <button onClick={handleDone} className={linkClass}>{t(pendingInterface, 'setupSkip')}</button>
            </div>
          </>
        )}

        {step === 'card' && core && faces && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingInterface, 'setupCardTitle')}</h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupCardHint')}</p>
            <button
              onClick={() => setFlipped(f => !f)}
              aria-pressed={flipped}
              className="w-full min-h-[14rem] p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] shadow-lg flex flex-col items-center justify-center gap-3 hover:border-[var(--color-highlight)] transition-colors"
            >
              {flipped ? (
                <>
                  <span className="text-xl font-semibold text-[var(--color-text)]">
                    {faces.back || t(pendingInterface, 'noTranslation')}
                  </span>
                  {faces.gloss && <span className="text-base text-[var(--color-muted)]">{faces.gloss}</span>}
                  {(partOfSpeech || reading) && (
                    <span className="flex gap-2 flex-wrap justify-center">
                      {partOfSpeech && <span className={chipClass}>{partOfSpeech}</span>}
                      {reading && <span className={chipClass}>{reading}</span>}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-3xl font-bold text-[var(--color-highlight)]">{faces.headword}</span>
              )}
            </button>
            <button onClick={handleDone} className={`${primaryClass} mt-6`}>
              {t(pendingInterface, 'setupStart')}
            </button>
            <button onClick={() => setStep('explain')} className={`${linkClass} mt-4`}>
              {t(pendingInterface, 'setupBack')}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
