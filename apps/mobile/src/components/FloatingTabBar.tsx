import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// SDK 57 vendored react-navigation into expo-router and dropped the
// `@react-navigation/*` packages; `expo-router/tabs` is the public re-export.
import type { BottomTabBarProps } from 'expo-router/tabs';
import { THEME_SCHEME, t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import ModeSwitcherSheet from './ModeSwitcherSheet';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type TabIcons = Record<string, { on: IoniconsName; off: IoniconsName }>;

/**
 * ⚠️ **Keyed by route name, and route names repeat across modes** — both Amgi
 * and Munli have an `index` and a `progress`. So each mode's navigator passes
 * its own maps rather than this module holding one table for all of them; a
 * shared table would give Munli's conjugation tab Learn's magnifying glass.
 */
const ICONS: TabIcons = {
  index:    { on: 'search',      off: 'search-outline'      },
  review:   { on: 'layers',      off: 'layers-outline'      },
  cards:    { on: 'albums',      off: 'albums-outline'      },
  decks:    { on: 'library',     off: 'library-outline'     },
  progress: { on: 'stats-chart', off: 'stats-chart-outline' },
};

// The bar is icon-only, so these surface only to screen readers.
const LABEL_KEYS: Record<string, TranslationKey> = {
  index:    'navLearn',
  review:   'navReview',
  cards:    'navCards',
  decks:    'navDecks',
  progress: 'navProgress',
};

export function useFloatingTabBarHeight() {
  const insets = useSafeAreaInsets();
  return insets.bottom + 84; // safe area + 12 margin + 52 bar + 20 breathing room
}

interface Props extends BottomTabBarProps {
  /** This navigator's icons, by route name. Defaults to Amgi's. */
  icons?: TabIcons;
  /** This navigator's screen-reader labels, by route name. Defaults to Amgi's. */
  labels?: Record<string, TranslationKey>;
}

export default function FloatingTabBar({ state, navigation, icons: iconMap = ICONS, labels = LABEL_KEYS }: Props) {
  const insets = useSafeAreaInsets();
  const { C, resolvedTheme } = useTheme();
  const { interfaceLanguage } = useUser();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // ⚠️ The palette's own lightness, never its id. This read `=== 'paper'` while
  // Paper was the only light theme, which handed Shoko and Godspeed a dark
  // frosted slab over a pale background — the bar looked painted on rather than
  // floating above.
  const tint = THEME_SCHEME[resolvedTheme];

  return (
    <>
    <View style={[s.wrapper, { bottom: insets.bottom + 12, borderColor: C.border }]}>
      {/* Thin glass. The intensity is low enough that the page reads through
          the bar rather than stopping at it, so the hairline below is what
          keeps the bar's own edge legible — over a busy card, or over a light
          palette where the blur alone has little to say. */}
      <BlurView intensity={BLUR_INTENSITY} tint={tint} style={s.blur}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const icons = iconMap[route.name] ?? { on: 'apps', off: 'apps-outline' };
          // Holding the *last* tab opens the mode switcher — Instagram's
          // account-switcher gesture, on the tab that sits where the thumb
          // already is. The last tab, not a named one: the bar is reordered by
          // editing the layout, and a gesture pinned to `progress` would follow
          // that screen somewhere useless. Tap is untouched.
          const isLast = i === state.routes.length - 1;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={s.tab}
              onPress={onPress}
              onLongPress={isLast ? () => setSwitcherOpen(true) : undefined}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                labels[route.name] ? t(interfaceLanguage, labels[route.name]) : route.name
              }
              // A hold is undiscoverable by feel, so the one tab that has one
              // says so. Every other tab keeps no hint at all.
              accessibilityHint={isLast ? t(interfaceLanguage, 'modeSwitchHint') : undefined}
            >
              {focused && <View style={[s.activePill, { backgroundColor: C.highlight + '22' }]} />}
              <Ionicons
                name={focused ? icons.on : icons.off}
                size={24}
                color={focused ? C.highlight : C.muted}
              />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
    {/* Outside the bar: the wrapper is absolutely positioned with
        `overflow: 'hidden'` for the blur's rounded corners, and nothing that
        has to cover the screen belongs inside it. */}
    <ModeSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
}

/**
 * How much glass. Deliberately light — the bar floats over the page and should
 * let it through, not sit on it as a slab. `border` carries the edge instead,
 * which is why this can go this low without the bar losing its shape.
 */
const BLUR_INTENSITY = 40;

// Position, height and radius are layout-only; the border colour is the one
// thing here that comes from the palette, and it is passed in per render.
const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  blur: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
