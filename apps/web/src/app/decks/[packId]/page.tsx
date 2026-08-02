'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import {
  fetchAllUserFlashcards,
  saveFlashcardsBatch,
  Flashcard,
} from '@/services/firestore';
import {
  buildPackCardDraft,
  collectSavedTerms,
  countSavedEntries,
  getCollectionId,
  getPackEntries,
  getPackText,
  getStudyLangSide,
  getVocabPack,
  resolvePackBack,
  unsavedEntries,
} from '@amgi/core';
import type { PackEntry, PackSection } from '@amgi/core';
import CardDetailModal from '@/components/CardDetailModal';
import PronounceButton from '@/components/PronounceButton';
import { t } from '@/lib/i18n';

/** The id used for the whole-deck enrol, which is not a section. */
const ALL = '__all__';

export default function DeckDetailPage() {
  const { packId } = useParams<{ packId: string }>();
  const router = useRouter();
  const { user, nativeLanguage, studyLanguage } = useUser();
  const pack = getVocabPack(studyLanguage, packId);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PackEntry | null>(null);
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
  // counts towards the deck.
  const savedTerms = useMemo(() => cards && collectSavedTerms(cards), [cards]);

  /**
   * Whether we actually know what this account has already saved.
   *
   * `savedTerms` is null while the fetch is in flight and after it fails, and
   * the enrol path read that as "nothing is saved" — so a tap before the load
   * landed, or any failed load, enrolled the entire deck on top of itself. One
   * account ended up with all 71 katakana cards twice. Not knowing has to block
   * the write, not wave it through.
   */
  const knowsSaved = savedTerms !== null;

  /**
   * The card behind each pack term, whichever way it got there.
   *
   * Keyed on text rather than `packId`, and preferring a card this deck
   * produced when there are both, because the question the deck page asks when
   * you tap an entry is "what do I already have for this word" — and a word you
   * looked up on your own is still what you have.
   */
  const cardsByTerm = useMemo(() => {
    const byTerm = new Map<string, Flashcard>();
    for (const card of cards ?? []) {
      const key = getStudyLangSide(card).toLowerCase();
      if (!key) continue;
      const existing = byTerm.get(key);
      if (!existing || getCollectionId(card) === packId) byTerm.set(key, card);
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

  /**
   * Enrol a set of entries in one batched write, then go straight to reviewing
   * the deck. Sections are the unit this is normally called with: 160 words is
   * not one decision, and "save this section" turns a pack into six sittings
   * that each end somewhere sensible.
   */
  async function enrol(id: string, entries: readonly PackEntry[]) {
    if (!pack) return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    const unsaved = unsavedEntries(entries, savedTerms);
    if (unsaved === null) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
    if (unsaved.length > 0) {
      setEnrolling(id);
      try {
        await saveFlashcardsBatch(
          unsaved.map(entry =>
            buildPackCardDraft(entry, pack.id, user.uid, studyLanguage) as Omit<Flashcard, 'createdAt' | 'id'>
          ),
          studyLanguage
        );
      } catch {
        setError(t(nativeLanguage, 'deckEnrollError'));
        setEnrolling(null);
        return;
      }
      setEnrolling(null);
    }
    router.push(`/review?collection=${encodeURIComponent(pack.id)}`);
  }

  const entries = getPackEntries(pack);
  const savedCount = savedTerms ? countSavedEntries(entries, savedTerms) : null;
  const detailCard = detail ? cardsByTerm.get(detail.study.toLowerCase()) : undefined;

  function renderSection(section: PackSection) {
    const sectionSaved = savedTerms ? countSavedEntries(section.entries, savedTerms) : null;
    const allSaved = sectionSaved === section.entries.length;
    const busy = enrolling === section.id;

    return (
      <section key={section.id} className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            {getPackText(section.name, nativeLanguage)}
          </h2>
          <span className="text-xs text-[var(--color-muted)]">
            {sectionSaved !== null
              ? t(nativeLanguage, 'packsSaved', { added: sectionSaved, total: section.entries.length })
              : t(nativeLanguage, 'deckEntryCount', { count: section.entries.length })}
          </span>
          <button
            onClick={() => enrol(section.id, section.entries)}
            // Signed out is not the same as still loading: that case keeps the
            // button live so the click can explain itself.
            disabled={!!enrolling || allSaved || (!!user && !knowsSaved)}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? t(nativeLanguage, 'deckSectionSaving')
              : allSaved
                ? t(nativeLanguage, 'deckSectionAllSaved')
                : t(nativeLanguage, 'deckSaveSection')}
          </button>
        </div>
        {section.note && (
          <p className="text-xs text-[var(--color-muted)] opacity-70 mb-3">
            {getPackText(section.note, nativeLanguage)}
          </p>
        )}
        {pack!.layout === 'grid' ? (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(4.5rem, 1fr))' }}
          >
            {section.entries.map(entry => renderGridTile(entry))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {section.entries.map(entry => renderListRow(entry))}
          </div>
        )}
      </section>
    );
  }

  function renderGridTile(entry: PackEntry) {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    const owned = cardsByTerm.get(entry.study.toLowerCase());
    const back = owned ? undefined : resolvePackBack(entry.back, studyLanguage, nativeLanguage);
    return (
      <div
        key={entry.study}
        className={`flex flex-col items-center rounded-lg border border-[var(--color-muted)] py-1.5 transition-opacity ${saved ? 'opacity-50' : ''}`}
      >
        <button
          onClick={() => setDetail(entry)}
          className="w-full flex flex-col items-center rounded hover:bg-[var(--color-muted)]/30"
          aria-label={`Open ${entry.study}`}
        >
          <span className="text-2xl leading-tight text-[var(--color-text)]">{entry.study}</span>
          <span className="text-[10px] leading-tight text-[var(--color-muted)]">
            {back ?? resolvePackBack(entry.back, studyLanguage, nativeLanguage)}{saved && ' ✓'}
          </span>
        </button>
        {pack!.pronounceable && (
          <PronounceButton text={entry.study} studyLanguage={studyLanguage} size="sm" />
        )}
      </div>
    );
  }

  // Words need a row, not a tile: `comprehensive` and 뒷받침하다 do not fit in
  // the 4.5rem box that makes 71 kana scannable.
  function renderListRow(entry: PackEntry) {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <button
        key={entry.study}
        onClick={() => setDetail(entry)}
        className={`flex items-baseline gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-muted)] text-left hover:bg-[var(--color-muted)]/20 transition-colors ${saved ? 'opacity-50' : ''}`}
      >
        <span className="text-sm text-[var(--color-text)]">{entry.study}</span>
        <span className="text-xs text-[var(--color-muted)]">
          {resolvePackBack(entry.back, studyLanguage, nativeLanguage)}
        </span>
        {saved && <span className="text-xs text-[var(--color-muted)]">✓</span>}
      </button>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {backLink}

      <div className="mt-4 flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-[var(--color-highlight)]">
          {getPackText(pack.name, nativeLanguage)}
        </h1>
        <span className="text-xs text-[var(--color-muted)]">
          {savedCount !== null
            ? t(nativeLanguage, 'packsSaved', { added: savedCount, total: entries.length })
            : t(nativeLanguage, 'deckEntryCount', { count: entries.length })}
        </span>
      </div>

      <p className="text-sm text-[var(--color-muted)] mt-2">
        {getPackText(pack.description, nativeLanguage)}
      </p>
      <p className="text-xs text-[var(--color-muted)] opacity-70 mt-2 mb-4">
        {t(nativeLanguage, pack.layout === 'grid' ? 'packTapHintCards' : 'packTapHint')}
      </p>

      {/* Every pack is enrollable and drillable now that every pack is
          pre-authored. The whole-deck button is deliberately secondary to the
          per-section ones above the lists: it is still the right call on 71
          kana and the wrong one on 160 TOPIK words. */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => enrol(ALL, entries)}
          disabled={!!enrolling || (!!user && !knowsSaved)}
          className="px-5 py-2.5 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enrolling === ALL ? t(nativeLanguage, 'deckEnrolling') : t(nativeLanguage, 'deckSaveAll')}
        </button>
        <Link
          href={`/decks/${pack.id}/drill`}
          className="px-5 py-2.5 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
        >
          {t(nativeLanguage, 'drillLink')}
        </Link>
      </div>

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

      {pack.sections.map(renderSection)}

      {/* One tap opens the card, saved or not. This replaces both the old
          save-on-tap and the deck's own management panel, and it is what makes
          the deck→Learn round trip optional rather than mandatory. */}
      {detail && (
        <CardDetailModal
          card={detailCard}
          entry={detailCard ? null : detail}
          packId={pack.id}
          uid={user?.uid}
          studyLanguage={studyLanguage}
          nativeLanguage={nativeLanguage}
          onClose={() => setDetail(null)}
          onChanged={loadCards}
        />
      )}
    </div>
  );
}
