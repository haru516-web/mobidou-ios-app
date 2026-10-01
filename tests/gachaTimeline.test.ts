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
  MA_MS,
  maAt,
  MAX_DIM,
  tempoAt,
  MIE_MS,
  mobbyAfterOpen,
  blossomsAt,
  confettiAt,
  CONFETTI_COLORS,
  fallAt,
  lightTintAt,
  motesAt,
  seasonRateAt,
  shimmerAt,
  OPEN_COMMIT,
  phaseOf,
  pillarAt,
  popAt,
  resolveRelease,
  curtainAt,
  CURTAIN_MS,
  INTRO_END_MS,
  UNLOAD_END_MS,
  ROLL_MS,
  rumbleAt,
  SETTLED_AT_MS,
  settleAt,
  silhouetteAt,
  sparklesAt,
} from '../src/components/gachaTimeline.ts';

const BURST = CHARGE_MS;
const FADE_FROM = CHARGE_MS + HOLD_MS;

test('the curtain opens, the box is brought in and lands, then the scene waits for the player', () => {
  assert.deepEqual([0, CURTAIN_MS - 1, CURTAIN_MS, ROLL_MS - 1, ROLL_MS, SETTLED_AT_MS - 1, SETTLED_AT_MS, 60000].map(ms => phaseOf(ms, null)), ['curtain', 'curtain', 'roll', 'roll', 'settle', 'settle', 'ready', 'ready']);
  // The carrier leaves after the box has landed, and the player need not wait for that.
  assert.ok(ROLL_MS < UNLOAD_END_MS && UNLOAD_END_MS < INTRO_END_MS);
});

test('once the board is up the light charges, bursts and holds, fades, then the scene is revealed', () => {
  assert.deepEqual(
    [0, CHARGE_MS - 1, CHARGE_MS, FADE_FROM - 1, FADE_FROM, AFTER_OPEN_MS - 1, AFTER_OPEN_MS].map(openedFor => phaseOf(9999, openedFor)),
    ['charge', 'charge', 'hold', 'hold', 'fade', 'fade', 'revealed'],
  );
  // The whole opening takes its time: several seconds, not a flash.
  assert.ok(AFTER_OPEN_MS >= 6000);
});

test('the curtain starts shut, opens smoothly and stays open', () => {
  assert.equal(curtainAt(0), 0);
  assert.equal(curtainAt(CURTAIN_MS), 1);
  assert.equal(curtainAt(CURTAIN_MS * 5), 1);
  let previous = -Infinity;
  for (let ms = 0; ms <= CURTAIN_MS; ms += 25) { const open = curtainAt(ms); assert.ok(open >= previous); previous = open; }
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
  assert.ok(glowAfterOpen(CHARGE_MS - MA_MS - 1) > glowAfterOpen(100));
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
  assert.ok(Math.abs(rumbleAt(1, true, 17, CHARGE_MS - MA_MS - 1).x) > Math.abs(rumbleAt(1, true, 17, 100).x));
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
  assert.ok(bloomAt(CHARGE_MS - MA_MS - 1, 1) > bloomAt(0, 1));
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
  assert.equal(HAPTIC_BEATS.length, 6);
  assert.deepEqual(HAPTIC_BEATS.map(beat => beat.at), [...HAPTIC_BEATS.map(beat => beat.at)].sort((a, b) => a - b));
  const strike = HAPTIC_BEATS.find(beat => beat.at === CHARGE_MS)!;
  assert.equal(strike.strength, 'heavy');
  assert.ok(HAPTIC_BEATS.filter(beat => beat.at < CHARGE_MS).every(beat => beat.at < CHARGE_MS - MA_MS));
  assert.ok(HAPTIC_BEATS.filter(beat => beat.at > CHARGE_MS).length === 1);
});

test('the light keeps moving on its own, like a candle: a gentle waver that never settles and never strobes', () => {
  const values = Array.from({ length: 400 }, (_, i) => shimmerAt(i * 50));
  assert.ok(Math.min(...values) > .9 && Math.max(...values) < 1.1);
  assert.ok(Math.max(...values) - Math.min(...values) > .03);
  // No jump from one frame to the next that the eye could take for a flash.
  for (let i = 1; i < values.length; i++) assert.ok(Math.abs(values[i] - values[i - 1]) < .03);
  assert.deepEqual(motesAt(1000, 0), []);
  assert.notDeepEqual(motesAt(1000, .5), motesAt(4000, .5));
  for (const mote of motesAt(3000, 1)) assert.ok(mote.opacity >= 0 && mote.opacity <= 1 && mote.size < .2);
});

test('the light is a soft gold while the box waits, then takes the pale colour of each season as the year turns', () => {
  assert.deepEqual(lightTintAt(null, 2), lightTintAt(CHARGE_MS - 1, 2));
  const after = (season: number) => lightTintAt(AFTER_OPEN_MS, season);
  assert.notDeepEqual(after(0), after(1));
  assert.notDeepEqual(after(1), after(2));
  assert.notDeepEqual(after(2), after(3));
  // The turn is gradual: a small step in season is a small step in colour.
  const gap = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  for (let s = 0; s < 4; s += .05) assert.ok(gap(after(s), after(s + .05)) < 12);
  // Low saturation: never a loud colour.
  for (let s = 0; s < 4; s += .25) assert.ok(Math.max(...after(s)) - Math.min(...after(s)) < 90);
});

