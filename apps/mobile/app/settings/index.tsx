import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { getMode, modeForTheme, t } from '@amgi/core';
import type { TranslationKey } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import ModeSwitcherSheet from '../../src/components/ModeSwitcherSheet';
import type { Palette } from '../../src/theme';

type Detail = 'languages' | 'appearance' | 'pronunciation' | 'reminders' | 'data' | 'about' | 'account';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Settings, as a list you skim: who is signed in, then a row per subject. Each
 * row pushes the screen that holds its controls.
 *
 * **Three groups, and the order is the argument.** What you tune, then what
 * you look up, then the account — last and alone, because that is where the
 * destructive actions are and they should not sit beside a row tapped daily.
 *
 * **Switch mode is the one row that does not push.** It opens the same sheet
 * the swap icon on Progress and a hold on the last tab do, and leads the first
 * group because the mode decides what the rows under it mean: the themes
 * Appearance offers are the current mode's.
 */
export default function SettingsIndex() {
  const { C } = useSettingsStyles();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage } = useUser();
  const mode = modeForTheme(usePathname(), useLocalSearchParams<{ mode?: string }>().mode);
  const [modeOpen, setModeOpen] = useState(false);

  const row = (icon: IconName, labelKey: TranslationKey, onPress: () => void, value?: string) => (
    <TouchableOpacity style={s.row} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={C.muted} />
      <Text style={s.rowLabel} numberOfLines={1}>{t(interfaceLanguage, labelKey)}</Text>
      {value && <Text style={s.rowValue} numberOfLines={1}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={C.muted} />
    </TouchableOpacity>
  );
  const detail = (icon: IconName, labelKey: TranslationKey, screen: Detail) =>
    row(icon, labelKey, () => router.push({ pathname: `/settings/${screen}`, params: { mode } }));

  return (
    <SettingsScreen titleKey="settingsTitle">
      {user ? (
        <View style={s.account}>
          {user.photoURL
            ? <Image source={{ uri: user.photoURL }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>
                  {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
          }
          <View style={s.accountInfo}>
            {user.displayName && <Text style={s.accountName} numberOfLines={1}>{user.displayName}</Text>}
            <Text style={s.accountEmail} numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
      ) : (
        <Text style={s.signedOut}>{t(interfaceLanguage, 'settingsNotSignedIn')}</Text>
      )}

      <View style={s.separator} />
      {row('swap-horizontal', 'modeSwitchTitle', () => setModeOpen(true), t(interfaceLanguage, getMode(mode).nameKey))}
      {detail('language-outline', 'settingsLanguages', 'languages')}
      {detail('color-palette-outline', 'settingsAppearance', 'appearance')}
      {detail('volume-medium-outline', 'settingsPronunciation', 'pronunciation')}
      {/* Signed in only, as the section was: a review reminder with no account
          has no due cards to count. */}
      {user && detail('notifications-outline', 'settingsReminders', 'reminders')}

      <View style={s.separator} />
      {detail('download-outline', 'settingsYourData', 'data')}
      {detail('information-circle-outline', 'settingsAbout', 'about')}

      <View style={s.separator} />
      {detail('person-circle-outline', 'settingsAccount', 'account')}

      <ModeSwitcherSheet visible={modeOpen} onClose={() => setModeOpen(false)} />
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    account: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 6 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: { backgroundColor: C.highlight, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: C.bg, fontSize: 19, fontWeight: '700' },
    accountInfo: { flex: 1 },
    accountName: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 2 },
    accountEmail: { fontSize: 14, color: C.muted },
    signedOut: { fontSize: 15, color: C.muted, paddingBottom: 6 },

    // Thin rules between groups and nothing between rows: the grouping is the
    // only structure the list has, so it is the only thing drawn.
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13 },
    rowLabel: { flex: 1, fontSize: 16, color: C.text },
    rowValue: { fontSize: 14, color: C.muted },
  });
}
