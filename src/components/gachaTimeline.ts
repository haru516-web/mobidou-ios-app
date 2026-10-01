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
export const CHARGE_MS = 2600;
/** ...then bursts and holds at full for this long... */
export const HOLD_MS = 1400;
/** ...and fades over this long. The Mobby takes its colour during the second half. */
export const FADE_MS = 5600;
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
const BEATS = [{ at: 700, power: .16 }, { at: 1350, power: .24 }, { at: 1900, power: .34 }, { at: 2230, power: .44 }];

/**
 * MA: the held breath before the burst. In Noh and Kabuki the strongest moment is not the loud one but the
 * silence just before it, so for this long the last beat has died, the box stops trembling, the gathered light
 * is all drawn in and the glow drops almost to nothing. The burst lands hard because of what came just before.
 */
export const MA_MS = 320;
/** 0 until the held breath begins, then quickly 1 until the burst. */
export const maAt = (openedFor: number) => openedFor < CHARGE_MS - MA_MS || openedFor >= CHARGE_MS ? 0 : easeOut(clamp01((openedFor - (CHARGE_MS - MA_MS)) / 140));

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
const chargeGlow = (openedFor: number) => Math.min(.98, (chargeBase(openedFor) + chargePulse(openedFor)) * (1 - .75 * maAt(openedFor)));

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
export const seamGlow = (ms: number, clock = ms) => ms < SETTLED_AT_MS ? 0 : .3 + .14 * Math.sin(clock / 300) + .06 * Math.sin(clock / 97 + 1);

/**
 * A tremble in pixels. It grows as the board comes up and through the charge (the light is straining to get
 * out), and stops at the burst. `t` is any changing number (milliseconds) so the shake never repeats exactly.
 */
export function rumbleAt(open: number, opened: boolean, t: number, openedFor = 0) {
  let amount: number;
  if (opened) {
    if (openedFor >= CHARGE_MS) return { x: 0, y: 0 };
    amount = (2 + 5 * easeIn(openedFor / CHARGE_MS)) * (1 - maAt(openedFor));
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
  if (openedFor < CHARGE_MS) return (.7 + .25 * easeIn(openedFor / CHARGE_MS) + chargePulse(openedFor) * .6) * (1 - .4 * maAt(openedFor));
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
    const delay = unit(i + .2) * 1200;
    const life = 1000 + unit(i + .6) * 800;
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
      opacity: Math.min(1, t * 5) * Math.min(1, (1 - t) * 3) * (.4 + .6 * easeIn(openedFor / CHARGE_MS)) * (1 - maAt(openedFor)),
    });
  }
  return out;
}

/**
 * Gold specks thrown out of the opening at the burst. Positions are in box widths from the opening's centre, so
 * they scale with the box. Each speck has its own direction, speed and lifetime, all fixed by its index.
 */
