import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_STEPS_MAX, openStepsDay, rangeSince, submitEventSteps, tokyoDayRange, type EventStepsRequest, type EventStepsResponse } from '../src/services/eventSteps.ts';

const jst = (iso: string) => new Date(`${iso}+09:00`);

test('the open day switches at 20:00 Tokyo time', () => {
  assert.equal(openStepsDay(jst('2026-09-30T19:59:00')), '2026-09-29');
  assert.equal(openStepsDay(jst('2026-09-30T20:00:00')), '2026-09-30');
  assert.equal(openStepsDay(jst('2026-10-01T00:30:00')), '2026-09-30');
  assert.equal(openStepsDay(jst('2026-10-01T19:59:00')), '2026-09-30');
  assert.equal(openStepsDay(jst('2026-10-01T20:00:00')), '2026-10-01');
});

test('the open day does not depend on the device time zone', () => {
  // 11:00 UTC is 20:00 JST regardless of where the phone is.
  assert.equal(openStepsDay(new Date('2026-09-30T11:00:00Z')), '2026-09-30');
  assert.equal(openStepsDay(new Date('2026-09-30T10:59:00Z')), '2026-09-29');
});

test('a Tokyo day spans 24 hours from Tokyo midnight', () => {
  const { start, end } = tokyoDayRange('2026-09-30');
  assert.equal(new Date(start).toISOString(), '2026-09-29T15:00:00.000Z');
  assert.equal(end - start, 24 * 60 * 60 * 1000);
  assert.throws(() => tokyoDayRange('2026-9-30'));
});

const ok = (status = 200, body: unknown = {}): EventStepsResponse => ({ status, body });

test('a morning send reads and files the previous day, cut off at now', async () => {
  const now = jst('2026-10-01T09:00:00');
  let read: [number, number] | null = null;
  let sent: EventStepsRequest | null = null;
  const result = await submitEventSteps({
    eventId: 'autumn', now,
    readSteps: async (start, end) => { read = [start, end]; return 8123.7; },
    transport: async (request) => { sent = request; return ok(200, { day: request.day, cumulative: request.cumulative }); },
  });
  assert.deepEqual(result, { ok: true, day: '2026-09-30', cumulative: 8123 });
  assert.deepEqual(sent, { eventId: 'autumn', day: '2026-09-30', cumulative: 8123 });
  assert.equal(new Date(read![0]).toISOString(), '2026-09-29T15:00:00.000Z');
  assert.equal(new Date(read![1]).toISOString(), '2026-09-30T15:00:00.000Z'); // end of 09-30, not now
});

test('an evening send reads the current day up to now', async () => {
  const now = jst('2026-09-30T20:10:00');
  let end = 0;
  await submitEventSteps({ eventId: 'autumn', now, readSteps: async (_s, e) => { end = e; return 100; }, transport: async () => ok() });
  assert.equal(end, now.getTime());
});

test('absurd step counts are clamped to the server limit and bad reads are not sent', async () => {
  const now = jst('2026-09-30T21:00:00');
  let sent: EventStepsRequest | null = null;
  const transport = async (request: EventStepsRequest) => { sent = request; return ok(200, { day: request.day, cumulative: request.cumulative }); };
  await submitEventSteps({ eventId: 'e', now, readSteps: async () => 250000, transport });
  assert.equal(sent!.cumulative, DAILY_STEPS_MAX);
  sent = null;
  const bad = await submitEventSteps({ eventId: 'e', now, readSteps: async () => Number.NaN, transport });
  assert.deepEqual(bad, { ok: false, reason: 'rejected' });
  assert.equal(sent, null);
});

test('server answers map to results', async () => {
  const base = { eventId: 'e', now: jst('2026-09-30T21:00:00'), readSteps: async () => 10 };
  assert.deepEqual(await submitEventSteps({ ...base, transport: async () => ok(409, { error: 'steps_day_mismatch', openDay: '2026-10-01' }) }), { ok: false, reason: 'day_mismatch', openDay: '2026-10-01' });
  assert.deepEqual(await submitEventSteps({ ...base, transport: async () => ok(409, { error: 'event_not_active' }) }), { ok: false, reason: 'rejected' });
  assert.deepEqual(await submitEventSteps({ ...base, transport: async () => { throw new Error('network'); } }), { ok: false, reason: 'offline' });
});

