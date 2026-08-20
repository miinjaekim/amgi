import { Stack } from 'expo-router';
import { UserProvider, useUser } from '../src/context/UserContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import LanguageSetupModal from '../src/components/LanguageSetupModal';

/**
 * First run, mounted above the whole navigator so it covers the tabs too.
 *
 * `undefined` means preferences are still loading and `null` means they are
 * loaded and unanswered — only the second opens the modal, which is why this
 * is not a falsiness check. The modal stays up through its own third step
 * because it commits both answers on the last tap, not as they are given.
 */
function FirstRun() {
  const { authLoading, nativeLanguage } = useUser();
  if (authLoading || nativeLanguage !== null) return null;
  return <LanguageSetupModal />;
}

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
          {/* Outside the tab group deliberately: the bar already carries five
              tabs, and a sixth would crowd them for a screen you visit to look
              back rather than to study. Reached by tapping the streak badge. */}
          <Stack.Screen name="progress" />
        </Stack>
        <FirstRun />
      </UserProvider>
    </ThemeProvider>
  );
}
