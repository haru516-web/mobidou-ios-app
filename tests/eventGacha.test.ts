import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeEventPulls, drawEventPulls, emptyEventGacha, eventTicketsEarned, eventTicketsLeft, grantEventTickets, nextEventTicketAt, normalizeEventGacha } from '../src/services/eventGacha.ts';

const pool = ['a', 'b', 'c', 'd'];

test('one 木札 for each quarter of the map, four in all', () => {
  const goal = 360000;
  assert.deepEqual([0, 89999, 90000, 179999, 180000, 270000, 359999, 360000, 999999].map(s => eventTicketsEarned(goal, s)), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
  assert.equal(nextEventTicketAt(goal, 0), 90000);
  assert.equal(nextEventTicketAt(goal, 3), 360000);
  assert.equal(nextEventTicketAt(goal, 4), null);
  assert.equal(eventTicketsEarned(undefined, 5000), 0);
});

test('granting only raises the total and stops at four', () => {
  let state = grantEventTickets(emptyEventGacha(), 2);
  assert.equal(state.granted, 2);
  assert.equal(grantEventTickets(state, 1), state);
  assert.equal(grantEventTickets(state, 9).granted, 4);
});

test('a pull spends one 木札 and may repeat a Mobby already owned', () => {
  const state = grantEventTickets(emptyEventGacha(), 2);
  const first = drawEventPulls(state, {}, pool, 1, () => 0);
  assert.equal(first.drawn, 1);
  assert.equal(eventTicketsLeft(first.state), 1);
  assert.deepEqual(first.state.unrevealed, [{ petId: 'a', isNew: true, guaranteed: false, kind: 'free' }]);
  const again = drawEventPulls(first.state, first.owned, pool, 1, () => 0);
  assert.equal(again.owned.a, 2);
  assert.equal(again.state.unrevealed[1].isNew, false);
});

test('no 木札 left means nothing is drawn; asking for more than held draws only what is held', () => {
  const none = drawEventPulls(emptyEventGacha(), {}, pool, 3);
  assert.equal(none.drawn, 0);
  const two = drawEventPulls(grantEventTickets(emptyEventGacha(), 2), {}, pool, 5, () => .99);
  assert.equal(two.drawn, 2);
  assert.equal(two.state.unrevealed.every(r => r.petId === 'd'), true);
});

test('the reveal being over clears the waiting results; a damaged save falls back to empty', () => {
  const drawn = drawEventPulls(grantEventTickets(emptyEventGacha(), 1), {}, pool, 1, () => 0).state;
  assert.equal(acknowledgeEventPulls(drawn).unrevealed.length, 0);
  assert.deepEqual(normalizeEventGacha('x', () => true), emptyEventGacha());
  const restored = normalizeEventGacha({ granted: 7, used: 9, unrevealed: [{ petId: 'a' }, { petId: 'zzz' }, null] }, id => id === 'a');
  assert.equal(restored.granted, 4);
  assert.equal(restored.used, 4);
  assert.equal(restored.unrevealed.length, 1);
});
