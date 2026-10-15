/*
 * When the "bring today's steps to the team" reminder goes off. Pure rules, so they can be tested without a phone.
 *
 * The server opens each Tokyo day's steps at 20:00 and takes them until 20:00 the next evening (and the two days
 * before that), so the reminder is a few minutes after 20:00 Japan time, a few days ahead, only while a team is out.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const JST_OFFSET_MS = 9 * HOUR_MS;

/** 20:05 Japan time. */
export const REMINDER_MINUTE_OF_DAY = 20 * 60 + 5;
/** How many evenings ahead are scheduled at once (iOS keeps up to 64); the plan is made again whenever the app is opened, so someone who stays away still gets a reminder every evening for two weeks. */
export const REMINDER_DAYS_AHEAD = 14;

export type ReminderOptions = {
  /** Reminders are off in the settings, or notifications are not allowed. */
  enabled: boolean;
  /** The player's team has set out: only then do steps count for it. */
  teamActive: boolean;
  /** When the event ends (epoch ms); no reminder at or after it. */
  eventEndsAt?: number;
  /** Do not remind when this is before this instant (epoch ms), for example the start of the event. */
  eventStartsAt?: number;
};

/** The instants (epoch ms) at which to remind, soonest first. */
export function reminderTimes(now: Date, options: ReminderOptions, daysAhead = REMINDER_DAYS_AHEAD): number[] {
  if (!options.enabled || !options.teamActive) return [];
  const tokyoMidnightToday = Math.floor((now.getTime() + JST_OFFSET_MS) / DAY_MS) * DAY_MS - JST_OFFSET_MS;
  const times: number[] = [];
  for (let day = 0; day <= daysAhead; day += 1) {
    const at = tokyoMidnightToday + day * DAY_MS + REMINDER_MINUTE_OF_DAY * 60_000;
    if (at <= now.getTime() + 60_000) continue;
    if (options.eventEndsAt !== undefined && at >= options.eventEndsAt) continue;
    if (options.eventStartsAt !== undefined && at < options.eventStartsAt) continue;
    times.push(at);
    if (times.length >= daysAhead) break;
  }
  return times;
}

export const REMINDER_TITLE = 'もび道';
export const REMINDER_BODY = '今日の歩数を、チームに届けましょう。もび道を開くと、届きます。';
