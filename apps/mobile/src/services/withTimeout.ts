/**
 * A deadline for Firestore calls.
 *
 * Lives in its own module rather than in `reviewSync.ts` so that `progress.ts`
 * can use it without importing `reviewSync` — which imports `firestore.ts`,
 * which imports `progress.ts`. Metro resolves that cycle by handing one of them
 * a half-initialised module, and the symptom would be an undefined function at
 * the moment a card is saved.
 *
 * Re-exported from `reviewSync.ts`, which is where existing callers import it.
 */

/**
 * How long to wait on a Firestore call before treating it as unreachable.
 *
 * A write is not optional here: `updateDoc`/`setDoc` do not reject when
 * offline, they return a promise that stays pending until the SDK can commit —
 * potentially forever. Awaiting one un-raced would stall a flush on its first
 * entry, and because flushes are chained, block every flush behind it for the
 * life of the process.
 *
 * For card ratings, timing out is free: every queued write is idempotent — it
 * sets scheduling to a fixed value, so a write that lands after we gave up on
 * it is simply written again next flush, to exactly the same result.
 *
 * **Progress deltas are not idempotent**, because they are `increment()`s. A
 * write that commits at second eleven is counted, and then counted again on
 * retry. That is accepted deliberately: the alternative is awaiting an un-raced
 * write, which offline never settles and which would wedge the flush chain for
 * the life of the process — trading a rare over-count for reliably losing whole
 * days. Over-counting is also self-limiting and only ever inflates a tally,
 * where the other failure silently erases history that cannot be rebuilt.
 */
export const REQUEST_TIMEOUT_MS = 10_000;

class TimeoutError extends Error {
  constructor() { super('Firestore request timed out'); }
}

export function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), REQUEST_TIMEOUT_MS);
    work.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}
