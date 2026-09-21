import { Stack } from 'expo-router';

/**
 * Required, not decorative — the same reason `(tabs)/decks` has one. Without a
 * layout here expo-router flattens these routes into the Tabs navigator, and
 * `FloatingTabBar` maps over every route in the navigator state, so each would
 * surface as an extra icon drawing the generic fallback.
 */
export default function TopicsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
