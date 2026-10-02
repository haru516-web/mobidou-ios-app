import test from 'node:test';
import assert from 'node:assert/strict';
import { milestoneCount, milestoneLine, milestoneMessage } from '../src/services/milestones.ts';

test('a marker is reached every 1,000 steps', () => {
  assert.equal(milestoneCount(0), 0);
  assert.equal(milestoneCount(999), 0);
  assert.equal(milestoneCount(1000), 1);
  assert.equal(milestoneCount(4999), 4);
  assert.equal(milestoneCount(-5), 0);
  assert.equal(milestoneCount(Number.NaN), 0);
});

test('the marker message states distance and what is left', () => {
  assert.equal(milestoneMessage(2, 3000), '2,000歩 道しるべ · 次の社まであと3,000歩');
  assert.equal(milestoneMessage(5, null), '5,000歩 道しるべ');
  assert.ok(milestoneLine(1) !== milestoneLine(2));
});