export function sparklesAt(openedFor: number, count = 18): Speck[] {
  const out: Speck[] = [];
  const since = openedFor - CHARGE_MS;
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .3) * 600;
    const life = 2200 + unit(i + .7) * 2600;
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
export function dustAt(openedFor: number, count = 22): Flake[] {
  const out: Flake[] = [];
  const since = openedFor - (CHARGE_MS + 500);
  for (let i = 0; i < count; i++) {
    const delay = unit(i + .15) * 2400;
    const life = 2800 + unit(i + .65) * 1300;
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

/**
 * Light that keeps moving by itself, whether or not the player touches anything. `t` is scene time (ms). It
 * wavers the way a candle does: a slow breath with a faint, uneven flutter on top, never a strobe.
 */
export const shimmerAt = (t: number) => 1 + .045 * Math.sin(t * .0021) + .03 * Math.sin(t * .0057 + 1.3) + .014 * Math.sin(t * .0173 + .4);

export type Mote = { x: number; y: number; size: number; opacity: number };

/**
 * Fine flecks of gold leaf lifting off the box like sparks from a lantern: few, small, each rising on its own
 * slow path and glinting rather than glowing. `strength` (0..1) is how much light there is; positions are in box
 * widths from the box's centre and `size` is a diameter in box widths.
 */
export function motesAt(t: number, strength: number, count = 9): Mote[] {
  const out: Mote[] = [];
  if (strength <= 0) return out;
  for (let i = 0; i < count; i++) {
    const period = 7000 + unit(i + .5) * 5000;
    const phase = ((t + unit(i + .25) * period) % period) / period;
    const glint = Math.pow(Math.max(0, Math.sin(t / (380 + unit(i + .9) * 420) + i * 2.3)), 3);
    out.push({
      x: (unit(i + .45) - .5) * 1.7 + .07 * Math.sin(t / 1300 + i * 1.9),
      y: .7 - phase * 2.1,
      size: .035 + unit(i + .85) * .045,
      opacity: Math.min(1, strength) * Math.min(1, phase * 6) * Math.min(1, (1 - phase) * 4) * (.12 + .88 * glint),
    });
  }
  return out;
}

/**
 * The wind, as how far it has carried something in `u` seconds. Every petal shares it (each feels it a little
 * differently), so they sway and surge together in gusts the way petals do, instead of each wandering on its own.
 */
const windDrift = (u: number) => .025 * u + .06 * (1 - Math.cos(u * 1.1)) + .02 * Math.sin(u * 2.3);

export type Petal = { x: number; y: number; size: number; rotate: number; flip: number; opacity: number; tone: number };

/**
 * Hanafubuki: cherry petals thrown up out of the opening at the burst. They fly out and up, slow down in the
 * air, then tumble and sway down. `x` and `y` are fractions of the screen (`origin` is the opening); `size` is a
 * fraction of the screen width; `flip` (0..1) is how wide the petal looks as it turns; `tone` (0..1) is how deep
 * the pink is. They are gone well before the opening ends, because the seasons carry on from there (see fallAt).
 */
export function blossomsAt(openedFor: number, origin: { x: number; y: number }, count = 44): Petal[] {
  const out: Petal[] = [];
  const since = openedFor - CHARGE_MS;
  for (let i = 0; i < count; i++) {
    // Most petals leave at once and the rest follow one by one: the last few fall alone, a quiet ending.
    const delay = Math.pow(unit(i + .11), 1.7) * 1400;
    const life = 2600 + unit(i + .57) * 1000;
    const age = since - delay;
    if (age <= 0 || age >= life) continue;
    const t = age / life;
    const u = age / 1000;
    const spread = 1 - Math.exp(-1.6 * u);
    const vx = (unit(i + .31) - .5) * 1.5;
    const vy = -(.5 + unit(i + .73) * 1.1);
    out.push({
      x: origin.x + vx * spread / 1.6 + windDrift(u) * (.7 + .6 * unit(i + .19)) + Math.sin(u * 2.9 + i * 1.9) * .012 * Math.min(1, u),
      y: origin.y + vy * spread / 1.6 + .13 * u,
      size: .022 + unit(i + .91) * .016,
      rotate: Math.round((unit(i + .2) * 360 + age * (.05 + unit(i + .4) * .12) * (i % 2 ? 1 : -1)) % 360),
      flip: .25 + .75 * Math.abs(Math.cos(age / 420 + i)),
      opacity: Math.min(1, t * 10) * Math.min(1, (1 - t) * 5),
      tone: unit(i + .66),
    });
  }
  return out;
}

/** Colours of the paper confetti, from traditional Japanese colour names: vermilion, plum pink, yamabuki gold, young grass, asagi blue, wisteria, white, indigo, gold. */
export const CONFETTI_COLORS = ['#D9472B', '#E9889B', '#F0B429', '#9CC96B', '#4FB3BF', '#9B7FC4', '#FBF7EE', '#3E5C9A', '#E6C46A'] as const;

/**
 * Kamifubuki: small slips of coloured paper thrown up out of the opening at the burst, as at a celebration on
 * the stage. Each is a flat slip, so it flashes wide and thin as it tumbles. `tone` (0..1) picks its colour from
 * CONFETTI_COLORS. Same flight as the petals (up and out, slowing, then down on the shared wind); all are gone
 * well before the opening ends.
 */
export function confettiAt(openedFor: number, origin: { x: number; y: number }, count = 26): Petal[] {
  const out: Petal[] = [];
  const since = openedFor - CHARGE_MS;
  for (let i = 0; i < count; i++) {
    const delay = Math.pow(unit(i + .13), 1.5) * 1600;
    const life = 3000 + unit(i + .59) * 1600;
    const age = since - delay;
    if (age <= 0 || age >= life) continue;
    const t = age / life;
    const u = age / 1000;
    const spread = 1 - Math.exp(-1.8 * u);
    const vx = (unit(i + .33) - .5) * 2;
    const vy = -(.6 + unit(i + .71) * 1.3);
    out.push({
      x: origin.x + vx * spread / 1.8 + windDrift(u) * (.6 + .8 * unit(i + .17)) + Math.sin(u * 3.3 + i * 1.7) * .014 * Math.min(1, u),
      y: origin.y + vy * spread / 1.8 + .16 * u,
      size: .014 + unit(i + .93) * .01,
      rotate: Math.round((unit(i + .21) * 360 + age * (.08 + unit(i + .43) * .2) * (i % 2 ? 1 : -1)) % 360),
      flip: .12 + .88 * Math.abs(Math.cos(age / (160 + unit(i + .5) * 160) + i)),
      opacity: Math.min(1, t * 12) * Math.min(1, (1 - t) * 5),
      tone: unit(i + .67),
    });
  }
  return out;
}

export type FallKind = 0 | 1 | 2 | 3;
/** What is falling: 0 cherry petal (spring), 1 firefly (summer), 2 maple leaf (autumn), 3 snow (winter). */
export type Fall = Petal & { kind: FallKind };

/**
 * How fast the seasons turn, in seasons per real ms. While the box waits it is always spring. From the burst a whole
 * year passes while the light fills and fades (the moment of the meeting holds every season), and afterwards the
 * seasons keep turning slowly on their own.
 */
export function seasonRateAt(openedFor: number | null) {
  if (openedFor === null || openedFor < CHARGE_MS) return 0;
  return openedFor < AFTER_OPEN_MS ? 4 / (AFTER_OPEN_MS - CHARGE_MS) : 1 / 9000;
}

/**
 * Seasons do not switch, they seep into each other: what falls is decided when it starts to fall, from the season
 * at that moment (a little blurred), so spring petals thin out while the first fireflies rise, and so on.
 * `t` is scene time (ms), `season` runs 0 spring, 1 summer, 2 autumn, 3 winter and wraps; `rate` is how many
 * seasons pass per ms of `t`.
 */
export function fallAt(t: number, season: number, rate: number, count = 22): Fall[] {
  const out: Fall[] = [];
  for (let i = 0; i < count; i++) {
    const period = 4200 + unit(i + .5) * 2800;
    const shifted = t + unit(i + .25) * period;
    const cycle = Math.floor(shifted / period);
    const phase = (shifted % period) / period;
    const seed = i + cycle * .371;
    const spawned = season - rate * phase * period;
    const pos = (((spawned + unit(seed + .6) * .5) % 4) + 4) % 4;
    const kind = Math.floor(pos) as FallKind;
    const x0 = unit(seed + .45);
    const wind = (.07 * Math.sin(t / 2600) + .04 * Math.sin(t / 1100 + 1)) * (.7 + .6 * unit(i + .19));
    const fade = Math.min(1, phase * 8) * Math.min(1, (1 - phase) * 8);
    const tone = unit(i + .66);
    if (kind === 0) {
      out.push({ kind, x: x0 + wind + Math.sin(phase * Math.PI * 4 + i) * .02, y: -.05 + phase * 1.15, size: .02 + unit(i + .85) * .014, rotate: Math.round((phase * 720 * (i % 2 ? 1 : -1) + unit(seed) * 360) % 360), flip: .25 + .75 * Math.abs(Math.cos(t / 520 + i)), opacity: fade * .85, tone });
    } else if (kind === 1) {
      // Fireflies rise slowly from low in the scene and blink.
      const blink = Math.pow(Math.max(0, Math.sin(t / (650 + unit(i + .3) * 500) + i * 3)), 3);
      out.push({ kind, x: x0 + wind * .5 + .05 * Math.sin(phase * Math.PI * 3 + i), y: .98 - phase * .55, size: .018 + unit(i + .85) * .012, rotate: 0, flip: 1, opacity: fade * (.1 + .9 * blink), tone });
    } else if (kind === 2) {
      // Maple leaves swing like a pendulum as they come down.
      const swing = Math.sin(phase * Math.PI * 5 + i);
      out.push({ kind, x: x0 + wind * 1.4 + swing * .045, y: -.05 + phase * 1.12, size: .026 + unit(i + .85) * .014, rotate: Math.round(unit(seed) * 360 + 45 * swing) % 360, flip: .6 + .4 * Math.abs(Math.cos(t / 700 + i)), opacity: fade * .9, tone });
    } else {
      out.push({ kind, x: x0 + wind * .6 + Math.sin(phase * Math.PI * 6 + i) * .015, y: -.05 + phase * 1.1, size: .007 + unit(i + .85) * .007, rotate: 0, flip: 1, opacity: fade * .9, tone });
    }
  }
  return out;
}

const TINT_GOLD = [242, 218, 168];
const TINT_SEASON = [[246, 216, 220], [208, 232, 212], [240, 202, 160], [216, 228, 242]];
/**
 * The colour of the light. It is a soft, low-saturation warm gold (the colour of gold leaf and lamplight) while
 * the box waits and charges, and after the burst it takes on the season's own pale colour as the year turns.
 */
export function lightTintAt(openedFor: number | null, season: number) {
  if (openedFor === null) return TINT_GOLD;
  const k = easeInOut(clamp01((openedFor - CHARGE_MS) / 1800));
  const s = ((season % 4) + 4) % 4;
  const a = TINT_SEASON[Math.floor(s)];
  const b = TINT_SEASON[(Math.floor(s) + 1) % 4];
  const f = s - Math.floor(s);
  return [0, 1, 2].map(c => Math.round(TINT_GOLD[c] + ((a[c] + (b[c] - a[c]) * f) - TINT_GOLD[c]) * k));
}

/**
 * JO-HA-KYU as one flow of time. Everything that moves by itself (the flicker, the turning rays, the orbiting
 * lights, the drifting petals, the trembling) runs on a single clock whose speed is set here, so the whole scene
 * shares one tempo instead of each part keeping its own:
 *   jo   the box waits: slow and calm, like breathing;
 *   ha   the board comes up and the light charges: the tempo keeps accelerating;
 *   ma   the held breath: time all but stops;
 *   mie  the burst is held in a frozen frame for a moment (the pose);
 *   kyu  time rushes back, then settles into a quiet afterglow (zanshin, the lingering after the strike).
 * Returns how many ms of scene time pass per real ms.
 */
export function tempoAt(openedFor: number | null, open: number) {
  if (openedFor === null) return .4 + .5 * easeOut(clamp01(open));
  const toMa = CHARGE_MS - MA_MS;
  if (openedFor < toMa) return .9 + 1.7 * easeIn(openedFor / toMa);
  if (openedFor < CHARGE_MS) return 2.6 + (.04 - 2.6) * easeOut(clamp01((openedFor - toMa) / 90));
  const since = openedFor - CHARGE_MS;
  if (since < MIE_MS) return .06;
  return .35 + 1.5 * Math.exp(-(since - MIE_MS) / 1400) * easeOut(clamp01((since - MIE_MS) / 250));
}
/** How long the burst is held still (the mie pose) before time rushes back. */
export const MIE_MS = 280;

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
  // Like the clappers: one hard strike after the silence, then a lighter answer.
  { at: CHARGE_MS, strength: 'heavy' }, { at: CHARGE_MS + 140, strength: 'medium' },
];
