import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextPilgrimageId, PILGRIMAGES } from '../src/data/pilgrimages.ts';

test('next pilgrimage prefers the next unfinished route', () => {
  assert.equal(getNextPilgrimageId('sanctuary', ['sanctuary', 'mountain']), 'circuit');
});

test('next pilgrimage wraps around the catalogue', () => {
  const last = PILGRIMAGES.at(-1)!;
  assert.equal(getNextPilgrimageId(last.id, [last.id]), PILGRIMAGES[0].id);
});

test('next pilgrimage keeps moving when every route is complete', () => {
  assert.equal(getNextPilgrimageId('sanctuary', PILGRIMAGES.map(route => route.id)), PILGRIMAGES[1].id);
});

test('next pilgrimage ignores unknown active routes', () => {
  assert.equal(getNextPilgrimageId('archived-or-missing'), undefined);
});
