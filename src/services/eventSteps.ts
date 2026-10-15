/**
 * The client side of event step sharing (server: POST /events/:id/steps).
 *
 * The server keeps one window per Tokyo day: day D opens at 20:00 on D and
 * closes at 20:00 on D+1, so exactly one day is open at any moment. Missing
 * the evening is fine; opening the app the next morning still files the
 * steps under the day that just ended. That means the value to send is the
 * total for the OPEN day, not for today, and the request names that day so a
 * mismatch is refused rather than filed under the wrong date.
 *
 * Nothing here talks to the network: the caller supplies a transport, and
 * sending stays off until the app is connected to the server.
 */

/** Mirrors EVENT_STEPS_WINDOW_START and EVENT_STEPS_DAILY_MAX in server/wrangler.toml. */
export const WINDOW_START_MINUTES = 20 * 60;
export const DAILY_STEPS_MAX = 100000;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const ymd = (ms: number) => new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);

/** The Tokyo day (YYYY-MM-DD) whose steps the server will accept at `now`. */
export const openStepsDay = (now: Date): string => ymd(now.getTime() - WINDOW_START_MINUTES * MINUTE_MS);

/** Start (inclusive) and end (exclusive) of a Tokyo calendar day, as epoch milliseconds. */
export function tokyoDayRange(day: string): { start: number; end: number } {
  const start = Date.parse(`${day}T00:00:00+09:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(start)) throw new Error(`invalid day: ${day}`);
  return { start, end: start + DAY_MS };
}

/**
 * The part of a day's range that counts for a player whose steps count from `since` (epoch ms): the time they joined the
 * team, or the time the team set out if that was later. Null when none of the range counts, such as the day before.
 */
export function rangeSince(start: number, end: number, since: number | undefined): { start: number; end: number } | null {
  const from = Math.max(start, since ?? 0);
  return end > from ? { start: from, end } : null;
}

export type EventStepsRequest = { eventId: string; day: string; cumulative: number };
export type EventStepsResponse = { status: number; body: unknown };
export type EventStepsTransport = (request: EventStepsRequest) => Promise<EventStepsResponse>;

export type EventStepsResult =
  | { ok: true; day: string; cumulative: number }
  | { ok: false; reason: 'offline' | 'day_mismatch' | 'rejected'; openDay?: string };

/** How many days before the open day the server still takes steps for (mirrors EVENT_STEPS_GRACE_DAYS). */
export const STEPS_GRACE_DAYS = 2;

/** The Tokyo day `days` after (before, when negative) the given one. */
export const shiftTokyoDay = (day: string, days: number): string => ymd(tokyoDayRange(day).start + days * DAY_MS);

/** The open day and the grace days before it, oldest first. */
export function catchUpDays(now: Date, graceDays = STEPS_GRACE_DAYS): string[] {
  const open = openStepsDay(now);
  return Array.from({ length: graceDays + 1 }, (_, index) => shiftTokyoDay(open, index - graceDays));
}

/**
 * Read the steps for the open day and send them. `readSteps` gets the day's
 * Tokyo-time range and must return the total for it; the range is cut off at
 * `now` so a day still in progress is read up to this moment.
 */
export async function submitEventSteps(options: {
  eventId: string;
  now: Date;
  readSteps: (start: number, end: number) => Promise<number>;
  transport: EventStepsTransport;
}): Promise<EventStepsResult> {
  return submitEventStepsForDay({ ...options, day: openStepsDay(options.now) });
}

/** The same for one named day (the open day, or one of the grace days before it). */
export async function submitEventStepsForDay(options: {
  eventId: string;
  day: string;
  now: Date;
  readSteps: (start: number, end: number) => Promise<number>;
  transport: EventStepsTransport;
}): Promise<EventStepsResult> {
  const day = options.day;
  const range = tokyoDayRange(day);
  const raw = await options.readSteps(range.start, Math.min(range.end, options.now.getTime()));
  if (!Number.isFinite(raw) || raw < 0) return { ok: false, reason: 'rejected' };
  const cumulative = Math.min(DAILY_STEPS_MAX, Math.floor(raw));

  let response: EventStepsResponse;
  try { response = await options.transport({ eventId: options.eventId, day, cumulative }); }
  catch { return { ok: false, reason: 'offline' }; }

  const body = response.body && typeof response.body === 'object' ? response.body as { error?: unknown; openDay?: unknown; day?: unknown; cumulative?: unknown } : {};
  if (response.status === 200 && typeof body.day === 'string' && typeof body.cumulative === 'number') {
    return { ok: true, day: body.day, cumulative: body.cumulative };
  }
  if (response.status === 409 && body.error === 'steps_day_mismatch') {
    return { ok: false, reason: 'day_mismatch', openDay: typeof body.openDay === 'string' ? body.openDay : undefined };
  }
  return { ok: false, reason: 'rejected' };
}

export type CatchUpOutcome = 'sent' | 'skipped' | 'failed';

/**
 * Send the steps for the open day and for the grace days before it, oldest first, so a day the app was not opened is not lost.
 * A day with no steps is not sent. `alreadySent` lists what the server has for earlier days: those are not sent again
 * (the open day always is, since it is still growing). Returns what to remember as sent, and how it went.
 */
export async function submitEventStepsCatchUp(options: {
  eventId: string;
  now: Date;
  alreadySent: Record<string, number>;
  readSteps: (start: number, end: number) => Promise<number>;
  transport: EventStepsTransport;
  graceDays?: number;
}): Promise<{ outcome: CatchUpOutcome; sent: Record<string, number> }> {
  const days = catchUpDays(options.now, options.graceDays);
  const open = days[days.length - 1];
  const sent: Record<string, number> = {};
  let anySent = false;
  let failed = false;
  for (const day of days) {
    let total = 0;
    const result = await submitEventStepsForDay({
      eventId: options.eventId, day, now: options.now, transport: options.transport,
      readSteps: async (start, end) => {
        total = await options.readSteps(start, end);
        // Nothing to say for an earlier day with no steps, or one the server already has in full.
        if (day !== open && (total <= 0 || options.alreadySent[day] === Math.min(DAILY_STEPS_MAX, Math.floor(total)))) throw new SkipDay();
        return total;
      }
    }).catch((error: unknown) => { if (error instanceof SkipDay) return null; throw error; });
    if (result === null) continue;
    if (result.ok) { anySent = true; sent[result.day] = result.cumulative; }
    // An older server that does not take earlier days answers with a mismatch: that is not a failure of this send.
    else if (!(result.reason === 'day_mismatch' && day !== open)) failed = true;
  }
  return { outcome: failed ? 'failed' : anySent ? 'sent' : 'skipped', sent };
}

class SkipDay extends Error {}
