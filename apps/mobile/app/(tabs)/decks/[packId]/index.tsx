import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  buildPackCardDraft, cardInCollection, collectSavedTerms, countSavedEntries,
  getPackEntries, getPackText, getStudyLangSide, getVocabPack, packRefId,
  resolvePackBack, unsavedEntries, t,
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
  const { user, interfaceLanguage, deckNativeLanguage, studyLanguage } = useUser();
  const pack = getVocabPack(studyLanguage, packId);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  /**
   * The subpack the entry list is narrowed to, or null for the whole deck.
   *
   * A filter rather than a screen: the deck's job is browsing the words, and
   * the default view stays what it was. What it removes is the scroll — on an
   * 11-section pack, reaching one section header meant paging past several
   * hundred entries.
   */
  const [openSubpack, setOpenSubpack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * The entry whose card modal is open, with the section it was tapped in —
   * which is what a card saved from the modal gets filed under. Losing the
   * section here would file it at the pack level and leave it out of every
   * subpack review.
   */
  const [detail, setDetail] = useState<{ entry: PackEntry; section: PackSection } | null>(null);

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
      if (!existing || cardInCollection(card, packId)) byTerm.set(key, card);
    }
    return byTerm;
  }, [cards, packId]);

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(interfaceLanguage, 'decksBack')}</Text>
    </View>
  );

  // A pack belongs to one study language, so switching languages while a deck
  // is open leaves this route pointing at nothing.
  if (!pack) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <Text style={s.empty}>{t(interfaceLanguage, 'deckNotFound')}</Text>
      </SafeAreaView>
    );
  }

  /**
   * Enrol a set of sections in one batched write, then go straight to reviewing
   * what was added. Sections are the unit: 160 words is not one decision, and
   * "save this section" turns a pack into six sittings.
   *
   * Sections rather than a flat entry list because each card is filed under its
   * own subpack, the whole-deck button included. Saving the deck and then
   * reviewing only Greetings has to work, and it only does if every card knows
   * which section it came from.
   */
  const enrol = async (busyId: string, sections: readonly PackSection[], collection: string) => {
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
    openReview(collection);
  };

  /** The review tab, scoped to one collection. `nonce` makes a repeat handoff
   *  of the same scope re-fire rather than land on a screen already showing it. */
  const openReview = (collection: string) =>
    router.navigate({ pathname: '/review', params: { collection, nonce: String(Date.now()) } });

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
   * it is the same choice in the same words, one surface earlier. Wrapping
   * tiles rather than full-width rows so eleven sections stay a glance instead
   * of becoming the scroll they were meant to remove.
   *
   * Hidden on a single-section pack, where it would offer a choice between a
   * thing and itself.
   */
  const renderSubpackPicker = () => {
    if (pack.sections.length < 2) return null;
    const option = (id: string | null, name: string, of: readonly PackEntry[]) => {
      const active = id === null ? picked.length === 0 : id === openSubpack;
      return (
        <TouchableOpacity
          key={id ?? ALL}
          style={[s.subpackTile, active && s.subpackTileActive]}
          onPress={() => setOpenSubpack(id)}
        >
          <Text style={s.subpackName}>{name}</Text>
          <Text style={s.subpackCount}>{progressLabel(of)}</Text>
        </TouchableOpacity>
      );
    };
    return (
      <View style={s.subpackBlock}>
        <Text style={s.subpackLabel}>{t(interfaceLanguage, 'deckSections')}</Text>
        <View style={s.subpackWrap}>
          {option(null, t(interfaceLanguage, 'deckSubpackAll'), entries)}
          {pack.sections.map(section =>
            option(section.id, getPackText(section.name, interfaceLanguage), section.entries)
          )}
        </View>
      </View>
    );
  };
  const detailCard = detail ? cardsByTerm.get(detail.entry.study.toLowerCase()) : undefined;

  const renderGridTile = (entry: PackEntry, section: PackSection) => {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <View key={entry.study} style={[s.cardTile, saved && s.dimmed]}>
        <TouchableOpacity
          onPress={() => setDetail({ entry, section })}
          style={s.cardTapArea}
          accessibilityLabel={`Open ${entry.study}`}
        >
          <Text style={s.cardStudy}>{entry.study}</Text>
          <Text style={s.cardBack}>
            {resolvePackBack(entry.back, studyLanguage, deckNativeLanguage)}{saved ? ' ✓' : ''}
          </Text>
        </TouchableOpacity>
        {pack.pronounceable && (
          <PronounceButton text={entry.study} eum={entry.eum} studyLanguage={studyLanguage} size="sm" />
        )}
      </View>
    );
  };

  // Words need a row, not a tile: 뒷받침하다 does not fit in the 68px box that
  // makes 71 kana scannable.
  const renderListRow = (entry: PackEntry, section: PackSection) => {
    const saved = savedTerms?.has(entry.study.toLowerCase()) ?? false;
    return (
      <TouchableOpacity
        key={entry.study}
        style={[s.entryRow, saved && s.dimmed]}
        onPress={() => setDetail({ entry, section })}
      >
        <Text style={s.entryStudy}>{entry.study}</Text>
        <Text style={s.entryBack} numberOfLines={1}>
          {resolvePackBack(entry.back, studyLanguage, deckNativeLanguage)}
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
    const subpackId = packRefId(pack.id, section.id);

    return (
      <View key={section.id} style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{getPackText(section.name, interfaceLanguage)}</Text>
          <Text style={s.sectionCount}>{progressLabel(section.entries)}</Text>
        </View>
        {section.note && (
          <Text style={s.sectionNote}>{getPackText(section.note, interfaceLanguage)}</Text>
        )}
        {/* A subpack is a thing you sit down with on its own, so the three
            things you can do to one live together: save it, review what you
            have saved of it, drill it. */}
        <View style={s.sectionActions}>
          <TouchableOpacity
            style={[s.sectionBtn, disabled && s.btnDisabled]}
            onPress={() => enrol(section.id, [section], subpackId)}
            // Signed out is not the same as still loading: that case keeps the
            // button live so the tap can explain itself.
            disabled={disabled}
          >
            <Text style={s.sectionBtnText}>
              {busy
                ? t(interfaceLanguage, 'deckSectionSaving')
                : allSaved
                  ? t(interfaceLanguage, 'deckSectionAllSaved')
                  : t(interfaceLanguage, 'deckSaveSection')}
            </Text>
          </TouchableOpacity>
          {/* Only once there is something to review. A subpack you have saved
              nothing of would open an empty session, which reads as a bug
              rather than as an answer. */}
          {!!sectionSaved && (
            <TouchableOpacity style={s.sectionBtn} onPress={() => openReview(subpackId)}>
              <Text style={s.sectionBtnText}>{t(interfaceLanguage, 'deckReviewSection')}</Text>
            </TouchableOpacity>
          )}
          {/* Drill needs nothing saved — it runs over the pack's own entries. */}
          <TouchableOpacity
            style={s.sectionBtn}
            onPress={() => router.push(`/decks/${pack.id}/drill?section=${encodeURIComponent(section.id)}`)}
          >
            <Text style={s.sectionSubtleBtnText}>{t(interfaceLanguage, 'drillLink')}</Text>
          </TouchableOpacity>
        </View>
        <View style={pack.layout === 'grid' ? s.cardWrap : s.entryWrap}>
          {section.entries.map(entry =>
            (pack.layout === 'grid' ? renderGridTile : renderListRow)(entry, section)
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.titleRow}>
          <Text style={s.title}>{getPackText(pack.name, interfaceLanguage)}</Text>
          <Text style={s.count}>
            {savedCount !== null
              ? t(interfaceLanguage, 'packsSaved', { added: savedCount, total: entries.length })
              : t(interfaceLanguage, 'deckEntryCount', { count: entries.length })}
          </Text>
        </View>
        <Text style={s.desc}>{getPackText(pack.description, interfaceLanguage)}</Text>
        <Text style={s.hint}>
          {t(interfaceLanguage, pack.layout === 'grid' ? 'packTapHintCards' : 'packTapHint')}
        </Text>

        {/* Every pack is enrollable and drillable now that every pack is
            pre-authored. The whole-deck button is deliberately secondary to the
            per-section ones: it is still the right call on 71 kana and the
            wrong one on 160 TOPIK words. */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.reviewBtn, (!!enrolling || (!!user && !knowsSaved)) && s.btnDisabled]}
            onPress={() => enrol(ALL, pack.sections, pack.id)}
            disabled={!!enrolling || (!!user && !knowsSaved)}
          >
            <Text style={s.reviewBtnText}>
              {enrolling === ALL ? t(interfaceLanguage, 'deckEnrolling') : t(interfaceLanguage, 'deckSaveAll')}
            </Text>
          </TouchableOpacity>
          {/* The whole pack in one sitting, which is what you want once you
              have worked through the sections separately. */}
          {!!savedCount && (
            <TouchableOpacity style={s.drillBtn} onPress={() => openReview(pack.id)}>
              <Text style={s.drillBtnText}>{t(interfaceLanguage, 'deckReviewDeck')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.drillBtn}
            onPress={() => router.push(`/decks/${pack.id}/drill`)}
          >
            <Text style={s.drillBtnText}>{t(interfaceLanguage, 'drillLink')}</Text>
          </TouchableOpacity>
        </View>

        {/* A failed load leaves the deck looking empty, which reads as "nothing
            saved yet" — say so, rather than letting it be discovered by
            enrolling a second copy. */}
        {loadFailed && !error && (
          <Text style={s.error}>{t(interfaceLanguage, 'deckCardsUnavailable')}</Text>
        )}
        {error && <Text style={s.error}>{error}</Text>}

        {renderSubpackPicker()}

        {shownSections.map(renderSection)}
      </ScrollView>

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

    subpackBlock: { marginBottom: 22 },
    subpackLabel: { fontSize: 12, color: C.muted, marginBottom: 8 },
    subpackWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    subpackTile: {
      minWidth: 104, flexGrow: 1,
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
    },
    subpackTileActive: { borderColor: C.highlight },
    subpackName: { fontSize: 14, color: C.text },
    subpackCount: { fontSize: 12, color: C.muted, marginTop: 2 },

    section: { marginBottom: 26 },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    sectionCount: { fontSize: 12, color: C.muted },
    sectionNote: { fontSize: 12, color: C.muted, opacity: 0.7, marginTop: 4 },
    sectionActions: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8,
      marginTop: 10, marginBottom: 12,
    },
    sectionBtn: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 7,
    },
    sectionBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
    sectionSubtleBtnText: { fontSize: 13, fontWeight: '600', color: C.muted },

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
