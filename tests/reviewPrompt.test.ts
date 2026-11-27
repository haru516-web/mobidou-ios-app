import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyReviewState, parseReviewState, shouldAskForReview, withReviewAsked, withReviewLaunch, REVIEW_GAP_MS, REVIEW_MAX_ASKS, REVIEW_MIN_LAUNCHES } from '../src/services/reviewPrompt.ts';

const launched = (n: number) => Array.from({ length: n }).reduce<ReturnType<typeof emptyReviewState>>(state => withReviewLaunch(state), emptyReviewState());

test('asks only from the fifteenth launch', () => {
  assert.equal(REVIEW_MIN_LAUNCHES, 15);
  assert.equal(shouldAskForReview(launched(14), 0), false);
  assert.equal(shouldAskForReview(launched(15), 0), true);
  assert.equal(parseReviewState(JSON.stringify(launched(15))).launches, 15);
});
test('waits between invitations and stops after the maximum', () => {
  let state = withReviewAsked(launched(15), 1000);
  assert.equal(shouldAskForReview(state, 1000 + REVIEW_GAP_MS - 1), false);
  assert.equal(shouldAskForReview(state, 1000 + REVIEW_GAP_MS), true);
  for (let i = 1; i < REVIEW_MAX_ASKS; i++) state = withReviewAsked(state, 1000 + i);
  assert.equal(shouldAskForReview(state, 1e15), false);
});
test('broken saved data falls back to empty', () => {
  assert.deepEqual(parseReviewState('{oops'), emptyReviewState());
  assert.deepEqual(parseReviewState(null), emptyReviewState());
});
