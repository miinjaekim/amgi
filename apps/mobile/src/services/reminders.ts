/**
 * Local scheduled reminders.
 *
 * Deliberately local rather than remote push: everything a reminder needs —
 * which cards are due, when the user last reviewed — is already on the device
 * from the offline review work, so a server round trip would be recomputing
 * what the phone already knows. It also avoids an APNs key on a borrowed Apple
 * developer account, and local notifications still work in Expo Go, so this is
 * testable without a development build.
 *
 * The decision of *what* to schedule is pure and lives in `@amgi/core`; this
 * module only talks to the OS and to storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  DEFAULT_REMINDER_PREFERENCES, applyPendingReviews, isDue, planReminders, t,
  type ReminderPreferences, type ReminderId,
} from '@amgi/core';
import {
  readCachedCards, readCachedStreak, readKnownLanguages, readPendingReviews,
} from './offlineReview';

const PREFS_KEY = 'amgi_reminder_preferences';

/**
 * Preferences live on the device, not in `users/{uid}`. A notification setting
 * belongs to a phone — someone with a tablet they study on at weekends should
 * be able to have it disagree with their phone.
 */
export async function readReminderPreferences(): Promise<ReminderPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFERENCES;
    // Spread over the defaults so a preference added later has a value on a
    // device that stored the old shape.
    return { ...DEFAULT_REMINDER_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_PREFERENCES;
  }
}

export async function writeReminderPreferences(preferences: ReminderPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // The in-memory value still drives this session; the toggle will simply
    // not survive a restart, which is better than failing the interaction.
  }
}

/**
 * Ask for permission, returning whether we have it.
 *
 * iOS only shows the system dialog once ever, so this is called when the user
 * turns a reminder on — where the reason is self-evident — and never on launch.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  // `canAskAgain` false means the dialog is spent; only Settings can change it.
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

interface ReminderCopy {
  title: string;
  body: string;
}

export interface ApplyRemindersInput {
  preferences: ReminderPreferences;
  dueCount: number;
  lastReviewDate: string | null;
  copy: Record<ReminderId, ReminderCopy>;
}

/**
 * Make the device's scheduled notifications match what the current state calls
 * for.
 *
 * Cancels everything and reschedules rather than diffing: the set is at most
 * two, and the failure mode of diffing — a reminder left behind after the
 * reason for it is gone — is exactly the one that makes people turn
 * notifications off for good.
 */
export async function applyReminders(input: ApplyRemindersInput): Promise<void> {
  const { preferences, dueCount, lastReviewDate, copy } = input;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!preferences.wordOfTheDay && !preferences.reviewReminder) return;
    if (!(await hasNotificationPermission())) return;

    const planned = planReminders({ preferences, dueCount, lastReviewDate, now: new Date() });

    for (const reminder of planned) {
      await Notifications.scheduleNotificationAsync({
        content: { title: copy[reminder.id].title, body: copy[reminder.id].body },
        trigger: reminder.repeats
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: reminder.hour,
              minute: reminder.minute,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminder.fireAt!,
            },
      });
    }
  } catch {
    // Scheduling is best-effort. A phone that refuses is not a reason to break
    // whatever the user was actually doing.
  }
}

/** Used when the user signs out or deletes their account. */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing useful to do.
  }
}

/**
 * Everything due across the languages this device has loaded, with unsent
 * ratings replayed — the same view of the cards the review screen would build.
 *
 * Counted from the local snapshot rather than Firestore so a reminder can be
 * re-planned with no connection, which is the state a phone is in most of the
 * time it is deciding whether to nag you.
 */
async function countDueCards(uid: string): Promise<number> {
  const pending = await readPendingReviews(uid);
  let due = 0;
  for (const language of await readKnownLanguages(uid)) {
    const cached = await readCachedCards(uid, language);
    if (!cached) continue;
    for (const card of applyPendingReviews(cached, pending, language)) {
      due += isDue(card).length;
    }
  }
  return due;
}

/**
 * Re-plan and reschedule from current local state.
 *
 * Called whenever something that feeds the decision changes: a preference, a
 * rating, returning to the app. Cheap enough to call generously, and calling it
 * too rarely is what leaves a reminder scheduled for work already done.
 */
export async function refreshReminders(
  uid: string | undefined,
  nativeLanguage: string | null | undefined,
): Promise<void> {
  if (!uid) {
    await cancelAllReminders();
    return;
  }
  const preferences = await readReminderPreferences();
  const streak = await readCachedStreak(uid);
  await applyReminders({
    preferences,
    dueCount: await countDueCards(uid),
    lastReviewDate: streak?.lastReviewDate ?? null,
    copy: {
      wordOfTheDay: {
        title: t(nativeLanguage, 'reminderWotdTitle'),
        body: t(nativeLanguage, 'reminderWotdBody'),
      },
      reviewReminder: {
        title: t(nativeLanguage, 'reminderReviewTitle'),
        body: t(nativeLanguage, 'reminderReviewBody'),
      },
    },
  });
}
