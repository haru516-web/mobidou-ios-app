import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyServerState, normalizeServerState, planServerOps } from '../src/services/server.ts';
import { emptyMobbyCollection } from '../src/services/gacha.ts';

const withMobbies = (owned: Record<string, number>, freePullRoutes: string[] = []) => ({ ...emptyMobbyCollection(), owned, freePullRoutes });

test('a single owned Mobby is reported as the starter, once', () => {
  assert.deepEqual(planServerOps(withMobbies({ mobibou: 1 }), emptyServerState()).ops, [{ type: 'starter', petId: 'mobibou' }]);
  assert.deepEqual(planServerOps(withMobbies({ mobibou: 1 }), { ...emptyServerState(), starterDone: true }).ops, []);
});

test('with several Mobbies the starter is unknown and not reported', () => {
  const plan = planServerOps(withMobbies({ mobibou: 1, yami: 2 }), emptyServerState());
  assert.deepEqual(plan.ops, []);
  assert.equal(plan.starterUnknown, true);
});

test('only route clears the server has not heard about are claimed', () => {
  const state = { ...emptyServerState(), starterDone: true, claimedRoutes: ['a'] };
  assert.deepEqual(planServerOps(withMobbies({ mobibou: 1 }, ['a', 'b']), state).ops, [{ type: 'claim', routeId: 'b' }]);
});

test('a damaged saved state falls back to an empty one', () => {
  assert.deepEqual(normalizeServerState('x'), emptyServerState());
  assert.deepEqual(normalizeServerState({ account: { userId: 1 }, claimedRoutes: ['a', 'a', 3] }), { account: null, lost: null, starterDone: false, claimedRoutes: ['a'] });
});
