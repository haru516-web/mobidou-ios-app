export type PrayerAction = 'rei' | 'hakushu';

/**
 * How long each of the eight frames of an action is held, in ms. The bow lingers
 * at its deepest point; a clap holds a beat at contact and again on the final
 * folded-hands pose, instead of every frame getting the same 90ms.
 */
const REI_MS = [110, 150, 100, 130, 280, 100, 110, 140] as const;
/** One clap per hakushu strip (the older art: two strips make two claps). */
const HAKUSHU_SINGLE_MS = [110, 110, 80, 160, 110, 110, 110, 150] as const;
/** Two claps in one strip (the newer art: one strip makes two claps). */
const HAKUSHU_DOUBLE_MS = [130, 130, 80, 160, 110, 80, 160, 320] as const;
const HAKUSHU_SINGLE_CLAPS = [3] as const;
const HAKUSHU_DOUBLE_CLAPS = [3, 6] as const;
const FRAMES_PER_ACTION = 8;

/** Per-frame durations and the frames where a clap lands, for a sequence of actions. */
export function buildPrayerTimeline(order: readonly PrayerAction[]) {
  const doubleClap = order.filter(action => action === 'hakushu').length === 1;
  const durations: number[] = [];
  const clapFrames: number[] = [];
  order.forEach((action, part) => {
    const base = part * FRAMES_PER_ACTION;
    if (action === 'rei') {
      durations.push(...REI_MS);
      return;
    }
    durations.push(...(doubleClap ? HAKUSHU_DOUBLE_MS : HAKUSHU_SINGLE_MS));
    clapFrames.push(...(doubleClap ? HAKUSHU_DOUBLE_CLAPS : HAKUSHU_SINGLE_CLAPS).map(frame => base + frame));
  });
  return { durations, clapFrames };
}
