import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_STEPS_MAX, openStepsDay, submitEventSteps, tokyoDayRange, type EventStepsRequest, type EventStepsResponse } from '../src/services/eventSteps.ts';

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
