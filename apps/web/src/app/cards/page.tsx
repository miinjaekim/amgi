'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/UserContext';
import {
  fetchAllUserFlashcards,
  archiveFlashcard,
  restoreFlashcard,
  deleteFlashcard,
  getCardsCollection,
  Flashcard,
} from '@/services/firestore';
import { DEFAULT_DECK_FILTER, buildDeckFilters, filterCardsByDeck, getBackSide, getBackSideConfig, getCharacterBreakdown, getExampleSides, getStudyLanguageConfig } from '@amgi/core';
import type { DeckFilterId } from '@amgi/core';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { t, partOfSpeechLabel } from '@/lib/i18n';
import CardDetailModal from '@/components/CardDetailModal';
import ImportModal from '@/components/ImportModal';
import PatternsPanel from '@/components/PatternsPanel';

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'active' | 'archived' | 'all';
/**
 * Cards and grammar patterns are different objects with different review verbs,
 * so this is a mode switch rather than another deck chip: `filterCardsByDeck`
 * returns `Flashcard[]`, and a pattern is not one. They share this page because
 * it is already "the things you have saved", and a fifth nav entry for a list
 * of ten items would cost more than it returned.
 */
type LibraryMode = 'cards' | 'patterns';

function highlight(text: string, query: string): React.ReactElement {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>{p}</mark>
          : p
      )}
    </>
  );
}

