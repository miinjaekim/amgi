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
    
    // Test "again" response - should set interval to 1 day (before we override it)
    const againResult = getNextReviewData(testCardData, 'again');
    expect(againResult.interval).toBe(1);
    
    // Calculate expected date for interval = 1
    const expectedTomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // Compare just the dates, not exact times (may vary slightly during test execution)
    expect(againResult.nextReview.getDate()).toBe(expectedTomorrowDate.getDate());
    
    // Test "good" response on a new card
    const goodResult = getNextReviewData(testCardData, 'good');
    expect(goodResult.interval).toBe(1);
    expect(goodResult.repetitions).toBe(1);
    // Should be tomorrow
    expect(goodResult.nextReview.getDate()).toBe(expectedTomorrowDate.getDate());
    
    // Test "good" response on a card that's been reviewed once
    const secondCardData = {
      interval: 1,
      ease: 2.5,
      repetitions: 1
    };
    const secondGoodResult = getNextReviewData(secondCardData, 'good');
    expect(secondGoodResult.interval).toBe(6);
    expect(secondGoodResult.repetitions).toBe(2);
    
    // Calculate expected date for interval = 6
    const expectedSixDaysLater = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    expect(secondGoodResult.nextReview.getDate()).toBe(expectedSixDaysLater.getDate());
    
    // Test "easy" response on a card that's been reviewed twice
    const thirdCardData = {
      interval: 6,
      ease: 2.6,
      repetitions: 2
    };
    const easyResult = getNextReviewData(thirdCardData, 'easy');
    expect(easyResult.interval).toBe(16); // Rounded from 6 * 2.6
    expect(easyResult.repetitions).toBe(3);
    
    // Calculate expected date for interval = 16
    const expectedSixteenDaysLater = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
    expect(easyResult.nextReview.getDate()).toBe(expectedSixteenDaysLater.getDate());
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
    
    // All dates should be in the future
    expect(againDate.getTime()).toBeGreaterThan(now.getTime());
    expect(hardDate.getTime()).toBeGreaterThan(now.getTime());
    expect(goodDate.getTime()).toBeGreaterThan(now.getTime());
    expect(easyDate.getTime()).toBeGreaterThan(now.getTime());
  });
}); 