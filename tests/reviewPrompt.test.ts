import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyReviewState, parseReviewState, shouldAskForReview, withReviewAsked, withReviewDay, REVIEW_GAP_MS, REVIEW_MAX_ASKS } from '../src/services/reviewPrompt.ts';

const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-12-0${i + 1}`).reduce(withReviewDay, emptyReviewState());

test('asks only after three different days', () => {
  assert.equal(shouldAskForReview(days(2), 0), false);
  assert.equal(shouldAskForReview(days(3), 0), true);
  assert.equal(withReviewDay(days(1), '2026-12-01').days.length, 1);
});
test('waits between invitations and stops after the maximum', () => {
  let state = withReviewAsked(days(3), 1000);
  assert.equal(shouldAskForReview(state, 1000 + REVIEW_GAP_MS - 1), false);
  assert.equal(shouldAskForReview(state, 1000 + REVIEW_GAP_MS), true);
  for (let i = 1; i < REVIEW_MAX_ASKS; i++) state = withReviewAsked(state, 1000 + i);
  assert.equal(shouldAskForReview(state, 1e15), false);
});
test('broken saved data falls back to empty', () => {
  assert.deepEqual(parseReviewState('{oops'), emptyReviewState());
  assert.deepEqual(parseReviewState(null), emptyReviewState());
});
