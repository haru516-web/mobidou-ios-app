/**
 * The timing of one box opening, as pure functions so the scene can be driven
 * from any clock and checked without a screen.
 *
 * The box rolls in and settles on its own. Then the player lifts the front
 * board by hand: light leaks out as it rises, and once it is fully up the
 * light fills the box, holds, and fades slowly until the Mobby shows.
 */
export const ROLL_MS = 1500;
export const SETTLE_MS = 350;
/** After the front board is fully up, the light holds at full for this long... */
export const HOLD_MS = 700;
/** ...and then fades over this long. The Mobby appears during its second half. */
export const FADE_MS = 2600;
export const AFTER_OPEN_MS = HOLD_MS + FADE_MS;
export const SETTLED_AT_MS = ROLL_MS + SETTLE_MS;

/** Lifting the board at least this far (0..1) and letting go finishes the opening. */
export const OPEN_COMMIT = 0.45;

export type GachaPhase = 'roll' | 'settle' | 'ready' | 'hold' | 'fade' | 'revealed';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * `ms` is time since the box started to roll; `openedFor` is time since the
 * board reached the top, or null while it has not.
 */
export function phaseOf(ms: number, openedFor: number | null): GachaPhase {
  if (openedFor !== null) return openedFor < HOLD_MS ? 'hold' : openedFor < AFTER_OPEN_MS ? 'fade' : 'revealed';
  if (ms < ROLL_MS) return 'roll';
  if (ms < SETTLED_AT_MS) return 'settle';
  return 'ready';
}

/** Rolling in: horizontal position (in box widths, from off-screen to 0), rotation in degrees and a small hop. */
export function rollAt(ms: number) {
  const t = clamp01(ms / ROLL_MS);
  const eased = easeOut(t);
  const turns = 2;
  // Whole turns, so the box (and its front board) ends the right way up.
  const rotate = -360 * turns * eased;
  const hop = Math.abs(Math.sin((rotate * Math.PI) / 90 / 2)) * 0.09 * (1 - t);
  return { x: 3.2 * (eased - 1), rotate: Math.round(rotate * 100) / 100, hop };
}

/** A small squash as the box comes to rest. */
export function settleAt(ms: number) {
  const t = clamp01((ms - ROLL_MS) / SETTLE_MS);
  return 1 - 0.05 * Math.sin(t * Math.PI);
}

/** Only once the box has come to rest can the board be touched. */
export const canOpen = (ms: number) => ms >= SETTLED_AT_MS;

/** What to do when the player lets go with the board at `open` (0 = shut, 1 = fully up). */
export const resolveRelease = (open: number): 'open' | 'close' => open >= OPEN_COMMIT ? 'open' : 'close';

/** Light leaking out while the board is being lifted. It stays below full until the board is up. */
export const glowWhileLifting = (open: number) => .8 * easeOut(clamp01(open));

/** Light once the board is fully up: full, held, then a slow fade. */
export function glowAfterOpen(openedFor: number) {
  if (openedFor < HOLD_MS) return .8 + .2 * easeOut(clamp01(openedFor / 200));
  return 1 - easeOut(clamp01((openedFor - HOLD_MS) / FADE_MS));
}

/** Opacity of the Mobby: hidden until the light has mostly gone. */
export const mobbyAfterOpen = (openedFor: number) => easeInOut(clamp01((openedFor - (HOLD_MS + FADE_MS * .5)) / (FADE_MS * .5)));
