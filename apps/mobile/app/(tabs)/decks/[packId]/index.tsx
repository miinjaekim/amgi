import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  buildPackCardDraft, collectSavedTerms, countSavedEntries, getCollectionId,
  getPackEntries, getPackText, getStudyLangSide, getVocabPack, resolvePackBack,
  unsavedEntries, t,
} from '@amgi/core';
import type { PackEntry, PackSection } from '@amgi/core';
import { useUser } from '../../../../src/context/UserContext';
import { useTheme } from '../../../../src/context/ThemeContext';
import { subscribeToAllUserFlashcards, saveFlashcardsBatch } from '../../../../src/services/firestore';
import type { Flashcard } from '../../../../src/services/firestore';
import CardDetailModal from '../../../../src/components/CardDetailModal';
import PronounceButton from '../../../../src/components/PronounceButton';
import { useFloatingTabBarHeight } from '../../../../src/components/FloatingTabBar';
import type { Palette } from '../../../../src/theme';

/** The id used for the whole-deck enrol, which is not a section. */
const ALL = '__all__';

export default function DeckDetailScreen() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { C } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, nativeLanguage, studyLanguage } = useUser();
  const pack = getVocabPack(studyLanguage, packId);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PackEntry | null>(null);

  // Live: enrolling writes a batch of cards, and the listener is what turns the
  // deck's saved-count and every row's state over once they land. Nothing has
  // to re-read on the way back from a card, either.
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
   * The card behind each pack term, whichever way it got there — preferring one
   * this deck produced when there are both, because the question the deck asks
   * when you tap an entry is "what do I already have for this word".
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

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(nativeLanguage, 'decksBack')}</Text>
    </View>
  );

  // A pack belongs to one study language, so switching languages while a deck
  // is open leaves this route pointing at nothing.
  if (!pack) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <Text style={s.empty}>{t(nativeLanguage, 'deckNotFound')}</Text>
      </SafeAreaView>
    );
  }

  /**
   * Enrol a set of entries in one batched write, then go straight to reviewing
   * the deck. Sections are the unit this is normally called with: 160 words is
   * not one decision, and "save this section" turns a pack into six sittings.
   */
  const enrol = async (id: string, entries: readonly PackEntry[]) => {
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
          studyLanguage,
        );
      } catch {
        setError(t(nativeLanguage, 'deckEnrollError'));
        setEnrolling(null);
        return;
      }
      setEnrolling(null);
    }
    router.navigate({ pathname: '/review', params: { collection: pack.id, nonce: String(Date.now()) } });
  };

  const entries = getPackEntries(pack);
  const savedCount = savedTerms ? countSavedEntries(entries, savedTerms) : null;
  const detailCard = detail ? cardsByTerm.get(detail.study.toLowerCase()) : undefined;

  const renderGridTile = (entry: PackEntry) => {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <View key={entry.study} style={[s.cardTile, saved && s.dimmed]}>
        <TouchableOpacity
          onPress={() => setDetail(entry)}
          style={s.cardTapArea}
          accessibilityLabel={`Open ${entry.study}`}
        >
          <Text style={s.cardStudy}>{entry.study}</Text>
          <Text style={s.cardBack}>
            {resolvePackBack(entry.back, studyLanguage, nativeLanguage)}{saved ? ' ✓' : ''}
          </Text>
        </TouchableOpacity>
        {pack.pronounceable && (
          <PronounceButton text={entry.study} studyLanguage={studyLanguage} size="sm" />
        )}
      </View>
    );
  };

  // Words need a row, not a tile: 뒷받침하다 does not fit in the 68px box that
  // makes 71 kana scannable.
  const renderListRow = (entry: PackEntry) => {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <TouchableOpacity
        key={entry.study}
        style={[s.entryRow, saved && s.dimmed]}
        onPress={() => setDetail(entry)}
      >
        <Text style={s.entryStudy}>{entry.study}</Text>
        <Text style={s.entryBack} numberOfLines={1}>
          {resolvePackBack(entry.back, studyLanguage, nativeLanguage)}
        </Text>
        {saved ? <Text style={s.entryCheck}>✓</Text> : null}
      </TouchableOpacity>
    );
  };

  const renderSection = (section: PackSection) => {
    const sectionSaved = savedTerms ? countSavedEntries(section.entries, savedTerms) : null;
    const allSaved = sectionSaved === section.entries.length;
    const busy = enrolling === section.id;
    const disabled = !!enrolling || allSaved || (!!user && !knowsSaved);

    return (
      <View key={section.id} style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{getPackText(section.name, nativeLanguage)}</Text>
          <Text style={s.sectionCount}>
            {sectionSaved !== null
              ? t(nativeLanguage, 'packsSaved', { added: sectionSaved, total: section.entries.length })
              : t(nativeLanguage, 'deckEntryCount', { count: section.entries.length })}
          </Text>
        </View>
        {section.note && (
          <Text style={s.sectionNote}>{getPackText(section.note, nativeLanguage)}</Text>
        )}
        <TouchableOpacity
          style={[s.sectionBtn, disabled && s.btnDisabled]}
          onPress={() => enrol(section.id, section.entries)}
          // Signed out is not the same as still loading: that case keeps the
          // button live so the tap can explain itself.
          disabled={disabled}
        >
          <Text style={s.sectionBtnText}>
            {busy
              ? t(nativeLanguage, 'deckSectionSaving')
              : allSaved
                ? t(nativeLanguage, 'deckSectionAllSaved')
                : t(nativeLanguage, 'deckSaveSection')}
          </Text>
        </TouchableOpacity>
        <View style={pack.layout === 'grid' ? s.cardWrap : s.entryWrap}>
          {section.entries.map(pack.layout === 'grid' ? renderGridTile : renderListRow)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <Text style={s.title}>{getPackText(pack.name, nativeLanguage)}</Text>
          <Text style={s.count}>
            {savedCount !== null
              ? t(nativeLanguage, 'packsSaved', { added: savedCount, total: entries.length })
              : t(nativeLanguage, 'deckEntryCount', { count: entries.length })}
          </Text>
        </View>
        <Text style={s.desc}>{getPackText(pack.description, nativeLanguage)}</Text>
        <Text style={s.hint}>
          {t(nativeLanguage, pack.layout === 'grid' ? 'packTapHintCards' : 'packTapHint')}
        </Text>

        {/* Every pack is enrollable and drillable now that every pack is
            pre-authored. The whole-deck button is deliberately secondary to the
            per-section ones: it is still the right call on 71 kana and the
            wrong one on 160 TOPIK words. */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.reviewBtn, (!!enrolling || (!!user && !knowsSaved)) && s.btnDisabled]}
            onPress={() => enrol(ALL, entries)}
            disabled={!!enrolling || (!!user && !knowsSaved)}
          >
            <Text style={s.reviewBtnText}>
              {enrolling === ALL ? t(nativeLanguage, 'deckEnrolling') : t(nativeLanguage, 'deckSaveAll')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.drillBtn}
            onPress={() => router.push(`/decks/${pack.id}/drill`)}
          >
            <Text style={s.drillBtnText}>{t(nativeLanguage, 'drillLink')}</Text>
          </TouchableOpacity>
        </View>

        {/* A failed load leaves the deck looking empty, which reads as "nothing
            saved yet" — say so, rather than letting it be discovered by
            enrolling a second copy. */}
        {loadFailed && !error && (
          <Text style={s.error}>{t(nativeLanguage, 'deckCardsUnavailable')}</Text>
        )}
        {error && <Text style={s.error}>{error}</Text>}

        {pack.sections.map(renderSection)}
      </ScrollView>

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
          // No `onChanged`: the listener above already reports anything the
          // modal writes, so telling the screen to go and look again would only
          // duplicate the read it is about to get for free.
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
    back: { fontSize: 24, color: C.muted, lineHeight: 26 },
    headerLabel: { fontSize: 14, color: C.muted },
    empty: { paddingHorizontal: 20, paddingTop: 8, fontSize: 14, color: C.muted },
    scroll: { paddingHorizontal: 20, paddingBottom: tabBarHeight },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
    title: { fontSize: 21, fontWeight: '700', color: C.highlight },
    count: { fontSize: 12, color: C.muted },
    desc: { fontSize: 13, color: C.muted, marginTop: 6 },
    hint: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 6, marginBottom: 14 },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    reviewBtn: {
      backgroundColor: C.highlight,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    },
    reviewBtnText: { fontSize: 15, fontWeight: '700', color: C.bg },
    btnDisabled: { opacity: 0.5 },
    drillBtn: {
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    },
    drillBtnText: { fontSize: 15, fontWeight: '600', color: C.text },
    error: { fontSize: 13, color: C.error, marginBottom: 12 },

    section: { marginBottom: 26 },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    sectionCount: { fontSize: 12, color: C.muted },
    sectionNote: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 4 },
    sectionBtn: {
      alignSelf: 'flex-start', marginTop: 10, marginBottom: 12,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 7,
    },
    sectionBtnText: { fontSize: 13, fontWeight: '600', color: C.text },

    dimmed: { opacity: 0.45 },
    entryWrap: { gap: 6 },
    entryRow: {
      flexDirection: 'row', alignItems: 'baseline', gap: 8,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    entryStudy: { fontSize: 15, color: C.text, flexShrink: 0 },
    entryBack: { fontSize: 13, color: C.muted, flexShrink: 1 },
    entryCheck: { fontSize: 12, color: C.muted, marginLeft: 'auto' },

    cardWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cardTile: {
      width: 68, alignItems: 'center', paddingVertical: 6,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
    },
    cardTapArea: { alignItems: 'center', alignSelf: 'stretch' },
    cardStudy: { fontSize: 22, color: C.text },
    cardBack: { fontSize: 10, color: C.muted },
  });
}
