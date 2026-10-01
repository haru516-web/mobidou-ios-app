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

export type EventStepsRequest = { eventId: string; day: string; cumulative: number };
export type EventStepsResponse = { status: number; body: unknown };
export type EventStepsTransport = (request: EventStepsRequest) => Promise<EventStepsResponse>;

export type EventStepsResult =
  | { ok: true; day: string; cumulative: number }
  | { ok: false; reason: 'offline' | 'day_mismatch' | 'rejected'; openDay?: string };

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
  const day = openStepsDay(options.now);
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
