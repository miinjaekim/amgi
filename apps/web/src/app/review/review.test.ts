import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextReviewData } from '@/services/sm2';
import { buildReviewCollections, isDue } from '@amgi/core';
import { Flashcard, ReviewTracking } from '@/services/firestore';

// Mock updateDoc function
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual as any,
    updateDoc: vi.fn().mockResolvedValue(undefined),
  };
});

describe('Review Scheduling Logic', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 6);

  // Create a sample card
  const sampleCard: Flashcard = {
    id: 'test-card-1',
    uid: 'test-user',
    term: '안녕하세요',
    termLanguage: 'Korean',
    korean: '안녕하세요',
    english: 'Hello',
    translation: 'Hello',
    definition: 'A greeting in Korean',
    examples: [{ korean: '안녕하세요, 만나서 반갑습니다.', english: 'Hello, nice to meet you.' }],
    notes: '',
    createdAt: new Date('2023-01-01'),
    frontToBack: {
      nextReview: today,
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    },
    backToFront: {
      nextReview: today,
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    }
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should schedule new date based on response type', () => {
    // Test "again" response - should be scheduled for today (immediately).
    // `interval` still resets to 1: that is what the next *successful* pass
    // schedules from, not this one.
    const againResult = getNextReviewData(sampleCard.frontToBack as ReviewTracking, 'again');
    expect(againResult.interval).toBe(1);
    expect(againResult.nextReview.getDate()).toBe(today.getDate());
    
    // Test "good" response - should be scheduled for tomorrow (1 day) for first review
    const goodResult = getNextReviewData(sampleCard.frontToBack as ReviewTracking, 'good');
    expect(goodResult.interval).toBe(1);
    expect(goodResult.nextReview.getDate()).toBe(tomorrow.getDate());
    
    // Test a follow-up "good" response after an initial "good"
    const followupCard = {
      ...sampleCard.frontToBack,
      interval: 1,
      repetitions: 1,
    };
    const followupGoodResult = getNextReviewData(followupCard, 'good');
    expect(followupGoodResult.interval).toBe(6);
    expect(followupGoodResult.nextReview.getDate()).toBe(
      new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).getDate()
    );

    // Test "easy" response on a card after multiple reviews
    const experiencedCard = {
      ...sampleCard.frontToBack,
      interval: 6,
      repetitions: 2,
      ease: 2.5,
    };
    const easyResult = getNextReviewData(experiencedCard, 'easy');
    expect(easyResult.interval).toBe(15); // 6 * 2.5 rounded
    expect(easyResult.nextReview).toBeInstanceOf(Date);
    expect(easyResult.nextReview.getTime()).toBeGreaterThan(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  });

  it('should correctly check if a card is due', () => {
    // Test a card that's due today
    const dueCard = {
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: today }
    };
    expect(isDue(dueCard as Flashcard)).toContain('frontToBack');

    // Test a card that's not due yet
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 7);

    const notDueCard = {
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: futureDate },
      backToFront: { ...sampleCard.backToFront, nextReview: futureDate }
    };
    expect(isDue(notDueCard as Flashcard)).toHaveLength(0);

    // Test a card with only one direction due
    const partialDueCard = {
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: today },
      backToFront: { ...sampleCard.backToFront, nextReview: futureDate }
    };
    const partialDueResult = isDue(partialDueCard as Flashcard);
    expect(partialDueResult).toContain('frontToBack');
    expect(partialDueResult).not.toContain('backToFront');
  });

  // A direction with no tracking has never been studied that way, so it is due
  // — that is what puts a freshly saved card at the front of the queue.
  it('treats an untracked direction as due', () => {
    const halfTracked = { ...sampleCard, backToFront: undefined };
    expect(isDue(halfTracked as Flashcard)).toEqual(['frontToBack', 'backToFront']);
  });

  // Pre-bidirectional cards carry only a top-level nextReview.
  it('falls back to the legacy nextReview when neither direction is tracked', () => {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 7);
    const legacy = { ...sampleCard, frontToBack: undefined, backToFront: undefined };
    expect(isDue({ ...legacy, nextReview: today } as Flashcard)).toHaveLength(2);
    expect(isDue({ ...legacy, nextReview: futureDate } as Flashcard)).toHaveLength(0);
  });
});

describe('buildReviewCollections', () => {
  const now = new Date('2026-07-26T12:00:00Z');
  const past = new Date('2026-07-25T12:00:00Z');
  const future = new Date('2026-08-02T12:00:00Z');
  const tracked = (nextReview: Date) => ({ nextReview, interval: 1, ease: 2.5, repetitions: 1 });

  const card = (packId: string | undefined, nextReview: Date): Flashcard => ({
    uid: 'u', term: 'あ', termLanguage: 'Japanese', japanese: 'あ', english: 'a',
    createdAt: new Date('2026-07-01'), studyLanguage: 'Japanese', packId,
    frontToBack: tracked(nextReview), backToFront: tracked(nextReview),
  });

  it('keeps your own cards and each pack apart, your own first', () => {
    const collections = buildReviewCollections(
      [card('kana-hiragana', past), card(undefined, past), card('kana-hiragana', future)],
      'Japanese',
      'English',
      now
    );
    expect(collections.map(c => c.id)).toEqual([null, 'kana-hiragana']);
    expect(collections[0].name).toBe('My cards');
    expect(collections[0].dueCount).toBe(2); // both directions of the one card
    expect(collections[1].cardCount).toBe(2);
    expect(collections[1].dueCount).toBe(2);
    expect(collections[1].nextReview).toEqual(future);
  });

  // A pack you have not enrolled in belongs on Decks, which is where you would
  // go to enrol in it — not in the review picker as a zero row.
  it('omits collections with no cards', () => {
    const collections = buildReviewCollections([card(undefined, past)], 'Japanese', 'English', now);
    expect(collections.map(c => c.id)).toEqual([null]);
  });
});
