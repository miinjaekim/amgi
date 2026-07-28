'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import {
  archiveFlashcard,
  deleteFlashcard,
  fetchAllUserFlashcards,
  getCardsCollection,
  restoreFlashcard,
  saveFlashcardToFirestore,
  saveFlashcardsBatch,
  Flashcard,
} from '@/services/firestore';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  buildPackCardDraft,
  collectSavedTerms,
  getCollectionId,
  getPackText,
  getPackTerms,
  unsavedPackCards,
  getStudyLanguageConfig,
  getBackSideConfig,
  getStudyLangSide,
  getVocabPack,
} from '@amgi/core';
import type { PackCard } from '@amgi/core';
import PronounceButton from '@/components/PronounceButton';
import { t } from '@/lib/i18n';

export default function DeckDetailPage() {
  const { packId } = useParams<{ packId: string }>();
  const router = useRouter();
  const { user, nativeLanguage, studyLanguage } = useUser();
  const pack = getVocabPack(studyLanguage, packId);
  const langConfig = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  /** The pack's authored back, in the language this reader wants it. */
  const packBack = (card: PackCard) => getPackText(card.back, nativeLanguage);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageTerm, setManageTerm] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadCards = useCallback(() => {
    if (!user) { setCards(null); return () => {}; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(fetched => { if (!cancelled) { setCards(fetched); setLoadFailed(false); } })
      // Browsing still works without this, but enrolling does not: a failure
      // used to be swallowed, leaving the deck looking empty and the enrol
      // button primed to add every card a second time.
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, [user, studyLanguage]);

  useEffect(loadCards, [loadCards]);

  // Progress deliberately matches on text: a word you looked up on your own
  // counts towards the deck. Management is keyed on `packId` instead, because
  // only a card this deck produced belongs to this deck — one you looked up is
  // yours, and stays on My Cards.
  const savedTerms = useMemo(() => cards && collectSavedTerms(cards), [cards]);

  /**
   * Whether we actually know what this account has already saved.
   *
   * `savedTerms` is null while the fetch is in flight and after it fails, and
   * the enrol path read that as "nothing is saved" — so a tap before the load
   * landed, or any failed load, enrolled the entire deck on top of itself. One
   * account ended up with all 71 katakana cards twice that way. Not knowing has
   * to block the write, not wave it through.
   */
  const knowsSaved = savedTerms !== null;
  const deckCards = useMemo(() => {
    const byTerm = new Map<string, Flashcard>();
    for (const card of cards ?? []) {
      if (getCollectionId(card) === packId) byTerm.set(getStudyLangSide(card).toLowerCase(), card);
    }
    return byTerm;
  }, [cards, packId]);

  const backLink = (
    <Link
      href="/decks"
      className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
    >
      ← {t(nativeLanguage, 'decksBack')}
    </Link>
  );

  // A pack belongs to one study language, so switching languages while a deck
  // is open leaves this URL pointing at nothing. Same message serves a stale
  // bookmark and a pack that was removed from the registry.
  if (!pack) {
    return (
      <div className="max-w-3xl mx-auto">
        {backLink}
        <p className="mt-6 text-[var(--color-muted)]">{t(nativeLanguage, 'deckNotFound')}</p>
      </div>
    );
  }

  // A looked-up word needs the full Learn flow — the value is the explanation
  // Gemini writes, which this page has no business rendering.
  function openInLearn(word: string, context?: string) {
    const params = new URLSearchParams({ term: word });
    if (context) params.set('context', context);
    router.push(`/?${params.toString()}`);
  }

  // A pre-authored card is already complete, so it goes straight to Firestore —
  // there is nothing for /api/explain to add about あ, and asking would cost a
  // model call per character to get prose nobody wants on the card.
  async function handleSaveCard(card: PackCard) {
    if (!pack || savingTerm || savedTerms?.has(card.study.toLowerCase())) return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    // Same reasoning as the deck enrol: without the saved set we cannot tell a
    // new card from one already held, and a duplicate costs more than a wait.
    if (!knowsSaved) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
    setSavingTerm(card.study);
    try {
      const draft = buildPackCardDraft(card, pack.id, user.uid, studyLanguage);
      await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
      loadCards();
      setError(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingTerm(null);
    }
  }

  /**
   * Enrol the whole deck, then go straight to reviewing it. Everything not
   * already saved goes in one batched write: enrolling is one decision to the
   * user, so it should not be 107 taps or 107 round trips.
   *
   * The deck lands in review as ~2 items per card, uncapped. That flood is
   * contained to this collection, which is much of why collections are kept
   * apart in the first place.
   */
  async function handleReviewDeck() {
    if (!pack || pack.kind !== 'cards') return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    const unsaved = unsavedPackCards(pack, savedTerms);
    if (unsaved === null) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
    if (unsaved.length > 0) {
      setEnrolling(true);
      try {
        await saveFlashcardsBatch(
          unsaved.map(card => buildPackCardDraft(card, pack.id, user!.uid, studyLanguage) as Omit<Flashcard, 'createdAt' | 'id'>),
          studyLanguage
        );
      } catch {
        setError(t(nativeLanguage, 'deckEnrollError'));
        setEnrolling(false);
        return;
      }
      setEnrolling(false);
    }
    router.push(`/review?collection=${encodeURIComponent(pack.id)}`);
  }

  const managed = manageTerm ? deckCards.get(manageTerm.toLowerCase()) : undefined;

  function openManage(term: string) {
    const card = deckCards.get(term.toLowerCase());
    if (!card) return;
    setManageTerm(term);
    setEditDraft(card[backConfig.backField] ?? card.english ?? card.translation ?? '');
    setError(null);
  }

  function closeManage() {
    setManageTerm(null);
    setEditDraft(null);
  }

  // Only the back side is editable: the study side is the pack's own text, and
  // rewriting あ would leave the entry unmatched against the deck it came from.
  async function handleManageSave() {
    if (!managed?.id || editDraft === null) return;
    try {
      await updateDoc(doc(db, getCardsCollection(studyLanguage), managed.id), {
        [backConfig.backField]: editDraft,
      });
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorSaveChanges'));
    }
  }

  async function handleManageArchive() {
    if (!managed?.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmArchive'))) return;
    try {
      await archiveFlashcard(managed.id, studyLanguage);
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorArchiveFlashcard'));
    }
  }

  async function handleManageRestore() {
    if (!managed?.id) return;
    try {
      await restoreFlashcard(managed.id, studyLanguage);
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorRestoreFlashcard'));
    }
  }

  async function handleManageDelete() {
    if (!managed?.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmDelete'))) return;
    try {
      await deleteFlashcard(managed.id, studyLanguage);
      loadCards();
      closeManage();
    } catch {
      setError(t(nativeLanguage, 'errorDeleteFlashcard'));
    }
  }

  const terms = getPackTerms(pack);
  const savedCount = savedTerms
    ? terms.filter(term => savedTerms.has(term.toLowerCase())).length
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      {backLink}

      <div className="mt-4 flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-[var(--color-highlight)]">
          {getPackText(pack.name, nativeLanguage)}
        </h1>
        <span className="text-xs text-[var(--color-muted)]">
          {savedCount !== null
            ? t(nativeLanguage, 'packsSaved', { added: savedCount, total: terms.length })
            : t(nativeLanguage, 'deckEntryCount', { count: terms.length })}
        </span>
      </div>

      <p className="text-sm text-[var(--color-muted)] mt-2">
        {getPackText(pack.description, nativeLanguage)}
      </p>
      <p className="text-xs text-[var(--color-muted)] opacity-70 mt-2 mb-4">
        {t(nativeLanguage, pack.kind === 'cards' ? 'packTapHintCards' : 'packTapHint')}
        {deckCards.size > 0 && ` ${t(nativeLanguage, 'deckManageHint')}`}
      </p>

      {/* Only a `cards` pack can be reviewed or drilled as a deck — a lookup
          pack holds words with no back side, so there is neither a card to
          enrol nor an answer to check against. */}
      {pack.kind === 'cards' && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={handleReviewDeck}
            // Signed out is not the same as still loading: that case keeps the
            // button live so the click can explain itself.
            disabled={enrolling || (!!user && !knowsSaved)}
            className="px-5 py-2.5 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrolling ? t(nativeLanguage, 'deckEnrolling') : t(nativeLanguage, 'deckReviewDeck')}
          </button>
          <Link
            href={`/decks/${pack.id}/drill`}
            className="px-5 py-2.5 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            {t(nativeLanguage, 'drillLink')}
          </Link>
        </div>
      )}

      {/* A failed load leaves the deck looking empty, which reads as "nothing
          saved yet" — say so, rather than letting it be discovered by enrolling
          a second copy. */}
      {loadFailed && !error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[var(--color-muted)]/30 text-[var(--color-text)]">
          {t(nativeLanguage, 'deckCardsUnavailable')}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[var(--color-muted)]/30 text-[var(--color-text)]">
          {error}
        </div>
      )}

      {/* Management panel for one entry. Inline above the list rather than a
          control per row, so the list stays a list — the grid is what makes
          107 characters scannable. */}
      {managed && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--color-muted)] bg-[var(--color-surface)] space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl text-[var(--color-text)]">{manageTerm}</span>
            {managed.archived && (
              <span className="px-1.5 py-0.5 rounded text-xs border border-[var(--color-muted)] text-[var(--color-muted)]">
                {t(nativeLanguage, 'cardsFilterArchived')}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
              {t(nativeLanguage, backConfig.backLabelKey)}
            </label>
            <input
              type="text"
              value={editDraft ?? ''}
              onChange={e => setEditDraft(e.target.value)}
              className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)] text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleManageSave}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
            >
              {t(nativeLanguage, 'save')}
            </button>
            {managed.archived ? (
              <button
                onClick={handleManageRestore}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted-dark)]"
              >
                {t(nativeLanguage, 'restore')}
              </button>
            ) : (
              <button
                onClick={handleManageArchive}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted-dark)]"
              >
                {t(nativeLanguage, 'archive')}
              </button>
            )}
            <button
              onClick={handleManageDelete}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-muted)] hover:border-red-400 hover:text-red-400"
            >
              {t(nativeLanguage, 'delete')}
            </button>
            <button
              onClick={closeManage}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              {t(nativeLanguage, 'cancel')}
            </button>
          </div>
        </div>
      )}

      {pack.kind === 'lookup' ? (
        <div className="flex flex-wrap gap-2">
          {pack.words.map(({ word, context }) => {
            const saved = savedTerms?.has(word.toLowerCase()) ?? false;
            return (
              <button
                key={word}
                onClick={() => openInLearn(word, context)}
                className={`px-3 py-1 rounded-full border text-sm transition-colors border-[var(--color-muted)] hover:bg-[var(--color-muted)]/30 ${
                  saved ? 'opacity-40 text-[var(--color-muted)]' : 'text-[var(--color-text)]'
                }`}
              >
                {word}
                {saved && <span className="ml-1">✓</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(4.5rem, 1fr))' }}
        >
          {pack.cards.map(card => {
            const saved = savedTerms?.has(card.study.toLowerCase()) ?? false;
            const owned = deckCards.get(card.study.toLowerCase());
            return (
              <div
                key={card.study}
                className={`flex flex-col items-center rounded-lg border py-1.5 transition-opacity ${
                  saved ? 'opacity-40' : ''
                } ${savingTerm === card.study ? 'animate-pulse' : ''}`}
                style={{
                  borderColor: manageTerm === card.study
                    ? 'var(--color-highlight)'
                    : 'var(--color-muted)',
                }}
              >
                {/* One tap does the thing this entry needs: save it if it isn't
                    saved, manage it once this deck owns a card for it. */}
                <button
                  onClick={() => owned ? openManage(card.study) : handleSaveCard(card)}
                  disabled={saved && !owned}
                  className="w-full flex flex-col items-center rounded hover:bg-[var(--color-muted)]/30 disabled:hover:bg-transparent"
                  aria-label={owned
                    ? `Manage the card for ${card.study} (${packBack(card)})`
                    : `Save ${card.study} (${packBack(card)}) as a card`}
                >
                  <span className="text-2xl leading-tight text-[var(--color-text)]">{card.study}</span>
                  <span className="text-[10px] leading-tight text-[var(--color-muted)]">
                    {owned ? (owned[backConfig.backField] ?? packBack(card)) : packBack(card)}{saved && ' ✓'}
                  </span>
                </button>
                {pack.pronounceable && (
                  <PronounceButton text={card.study} studyLanguage={studyLanguage} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
