import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Linking } from 'react-native';
import { formatReminderTime, reminderTimeOptions, t, type ReminderPreferences } from '@amgi/core';
import { useUser } from '../../src/context/UserContext';
import SettingsScreen, { useSettingsStyles } from '../../src/components/SettingsScreen';
import BottomSheet, { SheetRow } from '../../src/components/BottomSheet';
import {
  ensureNotificationPermission, hasNotificationPermission,
  readReminderPreferences, refreshReminders, writeReminderPreferences,
} from '../../src/services/reminders';
import type { Palette } from '../../src/theme';

/**
 * Reminders. Both default off — switching notifications on for someone who
 * never asked is the dark pattern that comes before the copy.
 */
export default function RemindersSettings() {
  const { C, s } = useSettingsStyles();
  const r = useMemo(() => makeStyles(C), [C]);
  const { user, interfaceLanguage } = useUser();
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

  return (
    <SettingsScreen titleKey="settingsReminders">
      {/* The list only offers this row signed in; the same check here covers
          signing out from another screen while this one is still mounted. */}
      {user && reminders && (
        <View style={s.card}>
          <View style={r.toggleRow}>
            <View style={r.toggleLabel}>
              <Text style={s.rowText}>{t(interfaceLanguage, 'reminderWordOfTheDay')}</Text>
              <Text style={s.rowDesc}>{t(interfaceLanguage, 'reminderWordOfTheDayDesc')}</Text>
            </View>
            <Switch
              value={reminders.wordOfTheDay}
              onValueChange={value => updateReminders({ ...reminders, wordOfTheDay: value })}
              trackColor={{ true: C.highlight, false: C.border }}
            />
          </View>

          <View style={s.divider} />

          <View style={r.toggleRow}>
            <View style={r.toggleLabel}>
              <Text style={s.rowText}>{t(interfaceLanguage, 'reminderReview')}</Text>
              <Text style={s.rowDesc}>{t(interfaceLanguage, 'reminderReviewDesc')}</Text>
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
            <TouchableOpacity style={r.timeRow} onPress={() => setTimePickerOpen(true)}>
              <Text style={s.rowDesc}>{t(interfaceLanguage, 'reminderTime')}</Text>
              <Text style={r.timeValue}>
                {formatReminderTime(reminders.reviewHour, reminders.reviewMinute)}
              </Text>
            </TouchableOpacity>
          )}

          {remindersBlocked && (
            <TouchableOpacity style={r.blockedRow} onPress={() => Linking.openSettings()}>
              <Text style={r.blockedText}>{t(interfaceLanguage, 'reminderBlocked')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
    </SettingsScreen>
  );
}

function makeStyles(C: Palette) {
  return StyleSheet.create({
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleLabel: { flex: 1 },
    timeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    timeValue: { fontSize: 15, color: C.highlight, fontWeight: '700' },
    blockedRow: { marginTop: 12 },
    blockedText: { fontSize: 12, color: C.error, lineHeight: 17, textDecorationLine: 'underline' },
  });
}
