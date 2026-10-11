import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgePulls,
  chooseStarter,
  duplicateCount,
  duplicateCrowd,
  emptyMobbyCollection,
  gachaOdds,
  grantFreePullForClear,
  hasStarter,
  normalizeMobbyCollection,
  ownsMobby,
  pullFive,
  pullOnce,
} from '../src/services/gacha.ts';

const POOL = Array.from({ length: 18 }, (_, index) => `pet${index}`);
const known = (id: string) => POOL.includes(id);
/** A "random" that cycles through a fixed list of values. */
const sequence = (values: number[]) => { let index = 0; return () => values[index++ % values.length]; };

test('the starter is chosen once and only from known Mobbies', () => {
  const empty = emptyMobbyCollection();
  assert.equal(chooseStarter(empty, 'nobody', known), empty);
  const started = chooseStarter(empty, 'pet3', known);
  assert.deepEqual(started.owned, { pet3: 1 });
  assert.equal(hasStarter(started), true);
  assert.equal(chooseStarter(started, 'pet5', known), started);
});

test('a free pull is granted once per route, on its first clear', () => {
  const once = grantFreePullForClear(emptyMobbyCollection(), 'sanctuary');
  assert.equal(once.freePulls, 1);
  assert.equal(grantFreePullForClear(once, 'sanctuary'), once);
  assert.equal(grantFreePullForClear(once, 'mountain').freePulls, 2);
});

test('a free pull needs a stored free pull and spends it', () => {
  const none = emptyMobbyCollection();
  assert.equal(pullOnce(none, POOL, 'free'), none);
  const drawn = pullOnce(grantFreePullForClear(none, 'sanctuary'), POOL, 'free', () => 0);
  assert.equal(drawn.freePulls, 0);
  assert.equal(drawn.paidPulls, 0);
  assert.equal(drawn.owned.pet0, 1);
  assert.deepEqual(drawn.unrevealed, [{ petId: 'pet0', isNew: true, guaranteed: false, kind: 'free' }]);
});

test('every Mobby in the pool has the same chance, the starter and duplicates included', () => {
  const odds = gachaOdds(POOL);
  assert.equal(odds.length, POOL.length);
  odds.forEach(entry => assert.equal(entry.rate, 1 / 18));
  assert.ok(Math.abs(odds.reduce((sum, entry) => sum + entry.rate, 0) - 1) < 1e-9);
  // Random 0.999… reaches the last entry, 0 the first.
  assert.equal(pullOnce(emptyMobbyCollection(), POOL, 'paid', () => 0.999999).unrevealed[0].petId, 'pet17');
  assert.equal(pullOnce(emptyMobbyCollection(), POOL, 'paid', () => 0).unrevealed[0].petId, 'pet0');
});

test('a repeat is kept as a duplicate count and marked as not new', () => {
  const started = chooseStarter(emptyMobbyCollection(), 'pet0', known);
  const drawn = pullOnce(started, POOL, 'paid', () => 0);
  assert.equal(drawn.unrevealed[0].isNew, false);
  assert.equal(drawn.owned.pet0, 2);
  assert.equal(duplicateCount(drawn, 'pet0'), 1);
  assert.equal(duplicateCount(drawn, 'pet1'), 0);
});

test('a five-pull is five paid pulls and each counts toward the guarantee', () => {
  const five = pullFive(emptyMobbyCollection(), POOL, sequence([0, 0.1, 0.2, 0.3, 0.4]));
  assert.equal(five.unrevealed.length, 5);
  assert.equal(five.paidPulls, 5);
  assert.equal(five.freePulls, 0);
});

test('a paid pull is an ordinary pull: no count of paid pulls guarantees a new Mobby', () => {
  // Own everything except pet17; with a random that picks pet0, every paid pull gives pet0 again, at any count.
  const owned = Object.fromEntries(POOL.slice(0, 17).map(id => [id, 1]));
  for (const paidPulls of [0, 23, 24, 49, 99]) {
    const drawn = pullOnce({ ...emptyMobbyCollection(), owned, paidPulls }, POOL, 'paid', () => 0);
    assert.equal(drawn.paidPulls, paidPulls + 1);
    assert.deepEqual(drawn.unrevealed.at(-1), { petId: 'pet0', isNew: false, guaranteed: false, kind: 'paid' });
  }
});

test('an empty pool changes nothing', () => {
  const start = grantFreePullForClear(emptyMobbyCollection(), 'sanctuary');
  assert.equal(pullOnce(start, [], 'free'), start);
});

test('pulls waiting for the reveal survive a restart and are cleared by the ceremony', () => {
  const drawn = pullOnce(emptyMobbyCollection(), POOL, 'paid', () => 0.5);
  const restored = normalizeMobbyCollection(JSON.parse(JSON.stringify(drawn)), known);
  assert.deepEqual(restored.unrevealed, drawn.unrevealed);
  assert.deepEqual(acknowledgePulls(restored).unrevealed, []);
  const clean = acknowledgePulls(emptyMobbyCollection());
  assert.equal(acknowledgePulls(clean), clean);
});

test('an older save keeps its chosen Mobby, and damaged data is repaired', () => {
  assert.deepEqual(normalizeMobbyCollection(undefined, known, 'pet4').owned, { pet4: 1 });
  assert.deepEqual(normalizeMobbyCollection(undefined, known, 'gone').owned, {});
  const repaired = normalizeMobbyCollection({
    owned: { pet1: 2, gone: 3, pet2: -1, pet3: 'x' },
    paidPulls: -4,
    freePulls: 2.5,
    freePullRoutes: ['a', 'a', 7],
    unrevealed: [{ petId: 'pet1', kind: 'paid', isNew: true }, { petId: 'gone', kind: 'paid' }, { petId: 'pet1', kind: 'gift' }, null],
  }, known, 'pet9');
  assert.deepEqual(repaired.owned, { pet1: 2 });
  assert.equal(repaired.paidPulls, 0);
  assert.equal(repaired.freePulls, 0);
  assert.deepEqual(repaired.freePullRoutes, ['a']);
  assert.deepEqual(repaired.unrevealed, [{ petId: 'pet1', isNew: true, guaranteed: false, kind: 'paid' }]);
});

test('ownsMobby reports ownership from the count', () => {
  assert.equal(ownsMobby({ ...emptyMobbyCollection(), owned: { pet1: 1 } }, 'pet1'), true);
  assert.equal(ownsMobby(emptyMobbyCollection(), 'pet1'), false);
});

test('the crowd has one small Mobby per duplicate copy, in a stable order, capped with a remainder', () => {
  const owned = { pet0: 3, pet1: 1, pet2: 2, pet3: 2 };
  const crowd = duplicateCrowd({ ...emptyMobbyCollection(), owned });
  assert.deepEqual(crowd.petIds, ['pet0', 'pet0', 'pet2', 'pet3']);
  assert.equal(crowd.more, 0);
  const many = duplicateCrowd({ ...emptyMobbyCollection(), owned: { pet0: 12 } }, 8);
  assert.equal(many.petIds.length, 8);
  assert.equal(many.more, 3);
  assert.deepEqual(duplicateCrowd(emptyMobbyCollection()), { petIds: [], more: 0 });
});
