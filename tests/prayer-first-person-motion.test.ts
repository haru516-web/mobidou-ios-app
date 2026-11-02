import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { armPose, cameraLayers, clapFrame } from '../src/data/prayerFirstPersonMotion.ts';
import { walkSourcePoint } from '../src/data/prayerWalkGeometry.ts';

test('the rear arm is outside the view and left/right alternate through every stride', () => {
  for (let ms = 0; ms <= 4640; ms += 4) {
    const left = armPose(ms, 0), right = armPose(ms, 1);
    assert.ok(!(left.visible && right.visible), `both arms visible at ${ms}ms`);
  }
  assert.equal(armPose(290, 0).visible, true);
  assert.equal(armPose(290, 1).visible, false);
  assert.equal(armPose(870, 0).visible, false);
  assert.equal(armPose(870, 1).visible, true);
});
test('adjacent actions end and start at the same camera direction and scale', () => {
  const endpoint = (index: number, p: number) => {
    const visible = cameraLayers(index, p)[0];
    const file = `${visible.series}-${String(Math.round(visible.frame)).padStart(3, '0')}.jpg`;
    return createHash('sha256').update(readFileSync(new URL('../assets/prayer-first-person/flat-frames/' + file, import.meta.url))).digest('hex');
  };
  for (let i = 0; i < 13; i++) {
    assert.equal(endpoint(i, 1), endpoint(i + 1, 0), `camera image changes at ${i} -> ${i + 1}`);
  }
});
test('walking selects only forward-facing walk frames, never turning or panorama frames', () => {
  for (const [index, series] of [[0, 'entryWalk'], [2, 'approachWalk'], [9, 'returnWalk'], [13, 'exitWalk']] as const) {
    for (let i = 0; i <= 100; i++) {
      const layers = cameraLayers(index, i / 100);
      assert.equal(layers.length, 1);
      assert.equal(layers[0].series, series);
      assert.equal(layers[0].opacity, 1);
      assert.equal(layers[0].zoom, 1);
    }
  }
});
test('clap lowers to neutral and prayer stays in contact without a time limit', () => {
  assert.equal(clapFrame(0, 1100, false), 0);
  assert.equal(clapFrame(1100, 1100, false), 0);
  assert.equal(clapFrame(600, 600, true), 5);
  assert.equal(clapFrame(300000, 600, true), 5);
});
test('the first clap reaches contact once and never crosses contact again while lowering', () => {
  let contacts = 0, wasTouching = false, previous = 5;
  for (let ms = 0; ms <= 1100; ms++) {
    const frame = clapFrame(ms, 1100, false), touching = frame >= 4.99;
    if (touching && !wasTouching) contacts++;
    wasTouching = touching;
    if (ms >= 594) { assert.ok(frame <= previous + 1e-9); previous = frame; }
    assert.ok(frame <= 5);
  }
  assert.equal(contacts, 1);
});
test('walking zoom keeps the path vanishing point fixed and scales both sides symmetrically', () => {
  const width = 1024, height = 1536, w = 448, h = 672;
  const expected = walkSourcePoint(w / 2, h * .64, width, height, w, h, 1);
  for (const zoom of [1, 1.12, 1.25, 1.5, 1.65]) {
    assert.deepEqual(walkSourcePoint(w / 2, h * .64, width, height, w, h, zoom), expected);
    const left = walkSourcePoint(w / 2 - 100, h * .64, width, height, w, h, zoom);
    const right = walkSourcePoint(w / 2 + 100, h * .64, width, height, w, h, zoom);
    assert.ok(Math.abs(expected.x - left.x - (right.x - expected.x)) < 1e-9);
  }
});
