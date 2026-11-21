import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomArtGeometry } from '../src/components/collectionRoomArt.ts';

test('rail and shelf fit the measured content, including short compatibility windows and taller navigation', () => {
  for (const [width, height] of [[320, 480], [375, 568], [375, 667], [390, 844], [820, 1180], [1180, 820]]) {
    for (const safeTop of [0, 24, 59]) {
      for (const navHeight of [85, 120, 150]) {
        const bounds = { top: safeTop + 64, bottom: height - navHeight - 12 };
        const art = roomArtGeometry(Math.min(480, width), height, bounds);
        assert.ok(art.railY >= bounds.top + Math.min(112, (bounds.bottom - bounds.top) * .35) - .001);
        assert.ok(art.shelfY <= bounds.bottom - 12 + .001);
        assert.ok(art.shelfY > art.railY);
      }
    }
  }
});

test('moving the content origin also moves the art, without using global window coordinates', () => {
  const first = roomArtGeometry(375, 568, { top: 64, bottom: 400 });
  const shifted = roomArtGeometry(375, 568, { top: 88, bottom: 424 });
  assert.ok(Math.abs(shifted.railY - first.railY - 24) < .001);
  assert.ok(Math.abs(shifted.shelfY - first.shelfY - 24) < .001);
});
