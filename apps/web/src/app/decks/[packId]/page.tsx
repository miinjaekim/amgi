'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import { fetchAllUserFlashcards, saveFlashcardToFirestore, Flashcard } from '@/services/firestore';
import {
  buildPackCardDraft,
  collectSavedTerms,
  getPackText,
  getPackTerms,
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
  const [savedTerms, setSavedTerms] = useState<Set<string> | null>(null);
  const [savingTerm, setSavingTerm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setSavedTerms(null); return; }
    let cancelled = false;
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(cards => { if (!cancelled) setSavedTerms(collectSavedTerms(cards)); })
      .catch(() => {}); // saved-marking is a nicety — browsing still works
    return () => { cancelled = true; };
  }, [user, studyLanguage]);

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
    setSavingTerm(card.study);
    try {
      const draft = buildPackCardDraft(card, pack.id, user.uid, studyLanguage);
      await saveFlashcardToFirestore(draft as Omit<Flashcard, 'createdAt' | 'id'>, studyLanguage);
      setSavedTerms(prev => new Set(prev ?? []).add(card.study.toLowerCase()));
      setError(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveFlashcard'));
    } finally {
      setSavingTerm(null);
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
      <p className="text-xs text-[var(--color-muted)] opacity-70 mt-2 mb-6">
        {t(nativeLanguage, pack.kind === 'cards' ? 'packTapHintCards' : 'packTapHint')}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[var(--color-muted)]/30 text-[var(--color-text)]">
          {error}
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
            return (
              <div
                key={card.study}
                className={`flex flex-col items-center rounded-lg border border-[var(--color-muted)] py-1.5 transition-opacity ${
                  saved ? 'opacity-40' : ''
                } ${savingTerm === card.study ? 'animate-pulse' : ''}`}
              >
                <button
                  onClick={() => handleSaveCard(card)}
                  disabled={saved}
                  className="w-full flex flex-col items-center rounded hover:bg-[var(--color-muted)]/30 disabled:hover:bg-transparent"
                  aria-label={`Save ${card.study} (${card.back}) as a card`}
                >
                  <span className="text-2xl leading-tight text-[var(--color-text)]">{card.study}</span>
                  <span className="text-[10px] leading-tight text-[var(--color-muted)]">
                    {card.back}{saved && ' ✓'}
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
