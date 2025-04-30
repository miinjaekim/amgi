import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNextReviewData } from '@/services/sm2';
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
    // Test "again" response - should be scheduled for today (immediately)
    const againResult = getNextReviewData(sampleCard.frontToBack as ReviewTracking, 'again');
    expect(againResult.interval).toBe(1);
    expect(againResult.nextReview.getDate()).toBe(tomorrow.getDate());
    
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
    // Import the isDue function directly
    const { isDue } = require('../review/page');
    
    // Test a card that's due today
    const dueCard = { 
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: today }
    };
    const dueResult = isDue(dueCard);
    expect(dueResult.due).toBe(true);
    expect(dueResult.directions).toContain('frontToBack');
    
    // Test a card that's not due yet
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 7);
    
    const notDueCard = {
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: futureDate },
      backToFront: { ...sampleCard.backToFront, nextReview: futureDate }
    };
    const notDueResult = isDue(notDueCard);
    expect(notDueResult.due).toBe(false);
    expect(notDueResult.directions).toHaveLength(0);
    
    // Test a card with only one direction due
    const partialDueCard = {
      ...sampleCard,
      frontToBack: { ...sampleCard.frontToBack, nextReview: today },
      backToFront: { ...sampleCard.backToFront, nextReview: futureDate }
    };
    const partialDueResult = isDue(partialDueCard);
    expect(partialDueResult.due).toBe(true);
    expect(partialDueResult.directions).toContain('frontToBack');
    expect(partialDueResult.directions).not.toContain('backToFront');
  });
}); 