import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { on: IoniconsName; off: IoniconsName }> = {
  index:    { on: 'search',    off: 'search-outline'   },
  review:   { on: 'layers',   off: 'layers-outline'   },
  cards:    { on: 'albums',   off: 'albums-outline'   },
  settings: { on: 'settings', off: 'settings-outline' },
};

// The bar is icon-only, so these surface only to screen readers.
const LABEL_KEYS: Record<string, TranslationKey> = {
  index:    'navLearn',
  review:   'navReview',
  cards:    'navCards',
  settings: 'navSettings',
};

export function useFloatingTabBarHeight() {
  const insets = useSafeAreaInsets();
  return insets.bottom + 84; // safe area + 12 margin + 52 bar + 20 breathing room
}

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { C, resolvedTheme } = useTheme();
  const { nativeLanguage } = useUser();
  const tint = resolvedTheme === 'paper' ? 'light' : 'dark';

  return (
    <View style={[s.wrapper, { bottom: insets.bottom + 12 }]}>
      <BlurView intensity={72} tint={tint} style={s.blur}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const icons = ICONS[route.name] ?? { on: 'apps', off: 'apps-outline' };

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
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                LABEL_KEYS[route.name] ? t(nativeLanguage, LABEL_KEYS[route.name]) : route.name
              }
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
  );
}

// Bottom position and height are layout-only — no theme colors needed here
const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
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
