import { Tabs } from 'expo-router';
import FloatingTabBar from '../../src/components/FloatingTabBar';

export default function TabLayout() {
  return (
    // Titles are not rendered — FloatingTabBar is icon-only and supplies its own
    // localized accessibility labels. These stay as stable internal names.
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Learn' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      {/* Unconditional, even on a language with no packs: a tab that appears
          and disappears would reflow the bar on every study-language switch,
          which is worse than a quiet empty state. */}
      <Tabs.Screen name="decks" options={{ title: 'Packs' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
