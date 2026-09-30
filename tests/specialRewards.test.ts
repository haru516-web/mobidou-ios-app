import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptySpecialCollection,
  finishArrival,
  grantPass,
  KEYCHAIN_BASE_RATE,
  KEYCHAIN_PLAN_RATE,
  keychainRate,
  normalizeSpecialCollection,
  ownsKeychain,
  redeemKeychainTicket,
  rollKeychainOnArrival,
} from '../src/services/specialRewards.ts';

const fixed = (value: number) => () => value;

test('the rate is ten percent without a plan and fifty percent with one', () => {
  assert.equal(keychainRate('none'), KEYCHAIN_BASE_RATE);
  assert.equal(keychainRate('light'), KEYCHAIN_PLAN_RATE);
  assert.equal(keychainRate('plus'), KEYCHAIN_PLAN_RATE);
});

test('the drop uses an exact boundary at the base rate', () => {
  assert.equal(ownsKeychain(rollKeychainOnArrival(emptySpecialCollection(), 'star', 'none', fixed(KEYCHAIN_BASE_RATE - 0.0001)), 'star'), true);
  assert.equal(ownsKeychain(rollKeychainOnArrival(emptySpecialCollection(), 'star', 'none', fixed(KEYCHAIN_BASE_RATE)), 'star'), false);
});

test('a plan raises the chance for the same roll', () => {
  const roll = fixed(0.4);
  assert.equal(ownsKeychain(rollKeychainOnArrival(emptySpecialCollection(), 'star', 'none', roll), 'star'), false);
  assert.equal(ownsKeychain(rollKeychainOnArrival(emptySpecialCollection(), 'star', 'light', roll), 'star'), true);
});

test('arriving with the keychain already owned never rolls', () => {
  const owned = rollKeychainOnArrival(emptySpecialCollection(), 'star', 'none', fixed(0));
  const later = rollKeychainOnArrival(finishArrival(owned), 'star', 'none', () => { throw new Error('must not roll'); });
  assert.equal(later.arrival?.outcome, 'owned');
  assert.equal(later.keychains.star, 1);
});

test('a keychain is never held twice', () => {
  const first = finishArrival(rollKeychainOnArrival(emptySpecialCollection(), 'star', 'none', fixed(0)));
  const second = rollKeychainOnArrival(first, 'star', 'plus', fixed(0));
  assert.equal(second.keychains.star, 1);
});

test('a miss at one arrival does not stop a later arrival from rolling again', () => {
  const missed = finishArrival(rollKeychainOnArrival(emptySpecialCollection(), 'rain', 'none', fixed(0.99)));
  assert.equal(ownsKeychain(missed, 'rain'), false);
  assert.equal(ownsKeychain(rollKeychainOnArrival(missed, 'rain', 'none', fixed(0)), 'rain'), true);
});

test('the same ceremony is rolled once even if it renders twice', () => {
  const once = rollKeychainOnArrival(emptySpecialCollection(), 'rain', 'none', fixed(0.99));
  const again = rollKeychainOnArrival(once, 'rain', 'none', fixed(0));
  assert.equal(again, once);
  assert.equal(ownsKeychain(again, 'rain'), false);
});

test('a ticket turns the miss on screen into a keychain and is spent once', () => {
  const missed = rollKeychainOnArrival(grantPass(emptySpecialCollection(), 'keychainDrop', 2), 'rain', 'none', fixed(0.99));
  const used = redeemKeychainTicket(missed, 'rain');
  assert.equal(used.keychains.rain, 1);
  assert.equal(used.passes.keychainDrop, 1);
  assert.equal(used.arrival?.outcome, 'ticket');
  assert.equal(redeemKeychainTicket(used, 'rain'), used);
});

test('a ticket cannot be used without a ticket, on a win, on another shrine, or after the ceremony', () => {
  const missedNoTicket = rollKeychainOnArrival(emptySpecialCollection(), 'rain', 'none', fixed(0.99));
  assert.equal(redeemKeychainTicket(missedNoTicket, 'rain'), missedNoTicket);

  const stocked = grantPass(emptySpecialCollection(), 'keychainDrop');
  const won = rollKeychainOnArrival(stocked, 'rain', 'none', fixed(0));
  assert.equal(redeemKeychainTicket(won, 'rain'), won);

  const missed = rollKeychainOnArrival(stocked, 'rain', 'none', fixed(0.99));
  assert.equal(redeemKeychainTicket(missed, 'star'), missed);

  const closed = finishArrival(missed);
  assert.equal(redeemKeychainTicket(closed, 'rain'), closed);
  assert.equal(closed.passes.keychainDrop, 1);
});

test('grantPass ignores unknown kinds and non-positive amounts', () => {
  const empty = emptySpecialCollection();
  assert.equal(grantPass(empty, 'keychainDrop', 0), empty);
  assert.equal(grantPass(empty, 'keychainDrop', -3), empty);
  assert.equal(grantPass(empty, 'coverChange' as never), empty);
  assert.equal(grantPass(empty, 'keychainDrop', 3).passes.keychainDrop, 3);
});

test('legacy saves keep their keychains (capped at one) and tickets, and drop the retired fields', () => {
  const restored = normalizeSpecialCollection({
    keychains: { star: 3, moon: 1, bad: 0 },
    sparkles: { star: 2 },
    rolls: { star: { keychain: true, sparkle: true } },
    keychainDecisions: { rain: 'pending' },
    passes: { coverChange: 4, keychainDrop: 2, ten: 5, fifty: 1, subscription: true },
  });
  assert.deepEqual(restored.keychains, { star: 1, moon: 1 });
  assert.deepEqual(restored.sparkles, { star: 1 });
  assert.deepEqual(restored.passes, { keychainDrop: 2 });
  assert.equal(restored.arrival, null);
  assert.equal('rolls' in restored, false);
});

test('a malformed or missing collection normalizes to empty', () => {
  assert.deepEqual(normalizeSpecialCollection(null), emptySpecialCollection());
  assert.deepEqual(normalizeSpecialCollection('nope'), emptySpecialCollection());
  assert.equal(normalizeSpecialCollection({ arrival: { shrineId: 3, outcome: 'won' } }).arrival, null);
  assert.equal(normalizeSpecialCollection({ arrival: { shrineId: 'star', outcome: 'jackpot' } }).arrival, null);
});

test('a persisted arrival survives normalization so a restart cannot re-roll', () => {
  const missed = rollKeychainOnArrival(emptySpecialCollection(), 'rain', 'none', fixed(0.99));
  const restored = normalizeSpecialCollection(JSON.parse(JSON.stringify(missed)));
  assert.deepEqual(restored.arrival, missed.arrival);
  assert.equal(rollKeychainOnArrival(restored, 'rain', 'none', fixed(0)), restored);
});
