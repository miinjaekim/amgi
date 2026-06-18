'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/components/UserContext';
import {
  fetchAllUserFlashcards,
  archiveFlashcard,
  restoreFlashcard,
  deleteFlashcard,
  Flashcard,
} from '@/services/firestore';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { t } from '@/lib/i18n';
import CardDetailModal from '@/components/CardDetailModal';

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'active' | 'archived' | 'all';

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
  const { user, nativeLanguage } = useUser();
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterKey, setFilterKey] = useState<FilterKey>('active');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ term: string; translation: string } | null>(null);
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [cardOrder, setCardOrder] = useState<'korean-first' | 'english-first'>('korean-first');

  useEffect(() => {
    if (!user) { setAllCards([]); return; }
    setLoading(true);
    fetchAllUserFlashcards(user.uid)
      .then(setAllCards)
      .catch(() => setAllCards([]))
      .finally(() => setLoading(false));
  }, [user]);

  const visibleCards = useMemo(() => {
    let cards = allCards;
    if (filterKey === 'active') cards = cards.filter(c => !c.archived);
    else if (filterKey === 'archived') cards = cards.filter(c => c.archived);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      cards = cards.filter(c =>
        (c.korean || c.term || '').toLowerCase().includes(q) ||
        (c.english || c.translation || '').toLowerCase().includes(q)
      );
    }
    if (sortKey === 'newest') cards = [...cards].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else if (sortKey === 'oldest') cards = [...cards].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    else if (sortKey === 'az') cards = [...cards].sort((a, b) => (a.korean || a.term || '').localeCompare(b.korean || b.term || ''));
    return cards;
  }, [allCards, filterKey, search, sortKey]);

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
      await Promise.all([...selectedIds].map(id => archiveFlashcard(id)));
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
      await Promise.all([...selectedIds].map(id => deleteFlashcard(id)));
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
    setEditDraft({ term: card.term, translation: card.translation || '' });
    setError(null);
  };

  const handleEditSave = async (card: Flashcard) => {
    if (!card.id || !editDraft) return;
    const isKoreanTerm = card.termLanguage === 'Korean';
    const korean = isKoreanTerm ? editDraft.term : editDraft.translation;
    const english = isKoreanTerm ? editDraft.translation : editDraft.term;
    try {
      await updateDoc(doc(db, 'cards', card.id), { term: editDraft.term, translation: editDraft.translation, korean, english });
      setAllCards(prev => prev.map(c =>
        c.id === card.id ? { ...c, term: editDraft.term, translation: editDraft.translation, korean, english } : c
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
      await archiveFlashcard(card.id);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: true } : c));
    } catch {
      setError(t(nativeLanguage, 'errorArchiveFlashcard'));
    }
  };

  const handleRestore = async (card: Flashcard) => {
    if (!card.id) return;
    try {
      await restoreFlashcard(card.id);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: false } : c));
    } catch {
      setError(t(nativeLanguage, 'errorRestoreFlashcard'));
    }
  };

  const handleDelete = async (card: Flashcard) => {
    if (!card.id) return;
    if (!window.confirm(t(nativeLanguage, 'confirmDelete'))) return;
    try {
      await deleteFlashcard(card.id);
      setAllCards(prev => prev.filter(c => c.id !== card.id));
    } catch {
      setError(t(nativeLanguage, 'errorDeleteFlashcard'));
    }
  };

  const activeCount = allCards.filter(c => !c.archived).length;
  const archivedCount = allCards.filter(c => c.archived).length;

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t(nativeLanguage, 'cardsSortNewest') },
    { key: 'oldest', label: t(nativeLanguage, 'cardsSortOldest') },
    { key: 'az', label: t(nativeLanguage, 'cardsSortAZ') },
  ];

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'active', label: t(nativeLanguage, 'cardsFilterActive'), count: activeCount },
    { key: 'archived', label: t(nativeLanguage, 'cardsFilterArchived'), count: archivedCount },
    { key: 'all', label: t(nativeLanguage, 'cardsFilterAll'), count: allCards.length },
  ];

  return (
    <div className="max-w-2xl mx-auto font-mono text-base pb-36" style={{ color: 'var(--color-text)' }}>
      <h1 className="text-2xl font-bold mb-2 mt-8 text-[var(--color-highlight)]">{t(nativeLanguage, 'cardsPageTitle')}</h1>
      <p className="text-sm mb-6 text-[var(--color-muted)]">{t(nativeLanguage, 'cardsPageDescription')}</p>

      {!user ? (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-muted)] text-center">
          <p className="text-[var(--color-muted)] mb-4">{t(nativeLanguage, 'cardsSignInPrompt')}</p>
          <a href="/" className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
            style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>
            {t(nativeLanguage, 'cardsGoLearn')}
          </a>
        </div>
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

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
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
              <span className="text-sm text-[var(--color-muted)]">
                {visibleCards.length} {nativeLanguage === 'Korean' ? '개' : `card${visibleCards.length !== 1 ? 's' : ''}`}
              </span>
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
                <a href="/" className="inline-block px-5 py-2.5 rounded-lg font-semibold transition-colors"
                  style={{ background: 'var(--color-highlight)', color: 'var(--color-bg)' }}>
                  {t(nativeLanguage, 'cardsGoLearn')}
                </a>
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
                            value={editDraft.term}
                            onChange={e => setEditDraft(d => d ? { ...d, term: e.target.value } : d)}
                            className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-muted)] text-[var(--color-text)]"
                          />
                          <input
                            type="text"
                            value={editDraft.translation}
                            onChange={e => setEditDraft(d => d ? { ...d, translation: e.target.value } : d)}
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
                              {highlight(cardOrder === 'korean-first' ? (card.korean || card.term) : (card.english || card.translation || ''), search)}
                            </div>
                            <div className="text-[var(--color-highlight)] text-base">
                              {highlight(cardOrder === 'korean-first' ? (card.english || card.translation || '') : (card.korean || card.term), search)}
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

      {/* Bulk action bar */}
      {selectMode && (
        <div
          className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 border-t"
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
          nativeLanguage={nativeLanguage}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
