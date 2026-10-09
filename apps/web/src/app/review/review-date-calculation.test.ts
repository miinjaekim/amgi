import { describe, it, expect } from 'vitest';
import { getNextReviewData } from '@/services/sm2';

describe('Review Date Calculation Tests', () => {
  const now = new Date();
  
  it('should schedule dates correctly for different responses', () => {
    // Test data structure - simulate a card with tracking data
    const testCardData = {
      interval: 0,
      ease: 2.5,
      repetitions: 0
    };
    
    // "again" resets the interval to 1 day, but the card itself stays due now —
    // answering wrong should not be what removes it from today's queue.
    const againResult = getNextReviewData(testCardData, 'again');
    expect(againResult.interval).toBe(1);
    expect(againResult.nextReview.getDate()).toBe(now.getDate());

    // Calculate expected date for interval = 2
    const expectedTwoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    // Compare just the dates, not exact times (may vary slightly during test execution)
    
    // Test "good" response on a new card
    const goodResult = getNextReviewData(testCardData, 'good');
    expect(goodResult.interval).toBe(2);
    expect(goodResult.repetitions).toBe(1);
    // Should be the day after tomorrow
    expect(goodResult.nextReview.getDate()).toBe(expectedTwoDaysLater.getDate());
    
    // Test "good" response on a card that's been reviewed once
    const secondCardData = {
      interval: 2,
      ease: 2.5,
      repetitions: 1
    };
    const secondGoodResult = getNextReviewData(secondCardData, 'good');
    expect(secondGoodResult.interval).toBe(5); // 2 * 2.5
    expect(secondGoodResult.repetitions).toBe(2);
    
    // Calculate expected date for interval = 5
    const expectedFiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(secondGoodResult.nextReview.getDate()).toBe(expectedFiveDaysLater.getDate());
    
    // Test "easy" response on a card that's been reviewed twice
    const thirdCardData = {
      interval: 6,
      ease: 2.6,
      repetitions: 2
    };
    const easyResult = getNextReviewData(thirdCardData, 'easy');
    expect(easyResult.interval).toBe(20); // Rounded from 6 * 2.6 * 1.3
    expect(easyResult.repetitions).toBe(3);
    
    // Calculate expected date for interval = 20
    const expectedTwentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    expect(easyResult.nextReview.getDate()).toBe(expectedTwentyDaysLater.getDate());
  });
  
  it('should never schedule a card for the past', () => {
    // All responses should schedule for the future, never the past
    const testCardData = {
      interval: 0,
      ease: 2.5,
      repetitions: 0
    };
    
    // Get the dates for each response type
    const againDate = getNextReviewData(testCardData, 'again').nextReview;
    const hardDate = getNextReviewData(testCardData, 'hard').nextReview;
    const goodDate = getNextReviewData(testCardData, 'good').nextReview;
    const easyDate = getNextReviewData(testCardData, 'easy').nextReview;
    
    // A missed card is due immediately; everything that passed goes forward.
    expect(againDate.getTime()).toBeLessThanOrEqual(Date.now());
    expect(hardDate.getTime()).toBeGreaterThan(now.getTime());
    expect(goodDate.getTime()).toBeGreaterThan(now.getTime());
    expect(easyDate.getTime()).toBeGreaterThan(now.getTime());
  });
}); 