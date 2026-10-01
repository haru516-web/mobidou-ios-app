import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carrierAt, dustFrameAt, placeBox, type CartAnchors } from '../src/components/gachaCart.ts';
import { INTRO_END_MS, ROLL_MS, SLIDE_START_MS, UNLOAD_END_MS, UNLOAD_START_MS, WALK_START_MS } from '../src/components/gachaTimeline.ts';

const anchors: CartAnchors = JSON.parse(readFileSync('assets/gacha/cart/anchors.json', 'utf8'));
const ENTRY = -900;
const EXIT = 700;

test('the anchors file has eight frames per sheet', () => {
  assert.equal(anchors.walk.length, 8);
  assert.equal(anchors.unload.length, 8);
});

test('the carrier comes in from the left, stops, and ends up at the stopping place', () => {
  assert.equal(carrierAt(0, anchors, ENTRY, EXIT).dx, ENTRY);
  const stopped = carrierAt(UNLOAD_START_MS, anchors, ENTRY, EXIT);
  assert.equal(stopped.sheet, 'unload');
  assert.equal(stopped.dx, 0);
  let previous = -Infinity;
  for (let ms = WALK_START_MS; ms < UNLOAD_START_MS; ms += 20) { const { dx } = carrierAt(ms, anchors, ENTRY, EXIT); assert.ok(dx >= previous); previous = dx; }
});

test('the unload starts from the walk pose and the box rides on the bed until it is let go', () => {
  const walkStart = carrierAt(WALK_START_MS, anchors, ENTRY, EXIT);
  assert.equal(walkStart.frame, 0);
  assert.deepEqual(carrierAt(UNLOAD_START_MS, anchors, ENTRY, EXIT).box, { x: anchors.unload[0].bedX, y: anchors.unload[0].bedY, angle: 0 });
  assert.equal(carrierAt(SLIDE_START_MS - 1, anchors, ENTRY, EXIT).landed, false);
});

test('the box slides down to the floor spot and stays there while the carrier leaves', () => {
  const landed = carrierAt(ROLL_MS, anchors, ENTRY, EXIT);
  assert.equal(landed.landed, true);
  assert.deepEqual(landed.box, { x: anchors.slideEnd.x, y: anchors.slideEnd.y, angle: 0 });
  for (const ms of [UNLOAD_END_MS - 1, UNLOAD_END_MS + 400, INTRO_END_MS - 1, INTRO_END_MS + 5000]) assert.deepEqual(carrierAt(ms, anchors, ENTRY, EXIT).box, landed.box);
  assert.equal(carrierAt(INTRO_END_MS, anchors, ENTRY, EXIT).sheet, null);
  // While sliding, the box moves toward the floor and straightens up.
  const mid = carrierAt((SLIDE_START_MS + ROLL_MS) / 2, anchors, ENTRY, EXIT).box;
  assert.ok(mid.y > anchors.unload[5].bedY && mid.y < anchors.slideEnd.y);
  assert.ok(Math.abs(mid.angle) < Math.abs(anchors.unload[5].bedAngle));
});

test('the dust plays eight frames after the landing and then stops', () => {
  assert.equal(dustFrameAt(-1), null);
  assert.equal(dustFrameAt(0), 0);
  assert.equal(dustFrameAt(10_000), null);
});

test('an upright box stands on its pivot; a tilted one swings about it', () => {
  assert.deepEqual(placeBox({ x: 100, y: 300 }, 0, 80, 120), { left: 60, top: 180, rotate: -0 });
  const tilted = placeBox({ x: 100, y: 300 }, 20, 80, 120);
  assert.equal(tilted.rotate, -20);
  // Right side up means the top leans left (the box turns counter-clockwise).
  assert.ok(tilted.left + 40 < 100);
});
