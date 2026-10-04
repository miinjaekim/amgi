'use client';
import React, { useEffect, useRef, useState } from 'react';
import { SUPPORTED_NATIVE_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@/services/userPreferences';
import { useUser } from '@/components/UserContext';
import { applySpellingCorrection, getTermExplanation } from '@/services/gemini';
import type { TermAmbiguous, TermCore } from '@/services/gemini';
import { saveFlashcardToFirestore } from '@/services/firestore';
import type { Flashcard } from '@/services/firestore';
import {
  SETUP_LOOKUP_TIMEOUT_MS, SETUP_WORDS, buildLookupCardDraft, directionPrompt, getNextReviewData, getPackTerms,
  getPackText, getReading, getStudyLanguageConfig, getVocabPacks, lookupCardFaces, nativeOptionsFor, setupReturnDay,
} from '@amgi/core';
import type { ReviewTracking } from '@amgi/core';
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
 * After the card: one real rating, which answers with the day the scheduler
 * gives and the same card asked the other way round; the packs that exist for
 * the chosen language; and sign-in, last and optional. Review timing and packs
 * are shown rather than described for the same reason the lookup is real.
 *
 * ⚠️ **The card step can always be skipped.** This screen has no dismiss, so a
 * lookup that fails or hangs must not be the only way forward. Skipping drops
 * the card and carries on to packs and sign-in.
 *
 * ⚠️ **The card is kept only by an account being set up here.** Signing in to
 * an account that already has preferences unmounts this screen through the
 * gate, and that account keeps its own languages and cards. *Not now* drops
 * the card: nothing is held on the device and nothing is left on Learn.
 *
 * Every answer is held locally and committed together on the last tap, not as
 * it is given. That is what lets the caller gate on `interfaceLanguage === null`
 * and nothing else: committing earlier would falsify the gate while the walkthrough
 * was still on screen, and the caller would need a latch to keep this mounted
 * through its own final step. Quitting mid-flow therefore saves nothing, which
 * is the honest outcome — setup was not finished.
 */
export default function LanguageSetupModal() {
  const { user, preferencesUid, setInterfaceLanguage, addLanguage, handleSignIn } = useUser();
  const [step, setStep] = useState<'interface' | 'study' | 'native' | 'word' | 'explain' | 'card' | 'packs' | 'signin'>('interface');
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
  /** The front-to-back tracking the one rating produced, once it is given. */
  const [rated, setRated] = useState<ReviewTracking | null>(null);
  const [signingIn, setSigningIn] = useState(false);
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
    setRated(null);
    setLoading(true);
    setStep('explain');
    try {
      const raw = await Promise.race([
        getTermExplanation(term, pendingNative, context, '', pendingStudy),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), SETUP_LOOKUP_TIMEOUT_MS)),
      ]);
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

  /**
   * Commit the answers, and the card if there is an account to put it in.
   *
   * The save is not awaited for the reason `handleDone` awaits nothing. A new
   * card is due in both directions; the rating moves the one that was asked.
   */
  const finish = () => {
    if (user && core && pendingStudy) {
      const draft = buildLookupCardDraft(core, pendingStudy, pendingNative) as Omit<Flashcard, 'createdAt' | 'id'>;
      void saveFlashcardToFirestore(
        { ...draft, uid: user.uid, ...(rated ? { frontToBack: rated } : {}) },
        pendingStudy,
      ).catch(() => {});
    }
    handleDone();
  };

  const packs = pendingStudy ? getVocabPacks(pendingStudy) : [];
  // Someone already signed in has nothing to be asked on the last step.
  const goToSignIn = () => (user ? finish() : setStep('signin'));
  // A language with no packs yet has no pack screen: there is nothing to show.
  const afterCard = () => (packs.length > 0 ? setStep('packs') : goToSignIn());

  const skipCard = () => {
    request.current++;
    setLoading(false);
    setCore(null);
    setRated(null);
    afterCard();
  };

  const signIn = async () => {
    setSigningIn(true);
    try {
      await handleSignIn();
    } catch {
      // Popup closed or blocked. The screen is still here to try again from.
    } finally {
      setSigningIn(false);
    }
  };

  // Signed in on the last step, and the account's preferences have been read.
  // If it already had an interface language the gate has unmounted this screen
  // and the effect never runs; still being here means it is this setup's
  // account to finish. See `preferencesUid` for why `user` alone is too early.
  useEffect(() => {
    if (step === 'signin' && user && preferencesUid === user.uid) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user, preferencesUid]);

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
              <button onClick={skipCard} className={linkClass}>{t(pendingInterface, 'setupSkip')}</button>
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
              <button onClick={skipCard} className={linkClass}>{t(pendingInterface, 'setupSkip')}</button>
            </div>
          </>
        )}

        {step === 'card' && core && faces && pendingStudy && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingInterface, 'setupCardTitle')}</h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-60">
              {rated
                ? t(pendingInterface, 'setupReturns', { when: setupReturnDay(new Date(rated.nextReview), pendingInterface) })
                : t(pendingInterface, flipped ? 'setupRateHint' : 'setupCardHint')}
            </p>

            {!rated ? (
              <>
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
                {/* Review's own four buttons and labels, and its scheduler:
                    the day this answers with is the day the card comes back. */}
                {flipped && (
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    {(['again', 'hard', 'good', 'easy'] as const).map(response => (
                      <button
                        key={response}
                        onClick={() => setRated(getNextReviewData({}, response))}
                        className={`${optionClass} text-sm`}
                        style={{ background: 'var(--color-surface)' }}
                      >
                        {t(pendingInterface, RATING_KEYS[response])}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm mb-3 text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupOtherWay')}</p>
                <div className="w-full min-h-[14rem] p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] shadow-lg flex flex-col items-center justify-center gap-3">
                  <span className="text-xl font-semibold text-[var(--color-text)]">
                    {faces.back || t(pendingInterface, 'noTranslation')}
                  </span>
                  <span className="text-[var(--color-muted)] italic">
                    {directionPrompt(pendingInterface, pendingStudy, pendingNative, 'backToFront')}
                  </span>
                </div>
                <button onClick={afterCard} className={`${primaryClass} mt-6`}>
                  {t(pendingInterface, 'setupNext')}
                </button>
              </>
            )}

            <div className="mt-8 flex justify-between">
              <button onClick={() => (rated ? setRated(null) : setStep('explain'))} className={linkClass}>
                {t(pendingInterface, 'setupBack')}
              </button>
              {/* Skips the rating, not the card: it is already made. */}
              {!rated && <button onClick={afterCard} className={linkClass}>{t(pendingInterface, 'setupSkip')}</button>}
            </div>
          </>
        )}

        {step === 'packs' && (
          <>
            <h2 className="text-2xl font-bold mb-1 text-[var(--color-text)]">{t(pendingInterface, 'setupPacksTitle')}</h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-60">{t(pendingInterface, 'setupPacksSubtitle')}</p>
            {/* The Packs page's own rows, names and counts. Not links: there is
                no app behind this screen yet to open one in. */}
            <ul className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {packs.map(pack => (
                <li key={pack.id} className="p-4 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)]">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h3 className="font-bold text-[var(--color-text)]">{getPackText(pack.name, pendingInterface)}</h3>
                    <span className="text-xs text-[var(--color-muted)] shrink-0">
                      {t(pendingInterface, 'deckEntryCount', { count: getPackTerms(pack).length })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-muted)] mt-1">{getPackText(pack.description, pendingInterface)}</p>
                </li>
              ))}
            </ul>
            <button onClick={goToSignIn} className={`${primaryClass} mt-6`}>
              {t(pendingInterface, 'setupNext')}
            </button>
            <button onClick={() => setStep(core ? 'card' : 'word')} className={`${linkClass} mt-4`}>
              {t(pendingInterface, 'setupBack')}
            </button>
          </>
        )}

        {step === 'signin' && (
          <>
            <h2 className="text-2xl font-bold mb-3 text-[var(--color-text)]">
              {t(pendingInterface, core ? 'setupSignInTitle' : 'setupSignInTitleNoCard')}
            </h2>
            <p className="text-sm mb-8 text-[var(--color-text)] opacity-70 leading-relaxed">
              {t(pendingInterface, 'setupSignInBody')}
            </p>
            {faces && (
              <div className="mb-8 p-4 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] flex items-baseline gap-3 flex-wrap">
                <span className="text-xl font-bold text-[var(--color-highlight)]">{faces.headword}</span>
                <span className="text-[var(--color-text)] opacity-80">{faces.back}</span>
              </div>
            )}
            {/* `user` set means signed in and waiting on the preferences read. */}
            <button onClick={signIn} disabled={signingIn || !!user} className={primaryClass}>
              {signingIn || user ? <Spinner className="w-5 h-5 mx-auto" /> : t(pendingInterface, 'signIn')}
            </button>
            <button onClick={finish} className={`${optionClass} mt-3`} style={{ background: 'var(--color-surface)' }}>
              {t(pendingInterface, 'setupNotNow')}
            </button>
            {core && (
              <p className="mt-3 text-xs text-center text-[var(--color-muted)]">{t(pendingInterface, 'setupSignInDropped')}</p>
            )}
            <button
              onClick={() => setStep(packs.length > 0 ? 'packs' : core ? 'card' : 'word')}
              className={`${linkClass} mt-6`}
            >
              {t(pendingInterface, 'setupBack')}
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

const RATING_KEYS = {
  again: 'ratingAgain',
  hard: 'ratingHard',
  good: 'ratingGood',
  easy: 'ratingEasy',
} as const;
