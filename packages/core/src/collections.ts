import type { Flashcard, StudyLanguage } from './types';
import { isDue, getNextReviewDate } from './sm2';
import { getPackText, getVocabPack, getVocabPacks, parentPackId, resolvePackRef } from './packs';
import { t } from './i18n';

/**
 * A collection is a set of things you sit down to review together: the cards
 * you made yourself, one pack, or one subpack inside a pack. They are kept
 * apart rather than pooled and filtered — a pack and your own words are learned
 * for different reasons, and katakana arriving mid-way through Japanese
 * vocabulary is worse review than either done alone. There is deliberately no
 * "everything" collection.
 *
 * A **pack** is the exception that proves that rule, and it is deliberate: its
 * subpacks were authored as one deck for one purpose, so pooling them is not
 * the mixing the paragraph above rejects. It is also what you want once you
 * have studied every section — at that point reviewing them one at a time is
 * six sittings of the same material.
 */
export interface ReviewCollection {
  /**
   * `null` is the cards you made yourself. Anything else is a pack id, or a
   * `pack/section` subpack id.
   */
  id: string | null;
  name: string;
  /**
   * What is due right now, which is what the queue length will be. Counted in
   * directions, not cards — the same card due both ways counts twice.
   *
   * On a pack row this is the whole pack, subpacks included.
   */
  dueCount: number;
  cardCount: number;
  /** Soonest review still ahead, for the caught-up message. Null when none. */
  nextReview: Date | null;
  /**
   * The subpacks under this pack that hold cards, in section order.
   *
   * Exactly one level deep: a subpack row's own list is always empty, and so is
   * your own cards'. Empty on a pack too when there is nothing to choose
   * between — one subpack holding every card of the pack is the same sitting as
   * the pack, and offering it twice is noise rather than a choice.
   */
  subcollections: ReviewCollection[];
}

/**
 * A stable identity for one row, for React keys and for remembering a selection
 * across a rebuild.
 *
 * `id` is unique on its own — pack ids are unique in the registry and a subpack
 * id carries its pack, so the two levels cannot collide. This survives the
 * nesting because selection state is a `string | undefined` on both platforms,
 * where `undefined` means "nothing selected" and `''` means "the cards you made
 * yourself"; collapsing those two would make an unselected picker open on your
 * own cards.
 */
export function collectionKey(collection: Pick<ReviewCollection, 'id'>): string {
  return collection.id ?? '';
}

/**
 * The collection a card belongs to — the deepest one, so a card enrolled from a
 * section reads back as that subpack rather than as its pack.
 *
 * Every read of `packId` for grouping goes through here, so collections a user
 * defines themselves are an added branch later rather than a migration. Cards
 * saved before subpacks carry a bare pack id and keep working: they are in the
 * pack, in no subpack, and `cardInCollection` still hands them to a pack
 * review.
 */
export function getCollectionId(card: Pick<Flashcard, 'packId'>): string | null {
  return card.packId ?? null;
}

/**
 * Whether this card is part of that collection — the membership test every
 * review session filters on.
 *
 * Asymmetric on purpose, and that asymmetry is the whole second level: a
 * subpack takes only its own cards, while a pack takes its own *and* every
 * subpack's. Without it, "review the whole pack" would come back empty the day
 * enrolling started filing cards one section down.
 */
export function cardInCollection(
  card: Pick<Flashcard, 'packId'>,
  collectionId: string | null,
): boolean {
  const id = getCollectionId(card);
  if (id === null || collectionId === null) return id === collectionId;
  return id === collectionId || parentPackId(id) === collectionId;
}

/** The cards one collection reviews. */
export function cardsInCollection<T extends Pick<Flashcard, 'packId'>>(
  cards: readonly T[],
  collectionId: string | null,
): T[] {
  return cards.filter(card => cardInCollection(card, collectionId));
}

/** Every row of a picker, packs and their subpacks alike, in display order. */
export function flattenCollections(collections: readonly ReviewCollection[]): ReviewCollection[] {
  return collections.flatMap(collection => [collection, ...collection.subcollections]);
}

/** One row by its `collectionKey`, at either level. */
export function findCollection(
  collections: readonly ReviewCollection[],
  key: string | undefined,
): ReviewCollection | undefined {
  if (key === undefined) return undefined;
  return flattenCollections(collections).find(collection => collectionKey(collection) === key);
}

