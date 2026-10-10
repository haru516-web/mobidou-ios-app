import test from 'node:test';
import assert from 'node:assert/strict';
import { creditEventTickets, emptyEventGacha, eventTicketsEarned, nextEventTicketAt, normalizeEventGacha, settleLegacyEventGacha } from '../src/services/eventGacha.ts';

test('one 木札 for each quarter of the map, four in all', () => {
  const goal = 360000;
  assert.deepEqual([0, 89999, 90000, 179999, 180000, 270000, 359999, 360000, 999999].map(s => eventTicketsEarned(goal, s)), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
  assert.equal(nextEventTicketAt(goal, 0), 90000);
  assert.equal(nextEventTicketAt(goal, 3), 360000);
  assert.equal(nextEventTicketAt(goal, 4), null);
  assert.equal(eventTicketsEarned(undefined, 5000), 0);
});

test('crediting hands over only the new 木札, once, and stops at four', () => {
  const first = creditEventTickets(emptyEventGacha(), 2);
  assert.equal(first.state.granted, 2);
  assert.equal(first.credited, 2);
  const same = creditEventTickets(first.state, 1);
  assert.equal(same.state, first.state);
  assert.equal(same.credited, 0);
  const more = creditEventTickets(first.state, 9);
  assert.equal(more.state.granted, 4);
  assert.equal(more.credited, 2);
});

test('an older save that kept event 木札 apart hands what is left to the ordinary ones, once', () => {
  const old = { granted: 3, used: 1, unrevealed: [{ petId: 'a', isNew: true, guaranteed: false, kind: 'free' as const }] };
  const settled = settleLegacyEventGacha(old);
  assert.equal(settled.tickets, 2);
  assert.equal(settled.unrevealed.length, 1);
  assert.deepEqual(settled.state, { granted: 3, used: 3, unrevealed: [] });
  const again = settleLegacyEventGacha(settled.state);
  assert.equal(again.state, settled.state);
  assert.equal(again.tickets, 0);
});

test('a damaged save falls back to empty', () => {
  assert.deepEqual(normalizeEventGacha('x', () => true), emptyEventGacha());
  const restored = normalizeEventGacha({ granted: 7, used: 9, unrevealed: [{ petId: 'a' }, { petId: 'zzz' }, null] }, id => id === 'a');
  assert.equal(restored.granted, 4);
  assert.equal(restored.used, 4);
  assert.equal(restored.unrevealed.length, 1);
});
