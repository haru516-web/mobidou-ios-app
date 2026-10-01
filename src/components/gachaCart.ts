/**
 * Where the carrier Mobby, the cart and the box are at any moment of the introduction.
 *
 * Everything here is in the carrier sheets' own pixels (a 768 × 512 cell, see assets/gacha/cart/anchors.json), measured
 * from where the cell sits once the cart has stopped, so the scene only has to scale and place it. Nothing here draws.
 */
import { EXIT_MS, SLIDE_MS, SLIDE_START_MS, UNLOAD_END_MS, UNLOAD_FRAME_MS, UNLOAD_START_MS, WALK_FRAME_MS, WALK_MS, WALK_START_MS } from './gachaTimeline.ts';

export type Bed = { bedX: number; bedY: number; bedAngle: number };
export type CartAnchors = {
  cell: { width: number; height: number };
  groundLine: number;
  walk: readonly Bed[];
  unload: readonly Bed[];
  /** The box as it sits on the cart, in cell pixels. */
  box: { width: number; height: number };
  /** Bottom centre of the box once it has slid to the floor. */
  slideEnd: { x: number; y: number };
};

export type CarrierState = {
  /** Which sheet the frame is on; `null` when the carrier is out of the picture. */
  sheet: 'walk' | 'unload' | null;
  frame: number;
  /** How far the cell is from its stopping place, in cell pixels (negative = still to the left). */
  dx: number;
  /** The cart's bed in cell pixels from the stopping place, for the shadow under the cart. */
  bedX: number;
  /** Bottom centre of the box and its tilt in degrees (positive = right side up), or null once it is not shown. */
  box: { x: number; y: number; angle: number };
  landed: boolean;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeIn = (t: number) => t * t;
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * `entryDx` and `exitDx` are how far (cell pixels) the cell must be from its stopping place for the carrier to be
 * entirely off the left and the right edge of the screen.
 */
export function carrierAt(ms: number, anchors: CartAnchors, entryDx: number, exitDx: number): CarrierState {
  const { walk, unload, slideEnd } = anchors;
  const onBed = (bed: Bed, dx: number) => ({ x: bed.bedX + dx, y: bed.bedY, angle: bed.bedAngle });
  const floor = { x: slideEnd.x, y: slideEnd.y, angle: 0 };

  if (ms < WALK_START_MS + WALK_MS) {
    const t = clamp01((ms - WALK_START_MS) / WALK_MS);
    const frame = Math.floor(Math.max(0, ms - WALK_START_MS) / WALK_FRAME_MS) % walk.length;
    const dx = lerp(entryDx, 0, t);
    return { sheet: 'walk', frame, dx, bedX: walk[frame].bedX + dx, box: onBed(walk[frame], dx), landed: false };
  }

  if (ms < UNLOAD_END_MS) {
    const frame = Math.min(unload.length - 1, Math.floor((ms - UNLOAD_START_MS) / UNLOAD_FRAME_MS));
    const dx = frame === unload.length - 1 ? unload[frame - 1].bedX - unload[frame].bedX : 0;
    const slide = clamp01((ms - SLIDE_START_MS) / SLIDE_MS);
    const letGo = unload[5];
    const box = ms < SLIDE_START_MS
      ? onBed(unload[frame], 0)
      : { x: lerp(letGo.bedX, floor.x, easeIn(slide)), y: lerp(letGo.bedY, floor.y, easeIn(slide)), angle: lerp(letGo.bedAngle, 0, easeIn(slide)) };
    return { sheet: 'unload', frame, dx, bedX: unload[frame].bedX + dx, box, landed: slide >= 1 };
  }

  // The last unload frame is drawn with the cart where the previous one had it, so the cart does not jump back onto the box.
  const carried = unload[unload.length - 2].bedX - unload[unload.length - 1].bedX;
  const t = clamp01((ms - UNLOAD_END_MS) / EXIT_MS);
  if (t >= 1) return { sheet: null, frame: 0, dx: exitDx, bedX: exitDx, box: floor, landed: true };
  const frame = Math.floor((ms - UNLOAD_END_MS) / WALK_FRAME_MS) % walk.length;
  const dx = lerp(carried, exitDx, t);
  return { sheet: 'walk', frame, dx, bedX: walk[frame].bedX + dx, box: floor, landed: true };
}

/** Frames of the dust the box kicks up: 0..7 for a short while after it lands, otherwise null. */
export const DUST_FRAME_MS = 70;
export function dustFrameAt(msSinceLanding: number): number | null {
  if (msSinceLanding < 0) return null;
  const frame = Math.floor(msSinceLanding / DUST_FRAME_MS);
  return frame < 8 ? frame : null;
}

/**
 * Screen position of the box for a point on the cart. `pivot` is the bottom centre of the box in screen pixels and
 * `angle` is the cart's tilt (right side up is positive). The result is where to put the box's top-left corner and
 * how far to turn it (CSS degrees, clockwise), because a view turns about its middle, not its bottom.
 */
export function placeBox(pivot: { x: number; y: number }, angle: number, boxW: number, boxH: number) {
  const turn = (-angle * Math.PI) / 180;
  const centreX = pivot.x + (boxH / 2) * Math.sin(turn);
  const centreY = pivot.y - (boxH / 2) * Math.cos(turn);
  return { left: centreX - boxW / 2, top: centreY - boxH / 2, rotate: -angle };
}
