/**
 * The timing of one box opening, as pure functions of elapsed milliseconds so
 * the scene can be driven from any clock and checked without a screen.
 *
 * roll -> settle -> lid opens -> four sides fall -> hold -> light fades.
 * The light stays full while the sides fall, so the contents only show once
 * it has faded enough.
 */
export const ROLL_MS = 1500;
export const SETTLE_MS = 350;
export const LID_MS = 800;
export const FLAPS_MS = 1000;
export const HOLD_MS = 600;
export const FADE_MS = 2600;

export const T = {
  roll: ROLL_MS,
  settle: ROLL_MS + SETTLE_MS,
  lid: ROLL_MS + SETTLE_MS + LID_MS,
  flaps: ROLL_MS + SETTLE_MS + LID_MS + FLAPS_MS,
  hold: ROLL_MS + SETTLE_MS + LID_MS + FLAPS_MS + HOLD_MS,
  fade: ROLL_MS + SETTLE_MS + LID_MS + FLAPS_MS + HOLD_MS + FADE_MS,
} as const;
export const TOTAL_MS = T.fade;

/** Each side starts a little after the previous one, in the order front, right, back, left. */
export const FLAP_STAGGER_MS = 110;
const FLAP_FALL_MS = FLAPS_MS - 3 * FLAP_STAGGER_MS;

export type GachaPhase = 'roll' | 'settle' | 'lid' | 'flaps' | 'hold' | 'fade' | 'revealed';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function phaseAt(ms: number): GachaPhase {
  if (ms < T.roll) return 'roll';
  if (ms < T.settle) return 'settle';
  if (ms < T.lid) return 'lid';
  if (ms < T.flaps) return 'flaps';
  if (ms < T.hold) return 'hold';
  if (ms < T.fade) return 'fade';
  return 'revealed';
}

/** Rolling in: horizontal position (fraction of the box size, from off-screen to 0), rotation in degrees and a small hop. */
export function rollAt(ms: number) {
  const t = clamp01(ms / ROLL_MS);
  const eased = easeOut(t);
  const turns = 2;
  // Whole turns, so the box (and whatever is drawn inside it) ends upright.
  const rotate = -360 * turns * eased;
  const hop = Math.abs(Math.sin((rotate * Math.PI) / 90 / 2)) * 0.09 * (1 - t);
  return { x: 3.2 * (eased - 1), rotate: Math.round(rotate * 100) / 100, hop };
}

/** A small squash as the box comes to rest. */
export function settleAt(ms: number) {
  const t = clamp01((ms - T.roll) / SETTLE_MS);
  return 1 - 0.05 * Math.sin(t * Math.PI);
}

/** 0 = lid shut, 1 = lid fully turned over. */
export const lidAt = (ms: number) => easeInOut(clamp01((ms - T.settle) / LID_MS));

/** 0 = the side is upright, 1 = it lies flat outward. `index` is 0..3 in the order front, right, back, left. */
export const flapAt = (ms: number, index: number) => easeOut(clamp01((ms - T.lid - index * FLAP_STAGGER_MS) / FLAP_FALL_MS));

/**
 * Strength of the light, 0..1. It grows as the lid opens, stays full while the
 * sides fall and through the hold, then fades slowly.
 */
export function glowAt(ms: number) {
  if (ms < T.settle) return 0;
  if (ms < T.lid) return easeOut(clamp01((ms - T.settle) / LID_MS));
  if (ms < T.hold) return 1;
  return 1 - easeOut(clamp01((ms - T.hold) / FADE_MS));
}

/** Opacity of the Mobby in the box: hidden until the light has mostly gone. */
export const mobbyAt = (ms: number) => easeInOut(clamp01((ms - (T.hold + FADE_MS * .5)) / (FADE_MS * .5)));
