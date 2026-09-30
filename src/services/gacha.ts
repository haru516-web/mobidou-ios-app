/**
 * Pure rules for owning Mobbies and drawing new ones.
 *
 * - The player picks one Mobby at the very start. Every other Mobby comes from
 *   the gacha, drawn uniformly at random from the whole pool (the starter and
 *   duplicates included).
 * - Finishing a route for the first time grants one free pull.
 * - Paid pulls (single, or five at once) count toward a guarantee: every 25th
 *   paid pull is a Mobby the player does not own yet (while any remain).
 * - A duplicate is kept as a count, so it can be shown as a small Mobby
 *   beside the main one.
 *
 * Paid pulls must be decided by the server (see docs/design-v3-monetization-server.md).
 * This module is the reference for the algorithm and drives free pulls and the
 * offline/demo behaviour.
 */

/** Every paid pull at a multiple of this number is guaranteed to be a new Mobby. */
export const PAID_PITY_INTERVAL = 25;
/** A five-pull is five ordinary pulls. */
export const FIVE_PULL_COUNT = 5;

export type PullKind = 'free' | 'paid';
export type PullResult = { petId: string; isNew: boolean; guaranteed: boolean; kind: PullKind };

export type MobbyCollection = {
  /** How many copies of each Mobby the player holds (1 = owned, 2+ = duplicates). */
  owned: Record<string, number>;
  /** Paid pulls made so far; drives the guarantee. */
  paidPulls: number;
  /** Free pulls waiting to be used. */
  freePulls: number;
  /** Routes whose first clear already gave a free pull. */
  freePullRoutes: string[];
  /** Results waiting for the reveal ceremony; persisted so closing the app cannot lose a pull. */
  unrevealed: PullResult[];
};

export const emptyMobbyCollection = (): MobbyCollection => ({ owned: {}, paidPulls: 0, freePulls: 0, freePullRoutes: [], unrevealed: [] });

const count = (value: unknown) => Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0;

function normalizePullResult(value: unknown): PullResult | null {
  if (!value || typeof value !== 'object') return null;
  const { petId, isNew, guaranteed, kind } = value as Partial<PullResult>;
  if (typeof petId !== 'string' || (kind !== 'free' && kind !== 'paid')) return null;
  return { petId, isNew: isNew === true, guaranteed: guaranteed === true, kind };
}

/**
 * Restore a saved collection. `isKnownPet` drops ids that no longer exist;
 * `starter` lets an older save (which had one chosen Mobby and no collection)
 * keep that Mobby.
 */
export function normalizeMobbyCollection(value: unknown, isKnownPet: (id: string) => boolean, starter?: string): MobbyCollection {
  const source = value && typeof value === 'object' ? value as Partial<MobbyCollection> : {};
  const owned: Record<string, number> = {};
  for (const [id, copies] of Object.entries(source.owned && typeof source.owned === 'object' ? source.owned : {})) {
    if (isKnownPet(id) && count(copies) > 0) owned[id] = count(copies);
  }
  if (Object.keys(owned).length === 0 && starter && isKnownPet(starter)) owned[starter] = 1;
  return {
    owned,
    paidPulls: count(source.paidPulls),
    freePulls: count(source.freePulls),
    freePullRoutes: Array.isArray(source.freePullRoutes) ? [...new Set(source.freePullRoutes.filter((id): id is string => typeof id === 'string'))] : [],
    unrevealed: Array.isArray(source.unrevealed) ? source.unrevealed.map(normalizePullResult).filter((result): result is PullResult => !!result && isKnownPet(result.petId)) : [],
  };
}

export const ownsMobby = (collection: MobbyCollection, petId: string) => (collection.owned[petId] ?? 0) > 0;
export const hasStarter = (collection: MobbyCollection) => Object.keys(collection.owned).length > 0;
/** Small Mobbies to show beside the main one: every copy after the first. */
export const duplicateCount = (collection: MobbyCollection, petId: string) => Math.max(0, (collection.owned[petId] ?? 0) - 1);

/** The very first Mobby. Ignored once the player already has one. */
export function chooseStarter(collection: MobbyCollection, petId: string, isKnownPet: (id: string) => boolean): MobbyCollection {
  if (hasStarter(collection) || !isKnownPet(petId)) return collection;
  return { ...collection, owned: { [petId]: 1 } };
}

/** First clear of a route gives one free pull, once per route. */
export function grantFreePullForClear(collection: MobbyCollection, routeId: string): MobbyCollection {
  if (collection.freePullRoutes.includes(routeId)) return collection;
  return { ...collection, freePulls: collection.freePulls + 1, freePullRoutes: [...collection.freePullRoutes, routeId] };
}

/** Uniform odds for the pool, for the "提供割合" screen. */
export const gachaOdds = (pool: readonly string[]) => pool.map(petId => ({ petId, rate: 1 / pool.length }));

function pickOne(candidates: readonly string[], random: () => number) {
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

/** One pull. A free pull needs a stored free pull; a paid pull is assumed to be paid for. */
export function pullOnce(collection: MobbyCollection, pool: readonly string[], kind: PullKind, random: () => number = Math.random): MobbyCollection {
  if (pool.length === 0) return collection;
  if (kind === 'free' && collection.freePulls <= 0) return collection;
  const paidPulls = kind === 'paid' ? collection.paidPulls + 1 : collection.paidPulls;
  const unowned = pool.filter(petId => !ownsMobby(collection, petId));
  const guaranteed = kind === 'paid' && paidPulls % PAID_PITY_INTERVAL === 0 && unowned.length > 0;
  const petId = pickOne(guaranteed ? unowned : pool, random);
  const result: PullResult = { petId, isNew: !ownsMobby(collection, petId), guaranteed, kind };
  return {
    ...collection,
    owned: { ...collection.owned, [petId]: (collection.owned[petId] ?? 0) + 1 },
    paidPulls,
    freePulls: kind === 'free' ? collection.freePulls - 1 : collection.freePulls,
    unrevealed: [...collection.unrevealed, result],
  };
}

/** Five paid pulls in a row (the 5連). Each counts toward the guarantee on its own. */
export function pullFive(collection: MobbyCollection, pool: readonly string[], random: () => number = Math.random): MobbyCollection {
  let next = collection;
  for (let index = 0; index < FIVE_PULL_COUNT; index++) next = pullOnce(next, pool, 'paid', random);
  return next;
}

/** The reveal ceremony is over. */
export function acknowledgePulls(collection: MobbyCollection): MobbyCollection {
  return collection.unrevealed.length ? { ...collection, unrevealed: [] } : collection;
}
