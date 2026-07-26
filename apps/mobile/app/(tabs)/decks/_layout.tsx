import { Stack } from 'expo-router';

/**
 * Required, not decorative. Without a layout here expo-router flattens the deck
 * routes into the Tabs navigator itself, and FloatingTabBar maps over every
 * route in the navigator state — so each one would surface as an extra icon
 * drawing the generic fallback. This keeps them a stack behind one tab.
 */
export default function DecksLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
