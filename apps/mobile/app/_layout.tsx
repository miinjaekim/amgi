import { Stack } from 'expo-router';
import { UserProvider } from '../src/context/UserContext';
import { ThemeProvider } from '../src/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          {/* Pushed above the tabs, so the tab bar gives way to the deck —
              the packs are a drill-down from Learn, not a fifth tab. */}
          <Stack.Screen name="decks" />
        </Stack>
      </UserProvider>
    </ThemeProvider>
  );
}
