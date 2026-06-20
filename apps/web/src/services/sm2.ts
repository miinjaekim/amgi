import { Flashcard, ReviewTracking } from './firestore';

// Type for card parameter - can be either a full Flashcard or just ReviewTracking
type CardForReview = Flashcard | ReviewTracking | {
  interval?: number;
  ease?: number;
  repetitions?: number;
};

export function getNextReviewData(card: CardForReview, response: 'again' | 'hard' | 'good' | 'easy') {
  // Defaults for new cards
  let interval = card.interval ?? 0;
  let ease = card.ease ?? 2.5;
  let repetitions = card.repetitions ?? 0;
  let now = new Date();

  // Map response to quality
  let quality = 0;
  if (response === 'again') quality = 0;
  else if (response === 'hard') quality = 3;
  else if (response === 'good') quality = 4;
  else if (response === 'easy') quality = 5;

  // SM-2 logic
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = (repetitions || 0) + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }
  // Ease factor update
  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  // Next review date
  const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { interval, ease, repetitions, nextReview };
} 