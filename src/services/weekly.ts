// Pure rules for the weekly look-back: a small per-day step log and the summary of one Monday-to-Sunday week.
import { localDay } from './progress.ts';

export type DayLog = Record<string, number>;
export type WeekSummary = { start: string; end: string; totalSteps: number; walkedDays: number; bestDay: { day: string; steps: number } | null; rewardIds: string[] };

const LOG_DAYS = 35;
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const parseDay = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };

/** The Monday (local) that starts the week containing `date`. */
export function weekStartDay(date = new Date()): string {
  return localDay(addDays(date, -((date.getDay() + 6) % 7)));
}
export function previousWeekStart(date = new Date()): string {
  return localDay(addDays(parseDay(weekStartDay(date)), -7));
}
/** Keeps the larger reading for a day and drops entries older than five weeks. */
export function recordDay(log: DayLog | undefined, day: string, steps: number, now = new Date()): DayLog {
  const next: DayLog = { ...(log ?? {}) };
  if (Number.isFinite(steps) && steps >= 0) next[day] = Math.max(next[day] ?? 0, Math.floor(steps));
  const oldest = localDay(addDays(now, -LOG_DAYS));
  for (const key of Object.keys(next)) if (key < oldest) delete next[key];
  return next;
}
export function normalizeDayLog(value: unknown): DayLog {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([day, steps]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof steps === 'number' && Number.isFinite(steps) && steps >= 0));
}
export function summarizeWeek(log: DayLog | undefined, rewards: readonly { id: string; date: string }[], start: string): WeekSummary {
  const days = Array.from({ length: 7 }, (_, index) => localDay(addDays(parseDay(start), index)));
  const walked = days.filter(day => (log?.[day] ?? 0) > 0);
  const best = walked.reduce<{ day: string; steps: number } | null>((top, day) => !top || log![day] > top.steps ? { day, steps: log![day] } : top, null);
  return {
    start,
    end: days[6],
    totalSteps: walked.reduce((sum, day) => sum + log![day], 0),
    walkedDays: walked.length,
    bestDay: best,
    rewardIds: rewards.filter(reward => reward.date >= days[0] && reward.date <= days[6]).map(reward => reward.id),
  };
}
/** Offer last week's look-back once, on the first open of a new week, if anything was walked. */
export function weeklyDue(seen: string | undefined, log: DayLog | undefined, now = new Date()): boolean {
  const last = previousWeekStart(now);
  return seen !== weekStartDay(now) && summarizeWeek(log, [], last).walkedDays > 0;
}
