import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  declineKeychainDrop,
  emptySpecialCollection,
  grantPass,
  hasPass,
  KEYCHAIN_DROP_RATE,
  normalizeSpecialCollection,
  purchasePass,
  redeemCoverChange,
  redeemKeychainDrop,
  redeemPass,
  rollSpecialDrop,
  SPARKLE_DROP_RATE,
} from '../src/services/specialRewards.ts';

function roll(collection = emptySpecialCollection(), shrineId = 'rain', keychainRandom = 1, sparkleRandom = 1) {
  const values = [keychainRandom, sparkleRandom];
  return rollSpecialDrop(collection, shrineId, () => values.shift()!);
}

test('natural keychain drop uses an exact ten percent boundary', () => {
  const justBelow = roll(emptySpecialCollection(), 'star', KEYCHAIN_DROP_RATE - 0.0001, 1);
  assert.equal(justBelow.rolls.star.keychain, true);
  assert.equal(justBelow.keychainDecisions.star, 'natural');
  assert.equal(justBelow.keychains.star, 1);

  const atBoundary = roll(emptySpecialCollection(), 'moon', KEYCHAIN_DROP_RATE, 1);
  assert.equal(atBoundary.rolls.moon.keychain, false);
  assert.equal(atBoundary.keychainDecisions.moon, 'pending');
  assert.equal(atBoundary.keychains.moon, undefined);
});

test('sparkle keeps its legacy independent probability without a new ticket', () => {
  const below = roll(emptySpecialCollection(), 'forest', 1, SPARKLE_DROP_RATE - 0.0001);
  assert.deepEqual(below.rolls.forest, { keychain: false, sparkle: true });
  assert.equal(below.sparkles.forest, 1);
  assert.equal(below.passes.keychainDrop, 0);
});

test('a shrine is rolled once and a persisted failure gets a pending decision', () => {
  const first = roll(emptySpecialCollection(), 'rain', 1, 1);
  const repeated = rollSpecialDrop(first, 'rain', () => 0);
  assert.equal(repeated, first);
  assert.deepEqual(repeated.rolls.rain, { keychain: false, sparkle: false });
  assert.equal(repeated.keychainDecisions.rain, 'pending');
});

test('keychain ticket redemption requires pending failure and is idempotent', () => {
  let collection = purchasePass(roll(emptySpecialCollection(), 'rain', 1, 1), 'keychainDrop');
  assert.equal(collection.passes.keychainDrop, 1);
  assert.equal(hasPass(collection, 'keychainDrop'), true);
  const redeemed = redeemKeychainDrop(collection, 'rain');
  assert.equal(redeemed.keychains.rain, 1);
  assert.equal(redeemed.passes.keychainDrop, 0);
  assert.equal(redeemed.keychainDecisions.rain, 'ticket');
  assert.equal(redeemKeychainDrop(redeemed, 'rain'), redeemed);
  assert.equal(redeemKeychainDrop(redeemed, 'missing'), redeemed);
});

test('a natural success cannot be replaced by a keychain ticket', () => {
  const natural = purchasePass(roll(emptySpecialCollection(), 'rain', 0, 1), 'keychainDrop');
  assert.equal(natural.keychainDecisions.rain, 'natural');
  assert.equal(redeemKeychainDrop(natural, 'rain'), natural);
  assert.equal(natural.passes.keychainDrop, 1);
});

test('declining a pending failure preserves the ticket and blocks later redemption', () => {
  let collection = purchasePass(roll(emptySpecialCollection(), 'rain', 1, 1), 'keychainDrop');
  collection = declineKeychainDrop(collection, 'rain');
  assert.equal(collection.keychainDecisions.rain, 'declined');
  assert.equal(collection.passes.keychainDrop, 1);
  assert.equal(redeemKeychainDrop(collection, 'rain'), collection);
  assert.equal(declineKeychainDrop(collection, 'rain'), collection);
});

test('ticket redemption is blocked when the natural-failure decision was not persisted', () => {
  const rolled = purchasePass(roll(emptySpecialCollection(), 'rain', 1, 1), 'keychainDrop');
  const withoutDecision = { ...rolled, keychainDecisions: {} };
  assert.equal(redeemKeychainDrop(withoutDecision, 'rain'), withoutDecision);
});

test('cover-change ticket unlocks once and consumes exactly one', () => {
  let collection = grantPass(emptySpecialCollection(), 'coverChange', 2);
  collection = redeemCoverChange(collection, 'sanctuary', { coverExists: true, alreadyOwned: false });
  assert.equal(collection.passes.coverChange, 1);
  const alreadyOwned = redeemCoverChange(collection, 'sanctuary', { coverExists: true, alreadyOwned: true });
  assert.equal(alreadyOwned, collection);
  const missing = redeemCoverChange(collection, 'unknown-route', { coverExists: false, alreadyOwned: false });
  assert.equal(missing, collection);
  const empty = redeemCoverChange(emptySpecialCollection(), 'sanctuary', { coverExists: true, alreadyOwned: false });
  assert.deepEqual(empty.passes, emptySpecialCollection().passes);
});

test('legacy balances survive normalization and are not converted to new tickets', () => {
  const normalized = normalizeSpecialCollection({
    keychains: { star: 2, invalid: -1 },
    passes: { ten: 9, fifty: 4, subscription: true },
    rolls: { rain: { keychain: false, sparkle: false }, star: { keychain: true, sparkle: false } },
  });
  assert.deepEqual(normalized.passes, { coverChange: 0, keychainDrop: 0, ten: 9, fifty: 4, subscription: true });
  assert.equal(normalized.keychainDecisions.rain, 'pending');
  assert.equal(normalized.keychainDecisions.star, 'natural');

  const newTicket = purchasePass(normalized, 'keychainDrop');
  assert.equal(newTicket.passes.keychainDrop, 1);
  assert.equal(newTicket.passes.ten, 9);
  assert.equal(newTicket.passes.fifty, 4);
  assert.equal(newTicket.passes.subscription, true);
});

test('legacy sparkle redemption remains available only through the compatibility API', () => {
  let collection = purchasePass(roll(emptySpecialCollection(), 'rain', 1, 1), 'ten');
  collection = redeemPass(collection, 'rain', 'sparkle');
  assert.equal(collection.sparkles.rain, 1);
  assert.equal(collection.passes.ten, 9);
  assert.equal(collection.passes.keychainDrop, 0);
});
