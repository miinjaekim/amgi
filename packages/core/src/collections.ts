import type { Flashcard, StudyLanguage } from './types';
import { isDue, getNextReviewDate } from './sm2';
import { getPackText, getVocabPacks } from './packs';
import { t } from './i18n';

/**
 * A collection is a set of cards you sit down to review together: the cards you
 * made yourself, or one pack. They are kept apart rather than pooled and
 * filtered — a pack and your own words are learned for different reasons, and
 * katakana arriving mid-way through Japanese vocabulary is worse review than
 * either done alone. There is deliberately no "everything" collection.
 */
export interface ReviewCollection {
  /** `null` is the cards you made yourself; anything else is a pack id. */
  id: string | null;
  name: string;
  /** Directions due right now, which is what the queue length will be. */
  dueCount: number;
  cardCount: number;
  /** Soonest review still ahead, for the caught-up message. Null when none. */
  nextReview: Date | null;
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
 * The collections worth offering for review, your own cards first.
 *
 * Only collections holding cards appear: a pack you have not enrolled in is on
 * the Decks page, which is where you would go to enrol in it, and an empty
 * "My cards" row is a dead end on a deck-only account.
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

  // Registry order, so the packs list the same way it does on Decks. A card
  // whose pack has left the registry still groups under its id — the cards are
  // real and reviewable even when the pack they came from is gone.
  const packs = getVocabPacks(studyLanguage);
  const ids = [...grouped.keys()];
  const order = (id: string | null) => {
    if (id === null) return -1;
    const index = packs.findIndex(pack => pack.id === id);
    return index === -1 ? packs.length : index;
  };
  ids.sort((a, b) => order(a) - order(b));

  return ids.map(id => {
    const group = grouped.get(id)!;
    const pack = id === null ? undefined : packs.find(p => p.id === id);
    return {
      id,
      name: id === null
        ? t(nativeLanguage, 'reviewCollectionMine')
        : pack ? getPackText(pack.name, nativeLanguage) : id,
      dueCount: group.reduce((total, card) => total + isDue(card, now).length, 0),
      cardCount: group.length,
      nextReview: getNextReviewDate(group, now),
    };
  });
}
