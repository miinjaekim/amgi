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
  canRetrySubtopic,
  getVocabPack,
  isUserPackId,
  packRefId,
  sourceDomain,
  userPackId,
  resolvePackBack,
  unsavedEntries,
} from '@amgi/core';
import type { PackEntry, PackSection, UserPackSubtopic } from '@amgi/core';
import CardDetailModal from '@/components/CardDetailModal';
import PronounceButton from '@/components/PronounceButton';
import { usePackLost } from '@/hooks/usePackLost';
import { useUserPacks } from '@/components/UserPacksContext';
import { deleteUserPack, startPackSubtopic } from '@/services/userPacks';
import { t } from '@/lib/i18n';

/** The id used for the whole-deck enrol, which is not a section. */
const ALL = '__all__';

export default function DeckDetailPage() {
  const { packId } = useParams<{ packId: string }>();
  const router = useRouter();
  const { user, interfaceLanguage, deckNativeLanguage, studyLanguage } = useUser();
  // A learner's own pack resolves through the registry like any other, but only
  // once their packs have loaded; reading them here also re-renders the page
  // as sourcing fills the pack in.
  const { userPacks } = useUserPacks();
  const userPack = isUserPackId(packId) ? userPacks?.find(p => userPackId(p.id) === packId) : undefined;
  const pack = getVocabPack(studyLanguage, packId);
  const packLost = usePackLost(pack);
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
  /**
   * The subpack the entry list is narrowed to, or null for the whole deck.
   *
   * A filter rather than a route: the deck page's job is browsing the words,
   * and the default view stays exactly what it was. What it removes is the
   * scroll — on an 11-section pack, finding one section meant paging past
   * several hundred entries to reach its header.
   */
  const [openSubpack, setOpenSubpack] = useState<string | null>(null);

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
      ← {t(interfaceLanguage, 'decksBack')}
    </Link>
  );

  // A pack belongs to one study language, so switching languages while a deck
  // is open leaves this URL pointing at nothing. Land on the Decks list, now
  // showing the new language's packs; `replace` so Back doesn't return here.
  useEffect(() => {
    if (packLost) router.replace('/decks');
  }, [packLost, router]);

  if (!pack && isUserPackId(packId) && user && userPacks === null) return <div className="max-w-3xl mx-auto">{backLink}</div>;

  // A URL that never resolved is a stale bookmark or a pack removed from the
  // registry, and gets the message.
  if (!pack) {
    if (packLost) return null;
    return (
      <div className="max-w-3xl mx-auto">
        {backLink}
        <p className="mt-6 text-[var(--color-muted)]">{t(interfaceLanguage, 'deckNotFound')}</p>
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
    if (!user) { setError(t(interfaceLanguage, 'signInToSave')); return; }
    const drafts: Omit<Flashcard, 'createdAt' | 'id'>[] = [];
    for (const section of sections) {
      const unsaved = unsavedEntries(section.entries, savedTerms);
      if (unsaved === null) { setError(t(interfaceLanguage, 'deckCardsUnavailable')); return; }
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
        setError(t(interfaceLanguage, 'deckEnrollError'));
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

  // A selection that no longer names a section — a stale one left over from
  // another deck — shows the whole deck rather than nothing at all.
  const picked = pack.sections.filter(section => section.id === openSubpack);
  const shownSections = picked.length > 0 ? picked : pack.sections;

  /** How many of a set of entries are saved, in the wording used everywhere. */
  const progressLabel = (of: readonly PackEntry[]) => {
    const saved = savedTerms ? countSavedEntries(of, savedTerms) : null;
    return saved !== null
      ? t(interfaceLanguage, 'packsSaved', { added: saved, total: of.length })
      : t(interfaceLanguage, 'deckEntryCount', { count: of.length });
  };

  /**
   * The subpacks, all visible at once, as the thing you pick before reading.
   *
   * Shaped like the review picker's second level — name over progress — because
   * it is the same choice in the same words, one surface earlier. A grid rather
   * than a column so eleven sections fit above the fold instead of becoming the
   * scroll they were meant to remove.
   *
   * Hidden on a single-section pack, where the row would offer a choice between
   * a thing and itself.
   */
  function renderSubpackPicker() {
    if (pack!.sections.length < 2) return null;
    const option = (id: string | null, name: string, of: readonly PackEntry[]) => {
      const active = id === null ? picked.length === 0 : id === openSubpack;
      return (
        <button
          key={id ?? '__all__'}
          onClick={() => setOpenSubpack(id)}
          aria-pressed={active}
          className={`text-left px-3 py-2 rounded-lg border transition-colors ${
            active
              ? 'border-[var(--color-highlight)] bg-[var(--color-muted)]/20'
              : 'border-[var(--color-muted)] hover:bg-[var(--color-muted)]/20'
          }`}
        >
          <span className="block text-sm text-[var(--color-text)]">{name}</span>
          <span className="block text-xs text-[var(--color-muted)] mt-0.5">{progressLabel(of)}</span>
        </button>
      );
    };
    return (
      <div className="mb-8">
        <p className="text-xs text-[var(--color-muted)] mb-2">{t(interfaceLanguage, 'deckSections')}</p>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))' }}
        >
          {option(null, t(interfaceLanguage, 'deckSubpackAll'), entries)}
          {pack!.sections.map(section =>
            option(section.id, getPackText(section.name, interfaceLanguage), section.entries)
          )}
        </div>
      </div>
    );
  }
  const detailCard = detail ? cardsByTerm.get(detail.entry.study.toLowerCase()) : undefined;

  async function retry(subtopic: UserPackSubtopic) {
    if (!user || !userPack) return;
    const knownTerms = (cards ?? []).map(card => getStudyLangSide(card)).filter(Boolean);
    try {
      await startPackSubtopic(user, userPack.id, subtopic.id, knownTerms);
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
    }
  }

  async function removePack() {
    if (!user || !userPack || !window.confirm(t(interfaceLanguage, 'userPackDeleteConfirm'))) return;
    try {
      await deleteUserPack(user, userPack.id);
      router.replace('/decks');
    } catch {
      setError(t(interfaceLanguage, 'makePackError'));
    }
  }

  /**
   * The parts of a learner's pack that are not a section yet: still being
   * sourced, or come back empty and waiting for a retry.
   */
  function renderUnfinished() {
    const open = userPack?.subtopics.filter(s => s.status !== 'ready') ?? [];
    if (open.length === 0) return null;
    return (
      <ul className="mb-6 flex flex-col gap-2">
        {open.map(s => {
          const name = getPackText(s.name, interfaceLanguage);
          const retryable = canRetrySubtopic(s);
          return (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--color-muted)] text-sm">
              <span className="flex-1 text-[var(--color-muted)]">
                {retryable
                  ? t(interfaceLanguage, 'userPackPartFailed', { name })
                  : t(interfaceLanguage, 'userPackPartPending', { name })}
              </span>
              {retryable && (
                <button onClick={() => retry(s)} className="font-semibold text-[var(--color-highlight)]">
                  {t(interfaceLanguage, 'userPackRetry')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  /**
   * Where a section's words came from, one link per site. Citations are what
   * let a user pack be checked, and later adopted, against the sourcing
   * standard, so they are on the page rather than only in the data.
   */
  function renderSources(section: PackSection) {
    const entries = userPack?.subtopics.find(s => s.id === section.id)?.entries ?? [];
    const sites = new Map<string, string>();
    let material = false;
    for (const entry of entries) {
      for (const source of entry.sources) {
        if (source.kind === 'material') material = true;
        else if (!sites.has(sourceDomain(source.url))) sites.set(sourceDomain(source.url), source.url);
      }
    }
    if (sites.size === 0 && !material) return null;
    return (
      <p className="text-xs text-[var(--color-muted)] mt-3">
        {t(interfaceLanguage, 'userPackSources')}:{' '}
        {[...sites].map(([domain, url], i) => (
          <React.Fragment key={domain}>
            {i > 0 && ', '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-text)]">
              {domain}
            </a>
          </React.Fragment>
        ))}
        {material && `${sites.size ? ', ' : ''}${t(interfaceLanguage, 'userPackMaterial')}`}
      </p>
    );
  }

  function renderSection(section: PackSection) {
    const sectionSaved = savedTerms ? countSavedEntries(section.entries, savedTerms) : null;
    const allSaved = sectionSaved === section.entries.length;
    const busy = enrolling === section.id;
    const subpackId = packRefId(pack!.id, section.id);

    return (
      <section key={section.id} className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            {getPackText(section.name, interfaceLanguage)}
          </h2>
          <span className="text-xs text-[var(--color-muted)]">{progressLabel(section.entries)}</span>
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
                ? t(interfaceLanguage, 'deckSectionSaving')
                : allSaved
                  ? t(interfaceLanguage, 'deckSectionAllSaved')
                  : t(interfaceLanguage, 'deckSaveSection')}
            </button>
            {/* Only once there is something to review. A subpack you have saved
                nothing of would open an empty session, which reads as a bug
                rather than as an answer. */}
            {!!sectionSaved && (
              <Link
                href={reviewHref(subpackId)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
              >
                {t(interfaceLanguage, 'deckReviewSection')}
              </Link>
            )}
            {/* Drill needs nothing saved — it runs over the pack's own entries,
                so it is offered on a subpack you have never enrolled in. */}
            <Link
              href={`/decks/${pack!.id}/drill?section=${encodeURIComponent(section.id)}`}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] border border-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {t(interfaceLanguage, 'drillLink')}
            </Link>
          </div>
        </div>
        {section.note && (
          <p className="text-xs text-[var(--color-muted)] opacity-70 mb-3">
            {getPackText(section.note, interfaceLanguage)}
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
        {pack!.userMade && renderSources(section)}
      </section>
    );
  }

  function renderGridTile(entry: PackEntry, section: PackSection) {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    const owned = cardsByTerm.get(entry.study.toLowerCase());
    const back = owned ? undefined : resolvePackBack(entry.back, studyLanguage, deckNativeLanguage);
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
            {back ?? resolvePackBack(entry.back, studyLanguage, deckNativeLanguage)}{saved && ' ✓'}
          </span>
        </button>
        {pack!.pronounceable && (
          <PronounceButton text={entry.study} eum={entry.eum} studyLanguage={studyLanguage} size="sm" />
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
          {resolvePackBack(entry.back, studyLanguage, deckNativeLanguage)}
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
          {getPackText(pack.name, interfaceLanguage)}
        </h1>
        <span className="text-xs text-[var(--color-muted)]">
          {savedCount !== null
            ? t(interfaceLanguage, 'packsSaved', { added: savedCount, total: entries.length })
            : t(interfaceLanguage, 'deckEntryCount', { count: entries.length })}
        </span>
      </div>

      <p className="text-sm text-[var(--color-muted)] mt-2">
        {getPackText(pack.description, interfaceLanguage)}
      </p>
      {pack.userMade && (
        <p className="text-xs text-[var(--color-highlight)] mt-2">{t(interfaceLanguage, 'userPackLabel')}</p>
      )}
      <p className="text-xs text-[var(--color-muted)] opacity-70 mt-2 mb-4">
        {t(interfaceLanguage, pack.layout === 'grid' ? 'packTapHintCards' : 'packTapHint')}
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
          {enrolling === ALL ? t(interfaceLanguage, 'deckEnrolling') : t(interfaceLanguage, 'deckSaveAll')}
        </button>
        {/* The whole pack in one sitting, which is what you want once you
            have worked through the sections separately — at that point doing
            them one at a time is the same material several times over. */}
        {!!savedCount && (
          <Link
            href={reviewHref(pack.id)}
            className="px-5 py-2.5 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
          >
            {t(interfaceLanguage, 'deckReviewDeck')}
          </Link>
        )}
        <Link
          href={`/decks/${pack.id}/drill`}
          className="px-5 py-2.5 rounded-lg font-semibold border border-[var(--color-muted)] text-[var(--color-text)] hover:bg-[var(--color-muted)]/20 transition-colors"
        >
          {t(interfaceLanguage, 'drillLink')}
        </Link>
      </div>

      {/* A failed load leaves the deck looking empty, which reads as "nothing
          saved yet" — say so, rather than letting it be discovered by enrolling
          a second copy. */}
      {loadFailed && !error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[var(--color-muted)]/30 text-[var(--color-text)]">
          {t(interfaceLanguage, 'deckCardsUnavailable')}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-[var(--color-muted)]/30 text-[var(--color-text)]">
          {error}
        </div>
      )}

      {renderUnfinished()}

      {renderSubpackPicker()}

      {shownSections.map(renderSection)}

      {userPack && (
        <button onClick={removePack} className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-highlight)] transition-colors">
          {t(interfaceLanguage, 'userPackDelete')}
        </button>
      )}

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
          interfaceLanguage={interfaceLanguage}

          deckNativeLanguage={deckNativeLanguage}
          onClose={() => setDetail(null)}
          // No `onChanged`: the subscription carries the modal's writes.
        />
      )}
    </div>
  );
}
