/**
 * Pure rules for optional collection items and mock exchange passes.
 * Goshuin ownership itself remains in `services/progress`; this module only
 * records optional results for an already-awarded shrine.
 */

/** Natural keychain probability for each newly awarded goshuin. */
export const KEYCHAIN_DROP_RATE = 0.10;

/** Legacy sparkle probability retained for existing saved collections. */
export const SPARKLE_DROP_RATE = 0.20;

/** @deprecated Use KEYCHAIN_DROP_RATE or SPARKLE_DROP_RATE explicitly. */
export const SPECIAL_DROP_RATE = SPARKLE_DROP_RATE;

export type SpecialKind = 'keychain' | 'sparkle';
export type NewPassKind = 'coverChange' | 'keychainDrop';
export type LegacyPassKind = 'ten' | 'fifty' | 'subscription';
/** Kept broad so old callers continue to type-check during migration. */
export type PassKind = NewPassKind | LegacyPassKind;

/** Persisted state for the natural keychain result. */
export type KeychainDecision = 'pending' | 'declined' | 'ticket' | 'natural';
export type SpecialDropResult = { keychain: boolean; sparkle: boolean };

/**
 * New ticket balances are independent of the previous ten/fifty/subscription
 * balances.  Legacy fields are retained verbatim and are never converted.
 */
export type PassInventory = {
  coverChange: number;
  keychainDrop: number;
  /** @deprecated Previous exchange-pass balance. */
  ten: number;
  /** @deprecated Previous exchange-pass balance. */
  fifty: number;
  /** @deprecated Previous exchange-pass balance. */
  subscription: boolean;
};

export type SpecialCollection = {
  keychains: Record<string, number>;
  sparkles: Record<string, number>;
  rolls: Record<string, SpecialDropResult>;
  /** One persisted decision per shrine's natural keychain roll. */
  keychainDecisions: Record<string, KeychainDecision>;
  passes: PassInventory;
};

export const emptySpecialCollection = (): SpecialCollection => ({
  keychains: {},
  sparkles: {},
  rolls: {},
  keychainDecisions: {},
  passes: { coverChange: 0, keychainDrop: 0, ten: 0, fifty: 0, subscription: false },
});

function positiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

function normalizeCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, count]) => Number.isInteger(count) && Number(count) > 0)
      .map(([id, count]) => [id, Number(count)]),
  );
}

function isKeychainDecision(value: unknown): value is KeychainDecision {
  return value === 'pending' || value === 'declined' || value === 'ticket' || value === 'natural';
}

function normalizedDecisionForRoll(result: SpecialDropResult, value: unknown): KeychainDecision {
  // A natural success must never become ticket-eligible through malformed or
  // legacy decision data. Failed legacy rolls safely resume as pending.
  if (result.keychain) return 'natural';
  return isKeychainDecision(value) ? value : 'pending';
}

export function normalizeSpecialCollection(value: unknown): SpecialCollection {
  if (!value || typeof value !== 'object') return emptySpecialCollection();
  const source = value as Partial<SpecialCollection> & { decisions?: unknown };
  const passSource = source.passes && typeof source.passes === 'object'
    ? source.passes
    : {} as Partial<PassInventory>;

  const rolls = source.rolls && typeof source.rolls === 'object'
    ? Object.fromEntries(
      Object.entries(source.rolls)
        .filter(([, result]) => !!result && typeof result === 'object')
        .map(([id, result]) => {
          const roll = result as Partial<SpecialDropResult>;
          return [id, { keychain: roll.keychain === true, sparkle: roll.sparkle === true }];
        }),
    ) as Record<string, SpecialDropResult>
    : {};

  // Accept `decisions` as a harmless alias from an intermediate build, while
  // writing the canonical `keychainDecisions` field going forward.
  const decisionSource = source.keychainDecisions && typeof source.keychainDecisions === 'object'
    ? source.keychainDecisions
    : source.decisions && typeof source.decisions === 'object'
      ? source.decisions
      : {};
  const rawDecisions = Object.fromEntries(
    Object.entries(decisionSource).filter(([, decision]) => isKeychainDecision(decision)),
  );
  const keychainDecisions: Record<string, KeychainDecision> = {};
  for (const [id, result] of Object.entries(rolls)) {
    keychainDecisions[id] = normalizedDecisionForRoll(result, rawDecisions[id]);
  }

  return {
    keychains: normalizeCounts(source.keychains),
    sparkles: normalizeCounts(source.sparkles),
    rolls,
    keychainDecisions,
    passes: {
      // New balances default to zero when loading legacy data.
      coverChange: positiveInteger(passSource.coverChange),
      keychainDrop: positiveInteger(passSource.keychainDrop),
      // Legacy balances remain independent and are never mapped to tickets.
      ten: positiveInteger(passSource.ten),
      fifty: positiveInteger(passSource.fifty),
      subscription: passSource.subscription === true,
    },
  };
}

function addCount(counts: Record<string, number>, shrineId: string) {
  return { ...counts, [shrineId]: (counts[shrineId] ?? 0) + 1 };
}

/**
 * Roll optional items for one already-awarded shrine. The keychain uses the
 * exact `< 0.10` boundary; sparkle remains an independent legacy 20% roll.
 * A persisted shrine result is never re-rolled.
 */