test('cherry petals are blown out at the burst and are all gone long before the opening ends', () => {
  const origin = { x: .5, y: .5 };
  assert.deepEqual(blossomsAt(BURST - 1, origin), []);
  assert.ok(blossomsAt(BURST + 1500, origin).length > 10);
  assert.deepEqual(blossomsAt(BURST + 1500, origin), blossomsAt(BURST + 1500, origin));
  for (let ms = BURST; ms <= AFTER_OPEN_MS; ms += 100) {
    for (const p of blossomsAt(ms, origin)) assert.ok([p.x, p.y, p.size, p.rotate, p.flip].every(Number.isFinite) && p.opacity >= 0 && p.opacity <= 1);
  }
  assert.deepEqual(blossomsAt(BURST + 5000, origin), []);
});

test('a whole year passes in the moment of the meeting, then the seasons keep turning slowly', () => {
  assert.equal(seasonRateAt(null), 0);
  assert.equal(seasonRateAt(CHARGE_MS - 1), 0);
  let year = 0;
  for (let ms = CHARGE_MS; ms < AFTER_OPEN_MS; ms++) year += seasonRateAt(ms);
  assert.ok(Math.abs(year - 4) < .01);
  assert.ok(seasonRateAt(AFTER_OPEN_MS) > 0 && seasonRateAt(AFTER_OPEN_MS) < seasonRateAt(CHARGE_MS));
});

test('what falls follows the season: petals in spring, fireflies in summer, maple leaves in autumn, snow in winter, and never a hard switch', () => {
  const kinds = (season: number) => new Set(fallAt(5000, season, 0, 60).map(f => f.kind));
  assert.deepEqual([...kinds(0)], [0]);
  assert.deepEqual([...kinds(1)], [1]);
  assert.deepEqual([...kinds(2)], [2]);
  assert.deepEqual([...kinds(3)], [3]);
  // Between two seasons both are falling at once.
  assert.deepEqual([...kinds(.8)].sort(), [0, 1]);
  for (const f of fallAt(1234, 2.2, .0005)) assert.ok([f.x, f.y, f.size, f.rotate, f.flip].every(Number.isFinite) && f.opacity >= 0 && f.opacity <= 1);
  assert.notDeepEqual(fallAt(0, 0, 0), fallAt(3000, 0, 0));
});

test('MA: just before the burst the light is drawn in and everything goes quiet, so the burst lands from silence', () => {
  const before = CHARGE_MS - MA_MS - 1;
  assert.equal(maAt(before), 0);
  assert.ok(maAt(CHARGE_MS - 1) > .99);
  assert.equal(maAt(CHARGE_MS), 0);
  assert.ok(glowAfterOpen(CHARGE_MS - 1) < glowAfterOpen(before) * .5);
  const still = rumbleAt(1, true, 17, CHARGE_MS - 20);
  assert.ok(Math.abs(still.x) < .01 && Math.abs(still.y) < .01);
  assert.deepEqual(gatherAt(CHARGE_MS - 20).filter(speck => speck.opacity > .05), []);
  // No heartbeat falls inside the silence.
  assert.ok(HAPTIC_BEATS.every(beat => beat.at <= before || beat.at >= CHARGE_MS));
});

test('JO-HA-KYU: one tempo for the whole scene, slow while waiting, ever faster, still at the pose, then a quiet afterglow', () => {
  const waiting = tempoAt(null, 0);
  assert.ok(waiting < 1);
  assert.ok(tempoAt(null, 1) > waiting);
  const ha = Array.from({ length: 10 }, (_, i) => tempoAt(i * 200, 1));
  for (let i = 1; i < ha.length; i++) assert.ok(ha[i] > ha[i - 1]);
  assert.ok(tempoAt(CHARGE_MS - 20, 1) < .3);
  assert.ok(tempoAt(CHARGE_MS + MIE_MS / 2, 1) < .1);
  assert.ok(tempoAt(CHARGE_MS + MIE_MS + 300, 1) > 1);
  assert.ok(tempoAt(AFTER_OPEN_MS, 1) < .5);
});

test('paper confetti is thrown up at the burst in many colours, and is all gone long before the opening ends', () => {
  const origin = { x: .5, y: .5 };
  assert.deepEqual(confettiAt(BURST - 1, origin), []);
  assert.ok(confettiAt(BURST + 1500, origin).length > 20);
  assert.deepEqual(confettiAt(BURST + 1500, origin), confettiAt(BURST + 1500, origin));
  const colours = new Set<number>();
  for (let ms = BURST; ms <= AFTER_OPEN_MS; ms += 100) {
    for (const p of confettiAt(ms, origin)) {
      assert.ok([p.x, p.y, p.size, p.rotate, p.flip].every(Number.isFinite) && p.opacity >= 0 && p.opacity <= 1 && p.tone >= 0 && p.tone < 1);
      colours.add(Math.floor(p.tone * CONFETTI_COLORS.length));
    }
  }
  assert.ok(colours.size >= 7);
  assert.deepEqual(confettiAt(BURST + 6000, origin), []);
});
