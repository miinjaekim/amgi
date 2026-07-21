import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { SUPPORTED_LANGUAGES, SUPPORTED_STUDY_LANGUAGES } from '@amgi/core';
import { THEMES } from '../../src/theme';
import type { Palette } from '../../src/theme';

export default function SettingsScreen() {
  const { C, theme, setTheme } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, authLoading, nativeLanguage, studyLanguage, setNativeLanguage, setStudyLanguage, handleSignIn, handleSignOut } = useUser();

  if (authLoading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator color={C.highlight} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Settings</Text>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          {user ? (
            <View style={s.accountRow}>
              {user.photoURL
                ? <Image source={{ uri: user.photoURL }} style={s.avatar} />
                : <View style={[s.avatar, s.avatarFallback]}>
                    <Text style={s.avatarInitial}>
                      {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
              }
              <View style={s.accountInfo}>
                {user.displayName && <Text style={s.accountName}>{user.displayName}</Text>}
                <Text style={s.accountEmail}>{user.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={s.signedOutText}>Not signed in</Text>
          )}
        </View>

        {/* Native language */}
        <Text style={s.sectionLabel}>Native Language</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            Explanations and app text will use this language.
          </Text>
          <View style={s.langRow}>
            {SUPPORTED_LANGUAGES.map(({ code, label }) => {
              const active = nativeLanguage === code || (!nativeLanguage && code === 'English');
              return (
                <TouchableOpacity
                  key={code}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => setNativeLanguage(code)}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Study language */}
        <Text style={s.sectionLabel}>Learning</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            The language you're studying. Cards and reviews are grouped per language.
          </Text>
          <View style={s.langRow}>
            {SUPPORTED_STUDY_LANGUAGES.map(({ code, label, labelNative }) => {
              const active = studyLanguage === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => setStudyLanguage(code)}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {label !== labelNative ? `${label} · ${labelNative}` : label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme */}
        <Text style={s.sectionLabel}>Theme</Text>
        <View style={s.card}>
          <View style={s.langRow}>
            {THEMES.map(({ value, label }) => {
              const active = theme === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => setTheme(value)}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Auth action */}
        <View style={s.authSection}>
          {user ? (
            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Text style={s.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
              <Text style={s.signInBtnText}>Sign in with Google</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: Palette, tabBarHeight: number) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: tabBarHeight },
  heading: { fontSize: 28, fontWeight: '700', color: C.text, marginBottom: 28 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: C.border, marginBottom: 24,
  },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: C.highlight, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: C.bg, fontSize: 22, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 2 },
  accountEmail: { fontSize: 14, color: C.muted },
  signedOutText: { fontSize: 15, color: C.muted },

  // Language
  settingDescription: { fontSize: 14, color: C.muted, marginBottom: 14 },
  langRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  langChip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
  },
  langChipActive: { backgroundColor: C.highlight, borderColor: C.highlight },
  langChipText: { fontSize: 15, color: C.text, fontWeight: '500' },
  langChipTextActive: { color: C.bg, fontWeight: '700' },

  // Auth
  authSection: { marginTop: 8 },
  signOutBtn: {
    borderWidth: 1.5, borderColor: C.error, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  signOutBtnText: { color: C.error, fontSize: 15, fontWeight: '600' },
  signInBtn: {
    backgroundColor: C.highlight, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  signInBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  });
}
