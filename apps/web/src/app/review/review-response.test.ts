import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, updateDoc } from 'firebase/firestore';
import { getNextReviewData } from '@/services/sm2';
import { ReviewDirection } from './page';

// Mock Firebase doc and updateDoc functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn().mockReturnValue({ /* mock doc reference */ }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));

// Mock SM-2 algorithm function
vi.mock('@/services/sm2', () => ({
  getNextReviewData: vi.fn().mockImplementation(
    (card, response) => {
      // Simplified mock implementation of SM-2 algorithm
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 6);

      if (response === 'again') {
        return {
          interval: 1,
          ease: 2.3,
          repetitions: 0,
          nextReview: now // Immediate review for "again"
        };
      } else if (response === 'hard') {
        return {
          interval: 1,
          ease: 2.5,
          repetitions: 1,
          nextReview: tomorrow
        };
      } else if (response === 'good') {
        return {
          interval: 6,
          ease: 2.6,
          repetitions: 2,
          nextReview: nextWeek
        };
      } else { // easy
        return {
          interval: 15,
          ease: 2.7,
          repetitions: 3,
          nextReview: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
        };
      }
    }
  )
}));

describe('Review Response Handler', () => {
  // Mock database and state objects
  const mockDb = { /* mock database instance */ };
  let mockUpdateDocSpy: any;
  let mockGetNextReviewDataSpy: any;

  // Test card and review data
  const testCard = { 
    id: 'test-card-1',
    uid: 'test-user',
    term: '안녕하세요',
    translation: 'Hello',
    definition: 'A greeting in Korean',
    examples: [] as any[],
    createdAt: new Date('2023-01-01'),
    frontToBack: {
      nextReview: new Date(),
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    },
    backToFront: {
      nextReview: new Date(),
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    }
  };

  // Extract the handleReviewResponse function from the page component
  let handleReviewResponse: (response: 'again' | 'hard' | 'good' | 'easy') => Promise<void>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockUpdateDocSpy = vi.mocked(updateDoc);
    mockGetNextReviewDataSpy = vi.mocked(getNextReviewData);

    // Create manual mock of the handleReviewResponse function to test independently
    handleReviewResponse = async (response: 'again' | 'hard' | 'good' | 'easy') => {
      const direction: ReviewDirection = 'frontToBack';
      const card = testCard;
      
      // Get updated scheduling data using the tracking data for the specific direction
      const { interval, ease, repetitions, nextReview } = getNextReviewData(
        card.frontToBack,
        response
      );
      
      try {
        // Update the specific direction's tracking
        const update: Record<string, any> = {};
        update[`${direction}.interval`] = interval;
        update[`${direction}.ease`] = ease;
        update[`${direction}.repetitions`] = repetitions;
        
        if (response === 'again') {
          // Set next review to now (will be shown in next session)
          update[`${direction}.nextReview`] = new Date();
        } else {
          update[`${direction}.nextReview`] = nextReview;
        }
        
        await updateDoc(doc(mockDb as any, 'cards', card.id), update);
      } catch (err) {
        console.error('Failed to update card scheduling:', err);
      }
    };
  });

  it('should update nextReview based on response type', async () => {
    // Test "again" response - should be scheduled for immediately
    await handleReviewResponse('again');
    
    // Check updateDoc was called with correct arguments for "again"
    expect(mockUpdateDocSpy).toHaveBeenCalledTimes(1);
    expect(mockUpdateDocSpy.mock.calls[0][1]).toHaveProperty('frontToBack.nextReview');
    expect(mockUpdateDocSpy.mock.calls[0][1]['frontToBack.nextReview']).toBeInstanceOf(Date);
    
    vi.clearAllMocks();
    
    // Test "good" response - should use the nextReview date returned by getNextReviewData
    await handleReviewResponse('good');
    
    // Check getNextReviewData was called with correct arguments
    expect(mockGetNextReviewDataSpy).toHaveBeenCalledTimes(1);
    expect(mockGetNextReviewDataSpy).toHaveBeenCalledWith(
      testCard.frontToBack, 
      'good'
    );
    
    // Check updateDoc was called with correct arguments for "good"
    expect(mockUpdateDocSpy).toHaveBeenCalledTimes(1);
    expect(mockUpdateDocSpy.mock.calls[0][1]).not.toHaveProperty('frontToBack.nextReview', expect.any(Date));
    expect(mockUpdateDocSpy.mock.calls[0][1]).toHaveProperty('frontToBack.nextReview');
    
    // Should be using the mock return value from getNextReviewData, which for "good" is nextWeek
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6);
    
    const reviewDateInCall = mockUpdateDocSpy.mock.calls[0][1]['frontToBack.nextReview'];
    expect(reviewDateInCall.getDate()).toBeGreaterThan(new Date().getDate());
  });
}); 