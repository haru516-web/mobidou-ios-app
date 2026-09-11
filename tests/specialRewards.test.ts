import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptySpecialCollection, normalizeSpecialCollection, purchasePass, redeemPass, rollSpecialDrop, SPECIAL_DROP_RATE } from '../src/services/specialRewards.ts';

test('special items each use an independent twenty percent roll', () => {
  const values = [SPECIAL_DROP_RATE - 0.01, SPECIAL_DROP_RATE + 0.01];
  const result = rollSpecialDrop(emptySpecialCollection(), 'star', () => values.shift()!);
  assert.deepEqual(result.rolls.star, { keychain: true, sparkle: false });
  assert.equal(result.keychains.star, 1);
  assert.equal(result.sparkles.star, undefined);
});

test('a shrine is rolled only once', () => {
  const first = rollSpecialDrop(emptySpecialCollection(), 'moon', () => 0);
  const repeated = rollSpecialDrop(first, 'moon', () => 1);
  assert.equal(repeated, first);
  assert.equal(repeated.keychains.moon, 1);
  assert.equal(repeated.sparkles.moon, 1);
});

test('temporary purchases add usable pass balances', () => {
  let collection = emptySpecialCollection();
  collection = purchasePass(collection, 'ten');
  collection = purchasePass(collection, 'ten');
  collection = purchasePass(collection, 'fifty');
  collection = purchasePass(collection, 'subscription');
  assert.deepEqual(collection.passes, { ten: 20, fifty: 50, subscription: true });
});

test('a pass can redeem each missed kind once and consumes finite passes first', () => {
  let collection = purchasePass(emptySpecialCollection(), 'ten');
  collection = redeemPass(collection, 'rain', 'keychain');
  collection = redeemPass(collection, 'rain', 'keychain');
  collection = redeemPass(collection, 'rain', 'sparkle');
  assert.equal(collection.keychains.rain, 1);
  assert.equal(collection.sparkles.rain, 1);
  assert.equal(collection.passes.ten, 8);
  assert.deepEqual(collection.rolls.rain, { keychain: true, sparkle: true });
});

test('a duplicate drop increments the existing shrine item count', () => {
  const previous = { ...emptySpecialCollection(), keychains: { rain: 1 } };
  const collection = rollSpecialDrop(previous, 'rain', () => 0);
  assert.equal(collection.keychains.rain, 2);
  assert.equal(collection.sparkles.rain, 1);
});

test('subscription redemptions never reduce finite pass balances', () => {
  let collection = purchasePass(purchasePass(emptySpecialCollection(), 'fifty'), 'subscription');
  collection = redeemPass(collection, 'forest', 'sparkle');
  assert.equal(collection.passes.fifty, 50);
  assert.equal(collection.passes.subscription, true);
  assert.equal(collection.sparkles.forest, 1);
});

test('saved inventory normalization rejects invalid quantities', () => {
  const normalized = normalizeSpecialCollection({
    keychains: { star: 2, moon: -1, rain: 1.5 },
    sparkles: { forest: 3 },
    passes: { ten: 9, fifty: -4, subscription: true },
    rolls: { star: { keychain: true, sparkle: false } },
  });
  assert.deepEqual(normalized.keychains, { star: 2 });
  assert.deepEqual(normalized.sparkles, { forest: 3 });
  assert.deepEqual(normalized.passes, { ten: 9, fifty: 0, subscription: true });
  assert.deepEqual(normalized.rolls.star, { keychain: true, sparkle: false });
});
