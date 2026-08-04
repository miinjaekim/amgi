import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useUser } from '../../src/context/UserContext';
import {
  fetchAllUserFlashcards, archiveFlashcard, restoreFlashcard,
  deleteFlashcard, updateFlashcardFields,
} from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import { t, DEFAULT_DECK_FILTER, buildDeckFilters, filterCardsByDeck, getCharacterBreakdown, getStudyLanguageConfig, getBackSideConfig, getStudyLangSide, getBackSide, getExampleSides } from '@amgi/core';
import type { CardSideField, DeckFilterId } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import CardDetailModal from '../../src/components/CardDetailModal';
import ImportModal from '../../src/components/ImportModal';
import FilterSheet from '../../src/components/FilterSheet';
import type { FilterGroup } from '../../src/components/FilterSheet';
import { SkeletonBar, SkeletonGroup, SkeletonRows } from '../../src/components/Skeleton';
import type { Palette } from '../../src/theme';

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'active' | 'archived' | 'all';

export default function CardsScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage } = useUser();
  const config = getStudyLanguageConfig(studyLanguage);
  const backConfig = getBackSideConfig(studyLanguage, nativeLanguage);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterKey, setFilterKey] = useState<FilterKey>('active');
  const [deckKey, setDeckKey] = useState<DeckFilterId>(DEFAULT_DECK_FILTER);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Record<CardSideField, string>> | null>(null);
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Every card for this language, packs included. A card used to belong to a
  // pack *or* to your list, and the load dropped anything with a `packId` — but
  // a pack word you have saved is a card you own, and hiding it here left you
  // searching a library that was missing half of itself. What replaces the cut
  // is the deck group in the filter sheet: a dimension you can widen or narrow,
  // rather than a decision taken before the data arrives. Review is unaffected
  // — it filters by collection itself.
  const loadCards = useCallback(() => {
    if (!user) { setAllCards([]); return; }
    setLoading(true);
    fetchAllUserFlashcards(user.uid, studyLanguage)
      .then(setAllCards)
      .catch(() => setError('Failed to load cards.'))
      .finally(() => setLoading(false));
  }, [user, studyLanguage, reloadToken]);

  useEffect(loadCards, [loadCards]);

  /**
   * Re-read whenever this tab is focused again.
   *
   * Expo Router keeps this screen mounted, so the effect above would otherwise
   * never run and a card saved on Learn would not appear until the process was
   * killed. Deliberately unconditional rather than gated on the card counter:
   * that counter lives in module scope, and Fast Refresh re-evaluates a module
   * when anything importing it is edited, so its value cannot be trusted to
   * survive a dev session. One query per tab visit is the honest price of a
   * list that is never quietly wrong.
   */
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    // Mount already loads; without this the first focus would fetch twice.
    if (firstFocus.current) { firstFocus.current = false; return; }
    setReloadToken(n => n + 1);
  }, []));

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
        getStudyLangSide(c).toLowerCase().includes(q) ||
        getBackSide(c, nativeLanguage).toLowerCase().includes(q)
      );
    }
    if (sortKey === 'newest') return [...cards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortKey === 'oldest') return [...cards].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return [...cards].sort((a, b) => getStudyLangSide(a).localeCompare(getStudyLangSide(b)));
  }, [deckCards, filterKey, search, sortKey]);

  // Counted within the chosen deck, so each number is the row count that chip
  // would produce. Search is left out, as it always was — a count that moved
  // while you typed would be measuring the search box, not the library.
  const activeCount = deckCards.filter(c => !c.archived).length;
  const archivedCount = deckCards.filter(c => c.archived).length;

  // ── Select mode ──
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = visibleCards.length > 0 && visibleCards.every(c => selectedIds.has(c.id!));
  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleCards.map(c => c.id!).filter(Boolean)));
  };

  const handleBulkArchive = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('', t(nativeLanguage, 'bulkConfirmArchive'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'archive'), style: 'destructive',
        onPress: async () => {
          setBulkWorking(true);
          try {
            await Promise.all([...selectedIds].map(id => archiveFlashcard(id, studyLanguage)));
            setAllCards(prev => prev.map(c => selectedIds.has(c.id!) ? { ...c, archived: true } : c));
            exitSelectMode();
          } catch { setError(t(nativeLanguage, 'errorArchiveFlashcard')); }
          finally { setBulkWorking(false); }
        },
      },
    ]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('', t(nativeLanguage, 'bulkConfirmDelete'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'delete'), style: 'destructive',
        onPress: async () => {
          setBulkWorking(true);
          try {
            await Promise.all([...selectedIds].map(id => deleteFlashcard(id, studyLanguage)));
            setAllCards(prev => prev.filter(c => !selectedIds.has(c.id!)));
            exitSelectMode();
          } catch { setError(t(nativeLanguage, 'errorDeleteFlashcard')); }
          finally { setBulkWorking(false); }
        },
      },
    ]);
  };

  // ── Export ──
  const shareFile = async (content: string, filename: string, mimeType: string, uti: string) => {
    try {
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
      }
    } catch {
      setError('Export failed.');
    }
  };

  // Both exports take `visibleCards` — what you are looking at is what you get,
  // filters, search and sort included. That is the whole contract, and it is
  // why neither of them re-filters: an Anki export used to drop archived cards
  // on its own, which now would hand you an empty file from the Archived tab.
  const exportCSV = () => {
    const rows = [[config.label, backConfig.backLanguage, 'Formality', 'Definition', 'Characters', 'Notes', 'Examples', 'Saved', 'Status']];
    for (const c of visibleCards) {
      const examples = c.examples?.map(e => {
        const sides = getExampleSides(e, studyLanguage, nativeLanguage);
        return `${sides.study} / ${sides.back}`;
      }).join(' | ') ?? '';
      const saved = c.createdAt instanceof Date ? c.createdAt.toISOString().slice(0, 10) : '';
      rows.push([
        getStudyLangSide(c), getBackSide(c, nativeLanguage), c.formality || '', c.definition || '',
        getCharacterBreakdown(c) || '', c.notes || '', examples, saved, c.archived ? 'archived' : 'active',
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    shareFile(csv, 'amgi-cards.csv', 'text/csv', 'public.comma-separated-values-text');
  };

  const exportAnki = () => {
    const lines = ['#separator:Tab', '#html:false', '#notetype:Basic', '#deck:Amgi'];
    for (const c of visibleCards) {
      const backParts = [getBackSide(c, nativeLanguage)];
      if (c.briefDefinition) backParts.push(c.briefDefinition);
      else if (c.definition) backParts.push(c.definition);
      lines.push(`${getStudyLangSide(c)}\t${backParts.join(' — ')}`);
    }
    shareFile(lines.join('\n'), 'amgi-cards.txt', 'text/plain', 'public.plain-text');
  };

  const promptExport = () => {
    if (visibleCards.length === 0) return;
    Alert.alert(t(nativeLanguage, 'cardsExport'), undefined, [
      { text: t(nativeLanguage, 'cardsExportCSV'), onPress: exportCSV },
      { text: t(nativeLanguage, 'cardsExportAnki'), onPress: exportAnki },
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
    ]);
  };

  const handleImportSaved = (count: number) => {
    setShowImport(false);
    loadCards();
    setImportSuccess(t(nativeLanguage, count === 1 ? 'importSavedToastOne' : 'importSavedToast', { count }));
    setTimeout(() => setImportSuccess(null), 4000);
  };

  // ── Per-card actions ──
  const handleEditSave = async (card: Flashcard) => {
    if (!card.id || !editDraft) return;
    try {
      await updateFlashcardFields(card.id, editDraft, studyLanguage);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, ...editDraft } : c));
      setEditingCardId(null);
      setEditDraft(null);
    } catch { setError(t(nativeLanguage, 'errorSaveChanges')); }
  };

  const handleArchive = (card: Flashcard) => {
    Alert.alert('', t(nativeLanguage, 'confirmArchive'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'archive'), style: 'destructive',
        onPress: async () => {
          try {
            await archiveFlashcard(card.id!, studyLanguage);
            setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: true } : c));
          } catch { setError(t(nativeLanguage, 'errorArchiveFlashcard')); }
        },
      },
    ]);
  };

  const handleRestore = async (card: Flashcard) => {
    try {
      await restoreFlashcard(card.id!, studyLanguage);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: false } : c));
    } catch { setError(t(nativeLanguage, 'errorRestoreFlashcard')); }
  };

  const handleDelete = (card: Flashcard) => {
    Alert.alert('', t(nativeLanguage, 'confirmDelete'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteFlashcard(card.id!, studyLanguage);
            setAllCards(prev => prev.filter(c => c.id !== card.id));
          } catch { setError(t(nativeLanguage, 'errorDeleteFlashcard')); }
        },
      },
    ]);
  };

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'active', label: t(nativeLanguage, 'cardsFilterActive'), count: activeCount },
    { key: 'archived', label: t(nativeLanguage, 'cardsFilterArchived'), count: archivedCount },
    { key: 'all', label: t(nativeLanguage, 'cardsFilterAll'), count: deckCards.length },
  ];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t(nativeLanguage, 'cardsSortNewest') },
    { key: 'oldest', label: t(nativeLanguage, 'cardsSortOldest') },
    { key: 'az', label: t(nativeLanguage, 'cardsSortAZ') },
  ];

  // Three groups behind one button. The deck group is left out entirely when
  // there are no pack cards — `buildDeckFilters` already returns nothing there,
  // and a group holding two chips that select the same list is noise.
  const filterGroups: FilterGroup[] = [
    ...(deckFilters.length > 0 ? [{
      title: t(nativeLanguage, 'cardsFilterDeckGroup'),
      options: deckFilters.map(d => ({ key: d.id, label: d.name, count: d.count })),
      selected: activeDeck,
      onSelect: (key: string) => { setDeckKey(key); exitSelectMode(); },
    }] : []),
    {
      title: t(nativeLanguage, 'cardsFilterStatusGroup'),
      options: FILTERS.map(f => ({ key: f.key, label: f.label, count: f.count })),
      selected: filterKey,
      onSelect: (key: string) => { setFilterKey(key as FilterKey); exitSelectMode(); },
    },
    {
      // No counts: sorting reorders the same rows, so every count would be the
      // same number three times.
      title: t(nativeLanguage, 'cardsFilterSortGroup'),
      options: SORTS,
      selected: sortKey,
      onSelect: (key: string) => setSortKey(key as SortKey),
    },
  ];

  // What the button says: the lit chip from each group, in the order the sheet
  // lists them. Reads as a sentence about the list you are looking at.
  const filterSummary = filterGroups
    .map(group => group.options.find(o => o.key === group.selected)?.label)
    .filter(Boolean)
    .join(' · ');

  const renderCard = ({ item: card }: { item: Flashcard }) => {
    const editing = editingCardId === card.id;
    const isSelected = card.id ? selectedIds.has(card.id) : false;
    return (
      <View style={[s.cardRow, card.archived && s.cardRowArchived, isSelected && s.cardRowSelected]}>
        {editing && editDraft ? (
          <View style={s.editForm}>
            <TextInput
              style={s.editInput}
              value={editDraft[config.studyField] ?? ''}
              onChangeText={v => setEditDraft(d => d ? { ...d, [config.studyField]: v } : d)}
              autoFocus
            />
            <TextInput
              style={s.editInput}
              value={editDraft[backConfig.backField] ?? ''}
              onChangeText={v => setEditDraft(d => d ? { ...d, [backConfig.backField]: v } : d)}
            />
            <View style={s.editActions}>
              <TouchableOpacity style={s.editSaveBtn} onPress={() => handleEditSave(card)}>
                <Text style={s.editSaveBtnText}>{t(nativeLanguage, 'save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.editCancelBtn} onPress={() => { setEditingCardId(null); setEditDraft(null); }}>
                <Text style={s.editCancelBtnText}>{t(nativeLanguage, 'cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.rowInner}>
            {selectMode && (
              <TouchableOpacity
                style={[s.checkbox, isSelected && s.checkboxOn]}
                onPress={() => card.id && toggleSelect(card.id)}
              >
                {isSelected && <Text style={s.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            <View style={s.rowBody}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => selectMode && card.id ? toggleSelect(card.id) : setDetailCard(card)}
              >
                <View style={s.cardContent}>
                  <Text style={s.cardKorean}>{getStudyLangSide(card)}</Text>
                  <Text style={s.cardEnglish}>{getBackSide(card, nativeLanguage)}</Text>
                  <Text style={s.cardDate}>
                    {t(nativeLanguage, 'savedAt')} {new Date(card.createdAt).toLocaleDateString()}
                    {card.archived ? `  ·  ${t(nativeLanguage, 'cardsFilterArchived')}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              {!selectMode && (
                <View style={s.cardActions}>
                  {!card.archived ? (
                    <>
                      <TouchableOpacity style={s.actionBtn} onPress={() => {
                        setEditingCardId(card.id!);
                        setEditDraft({ [config.studyField]: getStudyLangSide(card), [backConfig.backField]: getBackSide(card, nativeLanguage) });
                      }}>
                        <Text style={s.actionBtnText}>{t(nativeLanguage, 'edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.actionBtnMuted]} onPress={() => handleArchive(card)}>
                        <Text style={s.actionBtnMutedText}>{t(nativeLanguage, 'archive')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={[s.actionBtn, s.actionBtnMuted]} onPress={() => handleRestore(card)}>
                      <Text style={s.actionBtnMutedText}>{t(nativeLanguage, 'restore')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnDelete]} onPress={() => handleDelete(card)}>
                    <Text style={s.actionBtnDeleteText}>{t(nativeLanguage, 'delete')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>{t(nativeLanguage, 'cardsPageTitle')}</Text>
          {user && (
            <View style={s.headerActions}>
              <TouchableOpacity style={s.headerBtn} onPress={() => setShowImport(true)}>
                <Text style={s.headerBtnText}>{t(nativeLanguage, 'cardsImport')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.headerBtn, visibleCards.length === 0 && s.headerBtnDisabled]}
                onPress={promptExport}
                disabled={visibleCards.length === 0}
              >
                <Text style={s.headerBtnText}>{t(nativeLanguage, 'cardsExport')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={s.subtitle}>{t(nativeLanguage, 'cardsPageDescription')}</Text>
      </View>

      {importSuccess && (
        <View style={s.successBanner}>
          <Text style={s.successText}>{importSuccess}</Text>
        </View>
      )}

      {!user ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>{t(nativeLanguage, 'cardsSignInPrompt')}</Text>
        </View>
      ) : (
        <>
          <View style={s.controls}>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t(nativeLanguage, 'cardsSearchPlaceholder')}
              placeholderTextColor={C.muted}
            />

            {/* One row for all three choosing controls. Three rows of chips —
                deck, status, sort — put half a screen of chrome between you and
                the first card, to answer a question you asked once. The button
                says what is currently on, which the chips never did well: they
                show what is available and leave you to spot which one is lit.
                In select mode it steps aside for the selection controls, since
                changing a filter drops the selection anyway. */}
            <View style={s.actionRow}>
              {!selectMode ? (
                <>
                  <TouchableOpacity
                    style={s.filterBtn}
                    onPress={() => setShowFilters(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t(nativeLanguage, 'cardsFilterButtonLabel')}
                    accessibilityValue={{ text: filterSummary }}
                  >
                    <Text style={s.filterBtnText} numberOfLines={1}>{filterSummary}</Text>
                    <Text style={s.filterBtnCaret}>▾</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.selectBtn, visibleCards.length === 0 && s.headerBtnDisabled]}
                    onPress={() => setSelectMode(true)}
                    disabled={visibleCards.length === 0}
                  >
                    <Text style={s.selectBtnText}>{t(nativeLanguage, 'bulkSelect')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={s.selectControls}>
                  <TouchableOpacity style={s.selectBtn} onPress={toggleSelectAll}>
                    <Text style={s.selectBtnText}>
                      {allVisibleSelected ? t(nativeLanguage, 'bulkDeselectAll') : t(nativeLanguage, 'bulkSelectAll')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.selectBtn} onPress={exitSelectMode}>
                    <Text style={s.selectBtnText}>{t(nativeLanguage, 'bulkCancel')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            // The row shape you are about to get, at its real height, so the
            // list does not jump when the query lands. Six is roughly a screen.
            <SkeletonGroup label={t(nativeLanguage, 'loadingFlashcards')} style={s.list}>
              <SkeletonRows count={6} render={() => (
                <View style={s.cardRow}>
                  <SkeletonBar width={140} height={19} />
                  <SkeletonBar width={190} height={16} style={s.skelGap} />
                  <SkeletonBar width={110} height={11} style={s.skelGap} />
                  {/* The Edit / Archive / Delete row, which is most of the
                      height a card row actually takes. */}
                  <View style={s.skelActions}>
                    <SkeletonBar width={52} height={28} />
                    <SkeletonBar width={68} height={28} />
                    <SkeletonBar width={60} height={28} />
                  </View>
                </View>
              )} />
            </SkeletonGroup>
          ) : visibleCards.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>{t(nativeLanguage, 'cardsEmpty')}</Text>
            </View>
          ) : (
            <FlatList
              data={visibleCards}
              keyExtractor={item => item.id!}
              renderItem={renderCard}
              contentContainerStyle={s.list}
            />
          )}
        </>
      )}

      {/* Bulk action bar */}
      {selectMode && (
        <View style={s.bulkBar}>
          <Text style={s.bulkCount}>
            {nativeLanguage === 'Korean' ? `${selectedIds.size}개 선택됨` : `${selectedIds.size} selected`}
          </Text>
          <View style={s.bulkActions}>
            {filterKey !== 'archived' && (
              <TouchableOpacity
                style={[s.bulkBtn, (selectedIds.size === 0 || bulkWorking) && s.headerBtnDisabled]}
                onPress={handleBulkArchive}
                disabled={selectedIds.size === 0 || bulkWorking}
              >
                <Text style={s.bulkBtnText}>{t(nativeLanguage, 'bulkArchiveSelected')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.bulkBtn, s.bulkBtnDelete, (selectedIds.size === 0 || bulkWorking) && s.headerBtnDisabled]}
              onPress={handleBulkDelete}
              disabled={selectedIds.size === 0 || bulkWorking}
            >
              <Text style={s.bulkBtnDeleteText}>{t(nativeLanguage, 'bulkDeleteSelected')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showFilters && (
        <FilterSheet
          groups={filterGroups}
          nativeLanguage={nativeLanguage}
          onClose={() => setShowFilters(false)}
        />
      )}
      {showImport && (
        <ImportModal
          studyLanguage={studyLanguage}
          onClose={() => setShowImport(false)}
          onSaved={handleImportSaved}
        />
      )}
      {detailCard && (
        <CardDetailModal
          card={detailCard}
          studyLanguage={studyLanguage}
          nativeLanguage={nativeLanguage}
          onClose={() => setDetailCard(null)}
          // The modal can now write — enrichment, an edited back, archive,
          // delete — so this list has to hear about it.
          onChanged={loadCards}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: C.highlight },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  headerBtnDisabled: { opacity: 0.3 },
  headerBtnText: { fontSize: 12, color: C.muted },

  successBanner: { marginHorizontal: 16, marginTop: 8, backgroundColor: C.border, borderRadius: 10, padding: 12 },
  successText: { color: C.text, fontSize: 13, fontWeight: '600' },

  controls: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  searchInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, marginTop: 8,
  },
  // No wrap: the summary takes the slack and ellipsizes, so a long pack name
  // cannot push Select onto a second line and undo the row this replaced.
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  filterBtn: {
    flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  filterBtnText: { flexShrink: 1, fontSize: 13, color: C.text },
  filterBtnCaret: { fontSize: 11, color: C.muted },

  selectControls: { flexDirection: 'row', gap: 6 },
  selectBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  selectBtnText: { fontSize: 12, color: C.muted },

  errorBanner: { marginHorizontal: 16, backgroundColor: '#fde8e8', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorText: { color: C.error, fontSize: 13, fontWeight: '600' },

  skelGap: { marginTop: 6 },
  skelActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: C.muted, fontSize: 15, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: tabBarHeight + 72, gap: 10 },
  cardRow: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  cardRowArchived: { opacity: 0.65 },
  cardRowSelected: { borderColor: C.highlight },
  rowInner: { flexDirection: 'row', gap: 12 },
  rowBody: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxOn: { backgroundColor: C.highlight, borderColor: C.highlight },
  checkmark: { color: C.bg, fontSize: 13, fontWeight: '900' },
  cardContent: { marginBottom: 10 },
  cardKorean: { fontSize: 17, fontWeight: '600', color: C.text },
  cardEnglish: { fontSize: 15, color: C.highlight, marginTop: 2 },
  cardDate: { fontSize: 11, color: C.muted, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: C.highlight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { color: C.bg, fontSize: 13, fontWeight: '600' },
  actionBtnMuted: { backgroundColor: C.border },
  actionBtnMutedText: { color: C.text, fontSize: 13, fontWeight: '600' },
  actionBtnDelete: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
  actionBtnDeleteText: { color: C.muted, fontSize: 13 },

  editForm: { gap: 8 },
  editInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: C.text, backgroundColor: C.bg,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  editSaveBtn: { flex: 1, backgroundColor: C.highlight, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editSaveBtnText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  editCancelBtn: { flex: 1, backgroundColor: C.border, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editCancelBtnText: { color: C.text, fontWeight: '600', fontSize: 14 },

  bulkBar: {
    position: 'absolute', left: 0, right: 0, bottom: tabBarHeight,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
  },
  bulkCount: { fontSize: 13, color: C.muted },
  bulkActions: { flexDirection: 'row', gap: 8 },
  bulkBtn: { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  bulkBtnText: { color: C.text, fontSize: 13, fontWeight: '700' },
  bulkBtnDelete: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.error },
  bulkBtnDeleteText: { color: C.error, fontSize: 13, fontWeight: '700' },
  });
}
