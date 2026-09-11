export const SPECIAL_DROP_RATE = 0.2;

export type SpecialKind = 'keychain' | 'sparkle';
export type PassKind = 'ten' | 'fifty' | 'subscription';
export type SpecialDropResult = { keychain: boolean; sparkle: boolean };
export type PassInventory = { ten: number; fifty: number; subscription: boolean };
export type SpecialCollection = {
  keychains: Record<string, number>;
  sparkles: Record<string, number>;
  rolls: Record<string, SpecialDropResult>;
  passes: PassInventory;
};

export const emptySpecialCollection = (): SpecialCollection => ({
  keychains: {},
  sparkles: {},
  rolls: {},
  passes: { ten: 0, fifty: 0, subscription: false },
});

function normalizeCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([, count]) => Number.isInteger(count) && Number(count) > 0).map(([id, count]) => [id, Number(count)]));
}

export function normalizeSpecialCollection(value: unknown): SpecialCollection {
  if (!value || typeof value !== 'object') return emptySpecialCollection();
  const source = value as Partial<SpecialCollection>;
  const passSource = source.passes && typeof source.passes === 'object' ? source.passes : {} as Partial<PassInventory>;
  const rolls = source.rolls && typeof source.rolls === 'object'
    ? Object.fromEntries(Object.entries(source.rolls).filter(([, result]) => !!result && typeof result === 'object').map(([id, result]) => {
      const roll = result as Partial<SpecialDropResult>;
      return [id, { keychain: roll.keychain === true, sparkle: roll.sparkle === true }];
    }))
    : {};
  return {
    keychains: normalizeCounts(source.keychains),
    sparkles: normalizeCounts(source.sparkles),
    rolls,
    passes: {
      ten: Number.isInteger(passSource.ten) && Number(passSource.ten) > 0 ? Number(passSource.ten) : 0,
      fifty: Number.isInteger(passSource.fifty) && Number(passSource.fifty) > 0 ? Number(passSource.fifty) : 0,
      subscription: passSource.subscription === true,
    },
  };
}

function addCount(counts: Record<string, number>, shrineId: string) {
  return { ...counts, [shrineId]: (counts[shrineId] ?? 0) + 1 };
}

export function rollSpecialDrop(collection: SpecialCollection, shrineId: string, random: () => number = Math.random): SpecialCollection {
  if (collection.rolls[shrineId]) return collection;
  const result = { keychain: random() < SPECIAL_DROP_RATE, sparkle: random() < SPECIAL_DROP_RATE };
  return {
    ...collection,
    keychains: result.keychain ? addCount(collection.keychains, shrineId) : collection.keychains,
    sparkles: result.sparkle ? addCount(collection.sparkles, shrineId) : collection.sparkles,
    rolls: { ...collection.rolls, [shrineId]: result },
  };
}

export function purchasePass(collection: SpecialCollection, kind: PassKind): SpecialCollection {
  if (kind === 'subscription') return { ...collection, passes: { ...collection.passes, subscription: true } };
  const uses = kind === 'ten' ? 10 : 50;
  return { ...collection, passes: { ...collection.passes, [kind]: collection.passes[kind] + uses } };
}

export function hasExchangePass(collection: SpecialCollection) {
  return collection.passes.subscription || collection.passes.ten > 0 || collection.passes.fifty > 0;
}

export function redeemPass(collection: SpecialCollection, shrineId: string, kind: SpecialKind): SpecialCollection {
  if (collection.rolls[shrineId]?.[kind]) return collection;
  if (!hasExchangePass(collection)) return collection;
  const passes = collection.passes.subscription
    ? collection.passes
    : collection.passes.ten > 0
      ? { ...collection.passes, ten: collection.passes.ten - 1 }
      : { ...collection.passes, fifty: collection.passes.fifty - 1 };
  const previousResult = collection.rolls[shrineId] ?? { keychain: false, sparkle: false };
  return {
    ...collection,
    passes,
    keychains: kind === 'keychain' ? addCount(collection.keychains, shrineId) : collection.keychains,
    sparkles: kind === 'sparkle' ? addCount(collection.sparkles, shrineId) : collection.sparkles,
    rolls: { ...collection.rolls, [shrineId]: { ...previousResult, [kind]: true } },
  };
}
