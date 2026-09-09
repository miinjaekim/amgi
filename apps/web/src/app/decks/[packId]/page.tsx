'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/components/UserContext';
import {
  subscribeToAllUserFlashcards,
  saveFlashcardsBatch,
  Flashcard,
} from '@/services/firestore';
import {
  buildPackCardDraft,
  cardInCollection,
  collectSavedTerms,
  countSavedEntries,
  getPackEntries,
  getPackText,
  getStudyLangSide,
  getVocabPack,
  packRefId,
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
  /**
   * The entry whose card modal is open, with the section it was tapped in —
   * which is what a card saved from the modal gets filed under. Losing the
   * section here would file it at the pack level and leave it out of every
   * subpack review.
   */
  const [detail, setDetail] = useState<{ entry: PackEntry; section: PackSection } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Live: enrolling writes a batch of cards, and the enrolled/remaining counts
  // below are derived from this list, so they update themselves.
  useEffect(() => {
    if (!user) { setCards(null); return; }
    return subscribeToAllUserFlashcards(
      user.uid,
      studyLanguage,
      fetched => { setCards(fetched); setLoadFailed(false); },
      // Browsing still works without this, but enrolling does not: a failure
      // used to be swallowed, leaving the deck looking empty and the enrol
      // button primed to add every card a second time.
      () => setLoadFailed(true),
    );
  }, [user, studyLanguage]);

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
      if (!existing || cardInCollection(card, packId)) byTerm.set(key, card);
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
   * Enrol a set of sections in one batched write, then go straight to reviewing
   * what was added. Sections are the unit: 160 words is not one decision, and
   * "save this section" turns a pack into six sittings that each end somewhere
   * sensible.
   *
   * Sections rather than a flat entry list because each card is filed under its
   * own subpack, the whole-deck button included. Saving the deck and then
   * reviewing only Greetings has to work, and it only does if every card knows
   * which section it came from — filing the whole deck at the pack level would
   * leave every subpack empty.
   */
  async function enrol(busyId: string, sections: readonly PackSection[], collection: string) {
    if (!pack) return;
    if (!user) { setError(t(nativeLanguage, 'signInToSave')); return; }
    const drafts: Omit<Flashcard, 'createdAt' | 'id'>[] = [];
    for (const section of sections) {
      const unsaved = unsavedEntries(section.entries, savedTerms);
      if (unsaved === null) { setError(t(nativeLanguage, 'deckCardsUnavailable')); return; }
      for (const entry of unsaved) {
        drafts.push(
          buildPackCardDraft(entry, packRefId(pack.id, section.id), user.uid, studyLanguage) as Omit<Flashcard, 'createdAt' | 'id'>
        );
      }
    }
    if (drafts.length > 0) {
      setEnrolling(busyId);
      try {
        await saveFlashcardsBatch(drafts, studyLanguage);
      } catch {
        setError(t(nativeLanguage, 'deckEnrollError'));
        setEnrolling(null);
        return;
      }
      setEnrolling(null);
    }
    router.push(`/review?collection=${encodeURIComponent(collection)}`);
  }

  const reviewHref = (collection: string) =>
    `/review?collection=${encodeURIComponent(collection)}`;

  const entries = getPackEntries(pack);
  const savedCount = savedTerms ? countSavedEntries(entries, savedTerms) : null;
  const detailCard = detail ? cardsByTerm.get(detail.entry.study.toLowerCase()) : undefined;

  function renderSection(section: PackSection) {
    const sectionSaved = savedTerms ? countSavedEntries(section.entries, savedTerms) : null;
    const allSaved = sectionSaved === section.entries.length;
    const busy = enrolling === section.id;
    const subpackId = packRefId(pack!.id, section.id);

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
          {/* A subpack is a thing you sit down with on its own, so the three
              things you can do to one live together here: save it, review what
              you have saved of it, drill it. Review is the new half — before
              this, saving Greetings alone still sent you into all 59 words. */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => enrol(section.id, [section], subpackId)}
              // Signed out is not the same as still loading: that case keeps the
              // button live so the click can explain itself.
              disabled={!!enrolling || allSaved || (!!user && !knowsSaved)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy
                ? t(nativeLanguage, 'deckSectionSaving')
                : allSaved
                  ? t(nativeLanguage, 'deckSectionAllSaved')
                  : t(nativeLanguage, 'deckSaveSection')}
            </button>
            {/* Only once there is something to review. A subpack you have saved
                nothing of would open an empty session, which reads as a bug
                rather than as an answer. */}
            {!!sectionSaved && (
              <Link
                href={reviewHref(subpackId)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
              >
                {t(nativeLanguage, 'deckReviewSection')}
              </Link>
            )}
            {/* Drill needs nothing saved — it runs over the pack's own entries,
                so it is offered on a subpack you have never enrolled in. */}
            <Link
              href={`/decks/${pack!.id}/drill?section=${encodeURIComponent(section.id)}`}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] border border-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(nativeLanguage, 'drillLink')}
            </Link>
          </div>
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
            {section.entries.map(entry => renderGridTile(entry, section))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {section.entries.map(entry => renderListRow(entry, section))}
          </div>
        )}
      </section>
    );
  }

  function renderGridTile(entry: PackEntry, section: PackSection) {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    const owned = cardsByTerm.get(entry.study.toLowerCase());
    const back = owned ? undefined : resolvePackBack(entry.back, studyLanguage, nativeLanguage);
    return (
      <div
        key={entry.study}
        className={`flex flex-col items-center rounded-lg border border-[var(--color-muted)] py-1.5 transition-opacity ${saved ? 'opacity-50' : ''}`}
      >
        <button
          onClick={() => setDetail({ entry, section })}
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
  function renderListRow(entry: PackEntry, section: PackSection) {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <button
        key={entry.study}
        onClick={() => setDetail({ entry, section })}
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
          onClick={() => enrol(ALL, pack.sections, pack.id)}
          disabled={!!enrolling || (!!user && !knowsSaved)}
          className="px-5 py-2.5 rounded-lg font-semibold bg-[var(--color-highlight)] text-[var(--color-bg)] hover:bg-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enrolling === ALL ? t(nativeLanguage, 'deckEnrolling') : t(nativeLanguage, 'deckSaveAll')}
        </button>
        {/* The whole pack in one sitting, which is what you want once you
            have worked through the sections separately — at that point doing
            them one at a time is the same material several times over. */}
        {!!savedCount && (
          <Link
            href={reviewHref(pack.id)}
            className="px-5 py-2.5 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            {t(nativeLanguage, 'deckReviewDeck')}
          </Link>
        )}
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
          entry={detailCard ? null : detail.entry}
          // The subpack, not the pack: a card saved from this modal has to land
          // in the same collection the section's own save button would file it
          // in, or the two paths would disagree about where the word lives.
          packId={packRefId(pack.id, detail.section.id)}
          uid={user?.uid}
          studyLanguage={studyLanguage}
          nativeLanguage={nativeLanguage}
          onClose={() => setDetail(null)}
          // No `onChanged`: the subscription carries the modal's writes.
        />
      )}
    </div>
  );
}
