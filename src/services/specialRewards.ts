/**
 * Pure rules for the miniature keychain drop and its exchange tickets.
 * Goshuin ownership itself remains in `services/progress`.
 *
 * Rules:
 * - A keychain is owned at most once per shrine.
 * - Each time the player arrives at a shrine whose keychain they do not own,
 *   the ceremony rolls once (base rate, or the subscriber rate). Owned means
 *   no roll at all.
 * - An exchange ticket may be spent only on the miss that is on screen; it is
 *   never usable on a past miss.
 */

/** Drop rate for players without a subscription. */
export const KEYCHAIN_BASE_RATE = 0.10;
/** Drop rate while the plus plan is active: every shrine arrival hands over the keychain. */
export const KEYCHAIN_PLAN_RATE = 1;

/** Shrines whose keychain always drops (the first-step tutorial route), so a new player sees what the miniatures are. */
export const GUARANTEED_KEYCHAIN_SHRINES: ReadonlySet<string> = new Set(['hatsumobi']);

export type KeychainPlan = 'none' | 'plus';
export const KEYCHAIN_PLANS: readonly KeychainPlan[] = ['none', 'plus'];
export const isKeychainPlan = (value: unknown): value is KeychainPlan => KEYCHAIN_PLANS.includes(value as KeychainPlan);
export const keychainRate = (plan: KeychainPlan) => plan === 'none' ? KEYCHAIN_BASE_RATE : KEYCHAIN_PLAN_RATE;

/** Gacha 木札 the "plus" plan grants each month (the server credits them; they carry over like any other 木札). */
export const PLUS_MONTHLY_TICKETS = 1;

export type PassKind = 'keychainDrop';
export type PassInventory = { keychainDrop: number };

export type KeychainOutcome = 'owned' | 'won' | 'missed' | 'ticket';

/** The roll for the shrine whose arrival ceremony is on screen. */
export type KeychainArrival = { shrineId: string; outcome: KeychainOutcome; rate: number };

export type SpecialCollection = {
  /** 0 or 1 per shrine. */
  keychains: Record<string, number>;
  /** Legacy sparkle goshuin. Kept only so saved collections still display them; never rolled again. */
  sparkles: Record<string, number>;
  passes: PassInventory;
  /** Persisted so that closing the app mid-ceremony can never re-roll. Cleared when the ceremony ends. */
  arrival: KeychainArrival | null;
  /** The Monday (local, yyyy-mm-dd) of the week whose free weekly pass has been taken; null if never. */
  weeklyPassWeek: string | null;
};

export const emptySpecialCollection = (): SpecialCollection => ({
  keychains: {},
  sparkles: {},
  passes: { keychainDrop: 0 },
  arrival: null,
  weeklyPassWeek: null,
});

function positiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

function normalizeOwned(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, count]) => positiveInteger(count) > 0)
      // Old saves could hold several copies; the cap is one.
      .map(([id]) => [id, 1]),
  );
}

function normalizeArrival(value: unknown): KeychainArrival | null {
  if (!value || typeof value !== 'object') return null;
  const { shrineId, outcome, rate } = value as Partial<KeychainArrival>;
  if (typeof shrineId !== 'string' || !['owned', 'won', 'missed', 'ticket'].includes(outcome as string)) return null;
  return { shrineId, outcome: outcome as KeychainOutcome, rate: typeof rate === 'number' && rate >= 0 && rate <= 1 ? rate : KEYCHAIN_BASE_RATE };
}

/** Accepts every earlier save shape (rolls, decisions, ten/fifty/subscription, cover tickets) and keeps only what still means something. */
export function normalizeSpecialCollection(value: unknown): SpecialCollection {
  if (!value || typeof value !== 'object') return emptySpecialCollection();
  const source = value as { keychains?: unknown; sparkles?: unknown; passes?: { keychainDrop?: unknown } | null; arrival?: unknown; weeklyPassWeek?: unknown };
  return {
    keychains: normalizeOwned(source.keychains),
    sparkles: normalizeOwned(source.sparkles),
    passes: { keychainDrop: positiveInteger(source.passes?.keychainDrop) },
    arrival: normalizeArrival(source.arrival),
    weeklyPassWeek: typeof source.weeklyPassWeek === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.weeklyPassWeek) ? source.weeklyPassWeek : null,
  };
}