export default function CardsPage() {
  const { user, nativeLanguage, studyLanguage } = useUser();
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterKey, setFilterKey] = useState<FilterKey>('active');
  const [deckKey, setDeckKey] = useState<DeckFilterId>(DEFAULT_DECK_FILTER);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ studySide: string; backSide: string } | null>(null);
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [cardOrder, setCardOrder] = useState<'korean-first' | 'english-first'>('korean-first');
  const [showImport, setShowImport] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [mode, setMode] = useState<LibraryMode>('cards');

  const langConfig = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);

  const getStudySide = (card: Flashcard) =>
    card[langConfig.studyField] ?? card.term ?? '';

  // Every card for this language, packs included. A card used to belong to a
  // pack *or* to your list, and the load dropped anything with a `packId` — but
  // a pack word you have saved is a card you own, and hiding it here left you
  // searching a library that was missing half of itself. What replaces the cut
  // is the deck chips below: a dimension you can widen or narrow, rather than a
  // decision taken before the data arrives. Review is unaffected — it filters
  // by collection itself.
  const loadCards = (uid: string) => {
    setLoading(true);
    fetchAllUserFlashcards(uid, studyLanguage)
      .then(setAllCards)
      .catch(() => setAllCards([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { setAllCards([]); return; }
    loadCards(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studyLanguage]);

  // The chips to offer and which one is lit. `deckKey` is validated against the
  // offered chips rather than reset by an effect: deleting the last card of a
  // deck retires its chip, and a selection left pointing at a chip that is no
  // longer on screen shows an empty list with no visible reason.
  const deckFilters = useMemo(
    () => buildDeckFilters(allCards, studyLanguage, nativeLanguage),
    [allCards, studyLanguage, nativeLanguage]
  );
  const activeDeck = deckFilters.some(d => d.id === deckKey) ? deckKey : DEFAULT_DECK_FILTER;
  const deckCards = useMemo(
    () => filterCardsByDeck(allCards, activeDeck, studyLanguage),
    [allCards, activeDeck, studyLanguage]
  );

  const visibleCards = useMemo(() => {
    let cards = deckCards;
    if (filterKey === 'active') cards = cards.filter(c => !c.archived);
    else if (filterKey === 'archived') cards = cards.filter(c => c.archived);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      cards = cards.filter(c =>
        getStudySide(c).toLowerCase().includes(q) ||
        getBackSide(c, nativeLanguage).toLowerCase().includes(q)
      );
    }
    if (sortKey === 'newest') cards = [...cards].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else if (sortKey === 'oldest') cards = [...cards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    else if (sortKey === 'az') cards = [...cards].sort((a, b) => getStudySide(a).localeCompare(getStudySide(b)));
    return cards;
  }, [deckCards, filterKey, search, sortKey]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleCards.length > 0 && visibleCards.every(c => selectedIds.has(c.id!));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleCards.map(c => c.id!).filter(Boolean)));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(t(nativeLanguage, 'bulkConfirmArchive'))) return;
    setBulkWorking(true);
    try {
      await Promise.all([...selectedIds].map(id => archiveFlashcard(id, studyLanguage)));
      setAllCards(prev => prev.map(c => selectedIds.has(c.id!) ? { ...c, archived: true } : c));
      exitSelectMode();
    } catch {
      setError(t(nativeLanguage, 'errorArchiveFlashcard'));
    } finally {
      setBulkWorking(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(t(nativeLanguage, 'bulkConfirmDelete'))) return;
    setBulkWorking(true);
    try {
      await Promise.all([...selectedIds].map(id => deleteFlashcard(id, studyLanguage)));
      setAllCards(prev => prev.filter(c => !selectedIds.has(c.id!)));
      exitSelectMode();
    } catch {
      setError(t(nativeLanguage, 'errorDeleteFlashcard'));
    } finally {
      setBulkWorking(false);
    }
  };

  const handleEditStart = (card: Flashcard) => {
    setEditingCardId(card.id || null);
    setEditDraft({ studySide: getStudySide(card), backSide: getBackSide(card, nativeLanguage) });
    setError(null);
  };

  const handleEditSave = async (card: Flashcard) => {
    if (!card.id || !editDraft) return;
    const collectionName = getCardsCollection(studyLanguage);
    const update = {
      [langConfig.studyField]: editDraft.studySide,
      [backConfig.backField]: editDraft.backSide,
    };
    try {
      await updateDoc(doc(db, collectionName, card.id), update);
      setAllCards(prev => prev.map(c =>
        c.id === card.id ? { ...c, ...update } : c
      ));
      setEditingCardId(null);
      setEditDraft(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveChanges'));
    }
  };

  const handleArchive = async (card: Flashcard) => {
    if (!card.id) return;
    try {
      await archiveFlashcard(card.id, studyLanguage);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: true } : c));
    } catch {
      setError(t(nativeLanguage, 'errorArchiveFlashcard'));
    }
  };

  const handleRestore = async (card: Flashcard) => {
    if (!card.id) return;
    try {
      await restoreFlashcard(card.id, studyLanguage);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: false } : c));
    } catch {
      setError(t(nativeLanguage, 'errorRestoreFlashcard'));
    }
  };

  const handleDelete = async (card: Flashcard) => {
    if (!card.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmDelete'))) return;
    try {
      await deleteFlashcard(card.id, studyLanguage);
      setAllCards(prev => prev.filter(c => c.id !== card.id));
    } catch {
      setError(t(nativeLanguage, 'errorDeleteFlashcard'));
    }
  };

  // Counted within the chosen deck, so each number is the row count that chip
  // would produce. Search is left out, as it always was — a count that moved
  // while you typed would be measuring the search box, not the library.
  const activeCount = deckCards.filter(c => !c.archived).length;
  const archivedCount = deckCards.filter(c => c.archived).length;

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t(nativeLanguage, 'cardsSortNewest') },
    { key: 'oldest', label: t(nativeLanguage, 'cardsSortOldest') },
    { key: 'az', label: t(nativeLanguage, 'cardsSortAZ') },
  ];

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'active', label: t(nativeLanguage, 'cardsFilterActive'), count: activeCount },
    { key: 'archived', label: t(nativeLanguage, 'cardsFilterArchived'), count: archivedCount },
    { key: 'all', label: t(nativeLanguage, 'cardsFilterAll'), count: deckCards.length },
  ];

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Both exports take `visibleCards` — what you are looking at is what you get,
  // filters, search and sort included. That is the whole contract, and it is
  // why neither of them re-filters: an Anki export used to drop archived cards
  // on its own, which now would hand you an empty file from the Archived tab.
  const exportCSV = () => {
    const rows = [[langConfig.label, backConfig.backLanguage, 'Part of speech', 'Formality', 'Definition', 'Characters', 'Notes', 'Examples', 'Saved', 'Status']];
    for (const c of visibleCards) {
      const studySide = getStudySide(c);
      const examples = c.examples?.map(e => {
        const sides = getExampleSides(e, studyLanguage, nativeLanguage);
        return `${sides.study} / ${sides.back}`;
      }).join(' | ') ?? '';
      const saved = c.createdAt instanceof Date ? c.createdAt.toISOString().slice(0, 10) : '';
      rows.push([
        studySide,
        getBackSide(c, nativeLanguage),
        // The label, not the code: the column is read by a person, and it is
        // the same word the badge showed them.
        partOfSpeechLabel(nativeLanguage, c) || '',
        c.formality || '',
        c.definition || '',
        getCharacterBreakdown(c) || '',
        c.notes || '',
        examples,
        saved,
        c.archived ? 'archived' : 'active',
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, 'amgi-cards.csv', 'text/csv');
    setShowExportMenu(false);
  };

  const exportAnki = () => {
    const lines = ['#separator:Tab', '#html:false', '#notetype:Basic', '#deck:Amgi'];
    for (const c of visibleCards) {
      const front = getStudySide(c);
      const backParts = [getBackSide(c, nativeLanguage)];
      if (c.briefDefinition) backParts.push(c.briefDefinition);
      else if (c.definition) backParts.push(c.definition);
      lines.push(`${front}\t${backParts.join(' — ')}`);
    }
    downloadFile(lines.join('\n'), 'amgi-cards.txt', 'text/plain');
    setShowExportMenu(false);
  };

  const handleImportSaved = async (count: number) => {
    setShowImport(false);
    if (user) loadCards(user.uid);
    setImportSuccess(t(nativeLanguage, count === 1 ? 'importSavedToastOne' : 'importSavedToast', { count }));
    setTimeout(() => setImportSuccess(null), 4000);
  };

  return (
    <div className="max-w-2xl mx-auto font-mono text-base pb-36" style={{ color: 'var(--color-text)' }}>
      <div className="flex items-start justify-between mt-8 mb-2">
        <h1 className="text-2xl font-bold text-[var(--color-highlight)]">{t(nativeLanguage, 'cardsPageTitle')}</h1>
        {/* Import and export are card-shaped — CSV columns, Anki notes — so
            they leave with the card list rather than sitting greyed out over a
            list they cannot act on. */}
        {user && mode === 'cards' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors"
            >
              {t(nativeLanguage, 'cardsImport')}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                disabled={visibleCards.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t(nativeLanguage, 'cardsExport')}
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div
                    className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-[var(--color-muted)] shadow-lg overflow-hidden"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <button
                      onClick={exportCSV}
                      className="w-full text-left px-4 py-2.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors"
                    >
                      {t(nativeLanguage, 'cardsExportCSV')}
                    </button>
                    <button
                      onClick={exportAnki}
                      className="w-full text-left px-4 py-2.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-muted)] hover:text-[var(--color-bg)] transition-colors"
                    >
                      {t(nativeLanguage, 'cardsExportAnki')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-sm mb-6 text-[var(--color-muted)]">{t(nativeLanguage, 'cardsPageDescription')}</p>
      {importSuccess && (
        <div className="mb-4 p-3 rounded-lg text-sm font-semibold" style={{ background: 'var(--color-muted)', color: 'var(--color-bg)' }}>
          {importSuccess}
        </div>
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onSaved={handleImportSaved} />}

      {!user ? (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] text-center">
          <p className="text-[var(--color-muted)] mb-4">{t(nativeLanguage, 'cardsSignInPrompt')}</p>
          <Link href="/" className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>
            {t(nativeLanguage, 'cardsGoLearn')}
          </Link>
        </div>
      ) : (
        <>
          {/* Mode switch, above everything. Sits outside the filter rows on
              purpose: those all narrow one list, and this one changes which
              list you are looking at. */}
          <div className="flex gap-2 mb-4">
            {(['cards', 'patterns'] as LibraryMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
                style={
                  mode === m
                    ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                    : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                }
              >
                {t(nativeLanguage, m === 'cards' ? 'libraryModeCards' : 'libraryModePatterns')}
              </button>
            ))}
          </div>

          {mode === 'patterns' ? (
            <PatternsPanel
              uid={user.uid}
              studyLanguage={studyLanguage}
              nativeLanguage={nativeLanguage}
            />
          ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t(nativeLanguage, 'cardsSearchPlaceholder')}
              className="w-full p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-highlight)] text-[var(--color-text)] placeholder-[var(--color-muted)]"
            />
          </div>

          {/* Deck tabs. Its own row above the status one, never mixed in:
              these pick which cards, those pick which state. Absent entirely
              until a pack has produced a card, since until then it would be a
              row of chips that all select the same list.

              Neither row is labelled. They were, briefly, when both held a chip
              called "All" and needed a heading to say which "all" was which —
              renaming the status one to "Both" removed the ambiguity at its
              source, and headings that only exist to disambiguate should go
              when the ambiguity does. The fills still separate the rows: `text`
              here, `highlight` below. */}
          {deckFilters.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {deckFilters.map(deck => (
                <button
                  key={deck.id}
                  onClick={() => { setDeckKey(deck.id); exitSelectMode(); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors"
                  style={activeDeck === deck.id
                    ? { background: 'var(--color-text)', color: 'var(--color-bg)', borderColor: 'var(--color-text)' }
                    : { background: 'transparent', color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                >
                  {deck.name}
                  <span className="ml-1 opacity-60">({deck.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setFilterKey(opt.key); exitSelectMode(); }}
                className="px-3 py-1.5 rounded-lg text-sm font-mono border transition-colors"
                style={filterKey === opt.key
                  ? { background: 'var(--color-highlight)', color: 'var(--color-bg)', borderColor: 'var(--color-highlight)' }
                  : { background: 'transparent', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }}
              >
                {opt.label}
                <span className="ml-1 opacity-60">({opt.count})</span>
              </button>
            ))}
          </div>

          {/* Sort + count + Select row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {!selectMode ? (
                <button
                  onClick={() => setSelectMode(true)}
                  disabled={visibleCards.length === 0}
                  className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t(nativeLanguage, 'bulkSelect')}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    {allVisibleSelected ? t(nativeLanguage, 'bulkDeselectAll') : t(nativeLanguage, 'bulkSelectAll')}
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    {t(nativeLanguage, 'bulkCancel')}
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {sortOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortKey(opt.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors"
                  style={sortKey === opt.key
                    ? { background: 'var(--color-muted)', color: 'var(--color-text)', borderColor: 'var(--color-muted)' }
                    : { background: 'transparent', color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setCardOrder(o => o === 'korean-first' ? 'english-first' : 'korean-first')}
                title={cardOrder === 'korean-first' ? 'Korean on top' : 'English on top'}
                className="ml-1 p-1 rounded-lg border transition-colors"
                style={{ background: 'transparent', color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--color-highlight)] text-[var(--color-bg)] text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Card list */}
          {loading ? (
            <div className="text-[var(--color-muted)]">{t(nativeLanguage, 'loadingFlashcards')}</div>
          ) : visibleCards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted)] mb-4">{t(nativeLanguage, 'cardsEmpty')}</p>
              {filterKey === 'active' && allCards.length === 0 && (
                <Link href="/" className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>
                  {t(nativeLanguage, 'cardsGoLearn')}
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {visibleCards.map(card => {
                const isSelected = card.id ? selectedIds.has(card.id) : false;
                return (
                  <li
                    key={card.id}
                    className="p-4 rounded-xl border shadow flex gap-3 transition-all"
                    style={{
                      background: isSelected ? 'var(--color-muted-dark, var(--color-surface))' : 'var(--color-surface)',
                      borderColor: isSelected ? 'var(--color-highlight)' : 'var(--color-muted)',
                      opacity: card.archived ? 0.65 : 1,
                    }}
                  >
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <button
                        onClick={() => card.id && toggleSelect(card.id)}
                        className="flex-shrink-0 w-5 h-5 mt-1 rounded border-2 flex items-center justify-center transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--color-highlight)' : 'var(--color-muted)',
                          background: isSelected ? 'var(--color-highlight)' : 'transparent',
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3" fill="none" stroke="var(--color-bg)" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}

                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      {editingCardId === card.id && editDraft ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editDraft.studySide}
                            onChange={e => setEditDraft(d => d ? { ...d, studySide: e.target.value } : d)}
                            className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)]"
                          />
                          <input
                            type="text"
                            value={editDraft.backSide}
                            onChange={e => setEditDraft(d => d ? { ...d, backSide: e.target.value } : d)}
                            className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSave(card)}
                              className="px-4 py-2 rounded-lg font-bold"
                              style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                            >
                              {t(nativeLanguage, 'save')}
                            </button>
                            <button
                              onClick={() => { setEditingCardId(null); setEditDraft(null); }}
                              className="px-4 py-2 rounded-lg bg-[var(--color-muted)] text-[var(--color-text)] font-bold"
                            >
                              {t(nativeLanguage, 'cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            className="w-full text-left hover:bg-[var(--color-muted)]/10 rounded-lg -mx-1 px-1 py-1 transition-colors"
                            onClick={() => selectMode && card.id ? toggleSelect(card.id) : setDetailCard(card)}
                          >
                            <div className="font-semibold text-lg text-[var(--color-text)]">
                              {highlight(cardOrder === 'korean-first' ? getStudySide(card) : getBackSide(card, nativeLanguage), search)}
                            </div>
                            <div className="text-[var(--color-highlight)] text-base">
                              {highlight(cardOrder === 'korean-first' ? getBackSide(card, nativeLanguage) : getStudySide(card), search)}
                            </div>
                          </button>
                          <div className="text-xs text-[var(--color-muted)]">
                            {t(nativeLanguage, 'savedAt')} {card.createdAt instanceof Date ? card.createdAt.toLocaleDateString() : String(card.createdAt)}
                            {card.archived && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs border border-[var(--color-muted)]">
                                {t(nativeLanguage, 'cardsFilterArchived')}
                              </span>
                            )}
                          </div>
                          {!selectMode && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {!card.archived ? (
                                <>
                                  <button
                                    onClick={() => handleEditStart(card)}
                                    className="px-3 py-1 rounded-lg text-sm font-bold"
                                    style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}
                                  >
                                    {t(nativeLanguage, 'edit')}
                                  </button>
                                  <button
                                    onClick={() => handleArchive(card)}
                                    className="px-3 py-1 rounded-lg text-sm font-bold bg-[var(--color-muted)] text-[var(--color-text)]"
                                  >
                                    {t(nativeLanguage, 'archive')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleRestore(card)}
                                  className="px-3 py-1 rounded-lg text-sm font-bold bg-[var(--color-muted)] text-[var(--color-text)]"
                                >
                                  {t(nativeLanguage, 'restore')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(card)}
                                className="px-3 py-1 rounded-lg text-sm font-bold border border-[var(--color-muted)] text-[var(--color-muted)] hover:border-red-400 hover:text-red-400"
                              >
                                {t(nativeLanguage, 'delete')}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
          )}
        </>
      )}

      {/* Bulk action bar */}
      {selectMode && mode === 'cards' && (
        <div
          className="fixed bottom-16 sm:bottom-0 left-0 sm:left-[var(--sidenav-w,14rem)] right-0 z-40 border-t"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-muted)' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--color-muted)]">
              {selectedIds.size} {nativeLanguage === 'Korean' ? '개 선택됨' : `selected`}
            </span>
            <div className="flex gap-2">
              {filterKey !== 'archived' && (
                <button
                  onClick={handleBulkArchive}
                  disabled={selectedIds.size === 0 || bulkWorking}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--color-muted)] text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t(nativeLanguage, 'bulkArchiveSelected')}
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkWorking}
                className="px-4 py-2 rounded-lg text-sm font-bold border border-red-400 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-400/10"
              >
                {t(nativeLanguage, 'bulkDeleteSelected')}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          studyLanguage={studyLanguage}
          nativeLanguage={nativeLanguage}
          onClose={() => setDetailCard(null)}
          // The modal can now write — enrichment, an edited back, archive,
          // delete — so this list has to hear about it.
          onChanged={() => user && loadCards(user.uid)}
        />
      )}
    </div>
  );
}
