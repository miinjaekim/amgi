import { describe, it, expect } from 'vitest';
import {
  DRILL_REQUEUE_GAP,
  advancePreviewQueue,
  isNewCard,
  newCards,
  startPreviewQueue,
} from '@amgi/core';
import type { Flashcard, ReviewTracking } from '@amgi/core';

const NOW = new Date('2026-10-14T09:00:00Z');
const fresh = (): ReviewTracking => ({ nextReview: NOW, interval: 0, ease: 2.5, repetitions: 0 });
/** What Again leaves behind: the interval moves even though repetitions stay at 0. */
const missed = (): ReviewTracking => ({ nextReview: NOW, interval: 1, ease: 2.3, repetitions: 0 });
const learned = (): ReviewTracking => ({ nextReview: NOW, interval: 6, ease: 2.5, repetitions: 2 });

function card(id: string, fields: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    uid: 'user',
    createdAt: NOW,
    term: id,
    termLanguage: 'English',
    korean: `${id}-ko`,
    english: id,
    ...fields,
  } as Flashcard;
}

describe('isNewCard', () => {
  it('is a card at 0/0 both ways', () => {
    expect(isNewCard(card('a', { frontToBack: fresh(), backToFront: fresh() }))).toBe(true);
  });

  it('is not a card rated in either direction', () => {
    expect(isNewCard(card('a', { frontToBack: learned(), backToFront: fresh() }))).toBe(false);
    expect(isNewCard(card('a', { frontToBack: fresh(), backToFront: learned() }))).toBe(false);
  });

  it('is not a card missed once, which Again leaves at interval 1', () => {
    expect(isNewCard(card('a', { frontToBack: missed(), backToFront: fresh() }))).toBe(false);
  });

  it('reads a legacy card from its top-level fields', () => {
    expect(isNewCard(card('a', { interval: 0, repetitions: 0 }))).toBe(true);
    expect(isNewCard(card('a', { interval: 3, repetitions: 1 }))).toBe(false);
    expect(isNewCard(card('a'))).toBe(true);
  });
});

describe('newCards and startPreviewQueue', () => {
  const deck = [
    card('new1', { frontToBack: fresh(), backToFront: fresh() }),
    card('old', { frontToBack: learned(), backToFront: learned() }),
    card('new2', { frontToBack: fresh(), backToFront: fresh() }),
  ];

  it('keeps only the new cards', () => {
    expect(newCards(deck).map(c => c.id)).toEqual(['new1', 'new2']);
  });

  it('queues every new card once', () => {
    expect(startPreviewQueue(deck).map(c => c.id).sort()).toEqual(['new1', 'new2']);
  });
});

describe('advancePreviewQueue', () => {
  const queue = Array.from({ length: 8 }, (_, i) => card(`c${i}`));

  it('drops the front card when it is got', () => {
    const next = advancePreviewQueue(queue, true);
    expect(next.map(c => c.id)).toEqual(queue.slice(1).map(c => c.id));
  });

  it('sends the front card back a few places when it is not', () => {
    const next = advancePreviewQueue(queue, false);
    expect(next).toHaveLength(queue.length);
    expect(next[DRILL_REQUEUE_GAP].id).toBe('c0');
  });

  it('ends when the last card is got', () => {
    expect(advancePreviewQueue([card('only')], true)).toEqual([]);
  });

  it('keeps the last card when it is not got', () => {
    expect(advancePreviewQueue([card('only')], false).map(c => c.id)).toEqual(['only']);
  });
});
