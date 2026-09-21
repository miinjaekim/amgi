import { Stack } from 'expo-router';

/**
 * Munli's navigator — a Stack, not Tabs, and that is a decision rather than a
 * placeholder.
 *
 * The mode gets its own navigation, but it has one screen today: writing and
 * verb conjugation are the next two builds. A tab bar with a single tab is
 * furniture for rooms nobody built, so the bar arrives when the second screen
 * does. Until then Munli's home carries the mode switcher in its header, which
 * is what replaces the hold-the-last-tab gesture while there is no tab bar to
 * hold.
 */
export default function MunliLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
