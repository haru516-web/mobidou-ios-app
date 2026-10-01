/**
 * The timing of one box opening, as pure functions so the scene can be driven
 * from any clock and checked without a screen.
 *
 * The box rolls in and settles on its own. Then the player lifts the front
 * board by hand: light leaks out as it rises. Once the board is fully up the
 * light is not let go at once. It CHARGES: specks of light are drawn in, the box
 * trembles and the glow beats like a heart, faster and stronger three times.
 * Then it BURSTS (flash, rays, a pillar of light), holds, and FADES slowly while
 * gold dust falls and the Mobby, a white shape inside the light, takes its colour.
 */
export const ROLL_MS = 1500;
export const SETTLE_MS = 350;
/** After the board is fully up the light charges for this long... */
export const CHARGE_MS = 1900;
/** ...then bursts and holds at full for this long... */
export const HOLD_MS = 900;
/** ...and fades over this long. The Mobby takes its colour during the second half. */
export const FADE_MS = 3600;
export const AFTER_OPEN_MS = CHARGE_MS + HOLD_MS + FADE_MS;
export const SETTLED_AT_MS = ROLL_MS + SETTLE_MS;

/** Lifting the board at least this far (0..1) and letting go finishes the opening. */
export const OPEN_COMMIT = 0.45;

export type GachaPhase = 'roll' | 'settle' | 'ready' | 'charge' | 'hold' | 'fade' | 'revealed';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t;
const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * `ms` is time since the box started to roll; `openedFor` is time since the
 * board reached the top, or null while it has not.
 */
export function phaseOf(ms: number, openedFor: number | null): GachaPhase {
  if (openedFor !== null) {
    if (openedFor < CHARGE_MS) return 'charge';
    return openedFor < CHARGE_MS + HOLD_MS ? 'hold' : openedFor < AFTER_OPEN_MS ? 'fade' : 'revealed';
  }
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
export const glowWhileLifting = (open: number) => .5 * easeOut(clamp01(open));

/** Times (ms into the charge) of the three heartbeats, each one closer to the last and stronger. */
const BEATS = [{ at: 520, power: .16 }, { at: 1020, power: .24 }, { at: 1430, power: .34 }, { at: 1720, power: .44 }];

/** The steady level of the charging glow (it picks up where the lifting glow left off), and the heartbeat pulses on top of it. */
const chargeBase = (openedFor: number) => .5 + .22 * easeIn(clamp01(openedFor / CHARGE_MS));
function chargePulse(openedFor: number) {
  let pulse = 0;
  for (const beat of BEATS) {
    const age = openedFor - beat.at;
    if (age > 0) pulse += beat.power * Math.exp(-age / 110) * Math.min(1, age / 25);
  }
  return pulse;
}
const chargeGlow = (openedFor: number) => Math.min(.98, chargeBase(openedFor) + chargePulse(openedFor));

/** Light once the board is fully up: charging, then full at the burst, held, then a slow fade. */
export function glowAfterOpen(openedFor: number) {
  if (openedFor < CHARGE_MS) return chargeGlow(openedFor);
  const sinceBurst = openedFor - CHARGE_MS;
  if (sinceBurst < HOLD_MS) return 1;
  return 1 - easeOut(clamp01((sinceBurst - HOLD_MS) / FADE_MS));
}

/** Opacity of the Mobby: hidden until the light has mostly gone. */
export const mobbyAfterOpen = (openedFor: number) => easeInOut(clamp01((openedFor - (CHARGE_MS + HOLD_MS + FADE_MS * .5)) / (FADE_MS * .5)));

// ---- The spectacle: everything below is only for how the opening looks and feels. ----

/** The scene is dimmed while light builds, so the light has something to shine against. */
export const MAX_DIM = .62;

/** How dark the scene is: it darkens as the board rises and through the charge, and lifts as the light fades. */
export function dimAt(open: number, openedFor: number | null) {
  if (openedFor === null) return MAX_DIM * .8 * easeOut(clamp01(open));
  if (openedFor < CHARGE_MS) return MAX_DIM * (.8 + .2 * easeOut(openedFor / CHARGE_MS));
  return MAX_DIM * Math.min(1, glowAfterOpen(openedFor) * 1.25);
}

/** Light also seeps through the seams before the board is touched. */
export const seamGlow = (ms: number) => ms < SETTLED_AT_MS ? 0 : .12 + .08 * Math.sin((ms - SETTLED_AT_MS) / 260);

/**
 * A tremble in pixels. It grows as the board comes up and through the charge (the light is straining to get
 * out), and stops at the burst. `t` is any changing number (milliseconds) so the shake never repeats exactly.
 */
export function rumbleAt(open: number, opened: boolean, t: number, openedFor = 0) {
  let amount: number;
  if (opened) {
    if (openedFor >= CHARGE_MS) return { x: 0, y: 0 };
    amount = 2 + 5 * easeIn(openedFor / CHARGE_MS);
  } else {
    if (open <= 0) return { x: 0, y: 0 };
    amount = 1.2 + 3.4 * clamp01(open);
  }
  return { x: Math.round(Math.sin(t * .09) * amount * 10) / 10, y: Math.round(Math.cos(t * .13) * amount * .6 * 10) / 10 };
}

/** A white flash at the burst. */
export const FLASH_MS = 620;
export const flashAt = (openedFor: number) => {
  const t = openedFor - CHARGE_MS;
  return t < 0 || t >= FLASH_MS ? 0 : Math.pow(1 - t / FLASH_MS, 2) * .95;
};

/** Rays burst outward from the opening at the burst, then keep turning slowly with the glow. */
export const BURST_MS = 1100;
export function burstAt(openedFor: number) {
  const t = clamp01((openedFor - CHARGE_MS) / BURST_MS);
  if (openedFor < CHARGE_MS) return { scale: 0, opacity: 0 };
  return { scale: .25 + 1.7 * easeOut(t), opacity: Math.pow(1 - t, 1.4) };
}

/** A pillar of light shooting up out of the opening at the burst: how tall (0..1 of the screen) and how bright. */
export function pillarAt(openedFor: number) {
  const t = openedFor - CHARGE_MS;
  if (t < 0) return { height: 0, opacity: 0 };
  const rise = easeOut(clamp01(t / 420));
  const fade = 1 - easeInOut(clamp01((t - 350) / 1800));
  return { height: rise, opacity: Math.min(1, rise * 1.2) * fade };
}

/** How wide and bright the soft glow behind the box is: it swells with each heartbeat, then past full at the burst. */
export function bloomAt(openedFor: number | null, open: number) {
  if (openedFor === null) return .35 + .35 * easeOut(clamp01(open));
  if (openedFor < CHARGE_MS) return .7 + .25 * easeIn(openedFor / CHARGE_MS) + chargePulse(openedFor) * .6;
  const since = openedFor - CHARGE_MS;
  return 1 + .4 * Math.exp(-since / 500) * Math.sin(clamp01(since / 500) * Math.PI * .5 + .6) + .06 * Math.sin(since / 240);
}

/**
 * The Mobby first shows as a white shape inside the charging light (faint, then brighter with each beat), is
 * brightest at the burst, and gives way to its own colour as the light fades.
 */
export const silhouetteAt = (openedFor: number) => {
  const rise = easeOut(clamp01((openedFor - CHARGE_MS * .35) / (CHARGE_MS * .65)));
  const gone = clamp01((openedFor - (CHARGE_MS + HOLD_MS + FADE_MS * .35)) / (FADE_MS * .45));
  return rise * (1 - easeInOut(gone));
};

/** The Mobby pops up with a little overshoot as it appears. */
export function popAt(openedFor: number) {
  const t = clamp01((openedFor - (CHARGE_MS + HOLD_MS + FADE_MS * .5)) / 620);
  const overshoot = 1 + .16 * Math.sin(t * Math.PI) * (1 - t);
  return (.62 + .38 * easeOut(t)) * overshoot;
}

export type Speck = { x: number; y: number; size: number; opacity: number };
const unit = (seed: number) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/**
 * Specks of light drawn in toward the opening while it charges (the light is being gathered). Positions are in
 * box widths from the opening's centre. Each speck starts on a wide ring and speeds up as it falls in.
 */
export function gatherAt(openedFor: number, count = 30): Speck[] {
  const out: Speck[] = [];
  if (openedFor >= CHARGE_MS) return out;
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .2) * 900;
    const life = 900 + unit(i + .6) * 700;
    const age = openedFor - delay;
    if (age <= 0) continue;
    const t = (age % life) / life;
    // Each speck loops while the charge lasts; later specks start later.
    const angle = unit(i + .4 + Math.floor(age / life) * .13) * Math.PI * 2;
    const radius = (1.9 + unit(i + .8) * .9) * (1 - easeIn(t));
    out.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * .8,
      size: .03 + unit(i + .9) * .05,
      opacity: Math.min(1, t * 5) * Math.min(1, (1 - t) * 3) * (.4 + .6 * easeIn(openedFor / CHARGE_MS)),
    });
  }
  return out;
}

