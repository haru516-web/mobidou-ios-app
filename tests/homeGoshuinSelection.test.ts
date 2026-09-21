import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomeGoshuinSelection, setHomeGoshuinSlot } from '../src/services/homePreferences.ts';

test('normalizes three unique home goshuin slots', () => {
  assert.deepEqual(normalizeHomeGoshuinSelection(['rain', 'forest', 'rain']), ['rain', 'forest', null]);
  assert.deepEqual(normalizeHomeGoshuinSelection(undefined), [null, null, null]);
});

test('moves an already selected goshuin instead of duplicating it', () => {
  assert.deepEqual(setHomeGoshuinSlot(['rain', 'forest', 'cloud'], 2, 'rain'), ['cloud', 'forest', 'rain']);
});
