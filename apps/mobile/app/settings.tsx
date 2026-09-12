import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Alert, Switch, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useUser } from '../src/context/UserContext';
import { useTheme } from '../src/context/ThemeContext';
import { usePronunciation } from '../src/context/PronunciationContext';
import BottomSheet, { SheetRow } from '../src/components/BottomSheet';
import StudyLanguageList from '../src/components/StudyLanguageList';
import { clearAllLocalData } from '../src/services/offlineReview';
import {
  cancelAllReminders, ensureNotificationPermission, hasNotificationPermission,
  readReminderPreferences, refreshReminders, writeReminderPreferences,
} from '../src/services/reminders';
import {
  HANJA_PARTITIONS, SUPPORTED_LANGUAGES, formatReminderTime,
  getStudyLanguageConfig, reminderTimeOptions, t,
  type HanjaPartition, type ReminderPreferences, type StudyLanguage,
} from '@amgi/core';
import { THEMES } from '../src/theme';
import type { Palette } from '../src/theme';

// The policy is hosted on the web app; Korean speakers get the Korean version.
const PRIVACY_URL_BASE = 'https://amgi-iota.vercel.app/privacy';

/** Each partition's two i18n keys, together so neither can be guessed apart. */
const PARTITION_KEYS: Record<HanjaPartition, { label: 'hanjaPartitionCharacter' | 'hanjaPartitionHun' | 'hanjaPartitionEum'; example: 'hanjaPartitionCharacterExample' | 'hanjaPartitionHunExample' | 'hanjaPartitionEumExample' }> = {
  character: { label: 'hanjaPartitionCharacter', example: 'hanjaPartitionCharacterExample' },
  hun: { label: 'hanjaPartitionHun', example: 'hanjaPartitionHunExample' },
  eum: { label: 'hanjaPartitionEum', example: 'hanjaPartitionEumExample' },
};

