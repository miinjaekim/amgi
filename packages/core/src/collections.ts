import type { Flashcard, StudyLanguage } from './types';
import { isDue, getNextReviewDate } from './sm2';
import { duePatterns, nextPatternReviewDate } from './grammar';
import type { GrammarPattern } from './grammar';
import { getPackText, getVocabPack, getVocabPacks } from './packs';
import { t } from './i18n';

/**
 * A collection is a set of things you sit down to review together: the cards
 * you made yourself, one pack, or your grammar patterns. They are kept apart
 * rather than pooled and filtered — a pack and your own words are learned for
 * different reasons, and katakana arriving mid-way through Japanese vocabulary
 * is worse review than either done alone. There is deliberately no "everything"
 * collection.
 */
export interface ReviewCollection {
  /**
   * What kind of session this row starts, which is a bigger difference than it
   * looks: a patterns session is a 40-second production turn where a cards
   * session is a 3-second flip.
   *
   * A discriminating field rather than a reserved `id` string, because `id`'s
   * contract is "null is your own cards, anything else is a pack id" and a
   * sentinel like `'__patterns'` is one future pack id away from colliding with
   * a real deck. Use `collectionKey` to identify a row.
   */
  kind: 'cards' | 'patterns';
  /** `null` is the cards you made yourself; anything else is a pack id. */
  id: string | null;
  name: string;
  /**
   * What is due right now, which is what the queue length will be. Directions
   * for a cards row — the same card due both ways counts twice — and patterns
   * for a patterns row, which has only the one direction.
   */
  dueCount: number;
  cardCount: number;
  /** Soonest review still ahead, for the caught-up message. Null when none. */
  nextReview: Date | null;
}

/**
 * A stable identity for one row, for React keys and for remembering a
 * selection across a rebuild.
 *
 * Needed because `id` alone stopped being unique the moment patterns arrived:
 * your own cards and your patterns are both `id: null`. Selection state holds
 * this rather than an id.
 */
export function collectionKey(collection: Pick<ReviewCollection, 'kind' | 'id'>): string {
  return `${collection.kind}:${collection.id ?? ''}`;
}

/**
 * The collection a card belongs to. Every read of `packId` for grouping goes
 * through here, so collections a user defines themselves are an added branch
 * later rather than a migration.
 */
export function getCollectionId(card: Pick<Flashcard, 'packId'>): string | null {
  return card.packId ?? null;
}

/**
 * Sorts collection ids the way Decks lists them, your own cards first.
 *
 * A card whose pack has left the registry sorts last under its own id — the
 * cards are real and reviewable even when the pack they came from is gone.
 */
function byRegistryOrder(studyLanguage: StudyLanguage) {
  const packs = getVocabPacks(studyLanguage);
  const rank = (id: string | null) => {
    if (id === null) return -1;
    const index = packs.findIndex(pack => pack.id === id);
    return index === -1 ? packs.length : index;
  };
  return (a: string | null, b: string | null) => rank(a) - rank(b);
}

/**
 * The deck axis on the card list: everything, only the cards you made, or one
 * pack. Anything other than the two sentinels is a pack id.
 *
 * Deliberately a *second* axis rather than three more chips beside
 * active/archived. The two answer different questions — which cards these are,
 * and whether they are still in rotation — and folding them into one row makes
 * "the archived TOEIC cards" a thing you cannot ask for.
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
 * A card whose pack is not in the registry counts as a list deck. Its layout is
 * unknowable, and a stray row is a better failure than a card you cannot find.
 */
function isGridDeck(packId: string | null, studyLanguage: StudyLanguage): boolean {
  if (packId === null) return false;
  return getVocabPack(studyLanguage, packId)?.layout === 'grid';
}

/** The cards one deck chip selects. */
export function filterCardsByDeck(
  cards: Flashcard[],
  deck: DeckFilterId,
  studyLanguage: StudyLanguage,
): Flashcard[] {
  if (deck === 'mine') return cards.filter(card => getCollectionId(card) === null);
  if (deck === 'all') return cards.filter(card => !isGridDeck(getCollectionId(card), studyLanguage));
  return cards.filter(card => getCollectionId(card) === deck);
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
    packCounts.set(id, (packCounts.get(id) ?? 0) + 1);
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
 * The collections worth offering for review, your own cards first and your
 * grammar patterns last.
 *
 * Only collections holding something appear: a pack you have not enrolled in is
 * on the Decks page, which is where you would go to enrol in it; an empty "My
 * cards" row is a dead end on a deck-only account; and an account with no
 * patterns gets no patterns row, because the door into patterns is a writing
 * finding, not this list.
 *
 * **Patterns take a second input rather than riding in `cards`.** They are not
 * flashcards — different type, different review verb, one direction instead of
 * two — so this is a signature change and not a free call, exactly as the
 * design said it would be. The row sits last because a 40-second production
 * turn is the heavier thing to sit down to, and the lighter default should be
 * the one your eye lands on first.
 */
export function buildReviewCollections(
  cards: Flashcard[],
  patterns: readonly GrammarPattern[],
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

  const ids = [...grouped.keys()].sort(byRegistryOrder(studyLanguage));

  const cardCollections: ReviewCollection[] = ids.map(id => {
    const group = grouped.get(id)!;
    const pack = id === null ? undefined : getVocabPack(studyLanguage, id);
    return {
      kind: 'cards',
      id,
      name: id === null
        ? t(nativeLanguage, 'reviewCollectionMine')
        : pack ? getPackText(pack.name, nativeLanguage) : id,
      dueCount: group.reduce((total, card) => total + isDue(card, now).length, 0),
      cardCount: group.length,
      nextReview: getNextReviewDate(group, now),
    };
  });

  if (patterns.length === 0) return cardCollections;

  return [
    ...cardCollections,
    {
      kind: 'patterns',
      id: null,
      name: t(nativeLanguage, 'reviewCollectionPatterns'),
      dueCount: duePatterns(patterns, now).length,
      cardCount: patterns.length,
      // A pattern with no tracking is due now, so it has no date ahead of it to
      // report — `nextPatternReviewDate` skips those, which is what keeps the
      // caught-up line from claiming a future for something due this second.
      nextReview: nextPatternReviewDate(patterns, now),
    },
  ];
}