test('only the steps after joining count: a morning join adds nothing for yesterday and takes today from the joining time', () => {
  const joined = Date.parse('2026-10-01T10:00:00+09:00');
  const yesterday = tokyoDayRange('2026-09-30');
  const today = tokyoDayRange('2026-10-01');
  // At 10:00 the open day is still yesterday, and the whole of it is before the join.
  assert.equal(rangeSince(yesterday.start, Math.min(yesterday.end, joined), joined), null);
  // Today's day opens at 20:00 and is read from the joining time to midnight.
  assert.deepEqual(rangeSince(today.start, today.end, joined), { start: joined, end: today.end });
  // A player who has been in the team from before the day counts the whole day.
  assert.deepEqual(rangeSince(today.start, today.end, today.start - 1), { start: today.start, end: today.end });
  // No joining time known (an older server): nothing is cut.
  assert.deepEqual(rangeSince(today.start, today.end, undefined), { start: today.start, end: today.end });
});

// ---- the open day and the days before it
import { catchUpDays, shiftTokyoDay, submitEventStepsCatchUp, STEPS_GRACE_DAYS } from '../src/services/eventSteps.ts';
import { reminderTimes } from '../src/services/notificationPlan.ts';

test('the days to send are the open day and the grace days before it, oldest first', () => {
  assert.equal(STEPS_GRACE_DAYS, 2);
  assert.deepEqual(catchUpDays(jst('2026-10-05T21:00:00')), ['2026-10-03', '2026-10-04', '2026-10-05']);
  // Before 20:00 the open day is still yesterday.
  assert.deepEqual(catchUpDays(jst('2026-10-05T09:00:00')), ['2026-10-02', '2026-10-03', '2026-10-04']);
  assert.equal(shiftTokyoDay('2026-10-01', -1), '2026-09-30');
  assert.equal(shiftTokyoDay('2026-12-31', 1), '2027-01-01');
});

test('catching up sends each day with steps once, skips empty and already-sent days, and tolerates an older server', async () => {
  const sent: EventStepsRequest[] = [];
  const totals: Record<string, number> = { '2026-10-03': 4000, '2026-10-04': 0, '2026-10-05': 900 };
  const day = (start: number) => new Date(start + 9 * 3_600_000).toISOString().slice(0, 10);
  const run = (alreadySent: Record<string, number>, answer: (request: EventStepsRequest) => EventStepsResponse) => submitEventStepsCatchUp({
    eventId: 'toki', now: jst('2026-10-05T21:00:00'), alreadySent,
    readSteps: async (start) => totals[day(start)] ?? 0,
    transport: async request => { sent.push(request); return answer(request); }
  });

  const first = await run({}, request => ok(200, { day: request.day, cumulative: request.cumulative }));
  assert.deepEqual(sent.map(request => [request.day, request.cumulative]), [['2026-10-03', 4000], ['2026-10-05', 900]]);
  assert.equal(first.outcome, 'sent');
  assert.deepEqual(first.sent, { '2026-10-03': 4000, '2026-10-05': 900 });

  // The earlier day the server already has in full is not sent again; the open day always is.
  sent.length = 0;
  const second = await run({ '2026-10-03': 4000 }, request => ok(200, { day: request.day, cumulative: request.cumulative }));
  assert.deepEqual(sent.map(request => request.day), ['2026-10-05']);
  assert.equal(second.outcome, 'sent');

  // An older server refuses earlier days with a mismatch: the open day is what counts.
  sent.length = 0;
  const older = await run({}, request => request.day === '2026-10-05' ? ok(200, { day: request.day, cumulative: request.cumulative }) : ok(409, { error: 'steps_day_mismatch', openDay: '2026-10-05' }));
  assert.equal(older.outcome, 'sent');
  // The open day refused is a failure.
  const refused = await run({}, () => ok(409, { error: 'steps_day_mismatch', openDay: '2026-10-05' }));
  assert.equal(refused.outcome, 'failed');
});

/** Three evenings ahead, to keep the expectations short. */
const soon = (now: Date, options: Parameters<typeof reminderTimes>[1]) => reminderTimes(now, options, 3);

