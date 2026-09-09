import { describe, it, expect } from 'vitest';
import {
  buildDeckFilters,
  buildReviewCollections,
  cardInCollection,
  cardsInCollection,
  collectionKey,
  findCollection,
  flattenCollections,
  packRefId,
  parentPackId,
  resolvePackRef,
  VOCAB_PACKS,
} from '@amgi/core';
import type { Flashcard, StudyLanguage, VocabPack } from '@amgi/core';

const DUE = new Date('2026-01-01');
const LATER = new Date('2027-01-01');
const NOW = new Date('2026-06-01');

/** A Kikuyu card, due or not, filed under whatever collection id is given. */
const card = (packId: string | undefined, study: string, nextReview = DUE): Flashcard => ({
  uid: 'u', term: study, termLanguage: 'Kikuyu', kikuyu: study, english: study,
  createdAt: new Date('2026-01-01'), studyLanguage: 'Kikuyu', packId,
  frontToBack: { nextReview, interval: 1, ease: 2.5, repetitions: 1 },
  backToFront: { nextReview, interval: 1, ease: 2.5, repetitions: 1 },
} as Flashcard);

const GREETINGS = packRefId('kikuyu-basics', 'greetings');
const NUMBERS = packRefId('kikuyu-basics', 'numbers');

describe('subpack ids', () => {
  // Section ids are only unique within a pack — `greetings` and `numbers` are
  // in both Kikuyu Basics and Spanish Basics, and the two military packs share
  // all ten of theirs. The namespace is what keeps those apart.
  it('namespaces a section under its pack', () => {
    expect(GREETINGS).toBe('kikuyu-basics/greetings');
    expect(packRefId('spanish-basics', 'greetings')).not.toBe(GREETINGS);
  });

  it('reads the pack back out', () => {
    expect(parentPackId(GREETINGS)).toBe('kikuyu-basics');
  });

  // A bare pack id is its own parent, which is what makes every pack-level
  // grouping work unchanged on cards saved before subpacks existed.
  it('leaves a bare pack id alone', () => {
    expect(parentPackId('kikuyu-basics')).toBe('kikuyu-basics');
  });

  it('resolves a subpack to its pack and its section', () => {
    const ref = resolvePackRef('Kikuyu', GREETINGS);
    expect(ref?.pack.id).toBe('kikuyu-basics');
    expect(ref?.section?.id).toBe('greetings');
  });

  it('resolves a pack id to the pack and no section', () => {
    const ref = resolvePackRef('Kikuyu', 'kikuyu-basics');
    expect(ref?.pack.id).toBe('kikuyu-basics');
    expect(ref?.section).toBeUndefined();
  });

  // The safety the whole design rests on: a section renamed out of the pack
  // still resolves to the pack, so its cards keep the pack's name rather than
  // orphaning under a slug.
  it('falls back to the pack when the section is gone', () => {
    const ref = resolvePackRef('Kikuyu', packRefId('kikuyu-basics', 'retired'));
    expect(ref?.pack.id).toBe('kikuyu-basics');
    expect(ref?.section).toBeUndefined();
  });

  it('resolves nothing for a pack outside this study language', () => {
    expect(resolvePackRef('Spanish', GREETINGS)).toBeUndefined();
  });
});

// The asymmetry is the second level: a pack takes its subpacks' cards, a
// subpack takes only its own.
describe('cardInCollection', () => {
  it('gives a subpack only its own cards', () => {
    expect(cardInCollection(card(GREETINGS, 'wĩ mwega'), GREETINGS)).toBe(true);
    expect(cardInCollection(card(NUMBERS, 'ĩmwe'), GREETINGS)).toBe(false);
  });

  it('gives a pack every subpack under it', () => {
    const cards = [card(GREETINGS, 'wĩ mwega'), card(NUMBERS, 'ĩmwe')];
    expect(cardsInCollection(cards, 'kikuyu-basics')).toEqual(cards);
  });

  // Cards saved before subpacks carry a bare pack id. They are in the pack and
  // in no subpack, and a pack review has to still reach them.
  it('gives a pack its own un-subpacked cards', () => {
    expect(cardInCollection(card('kikuyu-basics', 'mbũri'), 'kikuyu-basics')).toBe(true);
    expect(cardInCollection(card('kikuyu-basics', 'mbũri'), GREETINGS)).toBe(false);
  });

  it('keeps your own cards out of every pack, and packs out of your own', () => {
    expect(cardInCollection(card(undefined, 'nyũmba'), null)).toBe(true);
    expect(cardInCollection(card(undefined, 'nyũmba'), 'kikuyu-basics')).toBe(false);
    expect(cardInCollection(card(GREETINGS, 'wĩ mwega'), null)).toBe(false);
  });

  // `kikuyu-basics-extra` starts with `kikuyu-basics` as a string but is a
  // different pack. Matching on the separator, not on a prefix, is what keeps
  // them apart.
  it('does not swallow a pack whose id merely starts the same', () => {
    expect(cardInCollection(card('kikuyu-basics-extra', 'x'), 'kikuyu-basics')).toBe(false);
  });
});

