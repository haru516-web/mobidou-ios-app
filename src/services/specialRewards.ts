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
/** Drop rate while a monthly plan is active. */
export const KEYCHAIN_PLAN_RATE = 0.50;

export type KeychainPlan = 'none' | 'light' | 'plus';
export const KEYCHAIN_PLANS: readonly KeychainPlan[] = ['none', 'light', 'plus'];
export const isKeychainPlan = (value: unknown): value is KeychainPlan => KEYCHAIN_PLANS.includes(value as KeychainPlan);
export const keychainRate = (plan: KeychainPlan) => plan === 'none' ? KEYCHAIN_BASE_RATE : KEYCHAIN_PLAN_RATE;

/** Exchange tickets granted each month by the "plus" plan; they do not carry over. */
export const PLUS_MONTHLY_TICKETS = 10;

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
};

export const emptySpecialCollection = (): SpecialCollection => ({
  keychains: {},
  sparkles: {},
  passes: { keychainDrop: 0 },
  arrival: null,
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
  const source = value as { keychains?: unknown; sparkles?: unknown; passes?: { keychainDrop?: unknown } | null; arrival?: unknown };
  return {
    keychains: normalizeOwned(source.keychains),
    sparkles: normalizeOwned(source.sparkles),
    passes: { keychainDrop: positiveInteger(source.passes?.keychainDrop) },
    arrival: normalizeArrival(source.arrival),
  };
}

export const ownsKeychain = (collection: SpecialCollection, shrineId: string) => (collection.keychains[shrineId] ?? 0) > 0;

/**
 * Roll once for the arrival on screen. Idempotent for the same shrine, so a
 * re-render or a restart during the ceremony shows the same result.
 */
export function rollKeychainOnArrival(collection: SpecialCollection, shrineId: string, plan: KeychainPlan = 'none', random: () => number = Math.random): SpecialCollection {
  if (collection.arrival?.shrineId === shrineId) return collection;
  const rate = keychainRate(plan);
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
