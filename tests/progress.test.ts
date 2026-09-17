import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, updateSteps, rollDay, localDay, normalizeProgress, startRoute, SHRINE_IDS, DAILY_TARGETS } from '../src/services/progress.ts';
import { PILGRIMAGES } from '../src/data/pilgrimages.ts';
const day = new Date(2026, 8, 9, 12);
const tomorrow = new Date(2026, 8, 10, 0, 1);
test('no reward at 999; first reward at exactly 1000; no duplicate on repeated refresh', () => {
  const p = updateSteps(freshProgress(day), 999, day);
  assert.equal(p.rewards.length, 0);
  const first = updateSteps(p, 1000, day);
  assert.deepEqual(first.pending, ['star']);
  assert.equal(first.rewards[0].threshold, 1000);
  assert.deepEqual(updateSteps(first, 1000, day).rewards, first.rewards);
});
test('a large first reading queues all three rewards in order and no more', () => {
  const p = updateSteps(freshProgress(day), 18000, day);
  assert.deepEqual(p.pending, ['star', 'moon', 'rain']);
  assert.equal(p.rewards.length, 3);
  assert.equal(updateSteps(p, 20000, day).rewards.length, 3);
});
test('local midnight resets steps while retaining rewards and pending ceremonies', () => {
  const p = updateSteps(freshProgress(day), 5000, day);
  const next = rollDay(p, tomorrow);
  assert.equal(next.steps, 0);
  assert.equal(next.day, '2026-09-10');
  assert.equal(next.dayStart, 3);
  assert.deepEqual(next.rewards, p.rewards);
  assert.deepEqual(next.pending, p.pending);
  assert.deepEqual(updateSteps(next, 1000, tomorrow).rewards.map(r => r.id), ['star', 'moon', 'rain', 'forest']);
});
test('cumulative steps keep daily readings separate from the all-time total', () => {
  let p = updateSteps(freshProgress(day), 1500, day);
  assert.equal(p.steps, 1500);
  assert.equal(p.totalSteps, 1500);
  p = updateSteps(p, 2300, day);
  assert.equal(p.totalSteps, 2300);
  p = updateSteps(p, 800, tomorrow);
  assert.equal(p.steps, 800);
  assert.equal(p.totalSteps, 3100);
});
test('unfinished day continues at next uncollected shrine on the following day', () => {
  const p = updateSteps(freshProgress(day), 1000, day);
  const next = updateSteps(p, 1000, tomorrow);
  assert.deepEqual(next.rewards.map(r => r.id), ['star', 'moon']);
  assert.equal(next.rewards[1].date, '2026-09-10');
  assert.equal(next.rewards[1].threshold, 1000);
});
test('the full collection completes in order; future days cannot duplicate it', () => {
  let p = freshProgress(day);
  for (let offset = 0; offset < SHRINE_IDS.length / DAILY_TARGETS.length; offset += 1) {
    p = updateSteps(p, 5000, new Date(2026, 8, 9 + offset));
  }
  assert.deepEqual(p.rewards.map(r => r.id), [...SHRINE_IDS]);
  assert.equal(updateSteps(p, 20000, new Date(2026, 9, 1)).rewards.length, SHRINE_IDS.length);
});
test('step corrections never revoke awards; invalid input cannot earn rewards', () => {
  const p = updateSteps(freshProgress(day), 3000, day);
  assert.equal(updateSteps(p, 800, day).rewards.length, 2);
  for (const invalid of [NaN, Infinity, -1]) assert.equal(updateSteps(freshProgress(day), invalid, day).rewards.length, 0);
});
test('JSON roundtrip retains acquired metadata and queued ceremonies', () => {
  const p = updateSteps(freshProgress(day), 3876, day);
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p)), day), p);
});
test('malformed saves and foreign shrine identifiers are rejected', () => {
  assert.throws(() => normalizeProgress({ ...freshProgress(day), dayStart: 77 }, day));
  assert.throws(() => normalizeProgress({ ...freshProgress(day), rewards: [{ id: 'real-shrine', date: '2026-09-09', steps: 1000, threshold: 1000 }] }, day));
});
test('local date uses local calendar components; demo updates are immutable', () => {
  assert.equal(localDay(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
  const real = freshProgress(day);
  const trial = updateSteps(freshProgress(day), 5000, day);
  assert.equal(real.steps, 0); assert.equal(real.rewards.length, 0); assert.equal(trial.rewards.length, 3);
});
test('a selected pilgrimage starts from the departure step count without retroactive rewards', () => {
  const started = startRoute('mountain', 4321, day);
  assert.equal(updateSteps(started, 4321, day).rewards.length, 0);
  const first = updateSteps(started, 6321, day);
  assert.deepEqual(first.rewards.map(reward => reward.id), ['hibikiishi']);
});
test('route targets repeat daily and completing the last stop records 結願', () => {
  let route = startRoute('sanctuary', 0, day);
  route = updateSteps(route, 5000, day);
  assert.deepEqual(route.rewards.map(reward => reward.id), ['rain', 'forest', 'takekaze']);
  route = updateSteps(route, 3000, tomorrow);
  assert.deepEqual(route.rewards.map(reward => reward.id), ['rain', 'forest', 'takekaze', 'morika', 'morikage']);
  assert.equal(route.completedAt, '2026-09-10');
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(route)), tomorrow), route);
});
test('seven-visit vow route awards one visit per day', () => {
  let route = startRoute('vow', 0, day);
  route = updateSteps(route, 9000, day);
  assert.deepEqual(route.rewards.map(reward => reward.id), ['kinboshi']);
  route = updateSteps(route, 1000, tomorrow);
  assert.deepEqual(route.rewards.map(reward => reward.id), ['kinboshi', 'sunamoon']);
});
test('all pilgrimage points are unique across routes', () => {
  const ids = PILGRIMAGES.flatMap(route => route.ids);
  assert.equal(PILGRIMAGES.length, 12);
  assert.equal(ids.length, 74);
  assert.equal(new Set(ids).size, ids.length);
  for (const type of ['神域参詣', '山岳修行', '札所周回', '観音巡礼', '七願掛け', '物語の聖地巡礼']) {
    assert.equal(PILGRIMAGES.filter(route => route.type === type).length, 2);
  }
  assert.equal(SHRINE_IDS.length, 74);
  assert.equal(new Set(SHRINE_IDS).size, SHRINE_IDS.length);
  assert.ok(ids.every(id => (SHRINE_IDS as readonly string[]).includes(id)));
});
test('legacy numbered vow rewards migrate to named shrine IDs', () => {
  const legacy = {
    ...startRoute('vow', 1000, tomorrow),
    dayStart: 1,
    rewards: [
      { id: 'kinboshi~1', date: '2026-09-09', steps: 1000, threshold: 1000 },
      { id: 'kinboshi~2', date: '2026-09-10', steps: 1000, threshold: 1000 },
    ],
    pending: ['kinboshi~2'],
  };
  const normalized = normalizeProgress(legacy, tomorrow);
  assert.deepEqual(normalized.rewards.map(reward => reward.id), ['kinboshi', 'sunamoon']);
  assert.deepEqual(normalized.pending, ['sunamoon']);
});
