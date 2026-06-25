import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import {
  fetchAllUserFlashcards, archiveFlashcard, restoreFlashcard,
  deleteFlashcard, updateFlashcardFields,
} from '../../src/services/firestore';
import type { Flashcard } from '../../src/services/firestore';
import { t } from '@amgi/core';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import type { Palette } from '../../src/theme';

type SortKey = 'newest' | 'oldest' | 'az';
type FilterKey = 'active' | 'archived' | 'all';

export default function CardsScreen() {
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage } = useUser();
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterKey, setFilterKey] = useState<FilterKey>('active');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ korean: string; english: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setAllCards([]); return; }
    setLoading(true);
    fetchAllUserFlashcards(user.uid)
      .then(setAllCards)
      .catch(() => setError('Failed to load cards.'))
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
    if (sortKey === 'newest') return [...cards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortKey === 'oldest') return [...cards].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return [...cards].sort((a, b) => (a.korean || a.term || '').localeCompare(b.korean || b.term || ''));
  }, [allCards, filterKey, search, sortKey]);

  const activeCount = allCards.filter(c => !c.archived).length;
  const archivedCount = allCards.filter(c => c.archived).length;

  const handleEditSave = async (card: Flashcard) => {
    if (!card.id || !editDraft) return;
    try {
      await updateFlashcardFields(card.id, editDraft);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, ...editDraft } : c));
      setEditingCardId(null);
      setEditDraft(null);
    } catch {
      setError(t(nativeLanguage, 'errorSaveChanges'));
    }
  };

  const handleArchive = (card: Flashcard) => {
    Alert.alert('', t(nativeLanguage, 'confirmArchive'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'archive'), style: 'destructive',
        onPress: async () => {
          try {
            await archiveFlashcard(card.id!);
            setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: true } : c));
          } catch {
            setError(t(nativeLanguage, 'errorArchiveFlashcard'));
          }
        },
      },
    ]);
  };

  const handleRestore = async (card: Flashcard) => {
    try {
      await restoreFlashcard(card.id!);
      setAllCards(prev => prev.map(c => c.id === card.id ? { ...c, archived: false } : c));
    } catch {
      setError(t(nativeLanguage, 'errorRestoreFlashcard'));
    }
  };

  const handleDelete = (card: Flashcard) => {
    Alert.alert('', t(nativeLanguage, 'confirmDelete'), [
      { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
      {
        text: t(nativeLanguage, 'delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteFlashcard(card.id!);
            setAllCards(prev => prev.filter(c => c.id !== card.id));
          } catch {
            setError(t(nativeLanguage, 'errorDeleteFlashcard'));
          }
        },
      },
    ]);
  };

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'active', label: t(nativeLanguage, 'cardsFilterActive'), count: activeCount },
    { key: 'archived', label: t(nativeLanguage, 'cardsFilterArchived'), count: archivedCount },
    { key: 'all', label: t(nativeLanguage, 'cardsFilterAll'), count: allCards.length },
  ];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t(nativeLanguage, 'cardsSortNewest') },
    { key: 'oldest', label: t(nativeLanguage, 'cardsSortOldest') },
    { key: 'az', label: t(nativeLanguage, 'cardsSortAZ') },
  ];

  const renderCard = ({ item: card }: { item: Flashcard }) => {
    const editing = editingCardId === card.id;
    return (
      <View style={[s.cardRow, card.archived && s.cardRowArchived]}>
        {editing && editDraft ? (
          <View style={s.editForm}>
            <TextInput
              style={s.editInput}
              value={editDraft.korean}
              onChangeText={v => setEditDraft(d => d ? { ...d, korean: v } : d)}
              autoFocus
            />
            <TextInput
              style={s.editInput}
              value={editDraft.english}
              onChangeText={v => setEditDraft(d => d ? { ...d, english: v } : d)}
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
          <>
            <View style={s.cardContent}>
              <Text style={s.cardKorean}>{card.korean || card.term}</Text>
              <Text style={s.cardEnglish}>{card.english || card.translation || ''}</Text>
              <Text style={s.cardDate}>
                {t(nativeLanguage, 'savedAt')} {new Date(card.createdAt).toLocaleDateString()}
                {card.archived ? `  ·  ${t(nativeLanguage, 'cardsFilterArchived')}` : ''}
              </Text>
            </View>
            <View style={s.cardActions}>
              {!card.archived ? (
                <>
                  <TouchableOpacity style={s.actionBtn} onPress={() => {
                    setEditingCardId(card.id!);
                    setEditDraft({ korean: card.korean || card.term, english: card.english || card.translation || '' });
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
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t(nativeLanguage, 'cardsPageTitle')}</Text>
        <Text style={s.subtitle}>{t(nativeLanguage, 'cardsPageDescription')}</Text>
      </View>

      {!user ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>{t(nativeLanguage, 'cardsSignInPrompt')}</Text>
        </View>
      ) : (
        <>
          <View style={s.controls}>
            {/* Search */}
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t(nativeLanguage, 'cardsSearchPlaceholder')}
              placeholderTextColor={C.muted}
            />

            {/* Filter tabs */}
            <View style={s.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterTab, filterKey === f.key && s.filterTabActive]}
                  onPress={() => setFilterKey(f.key)}
                >
                  <Text style={[s.filterTabText, filterKey === f.key && s.filterTabTextActive]}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort chips */}
            <View style={s.sortRow}>
              {SORTS.map(sort => (
                <TouchableOpacity
                  key={sort.key}
                  style={[s.sortChip, sortKey === sort.key && s.sortChipActive]}
                  onPress={() => setSortKey(sort.key)}
                >
                  <Text style={[s.sortChipText, sortKey === sort.key && s.sortChipTextActive]}>{sort.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={C.highlight} />
              <Text style={s.loadingText}>{t(nativeLanguage, 'loadingFlashcards')}</Text>
            </View>
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
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: C.highlight },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  controls: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  searchInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, marginTop: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  filterTabActive: { backgroundColor: C.highlight, borderColor: C.highlight },
  filterTabText: { fontSize: 13, color: C.text },
  filterTabTextActive: { color: C.bg, fontWeight: '600' },

  sortRow: { flexDirection: 'row', gap: 6 },
  sortChip: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  sortChipActive: { backgroundColor: C.border },
  sortChipText: { fontSize: 12, color: C.muted },
  sortChipTextActive: { color: C.text },

  errorBanner: { marginHorizontal: 16, backgroundColor: '#fde8e8', borderRadius: 10, padding: 12, marginBottom: 8 },
  errorText: { color: C.error, fontSize: 13, fontWeight: '600' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.muted, fontSize: 14 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: C.muted, fontSize: 15, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: tabBarHeight, gap: 10 },
  cardRow: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  cardRowArchived: { opacity: 0.65 },
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
  });
}
