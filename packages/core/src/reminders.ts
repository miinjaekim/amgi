/**
 * What, if anything, should be scheduled to fire — decided from state alone.
 *
 * Notifications are the one surface nobody watches being built: a reminder that
 * fires when it shouldn't is noticed once and then switched off for good, and
 * one that silently never fires is not noticed at all. So the decision lives
 * here, as a pure function under test, and the platform module is left with
 * nothing but the scheduling calls.
 */

/** The time of day the word of the day arrives. Not configurable by design. */
export const WORD_OF_THE_DAY_HOUR = 9;
export const WORD_OF_THE_DAY_MINUTE = 0;

export interface ReminderPreferences {
  wordOfTheDay: boolean;
  reviewReminder: boolean;
  /** Local time for the review reminder, 24-hour. */
  reviewHour: number;
  reviewMinute: number;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  // Both off. Switching notifications on for someone who never asked is the
  // dark pattern that comes before the copy.
  wordOfTheDay: false,
  reviewReminder: false,
  reviewHour: 19,
  reviewMinute: 0,
};

export type ReminderId = 'wordOfTheDay' | 'reviewReminder';

export interface PlannedReminder {
  id: ReminderId;
  hour: number;
  minute: number;
  /**
   * Daily reminders repeat forever; conditional ones are single-shot and
   * re-planned as the conditions change, so they can never outlive the reason
   * they were scheduled.
   */
  repeats: boolean;
  /** Only set for one-shot reminders. */
  fireAt?: Date;
}

export interface ReminderContext {
  preferences: ReminderPreferences;
  /** Directions due right now, across the collections the user studies. */
  dueCount: number;
  /** `YYYY-MM-DD`, or null if they have never reviewed. */
  lastReviewDate: string | null;
  now: Date;
}

function localDateString(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * The next time today's `hour:minute` comes around, today if it is still ahead
 * and tomorrow otherwise.
 */
function nextOccurrence(now: Date, hour: number, minute: number): Date {
  const at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return at;
}

/**
 * Everything that should currently be scheduled. Callers cancel what they have
 * and schedule this — planning the whole set rather than diffing keeps the
 * device from accumulating reminders whose reason has since evaporated.
 */
export function planReminders(context: ReminderContext): PlannedReminder[] {
  const { preferences, dueCount, lastReviewDate, now } = context;
  const planned: PlannedReminder[] = [];

  if (preferences.wordOfTheDay) {
    planned.push({
      id: 'wordOfTheDay',
      hour: WORD_OF_THE_DAY_HOUR,
      minute: WORD_OF_THE_DAY_MINUTE,
      repeats: true,
    });
  }

  // Two conditions, and both matter. Nothing due means reviewing would open an
  // empty queue, which is a worse thing to be interrupted for than silence.
  // Already reviewed means the reminder has been answered before it was asked.
  if (
    preferences.reviewReminder &&
    dueCount > 0 &&
    lastReviewDate !== localDateString(now)
  ) {
    planned.push({
      id: 'reviewReminder',
      hour: preferences.reviewHour,
      minute: preferences.reviewMinute,
      repeats: false,
      fireAt: nextOccurrence(now, preferences.reviewHour, preferences.reviewMinute),
    });
  }

  return planned;
}

/** Selectable reminder times: every half hour through the waking day. */
export function reminderTimeOptions(): { hour: number; minute: number }[] {
  const options: { hour: number; minute: number }[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    options.push({ hour, minute: 0 });
    options.push({ hour, minute: 30 });
  }
  return options;
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
