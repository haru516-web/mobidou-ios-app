import assert from 'node:assert/strict';
import test from 'node:test';
import { fortuneForDay, localOmikujiDay, OMIKUJI_FORTUNES } from '../src/data/omikuji.ts';

test('omikuji date uses the local calendar date', () => {
  assert.equal(localOmikujiDay(new Date(2026, 8, 22, 23, 59)), '2026-09-22');
});

test('the same character receives the same fortune throughout one day', () => {
  const first = fortuneForDay('2026-09-22', 'mobibou');
  assert.equal(fortuneForDay('2026-09-22', 'mobibou'), first);
});

test('daily omikuji provides a varied temple-style catalogue', () => {
  assert.ok(OMIKUJI_FORTUNES.length >= 20);
  assert.equal(new Set(OMIKUJI_FORTUNES.map(item => item.id)).size, OMIKUJI_FORTUNES.length);
  for (const fortune of OMIKUJI_FORTUNES) {
    assert.equal(fortune.categories.length, 3);
    assert.ok(fortune.action.length > 0);
    assert.ok(fortune.lucky.length > 0);
  }
});
