import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { flushPendingReviews } from '../services/reviewSync';
import { readPendingReviews } from '../services/offlineReview';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Owns *when* queued ratings get sent, and how many are still waiting.
 *
 * Three triggers, because no one of them is sufficient: coming back online
 * covers the ordinary case, returning to the foreground covers a reconnect the
 * app slept through, and mount covers a rating queued in a session that was
 * killed before either fired. `flushPendingReviews` deduplicates overlapping
 * calls, so triggering generously is cheap.
 *
 * Flushing promptly is also the mitigation for the conflict rule: ratings win
 * by being the last write, so the risk is a stale one landing on top of newer
 * work from another device. That risk is a function of how long a rating sits
 * in the queue, which is what these triggers keep short.
 */
export function usePendingReviewSync(uid: string | undefined) {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    if (!uid) { setPendingCount(0); return; }
    setPendingCount((await readPendingReviews(uid)).length);
  }, [uid]);

  const sync = useCallback(async () => {
    if (!uid) return;
    await flushPendingReviews(uid);
    await refreshPendingCount();
  }, [uid, refreshPendingCount]);

  // Mount, and whenever the user or their connection changes — which covers
  // coming back online, since that is a change to `isOnline`.
  useEffect(() => {
    if (!uid) { setPendingCount(0); return; }
    if (isOnline) void sync();
    else void refreshPendingCount();
  }, [uid, isOnline, sync, refreshPendingCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void sync();
    });
    return () => subscription.remove();
  }, [sync]);

  return { isOnline, pendingCount, refreshPendingCount, sync };
}
