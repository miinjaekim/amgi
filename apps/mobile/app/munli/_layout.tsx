import { Tabs } from 'expo-router';
import { ConjugationProvider } from '../../src/context/ConjugationContext';
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
 * **The bar mirrors Amgi's, slot for slot** — Practice sits where Review does,
 * Saved where Cards does, Writing where Learn does, Topics where Packs does,
 * Progress where Progress does. That is not decoration: a mode that reorders the
 * shell makes switching feel like leaving the app, and the parallel means
 * whatever a learner knows about one mode's bar is true of the other's.
 *
 * **Practice is first, and therefore the initial route** — the same argument
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
  saved:    { on: 'albums',      off: 'albums-outline'      },
  writing:  { on: 'create',      off: 'create-outline'      },
  topics:   { on: 'library',     off: 'library-outline'     },
  progress: { on: 'stats-chart', off: 'stats-chart-outline' },
};

const LABELS: Record<string, TranslationKey> = {
  index:    'munliTabPractice',
  saved:    'munliTabSaved',
  writing:  'munliToolWriting',
  topics:   'munliTabTopics',
  progress: 'navProgress',
};

export default function MunliLayout() {
  return (
    // Conjugation progress is owned here so Practice and Progress read one
    // copy — they held two, and a rating on one was invisible to the other
    // until the app restarted.
    <ConjugationProvider>
    <Tabs
      tabBar={props => <FloatingTabBar {...props} icons={ICONS} labels={LABELS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Practice' }} />
      {/* What you have saved to practise, and where you take it back out —
          Munli's answer to Cards, in the slot Cards occupies. */}
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      {/* Writing takes the middle, where Learn sits in Amgi: the centre of a
          five-tab bar is where a thumb already is. */}
      <Tabs.Screen name="writing" options={{ title: 'Writing' }} />
      {/* The catalogue you add from, in the slot Packs occupies: one row per
          grammar topic, each opening its own screen. A stack behind one tab. */}
      <Tabs.Screen name="topics" options={{ title: 'Topics' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
    </ConjugationProvider>
  );
}
