import { PET_CHARACTERS } from '../petCatalog';
import { PILGRIMAGES } from '../data/pilgrimages';
import { localOmikujiDay } from '../data/omikuji';
import type { Progress } from './progress';
import type { MobbyCollection } from './gacha';
import type { SpecialCollection } from './specialRewards';

/**
 * Local testing only: while this is on, every Mobby, goshuin, miniature, route cover and pass is
 * owned, passes and free pulls never run out, and the omikuji can be drawn again after each draw.
 * It only works in development builds (`__DEV__`), so a release build can never unlock anything
 * by it. Set to false to play with a normal save again; the unlocked items stay in the saved data
 * until it is reset.
 */
export const DEV_UNLOCK_ALL = typeof __DEV__ !== 'undefined' && __DEV__ && true;

const SUPPLY = 99;

type Unlockable = {
  mobbies: MobbyCollection;
  realSpecial: SpecialCollection;
  trialSpecial: SpecialCollection;
  realBookDesigns: { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
  trialBookDesigns: { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
  bookDesigns: { owned: Record<string, boolean>; selected: Record<string, 'normal' | 'route'> };
  routes?: Record<string, Progress>;
  demo: boolean;
};

const finishedRoute = (routeId: string, ids: readonly string[], day: string): Progress => ({
  day, steps: 0, totalSteps: 0, dayStart: 0, routeId, baseline: 0, highWater: 0, routeSteps: 0,
  rewards: ids.map((id, index) => ({ id, date: day, steps: (index + 1) * 1000, threshold: (index + 1) * 1000 })),
  pending: [], completedAt: day,
});

/** Returns `saved` itself when it is already fully unlocked, so repeated calls do not cause saves. */
export function devUnlockAll<T extends Unlockable>(saved: T): T {
  // Loaded here, not at the top, because the shrine data pulls in image assets that plain-Node tests cannot load.
  const { SHRINES } = require('../data/shrines') as typeof import('../data/shrines');
  const day = localOmikujiDay();
  const owned = { ...saved.mobbies.owned };
  for (const pet of PET_CHARACTERS) owned[pet.id] = Math.max(1, owned[pet.id] ?? 0);
  const mobbies = { ...saved.mobbies, owned, freePulls: Math.max(SUPPLY, saved.mobbies.freePulls) };

  const special = (collection: SpecialCollection): SpecialCollection => ({
    ...collection,
    keychains: { ...Object.fromEntries(SHRINES.map(shrine => [shrine.id, 1])), ...collection.keychains },
    passes: { ...collection.passes, keychainDrop: Math.max(SUPPLY, collection.passes.keychainDrop) },
  });
  const covers = (designs: Unlockable['bookDesigns']) => ({ ...designs, owned: { ...designs.owned, ...Object.fromEntries(PILGRIMAGES.map(route => [route.id, true])) } });

  const routes = { ...(saved.routes ?? {}) };
  for (const prefix of ['real:', 'trial:']) {
    for (const route of PILGRIMAGES) {
      const key = `${prefix}${route.id}`;
      const have = new Set((routes[key]?.rewards ?? []).map(reward => reward.id));
      if (!routes[key] || route.ids.some(id => !have.has(id))) routes[key] = finishedRoute(route.id, route.ids, routes[key]?.day ?? day);
    }
  }

  const next = { ...saved, mobbies, realSpecial: special(saved.realSpecial), trialSpecial: special(saved.trialSpecial), realBookDesigns: covers(saved.realBookDesigns), trialBookDesigns: covers(saved.trialBookDesigns), bookDesigns: covers(saved.bookDesigns), routes };
  return JSON.stringify(next) === JSON.stringify(saved) ? saved : next;
}
