import { Tabs } from 'expo-router';
import FloatingTabBar, { type TabIcons } from '../../src/components/FloatingTabBar';
import type { TranslationKey } from '@amgi/core';

/**
 * Munli's tab bar — the same shell as Amgi's, with different tabs in it.
 *
 * ⚠️ **This replaces the Stack that shipped in PR #135**, on the user's call
 * after using it: switching modes should change *what the tabs are*, not
 * whether there are tabs. A mode that navigates differently from the rest of
 * the app reads as leaving the app rather than moving inside it. The Stack was
 * argued from "a one-tab bar is furniture", which was right about one tab and
 * wrong about the shell.
 *
 * **Conjugation is first, and therefore the initial route** — the same argument
 * that puts Review first in Amgi. The first tab is the mode's answer to "what
 * is this for" on every cold open, and for a grammar mode the answer is
 * *practise*, not *submit something to be corrected*. Writing is intentional
 * and occasional; conjugation is the thing with a due count.
 *
 * **Progress is last in both modes**, which is not a coincidence to be tidied
 * away: holding the last tab is how modes are switched, so the gesture lands on
 * the same tab wherever you are — and unlike the Stack, Munli now has a bar to
 * hold.
 */
export const unstable_settings = { initialRouteName: 'index' };

const ICONS: TabIcons = {
  index:    { on: 'grid',        off: 'grid-outline'        },
  writing:  { on: 'create',      off: 'create-outline'      },
  progress: { on: 'stats-chart', off: 'stats-chart-outline' },
};

const LABELS: Record<string, TranslationKey> = {
  index:    'munliToolConjugation',
  writing:  'munliToolWriting',
  progress: 'navProgress',
};

export default function MunliLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} icons={ICONS} labels={LABELS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Conjugation' }} />
      <Tabs.Screen name="writing" options={{ title: 'Writing' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
