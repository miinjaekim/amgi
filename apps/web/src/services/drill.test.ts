import { describe, it, expect } from 'vitest';
import {
  DRILL_REQUEUE_GAP,
  HIRAGANA_PACK,
  advanceDrillQueue,
  drillAnswer,
  drillPrompt,
  startDrillQueue,
} from '@amgi/core';
import type { PackCard } from '@amgi/core';

const deck: PackCard[] = Array.from({ length: 10 }, (_, i) => ({
  study: `s${i}`,
  back: { English: `b${i}`, Korean: `ㅂ${i}` },
}));

describe('startDrillQueue', () => {
  it('takes the whole deck when size is null', () => {
    expect(startDrillQueue(deck, null)).toHaveLength(deck.length);
  });

  it('cuts to the requested size', () => {
    expect(startDrillQueue(deck, 4)).toHaveLength(4);
  });

  it('never asks for more than the deck holds', () => {
    expect(startDrillQueue(deck, 500)).toHaveLength(deck.length);
  });

  // Cutting before shuffling would drill the same opening cards every session —
  // for kana that means never reaching the dakuten rows at the end of the table.
  it('draws a short session from the whole deck, not just the front of it', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      for (const card of startDrillQueue(HIRAGANA_PACK.cards, 5)) seen.add(card.study);
    }
    const lastKana = HIRAGANA_PACK.cards[HIRAGANA_PACK.cards.length - 1].study;
    expect(seen.has(lastKana)).toBe(true);
    expect(seen.size).toBeGreaterThan(40);
  });

  it('leaves the pack itself untouched', () => {
    const before = HIRAGANA_PACK.cards.map(c => c.study).join('');
    startDrillQueue(HIRAGANA_PACK.cards, null);
    expect(HIRAGANA_PACK.cards.map(c => c.study).join('')).toBe(before);
  });
});

describe('advanceDrillQueue', () => {
  it('drops a card that was known', () => {
    const next = advanceDrillQueue(deck, true);
    expect(next).toHaveLength(deck.length - 1);
    expect(next[0]).toBe(deck[1]);
  });

  it('puts a missed card back, behind the requeue gap', () => {
    const next = advanceDrillQueue(deck, false);
    expect(next).toHaveLength(deck.length);
    expect(next[DRILL_REQUEUE_GAP]).toBe(deck[0]);
    expect(next[0]).toBe(deck[1]);
  });

  // Otherwise the last card of a session could be missed and still leave the
  // queue, ending a drill on a card the user just got wrong.
  it('re-asks a missed final card immediately', () => {
    const next = advanceDrillQueue([deck[0]], false);
    expect(next).toEqual([deck[0]]);
  });

  it('empties on the last card when it was known', () => {
    expect(advanceDrillQueue([deck[0]], true)).toEqual([]);
  });

  it('is safe on an empty queue', () => {
    expect(advanceDrillQueue([], true)).toEqual([]);
    expect(advanceDrillQueue([], false)).toEqual([]);
  });

  // The session-ends-only-when-clear property the whole loop rests on.
  it('terminates once every card has been answered correctly', () => {
    let queue = startDrillQueue(deck, null);
    let guard = 0;
    // Miss everything on the first pass, then know everything.
    let missPass = true;
    while (queue.length > 0 && guard++ < 500) {
      queue = advanceDrillQueue(queue, !missPass);
      if (guard === deck.length) missPass = false;
    }
    expect(queue).toHaveLength(0);
  });
});

describe('drill direction', () => {
  const card: PackCard = { study: 'あ', back: { English: 'a', Korean: '아' } };

  it('shows the character and asks for the sound', () => {
    expect(drillPrompt(card, 'studyToBack')).toBe('あ');
    expect(drillAnswer(card, 'studyToBack')).toBe('a');
  });

  it('reverses cleanly', () => {
    expect(drillPrompt(card, 'backToStudy')).toBe('a');
    expect(drillAnswer(card, 'backToStudy')).toBe('あ');
  });

  // The drill is the one pack surface where the back is both shown and typed
  // against, so it has to follow native language the way the deck tiles do.
  it('answers in the reader\'s own script', () => {
    expect(drillAnswer(card, 'studyToBack', 'Korean')).toBe('아');
    expect(drillPrompt(card, 'backToStudy', 'Korean')).toBe('아');
    expect(drillAnswer(card, 'studyToBack', 'English')).toBe('a');
  });
});
