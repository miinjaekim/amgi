import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import type { Palette } from '../theme';

/**
 * The streak, and how much of today is already done.
 *
 * A shortcut into the progress screen rather than the only door — progress took
 * a tab of its own 2026-09-04, precisely because this badge hides itself the
 * moment a streak breaks. `navigate` rather than `push`: the destination is a
 * sibling tab, and pushing it would stack a second copy over the current screen
 * instead of switching to the one already mounted.
 *
 * Renders nothing without a streak, which is the whole reason it can sit in a
 * shared header: a surface that carries it costs nothing on an account that has
 * not started one.
 *
 * Shared because it is now on two tabs. It lived inline on Learn and would have
 * been copied to Review, where the two would have drifted the way two page
 * titles did before `PAGE_TITLE_SIZE`.
 */
export default function StreakBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  const { user, nativeLanguage, streak, reviewedToday } = useUser();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  if (!user || streak <= 0) return null;

  return (
    <TouchableOpacity
      style={[s.badge, style]}
      onPress={() => router.navigate('/progress')}
      accessibilityRole="button"
      accessibilityLabel={t(nativeLanguage, 'progressTitle')}
      hitSlop={8}
    >
      <Text style={s.flame}>🔥</Text>
      <Text style={s.days}>
        {nativeLanguage === 'Korean' ? `${streak}일` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
      </Text>
      <Text style={s.sep}>·</Text>
      <Text style={s.today}>
        {nativeLanguage === 'Korean'
          ? `오늘 ${reviewedToday}개`
          : `${reviewedToday} ${reviewedToday === 1 ? 'card' : 'cards'} today`}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // No padding of its own: it sits in a page header on most screens and in a
    // row of its own on Learn's results state, and those want different room
    // around it. The caller supplies it.
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    flame: { fontSize: 14 },
    days: { fontSize: 13, fontWeight: '700', color: C.text },
    sep: { fontSize: 13, color: C.muted },
    today: { fontSize: 13, color: C.muted },
  });
}

/**
 * Padding for the badge standing on its own, with no page title above it.
 *
 * 16 rather than the 20 a `PageHeader` uses: the only screen in this shape is
 * Learn's results state, where what it has to line up with is the search row
 * below it, and that sits on a 16 gutter.
 */
export const streakRowStyle: ViewStyle = {
  alignSelf: 'flex-start',
  paddingHorizontal: 16,
  paddingTop: 8,
  paddingBottom: 4,
};
