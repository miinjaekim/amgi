import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Alert, Switch, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useUser } from '../../src/context/UserContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useFloatingTabBarHeight } from '../../src/components/FloatingTabBar';
import { clearAllLocalData } from '../../src/services/offlineReview';
import {
  cancelAllReminders, ensureNotificationPermission, hasNotificationPermission,
  readReminderPreferences, refreshReminders, writeReminderPreferences,
} from '../../src/services/reminders';
import {
  SUPPORTED_LANGUAGES, SUPPORTED_STUDY_LANGUAGES, formatReminderTime,
  reminderTimeOptions, t, type ReminderPreferences,
} from '@amgi/core';
import { THEMES } from '../../src/theme';
import type { Palette } from '../../src/theme';

// The policy is hosted on the web app; Korean speakers get the Korean version.
const PRIVACY_URL_BASE = 'https://amgi-iota.vercel.app/privacy';

export default function SettingsScreen() {
  const { C, theme, setTheme } = useTheme();
  const tabBarHeight = useFloatingTabBarHeight();
  const s = useMemo(() => makeStyles(C, tabBarHeight), [C, tabBarHeight]);
  const { user, authLoading, nativeLanguage, studyLanguage, setNativeLanguage, setStudyLanguage, deleteAccount, handleSignIn, handleSignOut } = useUser();
  const [deleting, setDeleting] = useState(false);
  const [reminders, setReminders] = useState<ReminderPreferences | null>(null);
  const [remindersBlocked, setRemindersBlocked] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  useEffect(() => {
    readReminderPreferences().then(setReminders);
    hasNotificationPermission().then(granted => setRemindersBlocked(!granted));
  }, []);

  /**
   * Persist, then re-plan. Permission is requested on the way *in* to the first
   * reminder — iOS shows that dialog once ever, so it is spent where the reason
   * is obvious rather than on a cold launch. Turning something off never asks.
   */
  const updateReminders = useCallback(async (next: ReminderPreferences) => {
    const turningOn = (next.wordOfTheDay && !reminders?.wordOfTheDay)
      || (next.reviewReminder && !reminders?.reviewReminder);
    if (turningOn && !(await ensureNotificationPermission())) {
      setRemindersBlocked(true);
      return;
    }
    setRemindersBlocked(false);
    setReminders(next);
    await writeReminderPreferences(next);
    await refreshReminders(user?.uid, nativeLanguage);
  }, [reminders, user, nativeLanguage]);

  const openPrivacyPolicy = () => {
    const url = nativeLanguage === 'Korean' ? `${PRIVACY_URL_BASE}/ko` : PRIVACY_URL_BASE;
    WebBrowser.openBrowserAsync(url);
  };

  /**
   * Two confirmations rather than the typed one the web uses. Making someone
   * type an email address on a phone keyboard to close their account is
   * hostile, and a destructive iOS alert is the platform's own idiom for
   * "this is irreversible".
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      t(nativeLanguage, 'deleteAccountConfirmTitle'),
      `${t(nativeLanguage, 'deleteAccountWarning')}\n\n${t(nativeLanguage, 'deleteAccountExportHint')}`,
      [
        { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(nativeLanguage, 'deleteAccount'),
          style: 'destructive',
          onPress: () => Alert.alert(
            t(nativeLanguage, 'deleteAccountConfirmTitle'),
            t(nativeLanguage, 'deleteAccountWarning'),
            [
              { text: t(nativeLanguage, 'cancel'), style: 'cancel' },
              { text: t(nativeLanguage, 'deleteAccountAction'), style: 'destructive', onPress: runDelete },
            ],
          ),
        },
      ],
    );
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      // The account is gone and the Delete User Data extension is already
      // sweeping Firestore server-side; everything here is the device catching
      // up with a decision that has been made.
      await clearAllLocalData();
      Alert.alert(t(nativeLanguage, 'deleteAccountSignedOut'));
    } catch (error) {
      // Backing out of the Google prompt is a decision, not a failure.
      if ((error as Error)?.message !== 'Reauthentication cancelled.') {
        Alert.alert(t(nativeLanguage, 'deleteAccountFailed'));
      }
    } finally {
      setDeleting(false);
    }
  };

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
        <Text style={s.heading}>{t(nativeLanguage, 'settingsTitle')}</Text>

        {/* Account */}
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsAccount')}</Text>
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
            <Text style={s.signedOutText}>{t(nativeLanguage, 'settingsNotSignedIn')}</Text>
          )}
        </View>

        {/* Native language */}
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsNativeLanguage')}</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            {t(nativeLanguage, 'settingsNativeLanguageDesc')}
          </Text>
          <View style={s.langRow}>
            {SUPPORTED_LANGUAGES.map(({ code, label }) => {
              // No fallback highlight for an unset native language: showing
              // English as selected claimed a preference nothing had stored.
              // First run now answers this before settings is reachable, so
              // an empty row here means the value is genuinely absent.
              const active = nativeLanguage === code;
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
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsStudyLanguage')}</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            {t(nativeLanguage, 'settingsStudyLanguageDesc')}
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
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsTheme')}</Text>
        <View style={s.card}>
          <View style={s.langRow}>
            {THEMES.map(({ value, labelKey }) => {
              const active = theme === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => setTheme(value)}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {t(nativeLanguage, labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reminders. Both default off — switching notifications on for someone
            who never asked is the dark pattern that comes before the copy. */}
        {user && reminders && (
          <>
            <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsReminders')}</Text>
            <View style={s.card}>
              <View style={s.toggleRow}>
                <View style={s.toggleLabel}>
                  <Text style={s.linkRowText}>{t(nativeLanguage, 'reminderWordOfTheDay')}</Text>
                  <Text style={s.toggleDesc}>{t(nativeLanguage, 'reminderWordOfTheDayDesc')}</Text>
                </View>
                <Switch
                  value={reminders.wordOfTheDay}
                  onValueChange={value => updateReminders({ ...reminders, wordOfTheDay: value })}
                  trackColor={{ true: C.highlight, false: C.border }}
                />
              </View>

              <View style={s.toggleDivider} />

              <View style={s.toggleRow}>
                <View style={s.toggleLabel}>
                  <Text style={s.linkRowText}>{t(nativeLanguage, 'reminderReview')}</Text>
                  <Text style={s.toggleDesc}>{t(nativeLanguage, 'reminderReviewDesc')}</Text>
                </View>
                <Switch
                  value={reminders.reviewReminder}
                  onValueChange={value => updateReminders({ ...reminders, reviewReminder: value })}
                  trackColor={{ true: C.highlight, false: C.border }}
                />
              </View>

              {/* Only the review reminder is timed. The word of the day is the
                  same word all day, so a choice of when to hear about it is a
                  setting without a decision behind it. */}
              {reminders.reviewReminder && (
                <TouchableOpacity style={s.timeRow} onPress={() => setTimePickerOpen(true)}>
                  <Text style={s.toggleDesc}>{t(nativeLanguage, 'reminderTime')}</Text>
                  <Text style={s.timeValue}>
                    {formatReminderTime(reminders.reviewHour, reminders.reviewMinute)}
                  </Text>
                </TouchableOpacity>
              )}

              {remindersBlocked && (
                <TouchableOpacity style={s.blockedRow} onPress={() => Linking.openSettings()}>
                  <Text style={s.blockedText}>{t(nativeLanguage, 'reminderBlocked')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* What is held, in plain language, on the screen that also erases it —
            a privacy policy behind a link is not the same as telling someone. */}
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsYourData')}</Text>
        <View style={s.card}>
          <Text style={s.blurbText}>{t(nativeLanguage, 'settingsYourDataBlurb')}</Text>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>{t(nativeLanguage, 'settingsAbout')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.linkRow} onPress={openPrivacyPolicy}>
            <Text style={s.linkRowText}>{t(nativeLanguage, 'settingsPrivacyPolicy')}</Text>
            <Ionicons name="open-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Auth action */}
        <View style={s.authSection}>
          {user ? (
            <>
              <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
                <Text style={s.signOutBtnText}>{t(nativeLanguage, 'signOut')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={C.error} />
                ) : (
                  <Text style={s.deleteBtnText}>{t(nativeLanguage, 'deleteAccount')}</Text>
                )}
              </TouchableOpacity>
              <Text style={s.deleteHint}>{t(nativeLanguage, 'deleteAccountBlurb')}</Text>
            </>
          ) : (
            <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
              <Text style={s.signInBtnText}>{t(nativeLanguage, 'settingsSignInWithGoogle')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {reminders && (
        <Modal visible={timePickerOpen} transparent animationType="slide" onRequestClose={() => setTimePickerOpen(false)}>
          <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={() => setTimePickerOpen(false)}>
            <View style={s.sheet}>
              <Text style={s.sheetTitle}>{t(nativeLanguage, 'reminderTime')}</Text>
              <ScrollView>
                {reminderTimeOptions().map(({ hour, minute }) => {
                  const selected = hour === reminders.reviewHour && minute === reminders.reviewMinute;
                  return (
                    <TouchableOpacity
                      key={`${hour}:${minute}`}
                      style={s.sheetRow}
                      onPress={() => {
                        setTimePickerOpen(false);
                        updateReminders({ ...reminders, reviewHour: hour, reviewMinute: minute });
                      }}
                    >
                      <Text style={[s.sheetRowText, selected && s.sheetRowSelected]}>
                        {formatReminderTime(hour, minute)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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

  // About
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRowText: { fontSize: 15, color: C.text, fontWeight: '500' },
  blurbText: { fontSize: 13, color: C.muted, lineHeight: 19 },

  // Reminders
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { flex: 1 },
  toggleDesc: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
  toggleDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  timeValue: { fontSize: 15, color: C.highlight, fontWeight: '700' },
  blockedRow: { marginTop: 12 },
  blockedText: { fontSize: 12, color: C.error, lineHeight: 17, textDecorationLine: 'underline' },

  // Time sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingBottom: 24, maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 20, marginBottom: 8,
  },
  sheetRow: { paddingVertical: 12, paddingHorizontal: 20 },
  sheetRowText: { fontSize: 16, color: C.text, textAlign: 'center' },
  sheetRowSelected: { color: C.highlight, fontWeight: '700' },

  // Auth
  authSection: { marginTop: 8 },
  signOutBtn: {
    borderWidth: 1.5, borderColor: C.error, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  signOutBtnText: { color: C.error, fontSize: 15, fontWeight: '600' },
  // Deliberately quieter than sign out: findable, as the App Store requires,
  // but not sitting at the same visual weight as the thing people click daily.
  deleteBtn: { marginTop: 14, paddingVertical: 11, alignItems: 'center' },
  deleteBtnText: { color: C.error, fontSize: 14, fontWeight: '600' },
  deleteHint: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 2, lineHeight: 17 },
  signInBtn: {
    backgroundColor: C.highlight, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  signInBtnText: { color: C.bg, fontSize: 15, fontWeight: '700' },
  });
}
