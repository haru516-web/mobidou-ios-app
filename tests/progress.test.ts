import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, updateSteps, rollDay, localDay, normalizeProgress, startRoute, SHRINE_IDS, DAILY_TARGETS } from '../src/services/progress.ts';
import { PILGRIMAGES } from '../src/data/pilgrimages.ts';
const day = new Date(2026, 8, 9, 12);
const tomorrow = new Date(2026, 8, 10, 0, 1);
test('no reward at 4999; first reward at exactly 5000; no duplicate on repeated refresh', () => {
  const p = updateSteps(freshProgress(day), 4999, day);
  assert.equal(p.rewards.length, 0);
  const first = updateSteps(p, 5000, day);
  assert.deepEqual(first.pending, ['star']);
  assert.equal(first.rewards[0].threshold, 5000);
  assert.deepEqual(updateSteps(first, 5000, day).rewards, first.rewards);
});
test('a large first reading queues all three rewards in order and no more', () => {
  const p = updateSteps(freshProgress(day), 18000, day);
  assert.deepEqual(p.pending, ['star', 'moon', 'rain']);
  assert.equal(p.rewards.length, 3);
  assert.equal(updateSteps(p, 20000, day).rewards.length, 3);
});
test('local midnight resets steps while retaining rewards and pending ceremonies', () => {
  const p = updateSteps(freshProgress(day), 9000, day);
  const next = rollDay(p, tomorrow);
  assert.equal(next.steps, 0);
  assert.equal(next.day, '2026-09-10');
  assert.equal(next.dayStart, 3);
  assert.deepEqual(next.rewards, p.rewards);
  assert.deepEqual(next.pending, p.pending);
  assert.deepEqual(updateSteps(next, 5000, tomorrow).rewards.map(r => r.id), ['star', 'moon', 'rain', 'forest']);
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
  const p = updateSteps(freshProgress(day), 5000, day);
  const next = updateSteps(p, 5000, tomorrow);
  assert.deepEqual(next.rewards.map(r => r.id), ['star', 'moon']);
  assert.equal(next.rewards[1].date, '2026-09-10');
  assert.equal(next.rewards[1].threshold, 5000);
});
test('the full collection completes in order; future days cannot duplicate it', () => {
  let p = freshProgress(day);
  for (let offset = 0; offset < SHRINE_IDS.length / DAILY_TARGETS.length; offset += 1) {
    p = updateSteps(p, 9000, new Date(2026, 8, 9 + offset));
  }
  assert.deepEqual(p.rewards.map(r => r.id), [...SHRINE_IDS]);
  assert.equal(updateSteps(p, 20000, new Date(2026, 9, 1)).rewards.length, SHRINE_IDS.length);
});
test('step corrections never revoke awards; invalid input cannot earn rewards', () => {
  const p = updateSteps(freshProgress(day), 7000, day);
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
  const trial = updateSteps(freshProgress(day), 9000, day);
  assert.equal(real.steps, 0); assert.equal(real.rewards.length, 0); assert.equal(trial.rewards.length, 3);
});
test('a selected pilgrimage starts from the departure step count without retroactive rewards', () => {
  const started = startRoute('mountain', 4321, day);
  assert.equal(updateSteps(started, 4321, day).rewards.length, 0);
  const first = updateSteps(started, 9321, day);
  assert.deepEqual(first.rewards.map(reward => reward.id), ['hibikiishi']);
});
test('a route can unlock every point on the same day without a daily cap', () => {
  let route = startRoute('sanctuary', 0, day);
  route = updateSteps(route, 16000, day);
  assert.deepEqual(route.rewards.map(reward => reward.id), ['rain', 'forest', 'takekaze', 'morika', 'morikage']);
  assert.equal(route.completedAt, '2026-09-09');
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(route)), day), route);
});
test('seven-visit vow route can also complete without a daily cap', () => {
  let route = startRoute('vow', 0, day);
  route = updateSteps(route, 35000, day);
  assert.deepEqual(route.rewards.map(reward => reward.id), PILGRIMAGES.find(item => item.id === 'vow')!.ids);
  assert.equal(route.completedAt, '2026-09-09');
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
  assert.ok(PILGRIMAGES.every(route => route.targets[0] === 5000));
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
test('a route saved with zero rewards does not unlock every point on reload', () => {
  const started = updateSteps(startRoute('mountain', 1000, day), 1500, day);
  assert.equal(started.rewards.length, 0);
  const reloaded = normalizeProgress(JSON.parse(JSON.stringify(started)), day);
  assert.equal(reloaded.routeSteps, started.routeSteps);
  assert.deepEqual(updateSteps(reloaded, 1501, day).rewards, []);
});
test('a downward step correction followed by a rebound does not double-count totalSteps', () => {
  let p = updateSteps(freshProgress(day), 5000, day);
  p = updateSteps(p, 4800, day);
  p = updateSteps(p, 5000, day);
  assert.equal(p.totalSteps, 5000);
});
test('a downward correction on a route does not double-count credited route steps', () => {
  let route = startRoute('mountain', 0, day);
  route = updateSteps(route, 5000, day);
  route = updateSteps(route, 4800, day);
  route = updateSteps(route, 5000, day);
  assert.equal(route.routeSteps, 5000);
});

// Walking a finished route again.
import { creditedSteps, lapCredited, lapView, routeTargets, startReplay } from '../src/services/progress.ts';
const finishedRoute = (routeId = 'compassion') => {
  const start = startRoute(routeId, 0, day);
  const targets = routeTargets(start);
  // The first-lap ceremonies have been watched by the time a lap starts.
  return { done: { ...updateSteps(start, targets.at(-1)!, day), pending: [] as string[] }, targets };
};
test('a route that is not finished cannot start a lap', () => {
  const partial = updateSteps(startRoute('compassion', 0, day), 5000, day);
  assert.equal(startReplay(partial), partial);
});
test('starting a lap keeps the clear and starts counting from zero', () => {
  const { done } = finishedRoute();
  assert.ok(done.completedAt);
  const lap = startReplay(done);
  assert.equal(lap.completedAt, done.completedAt);
  assert.deepEqual(lap.rewards, done.rewards);
  assert.equal(lapCredited(lap), 0);
  assert.equal(lapView(lap).rewards.length, 0);
  assert.equal(lapView(lap).completedAt, undefined);
});
test('a lap queues a ceremony for each stop reached, never adds rewards, and keeps the clear', () => {
  const { done, targets } = finishedRoute();
  const lap = startReplay(done);
  const total = creditedSteps(lap);
  const first = updateSteps(lap, lap.steps + targets[0], day);
  assert.deepEqual(first.pending.slice(-1), [done.rewards[0].id]);
  assert.equal(first.rewards.length, done.rewards.length);
  assert.equal(first.completedAt, done.completedAt);
  assert.equal(lapCredited(first), targets[0]);
  assert.equal(lapView(first).rewards.length, 1);
  assert.equal(creditedSteps(first), total + targets[0]);
  // The same reading does not queue the stop twice.
  assert.equal(updateSteps(first, first.steps, day).pending.length, first.pending.length);
});
test('a large reading in one lap queues every stop it crossed, in order', () => {
  const { done, targets } = finishedRoute();
  const lap = startReplay(done);
  const walked = updateSteps(lap, lap.steps + targets.at(-1)!, day);
  assert.deepEqual(walked.pending, done.rewards.map(reward => reward.id));
  assert.equal(lapView(walked).completedAt, done.completedAt);
  assert.equal(lapView(walked).rewards.length, done.rewards.length);
});
test('a finished lap can start another, and an unfinished one is left alone', () => {
  const { done, targets } = finishedRoute();
  const lap = startReplay(done);
  assert.equal(startReplay(lap), lap);
  const walked = updateSteps(lap, lap.steps + targets.at(-1)!, day);
  const again = startReplay(walked);
  assert.equal(lapCredited(again), 0);
  assert.equal(again.completedAt, done.completedAt);
});
test('a lap survives save and restore, and a bad lap marker is dropped', () => {
  const { done, targets } = finishedRoute();
  const walked = updateSteps(startReplay(done), done.steps + targets[1], day);
  const restored = normalizeProgress(JSON.parse(JSON.stringify(walked)), day);
  assert.equal(restored.lapBase, walked.lapBase);
  assert.equal(lapCredited(restored), lapCredited(walked));
  assert.equal(normalizeProgress({ ...JSON.parse(JSON.stringify(walked)), lapBase: -5 }, day).lapBase, undefined);
  const partial = updateSteps(startRoute('compassion', 0, day), 5000, day);
  assert.equal(normalizeProgress({ ...JSON.parse(JSON.stringify(partial)), lapBase: 100 }, day).lapBase, undefined);
});
