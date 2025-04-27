import { describe, it, expect } from 'vitest';
import { getNextReviewData } from './sm2';
import { Flashcard } from './firestore';

describe('getNextReviewData (SM-2)', () => {
  const baseCard: Flashcard = {
    id: 'test',
    uid: 'user',
    createdAt: new Date(),
    term: 'test',
    definition: 'test',
    examples: [],
    notes: '',
    interval: 0,
    ease: 2.5,
    repetitions: 0,
  };

  it('should reset interval and repetitions for "again"', () => {
    const result = getNextReviewData(baseCard, 'again');
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.ease).toBeLessThanOrEqual(2.5);
  });

  it('should increment repetitions and interval for "good"', () => {
    const card = { ...baseCard, interval: 1, repetitions: 1, ease: 2.5 };
    const result = getNextReviewData(card, 'good');
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.ease).toBeGreaterThan(2.0);
  });

  it('should increment interval for "easy"', () => {
    const card = { ...baseCard, interval: 6, repetitions: 2, ease: 2.5 };
    const result = getNextReviewData(card, 'easy');
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.ease).toBeGreaterThan(2.0);
  });

  it('should set interval to 1 for first review', () => {
    const card = { ...baseCard, interval: 0, repetitions: 0, ease: 2.5 };
    const result = getNextReviewData(card, 'good');
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });
}); 