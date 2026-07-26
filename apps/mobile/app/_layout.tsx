import { Stack } from 'expo-router';
import { UserProvider } from '../src/context/UserContext';
import { ThemeProvider } from '../src/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/* Decks moved into the tab group when review became per-collection:
              a pack is a peer of your own cards, not a drill-down from Learn.
              Drill stays out here, above the tabs — it is the one deck screen
              that wants the whole screen, and inside the group the tab bar
              would no longer give way to it. */}
          <Stack.Screen name="decks/[packId]/drill" />
        </Stack>
      </UserProvider>
    </ThemeProvider>
  );
}
