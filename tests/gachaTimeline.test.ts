import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFTER_OPEN_MS,
  bloomAt,
  burstAt,
  canOpen,
  CHARGE_MS,
  dimAt,
  dustAt,
  FADE_MS,
  flashAt,
  FLASH_MS,
  gatherAt,
  glowAfterOpen,
  glowWhileLifting,
  HAPTIC_BEATS,
  HOLD_MS,
  landingShake,
  MAX_DIM,
  mobbyAfterOpen,
  OPEN_COMMIT,
  phaseOf,
  pillarAt,
  popAt,
  resolveRelease,
  rollAt,
  ROLL_MS,
  rumbleAt,
  SETTLED_AT_MS,
  settleAt,
  silhouetteAt,
  sparklesAt,
} from '../src/components/gachaTimeline.ts';

const BURST = CHARGE_MS;
const FADE_FROM = CHARGE_MS + HOLD_MS;

test('the box rolls and settles by itself, then waits for the player', () => {
  assert.deepEqual([0, ROLL_MS - 1, ROLL_MS, SETTLED_AT_MS - 1, SETTLED_AT_MS, 60000].map(ms => phaseOf(ms, null)), ['roll', 'roll', 'settle', 'settle', 'ready', 'ready']);
});

test('once the board is up the light charges, bursts and holds, fades, then the scene is revealed', () => {
  assert.deepEqual(
    [0, CHARGE_MS - 1, CHARGE_MS, FADE_FROM - 1, FADE_FROM, AFTER_OPEN_MS - 1, AFTER_OPEN_MS].map(openedFor => phaseOf(9999, openedFor)),
    ['charge', 'charge', 'hold', 'hold', 'fade', 'fade', 'revealed'],
  );
  // The whole opening takes its time: several seconds, not a flash.
  assert.ok(AFTER_OPEN_MS >= 6000);
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

test('light leaks out as the board rises, never fills the box early, and does not dip when the board tops out', () => {
  assert.equal(glowWhileLifting(0), 0);
  let previous = -1;
  for (let open = 0; open <= 1; open += 0.05) { const value = glowWhileLifting(open); assert.ok(value >= previous); assert.ok(value < 1); previous = value; }
  assert.ok(glowAfterOpen(0) >= glowWhileLifting(1) - 1e-9);
});

test('while charging the glow climbs and beats, and never reaches the full burst level', () => {
  const values = Array.from({ length: CHARGE_MS / 10 }, (_, i) => glowAfterOpen(i * 10));
  assert.ok(Math.max(...values) < 1);
  assert.ok(glowAfterOpen(CHARGE_MS - 1) > glowAfterOpen(100));
  // Each heartbeat is a sudden rise followed by a fall: count the sudden rises.
  let jumps = 0;
  for (let i = 1; i < values.length; i++) if (values[i] - values[i - 1] > .012) jumps++;
  assert.ok(jumps >= 3);
});

test('at the burst the light is full, held, then fades slowly to nothing', () => {
  assert.equal(glowAfterOpen(BURST), 1);
  assert.equal(glowAfterOpen(FADE_FROM - 1), 1);
  assert.equal(glowAfterOpen(AFTER_OPEN_MS), 0);
  let previous = 1;
  for (let ms = FADE_FROM; ms <= AFTER_OPEN_MS; ms += 50) { const value = glowAfterOpen(ms); assert.ok(value <= previous + 1e-9); previous = value; }
});

test('the Mobby stays hidden through the charge, the hold and the first half of the fade', () => {
  assert.equal(mobbyAfterOpen(0), 0);
  assert.equal(mobbyAfterOpen(FADE_FROM), 0);
  assert.equal(mobbyAfterOpen(FADE_FROM + FADE_MS / 2), 0);
  assert.equal(mobbyAfterOpen(AFTER_OPEN_MS), 1);
  // By the time it starts to appear the light has already dropped.
  const appearing = FADE_FROM + FADE_MS * .6;
  assert.ok(mobbyAfterOpen(appearing) > 0);
  assert.ok(glowAfterOpen(appearing) < .5);
});

test('the room darkens as the board rises and through the charge, and brightens again as the light fades', () => {
  assert.equal(dimAt(0, null), 0);
  assert.ok(dimAt(.5, null) > 0 && dimAt(.5, null) < MAX_DIM);
  assert.ok(dimAt(1, 0) >= dimAt(1, null) - 1e-9);
  assert.ok(dimAt(1, CHARGE_MS - 1) > dimAt(1, 0));
  assert.ok(Math.abs(dimAt(1, BURST) - MAX_DIM) < .01);
  assert.ok(dimAt(1, AFTER_OPEN_MS) < .01);
});

test('the box trembles harder as the board comes up, harder still through the charge, and stops at the burst', () => {
  assert.deepEqual(rumbleAt(0, false, 100), { x: 0, y: 0 });
  assert.ok(Math.abs(rumbleAt(1, false, 17).x) > Math.abs(rumbleAt(.1, false, 17).x));
  assert.ok(Math.abs(rumbleAt(1, true, 17, CHARGE_MS - 1).x) > Math.abs(rumbleAt(1, true, 17, 100).x));
  assert.deepEqual(rumbleAt(1, true, 100, BURST), { x: 0, y: 0 });
});

test('the flash happens at the burst, brightest first, and is gone after its length', () => {
  assert.equal(flashAt(BURST - 1), 0);
  assert.ok(flashAt(BURST) > .9);
  assert.ok(flashAt(BURST + FLASH_MS / 2) < flashAt(BURST));
  assert.equal(flashAt(BURST + FLASH_MS), 0);
});

test('the ray burst starts at the burst, expands while fading out', () => {
  assert.equal(burstAt(BURST - 1).opacity, 0);
  assert.ok(burstAt(BURST).opacity > .99);
  assert.ok(burstAt(BURST + 400).scale > burstAt(BURST).scale);
  assert.ok(burstAt(BURST + 1200).opacity < .01);
});

test('a pillar of light shoots up at the burst, then fades', () => {
  assert.deepEqual(pillarAt(BURST - 1), { height: 0, opacity: 0 });
  assert.ok(pillarAt(BURST + 500).height > .95);
  assert.ok(pillarAt(BURST + 500).opacity > .5);
  assert.ok(pillarAt(BURST + 3000).opacity < .01);
});

test('the glow swells with each heartbeat, then past full at the burst, and settles near full', () => {
  assert.ok(bloomAt(null, 0) < bloomAt(null, 1));
  assert.ok(bloomAt(CHARGE_MS - 1, 1) > bloomAt(0, 1));
  assert.ok(bloomAt(BURST + 200, 1) > 1.1);
  assert.ok(bloomAt(BURST + 3000, 1) < 1.1);
});

test('the white silhouette rises in the charging light, peaks at the burst, and gives way to the colour', () => {
  assert.equal(silhouetteAt(0), 0);
  assert.ok(silhouetteAt(CHARGE_MS * .7) > 0 && silhouetteAt(CHARGE_MS * .7) < silhouetteAt(BURST));
  assert.ok(silhouetteAt(BURST) > .95);
  assert.ok(silhouetteAt(AFTER_OPEN_MS) < .01);
});

test('the Mobby pops past full size once and settles at 1', () => {
  assert.ok(popAt(0) < .7);
  const from = FADE_FROM + FADE_MS * .5;
  const sizes = Array.from({ length: 90 }, (_, i) => popAt(from + i * 10));
  assert.ok(Math.max(...sizes) > 1);
  assert.ok(Math.abs(popAt(AFTER_OPEN_MS) - 1) < .001);
});

test('light is gathered in during the charge: deterministic specks, starting wide, none after the burst', () => {
  assert.deepEqual(gatherAt(0), []);
  assert.deepEqual(gatherAt(1200), gatherAt(1200));
  assert.ok(gatherAt(1200).length > 8);
  assert.deepEqual(gatherAt(BURST), []);
  const radius = (s: { x: number; y: number }) => Math.hypot(s.x, s.y);
  assert.ok(Math.max(...gatherAt(1000).map(radius)) > 1);
  for (const speck of gatherAt(1500)) assert.ok(speck.opacity >= 0 && speck.opacity <= 1 && Number.isFinite(speck.x) && Number.isFinite(speck.y));
});

test('sparkles fly out at the burst, are deterministic, and stay finite', () => {
  assert.deepEqual(sparklesAt(BURST - 1), []);
  assert.deepEqual(sparklesAt(BURST + 1500), sparklesAt(BURST + 1500));
  assert.ok(sparklesAt(BURST + 1500).length > 5);
  assert.deepEqual(sparklesAt(AFTER_OPEN_MS + 5000), []);
  for (const spark of sparklesAt(BURST + 1200)) {
    assert.ok(Number.isFinite(spark.x) && Number.isFinite(spark.y));
    assert.ok(spark.opacity >= 0 && spark.opacity <= 1);
  }
});

test('gold dust falls over the screen while the light fades, and is gone by the end', () => {
  assert.deepEqual(dustAt(0), []);
  const mid = dustAt(FADE_FROM + 1500);
  assert.ok(mid.length > 5);
  for (const flake of mid) assert.ok(flake.x > -.2 && flake.x < 1.2 && flake.y >= -.1 && flake.y <= 1.1 && flake.opacity >= 0 && flake.opacity <= 1);
  assert.deepEqual(dustAt(AFTER_OPEN_MS + 8000), []);
});

test('the landing thud shakes only right after the box stops', () => {
  assert.equal(landingShake(ROLL_MS - 1), 0);
  assert.equal(landingShake(ROLL_MS + 1000), 0);
  assert.ok(Array.from({ length: 40 }, (_, i) => Math.abs(landingShake(ROLL_MS + i * 10))).some(value => value > 1));
});

test('the phone taps on every heartbeat and then hardest at the burst', () => {
  assert.equal(HAPTIC_BEATS.length, 5);
  assert.deepEqual(HAPTIC_BEATS.map(beat => beat.at), [...HAPTIC_BEATS.map(beat => beat.at)].sort((a, b) => a - b));
  const last = HAPTIC_BEATS[HAPTIC_BEATS.length - 1];
  assert.equal(last.at, CHARGE_MS);
  assert.equal(last.strength, 'heavy');
  assert.ok(HAPTIC_BEATS.slice(0, -1).every(beat => beat.at < CHARGE_MS));
});
