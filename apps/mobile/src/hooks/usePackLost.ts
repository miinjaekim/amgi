import { useState } from 'react';

/**
 * Whether a pack this screen was showing has stopped resolving.
 *
 * Packs are looked up under the current study language, so a pack that
 * resolved and then didn't means the language was switched while the screen
 * was open — the caller should leave for the Decks list rather than strand the
 * user on `deckNotFound`. A pack that never resolved is a bad link and stays
 * false, which is what keeps `deckNotFound` for that case.
 *
 * Remembered in state rather than a ref so the screen can render nothing on
 * the same pass, instead of flashing the not-found message before it leaves.
 */
export function usePackLost(pack: unknown): boolean {
  const [resolved, setResolved] = useState(false);
  if (pack && !resolved) setResolved(true);
  return resolved && !pack;
}
