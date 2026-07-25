import type { PackCard } from './packs';

/**
 * Drilling a deck is not reviewing it. Review asks the scheduler what is due
 * and writes back an interval; a drill is a closed set you grind until it
 * sticks, repeatable as many times as you like, and it deliberately writes no
 * SM-2 state — so grinding the kana chart five times in an afternoon cannot
 * wreck the intervals of the cards you saved from it.
 *
 * Everything here is pure, because the interesting part is the queue and the
 * queue is the same on web and mobile.
 */

export type DrillDirection = 'studyToBack' | 'backToStudy';

/**
 * How many cards a missed card waits behind before coming round again. Small
 * enough that it returns inside the same sitting, large enough that answering
 * it again is recall rather than an echo of the answer just read.
 */
export const DRILL_REQUEUE_GAP = 4;

/** Session lengths offered before starting. `null` is the whole deck. */
export const DRILL_SIZES: readonly (number | null)[] = [10, 25, null];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The starting queue: shuffled, then cut to `size`. Shuffling before cutting
 * matters — cutting first would drill the same opening ten kana every time.
 */
export function startDrillQueue(cards: readonly PackCard[], size: number | null): PackCard[] {
  const shuffled = shuffle(cards);
  return size === null ? shuffled : shuffled.slice(0, size);
}

/**
 * Grades the card at the front. Known cards leave the queue; missed cards go
 * back in, so a session ends only once everything in it has been answered
 * correctly at least once.
 */
export function advanceDrillQueue(queue: readonly PackCard[], knew: boolean): PackCard[] {
  const [current, ...rest] = queue;
  if (current === undefined) return [];
  if (knew) return rest;
  // Clamped, so missing the last card in the queue puts it straight back in
  // front rather than dropping it.
  const at = Math.min(DRILL_REQUEUE_GAP, rest.length);
  return [...rest.slice(0, at), current, ...rest.slice(at)];
}

/** What the drill shows before the reveal. */
export function drillPrompt(card: PackCard, direction: DrillDirection): string {
  return direction === 'studyToBack' ? card.study : card.back;
}

/** What the reveal shows. */
export function drillAnswer(card: PackCard, direction: DrillDirection): string {
  return direction === 'studyToBack' ? card.back : card.study;
}

/**
 * The text to pronounce for a card, which is always the study side whichever
 * way the drill runs — the romaji of a kana card is a description of the
 * sound, not the sound.
 */
export function drillSpokenText(card: PackCard): string {
  return card.study;
}