/**
 * The display name for a collection id at either level: your own cards, a
 * pack's name, or a subpack's section name.
 *
 * A subpack is named by its section alone rather than "Pack · Section", because
 * the only place a subpack row appears is already nested under its pack.
 */
function collectionName(
  id: string | null,
  studyLanguage: StudyLanguage,
  nativeLanguage: string | null | undefined,
): string {
  if (id === null) return t(nativeLanguage, 'reviewCollectionMine');
  const ref = resolvePackRef(studyLanguage, id);
  if (!ref) return id;
  if (ref.section) return getPackText(ref.section.name, nativeLanguage);
  // A subpack id whose section is gone from the pack. The pack's name would be
  // a lie here — it is already on the row above — so it wears its own slug,
  // which is the same deal a card from a retired pack gets.
  if (parentPackId(id) !== id) return id;
  return getPackText(ref.pack.name, nativeLanguage);
}

/**
 * Sorts collection ids the way Decks lists them, your own cards first, then
 * packs in registry order, and within a pack its sections in the order the pack
 * authored them.
 *
 * A card whose pack has left the registry sorts last under its own id — the
 * cards are real and reviewable even when the pack they came from is gone. A
 * pack sorts ahead of its own subpacks, which is what puts "the whole pack" at
 * the top of its group.
 */
function byRegistryOrder(studyLanguage: StudyLanguage) {
  const packs = getVocabPacks(studyLanguage);
  const rank = (id: string | null): [number, number] => {
    if (id === null) return [-1, -1];
    const packIndex = packs.findIndex(pack => pack.id === parentPackId(id));
    if (packIndex === -1) return [packs.length, 0];
    const section = resolvePackRef(studyLanguage, id)?.section;
    return [packIndex, section ? packs[packIndex].sections.indexOf(section) : -1];
  };
  return (a: string | null, b: string | null) => {
    const [packA, sectionA] = rank(a);
    const [packB, sectionB] = rank(b);
    return packA - packB || sectionA - sectionB;
  };
}

/**
 * The deck axis on the card list: everything, only the cards you made, or one
 * pack. Anything other than the two sentinels is a pack id.
 *
 * Deliberately a *second* axis rather than three more chips beside
 * active/archived. The two answer different questions — which cards these are,
 * and whether they are still in rotation — and folding them into one row makes
 * "the archived TOEIC cards" a thing you cannot ask for.
 *
 * **Packs only, never subpacks.** A chip per subpack would be 79 chips on a
 * full account, and a two-level chip control has nowhere to go in a row that is
 * already a third axis on mobile's filter sheet. The question this page asks is
 * which cards these are; picking a pack apart is what the review picker's
 * second level is for.
 */
export type DeckFilterId = 'all' | 'mine' | (string & {});

/**
 * What the card list opens on, and where a selection falls back to when the
 * deck it pointed at stops existing.
 *
 * Your own cards, not everything: the page is called My Cards, so it opens
 * showing what it is named and widening to a pack is a thing you do on purpose.
 * The reverse default made every account's first view of the list a mix it had
 * not asked for.
 */
export const DEFAULT_DECK_FILTER: DeckFilterId = 'mine';

export interface DeckFilter {
  id: DeckFilterId;
  /** Chip label, already resolved for the reader's language. */
  name: string;
  count: number;
}

/**
 * Whether the default view leaves this deck's cards out.
 *
 * Keyed on `layout === 'grid'` rather than on pack ids, so a future
 * single-character pack inherits the rule without anyone remembering to ask:
 * a word you can look up is vocabulary and belongs in the list, where a
 * 107-character drill set would swamp it. Hidden, not unreachable — a grid deck
 * still gets its own chip.
 *
 * Layout is a property of the pack, so a subpack id answers with its pack's —
 * half a kana pack is still a wall of glyphs.
 *
 * A card whose pack is not in the registry counts as a list deck. Its layout is
 * unknowable, and a stray row is a better failure than a card you cannot find.
 */
function isGridDeck(collectionId: string | null, studyLanguage: StudyLanguage): boolean {
  if (collectionId === null) return false;
  return resolvePackRef(studyLanguage, collectionId)?.pack.layout === 'grid';
}

/** The cards one deck chip selects. */
export function filterCardsByDeck(
  cards: Flashcard[],
  deck: DeckFilterId,
  studyLanguage: StudyLanguage,
): Flashcard[] {
  if (deck === 'mine') return cards.filter(card => getCollectionId(card) === null);
  if (deck === 'all') return cards.filter(card => !isGridDeck(getCollectionId(card), studyLanguage));
  return cardsInCollection(cards, deck);
}

