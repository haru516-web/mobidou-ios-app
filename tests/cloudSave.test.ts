import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_UPLOAD_GAP_MS, emptyCloudState, fingerprint, normalizeCloudState, shouldUpload } from '../src/services/cloudSave.ts';

const linked = { ...emptyCloudState(), linked: true, hash: fingerprint('old') };

test('the record is sent only for a linked account, when it changed, and not too often', () => {
  const now = 10 * MIN_UPLOAD_GAP_MS;
  assert.equal(shouldUpload(emptyCloudState(), fingerprint('new'), now), false, 'not tied to an Apple ID');
  assert.equal(shouldUpload(linked, fingerprint('old'), now), false, 'nothing changed');
  assert.equal(shouldUpload(linked, fingerprint('new'), now), true);
  assert.equal(shouldUpload({ ...linked, at: now - 1000 }, fingerprint('new'), now), false, 'just sent');
  assert.equal(shouldUpload({ ...linked, at: now - MIN_UPLOAD_GAP_MS }, fingerprint('new'), now), true);
  assert.equal(shouldUpload({ ...linked, conflict: true }, fingerprint('new'), now), false, 'the server has a newer record');
});

test('the fingerprint tells records apart and is stable', () => {
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
  assert.notEqual(fingerprint(''), fingerprint(' '));
});

test('a damaged saved state falls back to a safe one', () => {
  assert.deepEqual(normalizeCloudState('x'), emptyCloudState());
  assert.deepEqual(normalizeCloudState({ linked: 'yes', version: -3, hash: 5, at: 'now', conflict: 1 }), emptyCloudState());
  assert.deepEqual(normalizeCloudState({ linked: true, version: 4, hash: 'h', at: 7, conflict: true }), { linked: true, version: 4, hash: 'h', at: 7, conflict: true });
});