/**
 * Gold specks thrown out of the opening at the burst. Positions are in box widths from the opening's centre, so
 * they scale with the box. Each speck has its own direction, speed and lifetime, all fixed by its index.
 */
export function sparklesAt(openedFor: number, count = 36): Speck[] {
  const out: Speck[] = [];
  const since = openedFor - CHARGE_MS;
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .3) * 600;
    const life = 1800 + unit(i + .7) * 2000;
    const age = since - delay;
    if (age <= 0 || age >= life) continue;
    const t = age / life;
    const angle = -Math.PI / 2 + (unit(i + .1) - .5) * Math.PI * 1.7;
    const speed = 1 + unit(i + .5) * 2;
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

export type Flake = { x: number; y: number; size: number; opacity: number };

/**
 * Gold dust drifting down over the whole screen while the light fades. `x` and `y` are fractions of the
 * screen width and height; the dust sways as it falls.
 */
export function dustAt(openedFor: number, count = 26): Flake[] {
  const out: Flake[] = [];
  const since = openedFor - (CHARGE_MS + 500);
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .15) * 2400;
    const life = 3200 + unit(i + .65) * 1800;
    const age = since - delay;
    if (age <= 0 || age >= life) continue;
    const t = age / life;
    out.push({
      x: unit(i + .45) + Math.sin(age / 700 + i * 2) * .04,
      y: -.05 + t * 1.1,
      size: .012 + unit(i + .85) * .02,
      opacity: Math.min(1, t * 6) * Math.min(1, (1 - t) * 4) * (.5 + .5 * Math.abs(Math.sin(age / 160 + i))),
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

/** Moments (ms after the board is up) that deserve a touch on the phone: the heartbeats, then the burst. */
export const HAPTIC_BEATS: readonly { at: number; strength: 'light' | 'medium' | 'heavy' }[] = [
  { at: BEATS[0].at, strength: 'light' }, { at: BEATS[1].at, strength: 'light' },
  { at: BEATS[2].at, strength: 'medium' }, { at: BEATS[3].at, strength: 'medium' },
  { at: CHARGE_MS, strength: 'heavy' },
];
