import { describe, it, expect } from 'vitest';
import { DEFAULT_DECK_FILTER, buildDeckFilters, filterCardsByDeck } from '@amgi/core';
import type { Flashcard } from '@amgi/core';

// Japanese is the language that exercises both layouts: kana packs are `grid`
// and everything a user saves themselves is unpacked.
const card = (packId: string | undefined, study: string): Flashcard => ({
  uid: 'u', term: study, termLanguage: 'Japanese', japanese: study, english: study,
  createdAt: new Date('2026-07-01'), studyLanguage: 'Japanese', packId,
} as Flashcard);

const mine = card(undefined, '猫');
const hiragana = card('kana-hiragana', 'あ');
const katakana = card('kana-katakana', 'ア');
const toeic = card('toeic-core', 'comply');

// A product decision, not an implementation detail: the page is called My
// Cards, so it opens on them and widening to a pack is deliberate. Pinned so a
// refactor cannot quietly change what every account sees first.
describe('the default deck', () => {
  it('is your own cards', () => {
    expect(DEFAULT_DECK_FILTER).toBe('mine');
  });

  it('shows no pack cards on a mixed library', () => {
    expect(filterCardsByDeck([mine, toeic, hiragana], DEFAULT_DECK_FILTER, 'Japanese'))
      .toEqual([mine]);
  });
});

describe('filterCardsByDeck', () => {
  // The rule the loosening turns on: a card belongs to a pack *and* to your
  // list, so the list holds everything and the chips do the narrowing.
  it('keeps pack cards alongside your own', () => {
    const cards = [mine, toeic];
    expect(filterCardsByDeck(cards, 'all', 'Japanese')).toEqual(cards);
  });

  it('leaves grid packs out of the default view', () => {
    expect(filterCardsByDeck([mine, hiragana, katakana], 'all', 'Japanese')).toEqual([mine]);
  });

  // Hidden by default is not the same as unreachable.
  it('shows a grid pack when it is the deck you picked', () => {
    expect(filterCardsByDeck([mine, hiragana, katakana], 'kana-hiragana', 'Japanese'))
      .toEqual([hiragana]);
  });

  it('narrows to your own cards on Mine', () => {
    expect(filterCardsByDeck([mine, hiragana, toeic], 'mine', 'Japanese')).toEqual([mine]);
  });

  // A pack can leave the registry; the cards it produced are still real, and
  // vanishing from every view is worse than one stray row.
  it('keeps a card whose pack is no longer in the registry', () => {
    const orphan = card('retired-pack', '猿');
    expect(filterCardsByDeck([orphan], 'all', 'Japanese')).toEqual([orphan]);
  });
});

describe('buildDeckFilters', () => {
  it('offers nothing to choose between when no pack has produced a card', () => {
    expect(buildDeckFilters([mine], 'Japanese', 'English')).toEqual([]);
  });

  it('lists All and My Cards first, then each enrolled pack in registry order', () => {
    const filters = buildDeckFilters([katakana, mine, hiragana], 'Japanese', 'English');
    expect(filters.map(f => f.id)).toEqual(['all', 'mine', 'kana-hiragana', 'kana-katakana']);
  });

  it('counts the rows each chip would show, with grid packs out of All', () => {
    const filters = buildDeckFilters([mine, hiragana, hiragana], 'Japanese', 'English');
    expect(filters.find(f => f.id === 'all')!.count).toBe(1);
    expect(filters.find(f => f.id === 'mine')!.count).toBe(1);
    expect(filters.find(f => f.id === 'kana-hiragana')!.count).toBe(2);
  });

  // Archived cards are the other axis, and a chip that disappeared when its
  // deck had nothing archived would strand the selection on it.
  it('counts archived cards too', () => {
    const archived = { ...hiragana, archived: true };
    expect(buildDeckFilters([mine, archived], 'Japanese', 'English')
      .find(f => f.id === 'kana-hiragana')!.count).toBe(1);
  });

  it('names packs in the reader\'s language', () => {
    const korean = buildDeckFilters([mine, hiragana], 'Japanese', 'Korean');
    expect(korean[0].name).toBe('모든 카드');
    expect(korean[1].name).toBe('내 카드');
    expect(korean[2].name).toBe('히라가나');
  });

  it('falls back to the id for a pack no longer in the registry', () => {
    const orphan = card('retired-pack', '猿');
    const filters = buildDeckFilters([mine, orphan], 'Japanese', 'English');
    expect(filters.map(f => f.id)).toEqual(['all', 'mine', 'retired-pack']);
    expect(filters[2].name).toBe('retired-pack');
  });
});