export default function SettingsScreen() {
  const { C, theme, setTheme } = useTheme();
  const { speed, setSpeed, speeds } = usePronunciation();
  const s = useMemo(() => makeStyles(C), [C]);
  const {
    user, authLoading, interfaceLanguage, languages, studyLanguage, hanjaPartition,
    setInterfaceLanguage, setHanjaPartition, removeLanguage,
    deleteAccount, handleSignIn, handleSignOut,
  } = useUser();
  const [deleting, setDeleting] = useState(false);
  const [reminders, setReminders] = useState<ReminderPreferences | null>(null);
  const [remindersBlocked, setRemindersBlocked] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [studyListOpen, setStudyListOpen] = useState(false);

  useEffect(() => {
    readReminderPreferences().then(setReminders);
    hasNotificationPermission().then(granted => setRemindersBlocked(!granted));
  }, []);

  /**
   * Persist, then re-plan. Permission is requested on the way *in* to the first
   * reminder — iOS shows that dialog once ever, so it is spent where the reason
   * is obvious rather than on a cold launch. Turning something off never asks.
   *
   * The copy is chrome: a notification is Amgi speaking to you, not a card
   * explaining itself, so it takes the interface language.
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
    await refreshReminders(user?.uid, interfaceLanguage);
  }, [reminders, user, interfaceLanguage]);

  const nativeLabel = (native: string) =>
    t(interfaceLanguage, native === 'Korean' ? 'labelKorean' : 'labelEnglish');
  const current = languages.find(pair => pair.study === studyLanguage);
  const studyLanguageLabel = t(interfaceLanguage, getStudyLanguageConfig(studyLanguage).studyLabelKey);

  const openPrivacyPolicy = () => {
    const url = interfaceLanguage === 'Korean' ? `${PRIVACY_URL_BASE}/ko` : PRIVACY_URL_BASE;
    WebBrowser.openBrowserAsync(url);
  };

  /**
   * Removing a deck takes it off the switcher and leaves every card where it
   * is — which the dialog says, because "remove" next to a language is
   * otherwise easy to read as "erase everything I have learned in it".
   */
  const confirmRemove = (study: StudyLanguage) => {
    const name = t(interfaceLanguage, getStudyLanguageConfig(study).studyLabelKey);
    Alert.alert(
      t(interfaceLanguage, 'removeLanguageTitle', { study: name }),
      t(interfaceLanguage, 'removeLanguageBody'),
      [
        { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(interfaceLanguage, 'removeLanguage'),
          style: 'destructive',
          onPress: () => { void removeLanguage(study); },
        },
      ],
    );
  };

  /**
   * Two confirmations rather than the typed one the web uses. Making someone
   * type an email address on a phone keyboard to close their account is
   * hostile, and a destructive iOS alert is the platform's own idiom for
   * "this is irreversible".
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      t(interfaceLanguage, 'deleteAccountConfirmTitle'),
      `${t(interfaceLanguage, 'deleteAccountWarning')}\n\n${t(interfaceLanguage, 'deleteAccountExportHint')}`,
      [
        { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
        {
          text: t(interfaceLanguage, 'deleteAccount'),
          style: 'destructive',
          onPress: () => Alert.alert(
            t(interfaceLanguage, 'deleteAccountConfirmTitle'),
            t(interfaceLanguage, 'deleteAccountWarning'),
            [
              { text: t(interfaceLanguage, 'cancel'), style: 'cancel' },
              { text: t(interfaceLanguage, 'deleteAccountAction'), style: 'destructive', onPress: runDelete },
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
      Alert.alert(t(interfaceLanguage, 'deleteAccountSignedOut'));
    } catch (error) {
      // Backing out of the Google prompt is a decision, not a failure.
      if ((error as Error)?.message !== 'Reauthentication cancelled.') {
        Alert.alert(t(interfaceLanguage, 'deleteAccountFailed'));
      }
    } finally {
      setDeleting(false);
    }
  };

  // Its own header now that it is a pushed screen rather than a tab. Same
  // shape as the one the progress screen carried before it took the tab slot.
  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
        <Text style={s.back}>←</Text>
      </TouchableOpacity>
      <Text style={s.headerLabel}>{t(interfaceLanguage, 'settingsTitle')}</Text>
    </View>
  );

  if (authLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {header}
        <View style={s.center}><ActivityIndicator color={C.highlight} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {header}
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Account */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsAccount')}</Text>
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
            <Text style={s.signedOutText}>{t(interfaceLanguage, 'settingsNotSignedIn')}</Text>
          )}
        </View>

        {/* Study language. A disclosure row rather than the chip grid the rows
            below use: the list now carries a second line per row — the language
            each deck is explained in — and a chip cannot hold two lines. */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsStudyLanguage')}</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            {t(interfaceLanguage, 'settingsStudyLanguageDesc')}
          </Text>
          <TouchableOpacity
            style={s.disclosure}
            onPress={() => setStudyListOpen(open => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: studyListOpen }}
          >
            <View style={s.disclosureMain}>
              <Text style={s.disclosureValue}>{studyLanguageLabel}</Text>
              {current && (
                <Text style={s.disclosureNative}>
                  {t(interfaceLanguage, 'languagePairSummary', { native: nativeLabel(current.native) })}
                </Text>
              )}
            </View>
            <Ionicons
              name={studyListOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.muted}
            />
          </TouchableOpacity>
          {studyListOpen && (
            <View style={s.disclosureList}>
              <StudyLanguageList onSelect={() => setStudyListOpen(false)} />
            </View>
          )}
        </View>

        {/* Your languages — the management view, where a deck can be removed.
            Separate from the switcher above on purpose: switching is a thing
            you do daily and removing is a thing you do once, so a destructive
            control does not sit in the row you tap to change decks. Hidden
            while there is only one, where removing it is refused anyway. */}
        {languages.length > 1 && (
          <>
            <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsYourLanguages')}</Text>
            <View style={s.card}>
              <Text style={s.settingDescription}>
                {t(interfaceLanguage, 'settingsYourLanguagesDesc')}
              </Text>
              {languages.map(pair => (
                <View key={pair.study} style={s.pairRow}>
                  <View style={s.pairMain}>
                    <Text style={s.pairName} numberOfLines={1}>
                      {t(interfaceLanguage, getStudyLanguageConfig(pair.study).studyLabelKey)}
                    </Text>
                    <Text style={s.pairNative} numberOfLines={1}>
                      {t(interfaceLanguage, 'languagePairSummary', { native: nativeLabel(pair.native) })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmRemove(pair.study)}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={s.removeText}>{t(interfaceLanguage, 'removeLanguage')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* App language. Deliberately no longer called "native language": it
            does not decide what your cards are explained in any more — each
            deck carries that itself — so naming it for the app is what stops
            it reading as a second answer to the question above. */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsAppLanguage')}</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            {t(interfaceLanguage, 'settingsAppLanguageDesc')}
          </Text>
          <View style={s.langRow}>
            {SUPPORTED_LANGUAGES.map(({ code, label }) => {
              // No fallback highlight for an unset language: showing English as
              // selected claimed a preference nothing had stored. First run now
              // answers this before settings is reachable, so an empty row here
              // means the value is genuinely absent.
              const active = interfaceLanguage === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => { void setInterfaceLanguage(code); }}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* The hanja partition — which part of the card leads. A stacked list
            rather than the chip row below, because each option carries an
            example (水 → 물 수) that a chip cannot hold.

            Shown only on the deck it describes, and deliberately only here:
            put in the review session it would become a per-session toggle, and
            every switch inherits intervals earned answering a different
            question. Chosen once, like the study language above. */}
        {studyLanguage === 'Hanja' && (
          <>
            <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsHanjaPartition')}</Text>
            <View style={s.card}>
              <Text style={s.settingDescription}>
                {t(interfaceLanguage, 'settingsHanjaPartitionDesc')}
              </Text>
              {HANJA_PARTITIONS.map(partition => {
                const active = hanjaPartition === partition;
                return (
                  <TouchableOpacity
                    key={partition}
                    style={[s.partitionRow, active && s.partitionRowActive]}
                    onPress={() => setHanjaPartition(partition)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[s.partitionLabel, active && s.partitionLabelActive]}>
                      {t(interfaceLanguage, PARTITION_KEYS[partition].label)}
                    </Text>
                    <Text style={[s.partitionDesc, active && s.partitionDescActive]}>
                      {t(interfaceLanguage, PARTITION_KEYS[partition].example)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Theme */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsTheme')}</Text>
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
                    {t(interfaceLanguage, labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pronunciation speed. One control for every play button in the app —
            term, translation and example sentences all render the same
            PronounceButton, so a second setting would have nothing to name. */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsPronunciationSpeed')}</Text>
        <View style={s.card}>
          <Text style={s.settingDescription}>
            {t(interfaceLanguage, 'settingsPronunciationSpeedDesc')}
          </Text>
          <View style={s.langRow}>
            {speeds.map(({ value, labelKey }) => {
              const active = speed === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.langChip, active && s.langChipActive]}
                  onPress={() => setSpeed(value)}
                >
                  <Text style={[s.langChipText, active && s.langChipTextActive]}>
                    {t(interfaceLanguage, labelKey)}
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
            <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsReminders')}</Text>
            <View style={s.card}>
              <View style={s.toggleRow}>
                <View style={s.toggleLabel}>
                  <Text style={s.linkRowText}>{t(interfaceLanguage, 'reminderWordOfTheDay')}</Text>
                  <Text style={s.toggleDesc}>{t(interfaceLanguage, 'reminderWordOfTheDayDesc')}</Text>
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
                  <Text style={s.linkRowText}>{t(interfaceLanguage, 'reminderReview')}</Text>
                  <Text style={s.toggleDesc}>{t(interfaceLanguage, 'reminderReviewDesc')}</Text>
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
                  <Text style={s.toggleDesc}>{t(interfaceLanguage, 'reminderTime')}</Text>
                  <Text style={s.timeValue}>
                    {formatReminderTime(reminders.reviewHour, reminders.reviewMinute)}
                  </Text>
                </TouchableOpacity>
              )}

              {remindersBlocked && (
                <TouchableOpacity style={s.blockedRow} onPress={() => Linking.openSettings()}>
                  <Text style={s.blockedText}>{t(interfaceLanguage, 'reminderBlocked')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* What is held, in plain language, on the screen that also erases it —
            a privacy policy behind a link is not the same as telling someone. */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsYourData')}</Text>
        <View style={s.card}>
          <Text style={s.blurbText}>{t(interfaceLanguage, 'settingsYourDataBlurb')}</Text>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>{t(interfaceLanguage, 'settingsAbout')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.linkRow} onPress={openPrivacyPolicy}>
            <Text style={s.linkRowText}>{t(interfaceLanguage, 'settingsPrivacyPolicy')}</Text>
            <Ionicons name="open-outline" size={18} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Auth action */}
        <View style={s.authSection}>
          {user ? (
            <>
              <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
                <Text style={s.signOutBtnText}>{t(interfaceLanguage, 'signOut')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={C.error} />
                ) : (
                  <Text style={s.deleteBtnText}>{t(interfaceLanguage, 'deleteAccount')}</Text>
                )}
              </TouchableOpacity>
              <Text style={s.deleteHint}>{t(interfaceLanguage, 'deleteAccountBlurb')}</Text>
            </>
          ) : (
            <TouchableOpacity style={s.signInBtn} onPress={handleSignIn}>
              <Text style={s.signInBtnText}>{t(interfaceLanguage, 'settingsSignInWithGoogle')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {reminders && (
        <BottomSheet
          visible={timePickerOpen}
          title={t(interfaceLanguage, 'reminderTime')}
          onClose={() => setTimePickerOpen(false)}
        >
          {reminderTimeOptions().map(({ hour, minute }) => (
            <SheetRow
              key={`${hour}:${minute}`}
              label={formatReminderTime(hour, minute)}
              selected={hour === reminders.reviewHour && minute === reminders.reviewMinute}
              onPress={() => {
                setTimePickerOpen(false);
                updateReminders({ ...reminders, reviewHour: hour, reviewMinute: minute });
              }}
            />
          ))}
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: C.highlight, fontSize: 22 },
  headerLabel: { color: C.text, fontSize: 17, fontWeight: '700' },

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

  // Your languages — one row per pair, with the way to drop one.
  pairRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  pairMain: { flex: 1 },
  pairName: { fontSize: 15, color: C.text, fontWeight: '500' },
  pairNative: { fontSize: 12, color: C.muted, marginTop: 1 },
  removeText: { fontSize: 13, color: C.error, fontWeight: '600' },

  // Hanja partition — a stacked list, because each row carries an example
  // under its name and a chip row cannot hold two lines.
  partitionRow: {
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
  },
  partitionRowActive: { backgroundColor: C.highlight, borderColor: C.highlight },
  partitionLabel: { fontSize: 15, color: C.text, fontWeight: '500' },
  partitionLabelActive: { color: C.bg, fontWeight: '700' },
  partitionDesc: { fontSize: 13, color: C.muted, marginTop: 2 },
  partitionDescActive: { color: C.bg, opacity: 0.8 },

  // Disclosure (study language)
  disclosure: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  disclosureMain: { flex: 1 },
  disclosureValue: { fontSize: 15, color: C.text, fontWeight: '500' },
  disclosureNative: { fontSize: 12, color: C.muted, marginTop: 1 },
  // Negative side margins so the list's own row padding lines up with the card
  // edge rather than sitting inset twice over.
  disclosureList: {
    marginTop: 10, marginHorizontal: -18, borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 6,
  },

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
