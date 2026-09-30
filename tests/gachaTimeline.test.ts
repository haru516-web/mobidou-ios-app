import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFTER_OPEN_MS,
  canOpen,
  FADE_MS,
  glowAfterOpen,
  glowWhileLifting,
  HOLD_MS,
  mobbyAfterOpen,
  OPEN_COMMIT,
  phaseOf,
  resolveRelease,
  rollAt,
  ROLL_MS,
  SETTLED_AT_MS,
  settleAt,
} from '../src/components/gachaTimeline.ts';

test('the box rolls and settles by itself, then waits for the player', () => {
  assert.deepEqual([0, ROLL_MS - 1, ROLL_MS, SETTLED_AT_MS - 1, SETTLED_AT_MS, 60000].map(ms => phaseOf(ms, null)), ['roll', 'roll', 'settle', 'settle', 'ready', 'ready']);
});

test('after the board is up the light holds, fades, then the scene is revealed', () => {
  assert.deepEqual([0, HOLD_MS - 1, HOLD_MS, AFTER_OPEN_MS - 1, AFTER_OPEN_MS].map(openedFor => phaseOf(9999, openedFor)), ['hold', 'hold', 'fade', 'fade', 'revealed']);
});

test('the box rolls in from off-screen and comes to rest on the spot', () => {
  assert.ok(rollAt(0).x < -3);
  const end = rollAt(ROLL_MS);
  assert.equal(end.x, 0);
  assert.equal(end.hop, 0);
  // Whole turns only, so the box and its front board end the right way up.
  assert.equal(Math.abs(end.rotate) % 360, 0);
  let previous = -Infinity;
  for (let ms = 0; ms <= ROLL_MS; ms += 50) { const { x } = rollAt(ms); assert.ok(x >= previous); previous = x; }
});

test('the settle squash returns to full size', () => {
  assert.equal(settleAt(ROLL_MS), 1);
  assert.ok(settleAt(ROLL_MS + 175) < 1);
  assert.ok(Math.abs(settleAt(SETTLED_AT_MS) - 1) < 1e-9);
});

test('the board can only be touched once the box has come to rest', () => {
  assert.equal(canOpen(0), false);
  assert.equal(canOpen(SETTLED_AT_MS - 1), false);
  assert.equal(canOpen(SETTLED_AT_MS), true);
});

test('letting go past the commit point opens the box and short of it shuts it', () => {
  assert.equal(resolveRelease(0), 'close');
  assert.equal(resolveRelease(OPEN_COMMIT - 0.01), 'close');
  assert.equal(resolveRelease(OPEN_COMMIT), 'open');
  assert.equal(resolveRelease(1), 'open');
});

test('light leaks out as the board rises, but never fills the box before it is fully up', () => {
  assert.equal(glowWhileLifting(0), 0);
  let previous = -1;
  for (let open = 0; open <= 1; open += 0.05) { const value = glowWhileLifting(open); assert.ok(value >= previous); assert.ok(value < 1); previous = value; }
  assert.ok(glowWhileLifting(1) < glowAfterOpen(HOLD_MS - 1) + 1e-9 || glowAfterOpen(0) >= glowWhileLifting(1));
  // No dip when the board reaches the top.
  assert.ok(glowAfterOpen(0) >= glowWhileLifting(1) - 1e-9);
});

test('once fully up the light is full, held, then fades slowly to nothing', () => {
  assert.equal(glowAfterOpen(HOLD_MS - 1) > .99, true);
  assert.equal(glowAfterOpen(HOLD_MS), 1);
  assert.equal(glowAfterOpen(AFTER_OPEN_MS), 0);
  let previous = 1;
  for (let ms = HOLD_MS; ms <= AFTER_OPEN_MS; ms += 50) { const value = glowAfterOpen(ms); assert.ok(value <= previous + 1e-9); previous = value; }
});

test('the Mobby stays hidden through the hold and the first half of the fade', () => {
  assert.equal(mobbyAfterOpen(0), 0);
  assert.equal(mobbyAfterOpen(HOLD_MS), 0);
  assert.equal(mobbyAfterOpen(HOLD_MS + FADE_MS / 2), 0);
  assert.equal(mobbyAfterOpen(AFTER_OPEN_MS), 1);
  // By the time it starts to appear the light has already dropped.
  const appearing = HOLD_MS + FADE_MS * .6;
  assert.ok(mobbyAfterOpen(appearing) > 0);
  assert.ok(glowAfterOpen(appearing) < .5);
});
