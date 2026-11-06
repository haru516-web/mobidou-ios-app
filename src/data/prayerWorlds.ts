/** Which 3D world a prayer happens in. */
export type PrayerWorldVariant = 'forest' | 'kannon';

/**
 * The ceremony at the end of a pilgrimage always happens in the original forest shrine.
 * The lavish 願い観音もび寺 world is for free-roam prayer, opened from the home screen (FreePrayer).
 */
export function prayerWorldFor(_shrineId?: string): PrayerWorldVariant {
  return 'forest';
}
