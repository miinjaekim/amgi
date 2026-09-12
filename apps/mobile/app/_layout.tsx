import { Stack } from 'expo-router';
import { UserProvider, useUser } from '../src/context/UserContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { PronunciationProvider } from '../src/context/PronunciationContext';
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
  const { authLoading, interfaceLanguage } = useUser();
  if (authLoading || interfaceLanguage !== null) return null;
  return <LanguageSetupModal />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <PronunciationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            {/* Decks moved into the tab group when review became per-collection:
                a pack is a peer of your own cards, not a drill-down from Learn.
                Drill stays out here, above the tabs — it is the one deck screen
                that wants the whole screen, and inside the group the tab bar
                would no longer give way to it. */}
            <Stack.Screen name="decks/[packId]/drill" />
            {/* Settings left the tab bar 2026-09-04, trading places with
                progress: a screen visited a handful of times ever does not earn
                a fifth of the bar, while the one that says how you are doing
                was reachable only from a streak badge that hides itself when
                the streak breaks. Reached from the gear on the Progress
                header; nothing deep-links to it. */}
            <Stack.Screen name="settings" />
            {/* The share preview, pushed rather than presented as a modal —
                and that is load-bearing, not a style choice. `Sharing.shareAsync`
                presents a native view controller, which iOS silently refuses
                while a React Native `Modal` is still animating out. The old
                chooser was a `Modal`, so the OS sheet never appeared, its
                promise never settled, and the Share button stayed disabled for
                the rest of the session. A pushed screen is not mid-transition
                when its own button is tapped, so the race cannot happen. */}
            <Stack.Screen name="share" />
          </Stack>
          <FirstRun />
        </PronunciationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
