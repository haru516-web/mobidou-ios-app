import assert from 'node:assert/strict';
import test from 'node:test';

import { layoutMenuSlots } from '../src/components/mobbyMenuLayout.ts';

const ITEM = { itemWidth: 82, itemHeight: 92, radius: 134 };
const MOBBY = 88;

const screens = [
  { width: 375, height: 812, bottomInset: 92 },
  { width: 390, height: 844, bottomInset: 96 },
  { width: 320, height: 568, bottomInset: 84 },
  { width: 430, height: 932, bottomInset: 100 },
];

function overlaps(a: { left: number; top: number; width: number; height: number }, b: { left: number; top: number; width: number; height: number }) {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

for (const count of [3, 4, 5, 6]) {
  test(`menu of ${count} never overlaps itself, Mobby or the screen edges`, () => {
    // Six 82x92 buttons can't all clear Mobby in the middle of a 320x568 screen; the app uses four.
    for (const screen of screens.filter(entry => count < 6 || entry.height >= 800)) {
      for (let x = 8; x <= screen.width - MOBBY - 8; x += 29) {
        for (let y = 64; y <= screen.height - screen.bottomInset - MOBBY; y += 41) {
          const slots = layoutMenuSlots({ mobby: { x, y, size: MOBBY }, screen: { width: screen.width, height: screen.height }, bottomInset: screen.bottomInset, count, ...ITEM });
          assert.equal(slots.length, count);
          const boxes = slots.map(slot => ({ ...slot, width: ITEM.itemWidth, height: ITEM.itemHeight }));
          const where = `${screen.width}x${screen.height} mobby (${x}, ${y})`;
          boxes.forEach((box, i) => {
            assert.ok(box.left >= 4 && box.left + box.width <= screen.width - 4, `${where}: item ${i} leaves the sides`);
            assert.ok(box.top >= 0 && box.top + box.height <= screen.height - screen.bottomInset, `${where}: item ${i} leaves the top or runs under the tab bar`);
            assert.ok(!overlaps(box, { left: x, top: y, width: MOBBY, height: MOBBY }), `${where}: item ${i} covers Mobby`);
            boxes.slice(i + 1).forEach((other, k) => assert.ok(!overlaps(box, other), `${where}: items ${i} and ${i + 1 + k} overlap`));
          });
        }
      }
    }
  });
}
