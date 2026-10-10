import assert from 'node:assert/strict';
import test from 'node:test';
import { SAYING_MAX_PER_COLUMN, SHRINE_SAYINGS, sayingColumns } from '../src/data/shrineSayings.ts';

test('every saying is short enough for one card', () => {
  const entries = Object.entries(SHRINE_SAYINGS);
  assert.equal(entries.length, 75);
  for (const [id, text] of entries) {
    assert.ok(text.length > 0 && text.length <= 26, `${id}: ${text.length}`);
  }
});

test('a saying is written in at most three columns, each short enough to stand on the screen', () => {
  for (const [id, text] of Object.entries(SHRINE_SAYINGS)) {
    const columns = sayingColumns(text);
    assert.ok(columns.length >= 1 && columns.length <= 4, `${id}: ${columns.length} columns`);
    assert.ok(columns.every(column => column.length > 0 && column.length <= SAYING_MAX_PER_COLUMN), id);
    assert.equal(columns.flat().join(''), text, id);
  }
});
