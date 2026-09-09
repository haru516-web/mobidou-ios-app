import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, updateSteps, rollDay, localDay, normalizeProgress, SHRINE_IDS } from '../src/services/progress.ts';
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
test('unfinished day continues at next uncollected shrine on the following day', () => {
  const p = updateSteps(freshProgress(day), 1000, day);
  const next = updateSteps(p, 1000, tomorrow);
  assert.deepEqual(next.rewards.map(r => r.id), ['star', 'moon']);
  assert.equal(next.rewards[1].date, '2026-09-10');
  assert.equal(next.rewards[1].threshold, 1000);
});
test('all six complete across two days; future days cannot duplicate them', () => {
  const p = updateSteps(updateSteps(freshProgress(day), 5000, day), 5000, tomorrow);
  assert.deepEqual(p.rewards.map(r => r.id), [...SHRINE_IDS]);
  assert.equal(updateSteps(p, 20000, new Date(2026, 8, 13)).rewards.length, 6);
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