export function rollSpecialDrop(collection: SpecialCollection, shrineId: string, random: () => number = Math.random): SpecialCollection {
  const previousResult = collection.rolls[shrineId];
  const decisions = collection.keychainDecisions ?? {};
  if (previousResult) {
    if (decisions[shrineId]) return collection;
    return {
      ...collection,
      keychainDecisions: {
        ...decisions,
        [shrineId]: previousResult.keychain ? 'natural' : 'pending',
      },
    };
  }

  const result = {
    keychain: random() < KEYCHAIN_DROP_RATE,
    sparkle: random() < SPARKLE_DROP_RATE,
  };
  return {
    ...collection,
    keychains: result.keychain ? addCount(collection.keychains, shrineId) : collection.keychains,
    sparkles: result.sparkle ? addCount(collection.sparkles, shrineId) : collection.sparkles,
    rolls: { ...collection.rolls, [shrineId]: result },
    keychainDecisions: {
      ...decisions,
      [shrineId]: result.keychain ? 'natural' : 'pending',
    },
  };
}

export function hasPass(collection: SpecialCollection, kind: NewPassKind) {
  return collection.passes[kind] > 0;
}

/** Legacy helper retained while the old award UI migrates. */
export function hasExchangePass(collection: SpecialCollection) {
  return hasPass(collection, 'keychainDrop')
    || collection.passes.subscription
    || collection.passes.ten > 0
    || collection.passes.fifty > 0;
}

/** Grant passes using mock/local semantics without converting legacy balances. */
export function grantPass(collection: SpecialCollection, kind: PassKind, amount = 1): SpecialCollection {
  const quantity = positiveInteger(amount);
  if (quantity <= 0) return collection;
  if (kind === 'coverChange' || kind === 'keychainDrop') {
    return { ...collection, passes: { ...collection.passes, [kind]: (collection.passes[kind] ?? 0) + quantity } };
  }
  if (kind === 'subscription') {
    return { ...collection, passes: { ...collection.passes, subscription: true } };
  }
  return { ...collection, passes: { ...collection.passes, [kind]: (collection.passes[kind] ?? 0) + quantity } };
}

/** New ticket purchases grant one; old pass purchases retain 10/50 semantics. */
export function purchasePass(collection: SpecialCollection, kind: PassKind): SpecialCollection {
  if (kind === 'ten') return grantPass(collection, kind, 10);
  if (kind === 'fifty') return grantPass(collection, kind, 50);
  return grantPass(collection, kind, 1);
}

/**
 * Unlock one existing route cover. The hook layer supplies ownership and
 * availability because those live in saved book-design state.
 */
export function redeemCoverChange(collection: SpecialCollection, routeId: string, options: { coverExists?: boolean; alreadyOwned?: boolean } = {}): SpecialCollection {
  if (!routeId || options.coverExists === false || options.alreadyOwned === true || !hasPass(collection, 'coverChange')) return collection;
  return {
    ...collection,
    passes: { ...collection.passes, coverChange: collection.passes.coverChange - 1 },
  };
}

/**
 * Use one keychain ticket only after a persisted natural failure. The
 * `pending` decision is the guard against absent/successful rolls; repeated
 * redemption is idempotent.
 */
export function redeemKeychainDrop(collection: SpecialCollection, shrineId: string): SpecialCollection {
  const result = collection.rolls[shrineId];
  const decisions = collection.keychainDecisions ?? {};
  if (!result || result.keychain || decisions[shrineId] !== 'pending' || !hasPass(collection, 'keychainDrop')) return collection;
  return {
    ...collection,
    keychains: addCount(collection.keychains, shrineId),
    keychainDecisions: { ...decisions, [shrineId]: 'ticket' },
    passes: { ...collection.passes, keychainDrop: collection.passes.keychainDrop - 1 },
  };
}

/** Decline a failed natural keychain roll without consuming a ticket. */
export function declineKeychainDrop(collection: SpecialCollection, shrineId: string): SpecialCollection {
  const result = collection.rolls[shrineId];
  const decisions = collection.keychainDecisions ?? {};
  if (!result || result.keychain || decisions[shrineId] !== 'pending') return collection;
  return { ...collection, keychainDecisions: { ...decisions, [shrineId]: 'declined' } };
}

/**
 * Compatibility API for the previous award UI. New UI should call
 * `redeemKeychainDrop`; this wrapper never spends a new keychain ticket on a
 * sparkle. Legacy ten/fifty/subscription balances are not converted.
 */
export function redeemPass(collection: SpecialCollection, shrineId: string, kind: SpecialKind): SpecialCollection {
  if (kind === 'keychain') {
    const next = redeemKeychainDrop(collection, shrineId);
    if (next !== collection) return next;
  }
  const result = collection.rolls[shrineId];
  if (!result || result[kind]) return collection;
  const decisions = collection.keychainDecisions ?? {};
  if (kind === 'keychain' && decisions[shrineId] !== 'pending') return collection;
  const passes = collection.passes.subscription
    ? collection.passes
    : collection.passes.ten > 0
      ? { ...collection.passes, ten: collection.passes.ten - 1 }
      : collection.passes.fifty > 0
        ? { ...collection.passes, fifty: collection.passes.fifty - 1 }
        : null;
  if (!passes) return collection;
  return {
    ...collection,
    passes,
    keychains: kind === 'keychain' ? addCount(collection.keychains, shrineId) : collection.keychains,
    sparkles: kind === 'sparkle' ? addCount(collection.sparkles, shrineId) : collection.sparkles,
    rolls: { ...collection.rolls, [shrineId]: { ...result, [kind]: true } },
    ...(kind === 'keychain' ? { keychainDecisions: { ...decisions, [shrineId]: 'ticket' as const } } : {}),
  };
}
