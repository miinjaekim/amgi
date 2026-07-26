import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

function isReachable(state: Network.NetworkState | Network.NetworkStateEvent): boolean {
  // `isInternetReachable` is the honest signal — connected to a wifi network
  // that itself has no route out still counts as offline — but it is not
  // populated on every platform, so fall back to raw connectivity.
  return state.isInternetReachable ?? state.isConnected ?? true;
}

/**
 * Whether the device can currently reach the internet.
 *
 * Starts optimistic: the first real reading is a round trip away, and flashing
 * an "offline" banner on every cold start would be both wrong and alarming.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    Network.getNetworkStateAsync()
      .then(state => { if (active) setIsOnline(isReachable(state)); })
      .catch(() => { /* Keep the optimistic default rather than guessing. */ });

    const subscription = Network.addNetworkStateListener(state => {
      setIsOnline(isReachable(state));
    });

    return () => { active = false; subscription.remove(); };
  }, []);

  return isOnline;
}
