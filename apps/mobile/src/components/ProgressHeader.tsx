import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SUPPORTED_STUDY_LANGUAGES, t } from '@amgi/core';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import BottomSheet from './BottomSheet';
import StudyLanguageList from './StudyLanguageList';
import ModeSwitcherSheet from './ModeSwitcherSheet';
import type { Palette } from '../theme';

/**
 * Who you are, what you are studying, and the two ways out: modes, and
 * settings.
 *
 * ⚠️ **Shared by every mode's Progress tab, which is the point.** Switching
 * modes changes the first tabs and what Progress *measures*; it must not change
 * the shell around them, or the switch reads as leaving the app rather than
 * moving inside it. Extracted from `(tabs)/progress.tsx` 2026-09-22 when Munli
 * grew a Progress tab of its own — the same reason `StudyLanguageList` was
 * extracted, and the same failure avoided: a header rendered twice is a header
 * that drifts.
 *
 * The language chip is the quick switcher: study language changes often and
 * native language rarely, so they do not sit at the same depth. It stays here
 * in every mode because the study language is the *shell's*, not a mode's —
 * Munli conjugates whatever deck you are on.
 */
export default function ProgressHeader() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage, studyLanguage } = useUser();
  const [langOpen, setLangOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const currentStudy = SUPPORTED_STUDY_LANGUAGES.find(lang => lang.code === studyLanguage);

  return (
    <>
      <View style={s.header}>
        {user?.photoURL
          ? <Image source={{ uri: user.photoURL }} style={s.avatar} />
          : <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarInitial}>
                {(user?.displayName ?? user?.email ?? '?')[0].toUpperCase()}
              </Text>
            </View>
        }
        <View style={s.headerText}>
          <Text style={s.headerName} numberOfLines={1}>
            {user?.displayName ?? user?.email ?? t(interfaceLanguage, 'settingsNotSignedIn')}
          </Text>
          <TouchableOpacity
            onPress={() => setLangOpen(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t(interfaceLanguage, 'settingsStudyLanguage')}
          >
            <Text style={s.headerLang} numberOfLines={1}>
              {currentStudy?.label ?? studyLanguage}
              <Text style={s.headerLangChevron}>{'  ▾'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
        {/* ⚠️ A visible door into modes, beside the gear. Holding the last tab
            still works and is faster, but a hold is undiscoverable by feel —
            this is the one that gets found by looking, and it is why the
            gesture never had to be the only way in. */}
        <TouchableOpacity
          onPress={() => setModeOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t(interfaceLanguage, 'modeSwitchTitle')}
        >
          <Ionicons name="swap-horizontal" size={22} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t(interfaceLanguage, 'settingsTitle')}
        >
          <Ionicons name="settings-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <BottomSheet
        visible={langOpen}
        title={t(interfaceLanguage, 'settingsStudyLanguage')}
        onClose={() => setLangOpen(false)}
      >
        <StudyLanguageList onSelect={() => setLangOpen(false)} />
      </BottomSheet>

      <ModeSwitcherSheet visible={modeOpen} onClose={() => setModeOpen(false)} />
    </>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    // `gap: 12` rather than 16 now that two icons sit at the end — the name
    // still gets the flex, and the two targets stay 12 apart like every other
    // pair in this row.
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { backgroundColor: C.highlight, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: C.bg, fontSize: 17, fontWeight: '700' },
    headerText: { flex: 1 },
    headerName: { color: C.text, fontSize: 16, fontWeight: '700' },
    headerLang: { color: C.muted, fontSize: 13, marginTop: 1 },
    headerLangChevron: { fontSize: 10 },
  });
}