export const ownsKeychain = (collection: SpecialCollection, shrineId: string) => (collection.keychains[shrineId] ?? 0) > 0;

/**
 * Roll once for the arrival on screen. Idempotent for the same shrine, so a
 * re-render or a restart during the ceremony shows the same result.
 */
export function rollKeychainOnArrival(collection: SpecialCollection, shrineId: string, plan: KeychainPlan = 'none', random: () => number = Math.random): SpecialCollection {
  if (collection.arrival?.shrineId === shrineId) return collection;
  const rate = GUARANTEED_KEYCHAIN_SHRINES.has(shrineId) ? 1 : keychainRate(plan);
  if (ownsKeychain(collection, shrineId)) return { ...collection, arrival: { shrineId, outcome: 'owned', rate } };
  const won = random() < rate;
  return {
    ...collection,
    keychains: won ? { ...collection.keychains, [shrineId]: 1 } : collection.keychains,
    arrival: { shrineId, outcome: won ? 'won' : 'missed', rate },
  };
}

/** Spend one ticket on the miss that is on screen. Anything else is a no-op. */
export function redeemKeychainTicket(collection: SpecialCollection, shrineId: string): SpecialCollection {
  const { arrival } = collection;
  if (!arrival || arrival.shrineId !== shrineId || arrival.outcome !== 'missed' || collection.passes.keychainDrop <= 0) return collection;
  return {
    ...collection,
    keychains: { ...collection.keychains, [shrineId]: 1 },
    passes: { keychainDrop: collection.passes.keychainDrop - 1 },
    arrival: { ...arrival, outcome: 'ticket' },
  };
}

/** The ceremony is over; the result cannot be acted on any more. */
export function finishArrival(collection: SpecialCollection): SpecialCollection {
  return collection.arrival ? { ...collection, arrival: null } : collection;
}

export function grantPass(collection: SpecialCollection, kind: PassKind, amount = 1): SpecialCollection {
  const quantity = positiveInteger(amount);
  if (kind !== 'keychainDrop' || quantity <= 0) return collection;
  return { ...collection, passes: { keychainDrop: collection.passes.keychainDrop + quantity } };
}

/** The free weekly pass is open once per local week (Monday to Sunday); `week` is that week's Monday. */
export const weeklyPassAvailable = (collection: SpecialCollection, week: string) => collection.weeklyPassWeek !== week;

/** Takes the week's free pass: an ordinary miniature pass, once for the given week. */
export function claimWeeklyPass(collection: SpecialCollection, week: string): SpecialCollection {
  if (!weeklyPassAvailable(collection, week)) return collection;
  return { ...grantPass(collection, 'keychainDrop', 1), weeklyPassWeek: week };
}

export type SkippedArrival = { shrineId: string; outcome: KeychainOutcome };

/**
 * Settles the arrival ceremonies that were skipped all at once, in order. Each shrine rolls exactly as it would in its own
 * ceremony (the one already on screen has rolled, and keeps its result). With `useTickets`, an exchange ticket is spent on
 * each miss while any are left, as the player would have done on the screen of that shrine; without it, none is spent.
 * No arrival is left open afterwards.
 */
export function skipArrivals(
  collection: SpecialCollection,
  shrineIds: readonly string[],
  plan: KeychainPlan = 'none',
  useTickets = false,
  random: () => number = Math.random,
): { collection: SpecialCollection; results: SkippedArrival[] } {
  let next = collection;
  const results: SkippedArrival[] = [];
  for (const shrineId of shrineIds) {
    if (next.arrival?.shrineId !== shrineId) next = rollKeychainOnArrival({ ...next, arrival: null }, shrineId, plan, random);
    if (useTickets && next.arrival?.outcome === 'missed') next = redeemKeychainTicket(next, shrineId);
    results.push({ shrineId, outcome: next.arrival?.outcome ?? 'missed' });
    next = finishArrival(next);
  }
  return { collection: next, results };
}
