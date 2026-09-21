import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { getMode } from '@amgi/core';
import { UserProvider, useUser } from '../src/context/UserContext';
import { ModeProvider, useMode } from '../src/context/ModeContext';
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

/**
 * Land in the mode you left.
 *
 * ⚠️ **Runs once, and only as far as the first navigation.** It is not a
 * listener keeping the route in step with a stored value — the route *is* the
 * mode, and a second writer would fight the user's own navigation. The ref is
 * what makes "once" true across the re-render that `landingMode` arriving
 * causes.
 *
 * Amgi's group owns `/`, so landing there needs no navigation at all; only a
 * mode with a path of its own does.
 */
function ModeLanding() {
  const { landingMode } = useMode();
  const router = useRouter();
  const landed = useRef(false);

  useEffect(() => {
    if (landed.current || landingMode === undefined) return;
    landed.current = true;
    const home = getMode(landingMode).home;
    if (home !== '/') router.replace(home as never);
  }, [landingMode, router]);

  return null;
}

/**
 * Nothing renders until the landing mode is known.
 *
 * One AsyncStorage read, and it is what keeps a Munli user from watching Amgi's
 * tabs paint and then disappear. The splash screen is still up at this point,
 * so the gate is invisible.
 */
function ModeGate({ children }: { children: React.ReactNode }) {
  const { landingMode } = useMode();
  if (landingMode === undefined) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <PronunciationProvider>
          <ModeProvider>
          <ModeGate>
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
            {/* The per-language progress detail, opened from a "By language"
                row. A pushed screen rather than a sheet, matching share above:
                it is a place you go and come back from, and the row it opens
                from is the thing you come back to. */}
            <Stack.Screen name="progress/[language]" />
            {/* Munli — the grammar mode. A route segment rather than a group,
                so the path says which mode you are in exactly as web's
                `/munli` prefix does, and `modeFromPath` has one answer for
                both platforms. */}
            <Stack.Screen name="munli" />
          </Stack>
          <ModeLanding />
          <FirstRun />
          </ModeGate>
          </ModeProvider>
        </PronunciationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
