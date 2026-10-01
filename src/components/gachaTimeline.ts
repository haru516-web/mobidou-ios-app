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

// ---- The spectacle: everything below is only for how the opening looks and feels. ----

/** The scene is dimmed while light builds, so the light has something to shine against. */
export const MAX_DIM = .62;

/** How dark the scene is: it darkens as the board rises and lifts again as the light fades out. */
export const dimAt = (open: number, openedFor: number | null) =>
  MAX_DIM * (openedFor === null ? easeOut(clamp01(open)) : Math.min(1, glowAfterOpen(openedFor) * 1.25));

/** Light also seeps through the seams before the board is touched, and the box trembles with it. */
export const seamGlow = (ms: number) => ms < SETTLED_AT_MS ? 0 : .12 + .08 * Math.sin((ms - SETTLED_AT_MS) / 260);

/**
 * A tremble in pixels. It grows as the board comes up (the light is straining to get out) and stops once it is open.
 * `t` is any changing number (milliseconds) so the shake never repeats exactly.
 */
export function rumbleAt(open: number, opened: boolean, t: number) {
  if (opened || open <= 0) return { x: 0, y: 0 };
  const amount = 1.2 + 3.4 * clamp01(open);
  return { x: Math.round(Math.sin(t * .09) * amount * 10) / 10, y: Math.round(Math.cos(t * .13) * amount * .6 * 10) / 10 };
}

/** A white flash at the instant the board is fully up. */
export const FLASH_MS = 520;
export const flashAt = (openedFor: number) => openedFor >= FLASH_MS ? 0 : Math.pow(1 - openedFor / FLASH_MS, 2) * .95;

/** Rays burst outward from the opening, then settle into a slow glow. */
export const BURST_MS = 900;
export function burstAt(openedFor: number) {
  const t = clamp01(openedFor / BURST_MS);
  return { scale: .25 + 1.6 * easeOut(t), opacity: Math.pow(1 - t, 1.4) };
}

/** How wide and bright the soft glow behind the box is: it swells past full as the board opens, then relaxes. */
export function bloomAt(openedFor: number | null, open: number) {
  if (openedFor === null) return .35 + .65 * easeOut(clamp01(open));
  return 1 + .35 * Math.exp(-openedFor / 450) * Math.sin(clamp01(openedFor / 450) * Math.PI * .5 + .6) + .06 * Math.sin(openedFor / 220);
}

/** The Mobby first shows as a white shape inside the light, and takes its colour as the light goes. */
export const silhouetteAt = (openedFor: number) => {
  const rise = easeOut(clamp01((openedFor - 120) / (HOLD_MS - 120)));
  const gone = clamp01((openedFor - (HOLD_MS + FADE_MS * .35)) / (FADE_MS * .45));
  return rise * (1 - easeInOut(gone));
};

/** The Mobby pops up with a little overshoot as it appears. */
export function popAt(openedFor: number) {
  const t = clamp01((openedFor - (HOLD_MS + FADE_MS * .5)) / 620);
  const overshoot = 1 + .16 * Math.sin(t * Math.PI) * (1 - t);
  return (.62 + .38 * easeOut(t)) * overshoot;
}

export type Sparkle = { x: number; y: number; size: number; opacity: number };
const unit = (seed: number) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Gold specks thrown out of the opening. Positions are in box widths from the opening's centre, so they
 * scale with the box. Each speck has its own direction, speed and lifetime, all fixed by its index.
 */
export function sparklesAt(openedFor: number, count = 28): Sparkle[] {
  const out: Sparkle[] = [];
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .3) * 700;
    const life = 1500 + unit(i + .7) * 1700;
    const age = openedFor - delay;
    if (age <= 0 || age >= life) continue;
    const t = age / life;
    const angle = -Math.PI / 2 + (unit(i + .1) - .5) * Math.PI * 1.5;
    const speed = .9 + unit(i + .5) * 1.7;
    const reach = easeOut(t) * speed;
    out.push({
      x: Math.cos(angle) * reach + Math.sin(age / 340 + i) * .05,
      y: Math.sin(angle) * reach - t * .55,
      size: .035 + unit(i + .9) * .07,
      opacity: Math.min(1, t * 8) * (1 - t) * (.55 + .45 * Math.abs(Math.sin(age / 90 + i))),
    });
  }
  return out;
}

/** A short thud when the box lands: the whole scene shifts a little and recovers. */
export function landingShake(ms: number) {
  const t = (ms - ROLL_MS) / 420;
  if (t < 0 || t >= 1) return 0;
  return Math.round(Math.sin(t * Math.PI * 5) * (1 - t) * 6 * 10) / 10;
}
