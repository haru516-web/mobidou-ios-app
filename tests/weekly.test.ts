import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStartDay, previousWeekStart, recordDay, summarizeWeek, weeklyDue, normalizeDayLog } from '../src/services/weekly.ts';
const d = (m: number, day: number) => new Date(2026, m - 1, day, 12);
test('weeks run Monday to Sunday in local time', () => {
  assert.equal(weekStartDay(d(10, 3)), '2026-09-28'); // Saturday
  assert.equal(weekStartDay(d(10, 5)), '2026-10-05'); // Monday
  assert.equal(weekStartDay(d(10, 4)), '2026-09-28'); // Sunday
  assert.equal(previousWeekStart(d(10, 6)), '2026-09-28');
});
test('recordDay keeps the larger reading and prunes entries older than five weeks', () => {
  let log = recordDay(undefined, '2026-10-01', 3000, d(10, 3));
  log = recordDay(log, '2026-10-01', 2500, d(10, 3));
  assert.equal(log['2026-10-01'], 3000);
  log = recordDay({ ...log, '2026-08-01': 100 }, '2026-10-02', 10, d(10, 3));
  assert.equal(log['2026-08-01'], undefined);
  assert.deepEqual(recordDay(log, '2026-10-02', -5, d(10, 3)), log);
});
test('summarizeWeek totals walked days, finds the best day and lists the week\'s rewards', () => {
  const log = { '2026-09-28': 4000, '2026-09-29': 0, '2026-09-30': 9000, '2026-10-05': 5000 };
  const week = summarizeWeek(log, [{ id: 'a', date: '2026-09-30' }, { id: 'b', date: '2026-10-05' }], '2026-09-28');
  assert.equal(week.totalSteps, 13000);
  assert.equal(week.walkedDays, 2);
  assert.deepEqual(week.bestDay, { day: '2026-09-30', steps: 9000 });
  assert.deepEqual(week.rewardIds, ['a']);
  assert.equal(week.end, '2026-10-04');
});
test('weekly look-back is due once per new week and only after a walked week', () => {
  const log = { '2026-10-01': 3000 };
  assert.equal(weeklyDue(undefined, log, d(10, 6)), true);
  assert.equal(weeklyDue('2026-10-05', log, d(10, 6)), false);
  assert.equal(weeklyDue(undefined, {}, d(10, 6)), false);
  assert.equal(weeklyDue(undefined, log, d(10, 3)), false); // still the same week
});
test('normalizeDayLog drops malformed entries', () => {
  assert.deepEqual(normalizeDayLog({ '2026-10-01': 5, bad: 3, '2026-10-02': -1, '2026-10-03': 'x' }), { '2026-10-01': 5 });
  assert.deepEqual(normalizeDayLog(null), {});
});
