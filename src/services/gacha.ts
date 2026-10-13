/**
 * Pure rules for owning Mobbies and drawing new ones.
 *
 * - The player picks one Mobby at the very start. Every other Mobby comes from
 *   the gacha, drawn uniformly at random from the whole pool (the starter and
 *   duplicates included).
 * - Finishing a route for the first time grants one free pull.
 * - Paid pulls (single, or five at once) are ordinary pulls from the same pool:
 *   there is no guarantee of a new Mobby.
 * - A duplicate is kept as a count, so it can be shown as a small Mobby
 *   beside the main one.
 *
 * Paid pulls must be decided by the server (see docs/design-v3-monetization-server.md).
 * This module is the reference for the algorithm and drives free pulls and the
 * offline/demo behaviour.
 */

/** A five-pull is five ordinary pulls. */
export const FIVE_PULL_COUNT = 5;

export type PullKind = 'free' | 'paid';
export type PullResult = { petId: string; isNew: boolean; guaranteed: boolean; kind: PullKind };

export type MobbyCollection = {
  /** How many copies of each Mobby the player holds (1 = owned, 2+ = duplicates). */
  owned: Record<string, number>;
  /** Paid pulls made so far (a count only; it changes nothing about a draw). */
  paidPulls: number;
  /** Free pulls waiting to be used. */
  freePulls: number;
  /** 木札 bought with money. The server's wallet is the truth; this is the last balance seen, so the count can be shown offline. */
  paidTickets: number;
  /** Routes whose first clear already gave a free pull. */
  freePullRoutes: string[];
  /** Results waiting for the reveal ceremony; persisted so closing the app cannot lose a pull. */
  unrevealed: PullResult[];
  /** Operation ids of server draws already taken into this collection, so a repeated answer is never applied twice. The newest are kept. */
  appliedOps?: string[];
};

export const emptyMobbyCollection = (): MobbyCollection => ({ owned: {}, paidPulls: 0, freePulls: 0, paidTickets: 0, freePullRoutes: [], unrevealed: [] });

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
    paidTickets: count(source.paidTickets),
    freePullRoutes: Array.isArray(source.freePullRoutes) ? [...new Set(source.freePullRoutes.filter((id): id is string => typeof id === 'string'))] : [],
    unrevealed: Array.isArray(source.unrevealed) ? source.unrevealed.map(normalizePullResult).filter((result): result is PullResult => !!result && isKnownPet(result.petId)) : [],
    ...(Array.isArray(source.appliedOps) && source.appliedOps.some(id => typeof id === 'string') ? { appliedOps: source.appliedOps.filter((id): id is string => typeof id === 'string').slice(-APPLIED_OPS_KEPT) } : {}),
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

/** 木札 from a gift or a purchase: each one is a pull. */
export function grantTickets(collection: MobbyCollection, amount: number): MobbyCollection {
  return count(amount) > 0 ? { ...collection, freePulls: collection.freePulls + count(amount) } : collection;
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
  const petId = pickOne(pool, random);
  const result: PullResult = { petId, isNew: !ownsMobby(collection, petId), guaranteed: false, kind };
  return {
    ...collection,
    owned: { ...collection.owned, [petId]: (collection.owned[petId] ?? 0) + 1 },
    paidPulls,
    freePulls: kind === 'free' ? collection.freePulls - 1 : collection.freePulls,
    unrevealed: [...collection.unrevealed, result],
  };
}

/** Five paid pulls in a row (the 5連). Each is an ordinary pull. */
export function pullFive(collection: MobbyCollection, pool: readonly string[], random: () => number = Math.random): MobbyCollection {
  let next = collection;
  for (let index = 0; index < FIVE_PULL_COUNT; index++) next = pullOnce(next, pool, 'paid', random);
  return next;
}

/**
 * Record pulls the server decided (paid pulls). The server's own `isNew` is
 * ignored: it is recomputed here from what this device owns, so the reveal
 * always matches the collection the player sees. `paidPulls` is the server's
 * running count of paid pulls.
 */
export function applyServerPulls(collection: MobbyCollection, results: readonly PullResult[], paidPulls: number, isKnownPet: (id: string) => boolean, paidTickets?: number): MobbyCollection {
  let next = collection;
  for (const result of results) {
    if (!isKnownPet(result.petId)) continue;
    const entry: PullResult = { petId: result.petId, isNew: !ownsMobby(next, result.petId), guaranteed: result.guaranteed === true, kind: result.kind === 'free' ? 'free' : 'paid' };
    next = { ...next, owned: { ...next.owned, [result.petId]: (next.owned[result.petId] ?? 0) + 1 }, unrevealed: [...next.unrevealed, entry] };
  }
  return { ...next, paidPulls: Math.max(next.paidPulls, count(paidPulls)), paidTickets: paidTickets === undefined ? next.paidTickets : count(paidTickets) };
}

const APPLIED_OPS_KEPT = 100;

/**
 * Take in the draws of several server operations, each at most once: an operation id already in `appliedOps` is skipped,
 * so asking the server again (after a restart that came between saving and forgetting the id) cannot add a result twice.
 */
export function applyServerOps(collection: MobbyCollection, ops: readonly { opId: string; results: readonly PullResult[] }[], paidPulls: number, isKnownPet: (id: string) => boolean, paidTickets?: number): MobbyCollection {
  const seen = new Set(collection.appliedOps ?? []);
  let next = collection;
  const added: string[] = [];
  for (const op of ops) {
    if (seen.has(op.opId)) continue;
    next = applyServerPulls(next, op.results, 0, isKnownPet);
    seen.add(op.opId);
    added.push(op.opId);
  }
  const appliedOps = [...(collection.appliedOps ?? []), ...added].slice(-APPLIED_OPS_KEPT);
  return { ...next, appliedOps, paidPulls: Math.max(next.paidPulls, count(paidPulls)), paidTickets: paidTickets === undefined ? next.paidTickets : count(paidTickets) };
}

/** The balance the server reported for bought 木札. */
export const setPaidTickets = (collection: MobbyCollection, amount: number): MobbyCollection =>
  count(amount) === collection.paidTickets ? collection : { ...collection, paidTickets: count(amount) };

/** Every 木札 the player can pull with: free ones and bought ones. */
export const ticketCount = (collection: MobbyCollection) => collection.freePulls + collection.paidTickets;

/** The reveal ceremony is over. */
export function acknowledgePulls(collection: MobbyCollection): MobbyCollection {
  return collection.unrevealed.length ? { ...collection, unrevealed: [] } : collection;
}

/**
 * The small Mobbies to show around the main one: one per duplicate copy, of
 * any kind. Stable order (most copies first, then by id) so the crowd does not
 * reshuffle between visits; `more` is how many did not fit.
 */
export function duplicateCrowd(collection: MobbyCollection, limit = 8): { petIds: string[]; more: number } {
  const all = Object.entries(collection.owned)
    .filter(([, copies]) => copies > 1)
    .sort(([a, aCopies], [b, bCopies]) => bCopies - aCopies || (a < b ? -1 : 1))
    .flatMap(([id, copies]) => Array.from({ length: copies - 1 }, () => id));
  return { petIds: all.slice(0, Math.max(0, limit)), more: Math.max(0, all.length - Math.max(0, limit)) };
}
