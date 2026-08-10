import { describe, it, expect } from 'vitest';
import {
  DIRECTION_FILTERS,
  buildReviewQueue,
  dueReviewItems,
  filterByDirection,
  removeCardFromQueue,
} from '@amgi/core';
import type { Flashcard, ReviewTracking } from '@amgi/core';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-07-28T09:00:00Z');
const past = (): ReviewTracking => ({
  nextReview: new Date(NOW.getTime() - DAY), interval: 1, ease: 2.5, repetitions: 1,
});
const future = (): ReviewTracking => ({
  nextReview: new Date(NOW.getTime() + DAY), interval: 1, ease: 2.5, repetitions: 1,
});

function card(id: string, tracking: Partial<Pick<Flashcard, 'frontToBack' | 'backToFront'>>): Flashcard {
  return {
    id,
    uid: 'user',
    createdAt: NOW,
    term: id,
    termLanguage: 'English',
    korean: `${id}-ko`,
    english: id,
    ...tracking,
  } as Flashcard;
}

describe('dueReviewItems', () => {
  it('yields one entry per due direction, so a card due both ways is asked twice', () => {
    const items = dueReviewItems([card('a', { frontToBack: past(), backToFront: past() })], NOW);
    expect(items).toHaveLength(2);
    expect(items.map(i => i.direction).sort()).toEqual(['backToFront', 'frontToBack']);
  });

  it('yields only the direction that is due', () => {
    const items = dueReviewItems([card('a', { frontToBack: past(), backToFront: future() })], NOW);
    expect(items).toHaveLength(1);
    expect(items[0].direction).toBe('frontToBack');
  });

  it('skips a card due in neither direction', () => {
    expect(dueReviewItems([card('a', { frontToBack: future(), backToFront: future() })], NOW)).toEqual([]);
  });

  it('treats an untracked direction as due — a new card is asked both ways', () => {
    const items = dueReviewItems([card('a', {})], NOW);
    expect(items).toHaveLength(2);
  });
});

describe('filterByDirection', () => {
  const items = dueReviewItems([
    card('both', { frontToBack: past(), backToFront: past() }),
    card('forwards', { frontToBack: past(), backToFront: future() }),
  ], NOW);

  it('passes everything through on "both"', () => {
    expect(filterByDirection(items, 'both')).toHaveLength(3);
  });

  it('keeps only the chosen direction', () => {
    expect(filterByDirection(items, 'frontToBack').map(i => i.card.id)).toEqual(['both', 'forwards']);
    expect(filterByDirection(items, 'backToFront').map(i => i.card.id)).toEqual(['both']);
  });

  it('does not mutate what it was given', () => {
    filterByDirection(items, 'backToFront');
    expect(items).toHaveLength(3);
  });

  it('offers both directions plus "both", in that order', () => {
    expect(DIRECTION_FILTERS).toEqual(['both', 'frontToBack', 'backToFront']);
  });
});

describe('buildReviewQueue', () => {
  const cards = [
    card('a', { frontToBack: past(), backToFront: past() }),
    card('b', { frontToBack: past(), backToFront: future() }),
    card('c', { frontToBack: future(), backToFront: future() }),
  ];

  it('serves every due direction when both are wanted', () => {
    expect(buildReviewQueue(cards, 'both', NOW)).toHaveLength(3);
  });

  // The count on the start button and the length of the queue behind it are
  // read from these two functions separately; they must not be able to disagree.
  it('matches the count the start screen shows', () => {
    const due = dueReviewItems(cards, NOW);
    for (const filter of DIRECTION_FILTERS) {
      expect(buildReviewQueue(cards, filter, NOW)).toHaveLength(filterByDirection(due, filter).length);
    }
  });

  it('serves nothing when nothing is due that way round', () => {
    const backOnly = [card('c', { frontToBack: past(), backToFront: future() })];
    expect(buildReviewQueue(backOnly, 'backToFront', NOW)).toEqual([]);
  });

  it('keeps the same items whatever order it shuffles them into', () => {
    const ids = buildReviewQueue(cards, 'frontToBack', NOW).map(i => i.card.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });
});

describe('removeCardFromQueue', () => {
  const queue = [
    { card: card('a', {}), direction: 'frontToBack' as const },
    { card: card('b', {}), direction: 'frontToBack' as const },
    { card: card('a', {}), direction: 'backToFront' as const },
    { card: card('c', {}), direction: 'frontToBack' as const },
  ];

  // The bug this function exists for: archiving mid-session dropped the entry
  // on screen and left the same card queued the other way round.
  it('drops every direction of the card, not just the one on screen', () => {
    const { queue: remaining } = removeCardFromQueue(queue, 'a', 0);
    expect(remaining.map(i => i.card.id)).toEqual(['b', 'c']);
  });

  it('lands on the entry that followed the removed one', () => {
    const { queue: remaining, index } = removeCardFromQueue(queue, 'b', 1);
    expect(remaining[index].card.id).toBe('a');
    expect(remaining[index].direction).toBe('backToFront');
  });

  // The second 'a' sits behind the current index, so the index has to slide
  // back with it or the session skips a card.
  it('slides the index back past entries removed before it', () => {
    const { queue: remaining, index } = removeCardFromQueue(queue, 'a', 2);
    expect(remaining.map(i => i.card.id)).toEqual(['b', 'c']);
    expect(remaining[index].card.id).toBe('c');
  });

  it('stays on the last entry when the removed card was at the end', () => {
    const { queue: remaining, index } = removeCardFromQueue(queue, 'c', 3);
    expect(index).toBe(remaining.length - 1);
    expect(remaining[index].card.id).toBe('a');
  });

  it('empties the queue when the last card goes, whichever direction is showing', () => {
    const onlyA = queue.filter(i => i.card.id === 'a');
    const { queue: remaining, index } = removeCardFromQueue(onlyA, 'a', 1);
    expect(remaining).toEqual([]);
    expect(index).toBe(0);
  });
});
