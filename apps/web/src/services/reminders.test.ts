import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REMINDER_PREFERENCES,
  WORD_OF_THE_DAY_HOUR,
  formatReminderTime,
  planReminders,
  reminderTimeOptions,
} from '@amgi/core';
import type { ReminderContext, ReminderPreferences } from '@amgi/core';

const NOW = new Date('2026-07-27T12:00:00');

function context(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    preferences: { ...DEFAULT_REMINDER_PREFERENCES, wordOfTheDay: true, reviewReminder: true },
    dueCount: 5,
    lastReviewDate: null,
    now: NOW,
    ...overrides,
  };
}

function prefs(overrides: Partial<ReminderPreferences> = {}): ReminderPreferences {
  return { ...DEFAULT_REMINDER_PREFERENCES, wordOfTheDay: true, reviewReminder: true, ...overrides };
}

const idsOf = (planned: ReturnType<typeof planReminders>) => planned.map(p => p.id);

describe('planReminders', () => {
  it('schedules nothing when both reminders are off', () => {
    expect(planReminders(context({ preferences: DEFAULT_REMINDER_PREFERENCES }))).toEqual([]);
  });

  it('defaults to off, so nobody is enrolled without asking', () => {
    expect(DEFAULT_REMINDER_PREFERENCES.wordOfTheDay).toBe(false);
    expect(DEFAULT_REMINDER_PREFERENCES.reviewReminder).toBe(false);
  });

  it('repeats the word of the day daily at a fixed hour', () => {
    const [wotd] = planReminders(context({ preferences: prefs({ reviewReminder: false }) }));
    expect(wotd.id).toBe('wordOfTheDay');
    expect(wotd.repeats).toBe(true);
    expect(wotd.hour).toBe(WORD_OF_THE_DAY_HOUR);
  });

  it('skips the review reminder when nothing is due', () => {
    // Reviewing would open an empty queue — worse to be interrupted for than
    // silence.
    expect(idsOf(planReminders(context({ dueCount: 0 })))).not.toContain('reviewReminder');
  });

  it('skips the review reminder once the user has reviewed today', () => {
    expect(idsOf(planReminders(context({ lastReviewDate: '2026-07-27' })))).not.toContain('reviewReminder');
  });

  it('still schedules when the last review was an earlier day', () => {
    expect(idsOf(planReminders(context({ lastReviewDate: '2026-07-26' })))).toContain('reviewReminder');
  });

  it('fires the review reminder later today when its time is still ahead', () => {
    const [, review] = planReminders(context({ preferences: prefs({ reviewHour: 19, reviewMinute: 30 }) }));
    expect(review.fireAt?.getDate()).toBe(NOW.getDate());
    expect(review.fireAt?.getHours()).toBe(19);
    expect(review.fireAt?.getMinutes()).toBe(30);
  });

  it('rolls to tomorrow when its time has already passed', () => {
    const [, review] = planReminders(context({ preferences: prefs({ reviewHour: 8, reviewMinute: 0 }) }));
    expect(review.fireAt?.getDate()).toBe(NOW.getDate() + 1);
    expect(review.fireAt?.getHours()).toBe(8);
  });

  it('treats the exact current minute as passed rather than firing instantly', () => {
    const [, review] = planReminders(context({ preferences: prefs({ reviewHour: 12, reviewMinute: 0 }) }));
    expect(review.fireAt?.getDate()).toBe(NOW.getDate() + 1);
  });

  it('does not repeat the review reminder — it is re-planned as state changes', () => {
    const [, review] = planReminders(context());
    expect(review.repeats).toBe(false);
  });

  it('plans each reminder independently', () => {
    expect(idsOf(planReminders(context({ preferences: prefs({ wordOfTheDay: false }) })))).toEqual(['reviewReminder']);
    expect(idsOf(planReminders(context({ preferences: prefs({ reviewReminder: false }) })))).toEqual(['wordOfTheDay']);
  });
});

describe('reminderTimeOptions', () => {
  it('covers the waking day in half hours', () => {
    const options = reminderTimeOptions();
    expect(options[0]).toEqual({ hour: 6, minute: 0 });
    expect(options.at(-1)).toEqual({ hour: 22, minute: 30 });
    expect(options).toHaveLength(34);
  });

  it('contains the default reminder time', () => {
    expect(reminderTimeOptions()).toContainEqual({
      hour: DEFAULT_REMINDER_PREFERENCES.reviewHour,
      minute: DEFAULT_REMINDER_PREFERENCES.reviewMinute,
    });
  });
});

describe('formatReminderTime', () => {
  it('pads to a stable width so a list of times does not jitter', () => {
    expect(formatReminderTime(9, 0)).toBe('09:00');
    expect(formatReminderTime(19, 30)).toBe('19:30');
  });
});