test('the evening reminder: 20:05 Tokyo time, a few days ahead, only while a team is out and the event runs', () => {
  const at = (iso: string) => new Date(`${iso}+09:00`).getTime();
  const options = { enabled: true, teamActive: true };
  assert.deepEqual(soon(jst('2026-10-05T09:00:00'), options), [at('2026-10-05T20:05:00'), at('2026-10-06T20:05:00'), at('2026-10-07T20:05:00')]);
  // After tonight's time has passed, the next evenings.
  assert.deepEqual(soon(jst('2026-10-05T21:00:00'), options), [at('2026-10-06T20:05:00'), at('2026-10-07T20:05:00'), at('2026-10-08T20:05:00')]);
  assert.deepEqual(soon(jst('2026-10-05T09:00:00'), { ...options, teamActive: false }), []);
  assert.deepEqual(soon(jst('2026-10-05T09:00:00'), { ...options, enabled: false }), []);
  // Nothing at or after the end of the event, nor before it starts.
  assert.deepEqual(soon(jst('2026-10-05T09:00:00'), { ...options, eventEndsAt: at('2026-10-07T00:00:00') }), [at('2026-10-05T20:05:00'), at('2026-10-06T20:05:00')]);
  assert.deepEqual(soon(jst('2026-10-05T09:00:00'), { ...options, eventStartsAt: at('2026-10-06T00:00:00') }), [at('2026-10-06T20:05:00'), at('2026-10-07T20:05:00'), at('2026-10-08T20:05:00')]);
  // Same instants wherever the phone is: it is all in Tokyo time.
  assert.deepEqual(soon(new Date('2026-10-05T00:00:00Z'), options), soon(jst('2026-10-05T09:00:00'), options));
});

test('the reminder is planned two weeks ahead, so someone who does not open the app is still reminded', () => {
  const times = reminderTimes(jst('2026-10-05T09:00:00'), { enabled: true, teamActive: true });
  assert.equal(times.length, 14);
  assert.equal(times[0], new Date('2026-10-05T20:05:00+09:00').getTime());
  assert.equal(times[13], new Date('2026-10-18T20:05:00+09:00').getTime());
  // The end of the event cuts it short.
  const ends = new Date('2026-10-08T00:00:00+09:00').getTime();
  assert.equal(reminderTimes(jst('2026-10-05T09:00:00'), { enabled: true, teamActive: true, eventEndsAt: ends }).length, 3);
});

import { omikujiTimes } from '../src/services/notificationPlan.ts';

test('the daily omikuji reminder: 8:00 on the phone clock, two weeks ahead, not today once drawn, nothing when off', () => {
  const morning = new Date(2026, 9, 5, 7, 0);
  const eight = (day: number) => new Date(2026, 9, day, 8, 0).getTime();
  const times = omikujiTimes(morning, { enabled: true, drawnToday: false });
  assert.equal(times.length, 14);
  assert.equal(times[0], eight(5));
  assert.equal(times[13], eight(18));
  // Today's is left out once today's omikuji is drawn.
  assert.equal(omikujiTimes(morning, { enabled: true, drawnToday: true })[0], eight(6));
  // After 8:00 the next one is tomorrow's.
  assert.equal(omikujiTimes(new Date(2026, 9, 5, 9, 0), { enabled: true, drawnToday: false })[0], eight(6));
  assert.deepEqual(omikujiTimes(morning, { enabled: false, drawnToday: false }), []);
});

import { absenceTimes } from '../src/services/notificationPlan.ts';

test('the away reminders: day 5 and day 12 after the app was last open, at 18:00 on the phone clock, none when off', () => {
  const opened = new Date(2026, 9, 5, 21, 30);
  assert.deepEqual(absenceTimes(opened, { enabled: true }), [new Date(2026, 9, 10, 18, 0).getTime(), new Date(2026, 9, 17, 18, 0).getTime()]);
  assert.deepEqual(absenceTimes(opened, { enabled: false }), []);
  // Month ends carry over.
  assert.deepEqual(absenceTimes(new Date(2026, 9, 30, 9, 0), { enabled: true }), [new Date(2026, 10, 4, 18, 0).getTime(), new Date(2026, 10, 11, 18, 0).getTime()]);
});

import { orderForPicker } from '../src/services/mobbyPicker.ts';

test('the Mobby picker lists the owned ones first, from the left, then the ones not met yet; event ones only when owned', () => {
  const ordinary = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id }));
  const event = ['x', 'y'].map(id => ({ id }));
  const owns = (ids: string[]) => (id: string) => ids.includes(id);
  assert.deepEqual(orderForPicker(ordinary, event, owns(['d', 'b', 'y'])).map(pet => pet.id), ['b', 'd', 'y', 'a', 'c', 'e']);
  // Nothing owned yet: all of them, locked, in the catalog's order.
  assert.deepEqual(orderForPicker(ordinary, event, owns([])).map(pet => pet.id), ['a', 'b', 'c', 'd', 'e']);
  // The first pick has no ownership check: the catalog order, no event Mobbies.
  assert.deepEqual(orderForPicker(ordinary, event).map(pet => pet.id), ['a', 'b', 'c', 'd', 'e']);
});