/**
 * The deck chips worth offering, or `[]` when there is nothing to choose
 * between — which is what the caller hides the row on.
 *
 * Empty on an account with no pack cards, because there "All" and "My Cards"
 * select the same rows and two chips that do the same thing are worse than
 * none. Only decks holding cards appear, for the same reason the review picker
 * omits them: a pack you have not enrolled in is on Decks, which is where you
 * would go to enrol.
 *
 * Counts are over every card in the deck, regardless of which
 * active/archived chip is lit. Conditioning them on the other axis would make a
 * chip vanish the moment its deck had nothing archived — including the selected
 * one, leaving the selection pointing at a row no longer on screen.
 */
export function buildDeckFilters(
  cards: Flashcard[],
  studyLanguage: StudyLanguage,
  nativeLanguage: string | null | undefined,
): DeckFilter[] {
  const packCounts = new Map<string, number>();
  for (const card of cards) {
    const id = getCollectionId(card);
    if (id === null) continue;
    // Counted against the pack, not the subpack: one chip per pack is the
    // whole rule of this row, so a card's subpack only decides which chip it
    // lands in, never whether a new one appears.
    const parent = parentPackId(id);
    packCounts.set(parent, (packCounts.get(parent) ?? 0) + 1);
  }
  if (packCounts.size === 0) return [];

  const order = byRegistryOrder(studyLanguage);
  const packIds = [...packCounts.keys()].sort(order);

  return [
    {
      id: 'all',
      name: t(nativeLanguage, 'cardsDeckAll'),
      count: filterCardsByDeck(cards, 'all', studyLanguage).length,
    },
    {
      id: 'mine',
      name: t(nativeLanguage, 'cardsDeckMine'),
      count: filterCardsByDeck(cards, 'mine', studyLanguage).length,
    },
    ...packIds.map(id => {
      const pack = getVocabPack(studyLanguage, id);
      return {
        id,
        name: pack ? getPackText(pack.name, nativeLanguage) : id,
        count: packCounts.get(id)!,
      };
    }),
  ];
}

/**
 * The collections worth offering for review, your own cards first, each pack
 * carrying the subpacks you have cards in.
 *
 * Only collections holding something appear: a pack you have not enrolled in is
 * on the Decks page, which is where you would go to enrol in it, and an empty
 * "My cards" row is a dead end on a deck-only account. The same rule one level
 * down is what keeps a pack from listing all eleven of its sections when you
 * have saved two.
 */
export function buildReviewCollections(
  cards: Flashcard[],
  studyLanguage: StudyLanguage,
  nativeLanguage: string | null | undefined,
  now: Date = new Date()
): ReviewCollection[] {
  const grouped = new Map<string | null, Flashcard[]>();
  for (const card of cards) {
    const id = getCollectionId(card);
    const group = grouped.get(id);
    if (group) group.push(card);
    else grouped.set(id, [card]);
  }

  const order = byRegistryOrder(studyLanguage);

  // Each pack, with the exact ids filed under it in section order — which
  // includes the pack's own id when cards predate the subpack they belong to.
  const byParent = new Map<string | null, (string | null)[]>();
  for (const id of [...grouped.keys()].sort(order)) {
    const parent = id === null ? null : parentPackId(id);
    const members = byParent.get(parent);
    if (members) members.push(id);
    else byParent.set(parent, [id]);
  }

  const row = (id: string | null, group: Flashcard[]): Omit<ReviewCollection, 'subcollections'> => ({
    id,
    name: collectionName(id, studyLanguage, nativeLanguage),
    dueCount: group.reduce((total, card) => total + isDue(card, now).length, 0),
    cardCount: group.length,
    nextReview: getNextReviewDate(group, now),
  });

  return [...byParent.keys()].sort(order).map(parent => {
    const members = byParent.get(parent)!;
    return {
      ...row(parent, members.flatMap(id => grouped.get(id)!)),
      // One member is one sitting however it is labelled, so it stays a single
      // row wearing the pack's name. The second level appears the moment there
      // is actually a choice inside the pack.
      subcollections: members.length < 2
        ? []
        : members
            .filter(id => id !== parent)
            .map(id => ({ ...row(id, grouped.get(id)!), subcollections: [] })),
    };
  });
}
