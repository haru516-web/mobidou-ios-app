import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flapAt, FLAP_STAGGER_MS, glowAt, lidAt, mobbyAt, phaseAt, rollAt, settleAt, T, TOTAL_MS } from '../src/components/gachaTimeline.ts';

test('the phases run in order and the scene ends revealed', () => {
  assert.deepEqual(
    [0, T.roll - 1, T.roll, T.settle, T.lid, T.flaps, T.hold, T.fade].map(phaseAt),
    ['roll', 'roll', 'settle', 'lid', 'flaps', 'hold', 'fade', 'revealed'],
  );
  assert.equal(TOTAL_MS, T.fade);
});

test('the box rolls in from off-screen and comes to rest square on the spot', () => {
  const start = rollAt(0);
  assert.ok(start.x < -3);
  const end = rollAt(T.roll);
  assert.equal(end.x, 0);
  assert.equal(end.hop, 0);
  // Whole turns only, so the box and the Mobby inside it end upright.
  assert.equal(Math.abs(end.rotate) % 360, 0);
  // Moving right the whole way.
  let previous = -Infinity;
  for (let ms = 0; ms <= T.roll; ms += 50) { const { x } = rollAt(ms); assert.ok(x >= previous); previous = x; }
});

test('the settle squash returns to full size', () => {
  assert.equal(settleAt(T.roll), 1);
  assert.ok(settleAt(T.roll + 175) < 1);
  assert.ok(Math.abs(settleAt(T.settle) - 1) < 1e-9);
});

test('the lid stays shut until the box has settled, then turns over', () => {
  assert.equal(lidAt(T.settle - 1), 0);
  assert.equal(lidAt(T.lid), 1);
  assert.ok(lidAt(T.settle + 400) > 0 && lidAt(T.settle + 400) < 1);
});

test('the four sides fall in order, none before the lid is open', () => {
  assert.equal(flapAt(T.lid - 1, 0), 0);
  for (let index = 0; index < 3; index++) {
    const ms = T.lid + 300;
    assert.ok(flapAt(ms, index) >= flapAt(ms, index + 1));
  }
  assert.ok(flapAt(T.lid + FLAP_STAGGER_MS * 3 - 1, 3) === 0);
  for (let index = 0; index < 4; index++) assert.equal(flapAt(T.flaps, index), 1);
});

test('the light is full while the sides fall and only then fades slowly', () => {
  assert.equal(glowAt(0), 0);
  assert.equal(glowAt(T.lid), 1);
  assert.equal(glowAt(T.lid + 500), 1);
  assert.equal(glowAt(T.hold), 1);
  assert.equal(glowAt(T.fade), 0);
  // Monotone fade with no jump.
  let previous = 1;
  for (let ms = T.hold; ms <= T.fade; ms += 50) { const value = glowAt(ms); assert.ok(value <= previous + 1e-9); previous = value; }
});

test('the Mobby stays hidden through the fall and the first half of the fade', () => {
  assert.equal(mobbyAt(T.flaps), 0);
  assert.equal(mobbyAt(T.hold), 0);
  assert.equal(mobbyAt(T.hold + (T.fade - T.hold) / 2), 0);
  assert.equal(mobbyAt(T.fade), 1);
  // By the time it starts to appear the light has already dropped.
  const appearing = T.hold + (T.fade - T.hold) * .6;
  assert.ok(mobbyAt(appearing) > 0);
  assert.ok(glowAt(appearing) < .5);
});
