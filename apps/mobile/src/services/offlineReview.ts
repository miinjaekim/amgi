/**
 * Durable offline state for the review loop — the storage half.
 *
 * Web gets this from Firestore's IndexedDB persistent cache. React Native has
 * no IndexedDB, so `getFirestore` there is memory-only: it survives a
 * backgrounded app but not a killed one, and the review loop is used in exactly
 * the place where the app gets killed — a phone in a pocket, underground. So
 * mobile keeps its own snapshot of the cards and its own queue of unsent
 * ratings, both in AsyncStorage.
 *
 * The data logic these functions move around (collapsing the queue, replaying
 * it, merging streaks) is pure and lives in `@amgi/core`, where it is tested.
 * The Firestore side is in `reviewSync.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Flashcard, PendingReview, StreakState, StudyLanguage } from '@amgi/core';
import { isStudyLanguage } from '@amgi/core';

const cardsKey = (uid: string, lang: StudyLanguage) => `amgi_cards_${uid}_${lang}`;
const knownLanguagesKey = (uid: string) => `amgi_known_languages_${uid}`;
const pendingKey = (uid: string) => `amgi_pending_reviews_${uid}`;
const streakKey = (uid: string) => `amgi_streak_${uid}`;

// ---------------------------------------------------------------------------
// Card snapshots
// ---------------------------------------------------------------------------

function reviveTracking(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const tracking = raw as Flashcard['frontToBack'] & object;
  return { ...tracking, nextReview: new Date(tracking.nextReview) };
}

/**
 * JSON has no Date, so a round-trip through AsyncStorage returns ISO strings.
 * `isDue` and friends already tolerate those, but `createdAt` is typed as a
 * Date and gets `.toLocaleDateString()` called on it, so cards come back shaped
 * exactly as Firestore delivered them rather than nearly.
 */
function reviveCard(raw: Record<string, unknown>): Flashcard {
  return {
    ...(raw as unknown as Flashcard),
    createdAt: new Date(raw.createdAt as string),
    nextReview: raw.nextReview ? new Date(raw.nextReview as string) : undefined,
    frontToBack: reviveTracking(raw.frontToBack),
    backToFront: reviveTracking(raw.backToFront),
  };
}

/** The last cards seen for this language, or null if this device never loaded it. */
export async function readCachedCards(
  uid: string,
  studyLanguage: StudyLanguage,
): Promise<Flashcard[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cardsKey(uid, studyLanguage));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(reviveCard);
  } catch {
    // A corrupt or half-written snapshot is not worth failing a review over;
    // treat it as "never cached" and let the network refill it.
    return null;
  }
}

/**
 * Store a language's cards and record that this device has seen the language —
 * the two always happen together, and the language set is what
 * `warmKnownLanguages` later refreshes so switching languages works offline.
 */
export async function writeCachedCards(
  uid: string,
  studyLanguage: StudyLanguage,
  cards: Flashcard[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(cardsKey(uid, studyLanguage), JSON.stringify(cards));
    await rememberLanguage(uid, studyLanguage);
  } catch {
    // Out of disk is not a reason to break the session that is already loaded.
  }
}

/** Study languages this device has successfully loaded for this user. */
export async function readKnownLanguages(uid: string): Promise<StudyLanguage[]> {
  try {
    const raw = await AsyncStorage.getItem(knownLanguagesKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStudyLanguage) : [];
  } catch {
    return [];
  }
}

async function rememberLanguage(uid: string, studyLanguage: StudyLanguage): Promise<void> {
  const known = await readKnownLanguages(uid);
  if (known.includes(studyLanguage)) return;
  await AsyncStorage.setItem(knownLanguagesKey(uid), JSON.stringify([...known, studyLanguage]));
}

// ---------------------------------------------------------------------------
// Pending ratings
// ---------------------------------------------------------------------------

/**
 * The queue is read-modify-written from several places — rating a card,
 * flushing on reconnect, flushing on foreground — and AsyncStorage offers no
 * atomic update. Serialising every mutation is what stops a flush that started
 * first from writing back a list that predates a rating made during it, which
 * would lose that rating silently. Rejections are swallowed so one failed
 * mutation doesn't wedge the chain behind it.
 */
let queueLock: Promise<unknown> = Promise.resolve();

function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = queueLock.then(operation, operation);
  queueLock = run.catch(() => undefined);
  return run;
}

async function readQueue(uid: string): Promise<PendingReview[]> {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(uid: string, queue: PendingReview[]): Promise<void> {
  if (queue.length === 0) await AsyncStorage.removeItem(pendingKey(uid));
  else await AsyncStorage.setItem(pendingKey(uid), JSON.stringify(queue));
}

export function readPendingReviews(uid: string): Promise<PendingReview[]> {
  return withQueueLock(() => readQueue(uid));
}

/**
 * Durably record a rating. The review screen awaits this *before* attempting
 * the network write: once it returns, the rating survives the app being killed,
 * which is the whole point of the queue.
 */
export function enqueueReview(uid: string, entry: PendingReview): Promise<void> {
  return withQueueLock(async () => {
    const queue = await readQueue(uid);
    await writeQueue(uid, [...queue, entry]);
  });
}

/**
 * Drop entries Firestore has accepted, keeping any added during the flush.
 * Matching on card and direction rather than object identity also clears the
 * superseded entries that `collapsePendingReviews` folded away.
 */
export function removePendingReviews(uid: string, sent: PendingReview[]): Promise<void> {
  if (sent.length === 0) return Promise.resolve();
  const sentKeys = new Set(sent.map(entry => `${entry.studyLanguage}:${entry.cardId}:${entry.direction}`));
  return withQueueLock(async () => {
    const queue = await readQueue(uid);
    await writeQueue(
      uid,
      queue.filter(entry => !sentKeys.has(`${entry.studyLanguage}:${entry.cardId}:${entry.direction}`)),
    );
  });
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export async function readCachedStreak(uid: string): Promise<StreakState | null> {
  try {
    const raw = await AsyncStorage.getItem(streakKey(uid));
    return raw ? (JSON.parse(raw) as StreakState) : null;
  } catch {
    return null;
  }
}

export async function writeCachedStreak(uid: string, state: StreakState): Promise<void> {
  try {
    await AsyncStorage.setItem(streakKey(uid), JSON.stringify(state));
  } catch {
    // Best-effort; the in-memory value still drives this session.
  }
}

/**
 * Mark the cached streak as synced — but only if it still says what was sent.
 *
 * Ratings arrive faster than writes settle, so by the time one resolves the
 * cache may already hold a later review. Clearing `dirty` blindly would both
 * roll that review back and declare it saved.
 */
export async function markStreakSynced(uid: string, sent: StreakState): Promise<void> {
  const current = await readCachedStreak(uid);
  if (!current) return;
  if (current.lastReviewDate !== sent.lastReviewDate) return;
  if (current.reviewedToday !== sent.reviewedToday) return;
  await writeCachedStreak(uid, { ...current, dirty: false });
}