describe('buildReviewCollections', () => {
  it('nests subpacks under their pack, in section order', () => {
    const collections = buildReviewCollections(
      [card(NUMBERS, 'ĩmwe'), card(GREETINGS, 'wĩ mwega')],
      'Kikuyu', 'English', NOW,
    );
    expect(collections).toHaveLength(1);
    expect(collections[0].id).toBe('kikuyu-basics');
    expect(collections[0].name).toBe('Kikuyu Basics');
    // Greetings is authored before Numbers, and saving order does not reorder
    // the pack.
    expect(collections[0].subcollections.map(s => s.id)).toEqual([GREETINGS, NUMBERS]);
    expect(collections[0].subcollections.map(s => s.name)).toEqual(['Greetings', 'Numbers']);
  });

  // The whole-pack row is the user's stated reason for the second level being
  // additive: once every section is studied, reviewing them one at a time is
  // several sittings of the same material.
  it('counts a pack over every subpack under it', () => {
    const collections = buildReviewCollections(
      [card(GREETINGS, 'wĩ mwega'), card(NUMBERS, 'ĩmwe'), card(NUMBERS, 'igĩrĩ', LATER)],
      'Kikuyu', 'English', NOW,
    );
    expect(collections[0].cardCount).toBe(3);
    // Due counts directions, not cards: two due cards, both ways round.
    expect(collections[0].dueCount).toBe(4);
    const numbers = collections[0].subcollections.find(s => s.id === NUMBERS)!;
    expect(numbers.cardCount).toBe(2);
    expect(numbers.dueCount).toBe(2);
  });

  // Offering the same sitting twice is noise, not a choice.
  it('leaves a pack flat when one subpack holds all of it', () => {
    const collections = buildReviewCollections([card(GREETINGS, 'wĩ mwega')], 'Kikuyu', 'English', NOW);
    expect(collections[0].id).toBe('kikuyu-basics');
    expect(collections[0].name).toBe('Kikuyu Basics');
    expect(collections[0].subcollections).toEqual([]);
  });

  // Un-migrated cards sit in the pack and in no subpack. They still count on
  // the pack row, and they do not invent a row of their own.
  it('holds un-subpacked cards on the pack row only', () => {
    const collections = buildReviewCollections(
      [card('kikuyu-basics', 'mbũri'), card(GREETINGS, 'wĩ mwega')],
      'Kikuyu', 'English', NOW,
    );
    expect(collections[0].cardCount).toBe(2);
    expect(collections[0].subcollections.map(s => s.id)).toEqual([GREETINGS]);
  });

  it('puts your own cards first', () => {
    const collections = buildReviewCollections(
      [card(GREETINGS, 'wĩ mwega'), card(undefined, 'nyũmba')],
      'Kikuyu', 'English', NOW,
    );
    expect(collections.map(c => c.id)).toEqual([null, 'kikuyu-basics']);
    expect(collections[0].subcollections).toEqual([]);
  });

  // Every row is selectable, so every row needs a key nothing else answers to.
  it('keys both levels apart', () => {
    const collections = buildReviewCollections(
      [card(GREETINGS, 'wĩ mwega'), card(NUMBERS, 'ĩmwe'), card(undefined, 'nyũmba')],
      'Kikuyu', 'English', NOW,
    );
    const keys = flattenCollections(collections).map(collectionKey);
    expect(keys).toEqual(['', 'kikuyu-basics', GREETINGS, NUMBERS]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(findCollection(collections, GREETINGS)?.name).toBe('Greetings');
    expect(findCollection(collections, '')?.id).toBeNull();
    expect(findCollection(collections, undefined)).toBeUndefined();
  });

  it('names subpacks in the reader\'s language', () => {
    const collections = buildReviewCollections(
      [card(GREETINGS, 'wĩ mwega'), card(NUMBERS, 'ĩmwe')],
      'Kikuyu', 'Korean', NOW,
    );
    expect(collections[0].subcollections.map(s => s.name)).toEqual(['인사', '숫자']);
  });
});

describe('buildDeckFilters', () => {
  // The Cards page chip row stays one chip per pack. Subpacks decide which chip
  // a card lands in, never whether a new one appears.
  it('gives a pack one chip however many subpacks it spans', () => {
    const filters = buildDeckFilters(
      [card(undefined, 'nyũmba'), card(GREETINGS, 'wĩ mwega'), card(NUMBERS, 'ĩmwe')],
      'Kikuyu', 'English',
    );
    expect(filters.map(f => f.id)).toEqual(['all', 'mine', 'kikuyu-basics']);
    expect(filters.find(f => f.id === 'kikuyu-basics')!.count).toBe(2);
  });
});

/**
 * What every pack has to keep true for subpack ids to work at all. These are
 * about the registry rather than about one pack, so a new pack inherits them
 * without anyone remembering to ask.
 */
describe('the registry, for subpacks', () => {
  const packs = (Object.entries(VOCAB_PACKS) as [StudyLanguage, VocabPack[]][])
    .flatMap(([studyLanguage, list]) => list.map(pack => ({ studyLanguage, pack })));

  // A slash in either half would make `parentPackId` cut in the wrong place,
  // silently filing cards under a pack that does not exist.
  it('has no slash in any pack or section id', () => {
    for (const { pack } of packs) {
      expect(pack.id).not.toContain('/');
      for (const section of pack.sections) expect(section.id).not.toContain('/');
    }
  });

  it('round-trips every section through its subpack id', () => {
    for (const { studyLanguage, pack } of packs) {
      for (const section of pack.sections) {
        const id = packRefId(pack.id, section.id);
        expect(parentPackId(id)).toBe(pack.id);
        expect(resolvePackRef(studyLanguage, id)?.section?.id).toBe(section.id);
      }
    }
  });

  it('gives each section of a pack a distinct id', () => {
    for (const { pack } of packs) {
      const ids = pack.sections.map(section => section.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  // What the remap script derives from: a term in two sections of one pack
  // would name no single subpack, so those cards would have to stay at pack
  // level. True today across every pack; the script reports any that appear.
  it('puts each term in exactly one section of its pack', () => {
    for (const { pack } of packs) {
      const terms = pack.sections.flatMap(s => s.entries.map(e => e.study.toLowerCase()));
      expect(new Set(terms).size).toBe(terms.length);
    }
  });
});
