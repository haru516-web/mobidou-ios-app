import test from 'node:test';
import assert from 'node:assert/strict';
import { appleMessages, appleOutcome } from '../src/services/appleOutcome.ts';

test('linking: success, already linked, and each way the server can refuse', () => {
  assert.deepEqual(appleOutcome('link', { status: 200, data: { status: 'linked' } }), { ok: true, status: 'linked' });
  assert.deepEqual(appleOutcome('link', { status: 200, data: { status: 'already_linked' } }), { ok: true, status: 'already_linked' });
  assert.deepEqual(appleOutcome('link', { status: 409, data: { error: 'apple_in_use' } }), { ok: false, reason: 'apple_in_use' });
  assert.deepEqual(appleOutcome('link', { status: 409, data: { error: 'account_has_other_apple' } }), { ok: false, reason: 'account_has_other_apple' });
  assert.deepEqual(appleOutcome('link', { status: 401, data: { error: 'invalid_apple_token' } }), { ok: false, reason: 'failed' });
  assert.deepEqual(appleOutcome('link', null), { ok: false, reason: 'offline' });
});

test('restoring: found, not found, and failures', () => {
  assert.deepEqual(appleOutcome('restore', { status: 200, data: {} }), { ok: true, status: 'restored' });
  assert.deepEqual(appleOutcome('restore', { status: 404, data: { error: 'no_linked_account' } }), { ok: false, reason: 'no_account' });
  assert.deepEqual(appleOutcome('restore', { status: 429, data: null }), { ok: false, reason: 'failed' });
  assert.deepEqual(appleOutcome('restore', null), { ok: false, reason: 'offline' });
});

test('every failure has a message, and cancelling stays silent', () => {
  for (const [reason, message] of Object.entries(appleMessages)) assert.equal(message === '', reason === 'cancelled', reason);
});
