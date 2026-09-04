import { Tabs } from 'expo-router';
import FloatingTabBar from '../../src/components/FloatingTabBar';

/**
 * Review is the initial route, not Learn.
 *
 * The first tab is what every cold open lands on, which makes it the app's
 * own answer to "what is this for" — and the answer is *remember*. Looking a
 * word up is intent-driven and one tap away; reviewing is the thing a returning
 * learner came back to do and the thing they skip if it isn't in front of them.
 *
 * `initialRouteName` is load-bearing here: declaration order below sets the bar
 * order, but `/` still resolves to this group's `index`, so without it the bar
 * would read Review-first while a cold launch still opened on Learn.
 */
export const unstable_settings = { initialRouteName: 'review' };

export default function TabLayout() {
  return (
    // Titles are not rendered — FloatingTabBar is icon-only and supplies its own
    // localized accessibility labels. These stay as stable internal names.
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      {/* Learn sits in the middle rather than at either end: it is the surface
          reached most often from within a session, and the centre of a
          five-tab bar is where a thumb already is. */}
      <Tabs.Screen name="index" options={{ title: 'Learn' }} />
      {/* Unconditional, even on a language with no packs: a tab that appears
          and disappears would reflow the bar on every study-language switch,
          which is worse than a quiet empty state. */}
      <Tabs.Screen name="decks" options={{ title: 'Packs' }} />
      {/* Was reachable only from the streak badge, which renders only while the
          streak is alive — so breaking a streak hid the screen that would have
          told you. A tab fixes that by construction. Settings took this slot
          until 2026-09-04 and now lives behind the gear in this screen's
          header, which is the weight it earns. */}
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
