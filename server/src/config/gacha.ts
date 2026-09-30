export interface GachaItem {
  petId: string;
  weight: number;
  rarity: number;
}

export interface GachaPool {
  id: string;
  items: GachaItem[];
  pityLimit: number;
  pityRarity: number;
}

// Rates and pity are placeholders. Product design has not been decided.
export const GACHA_POOLS: Record<string, GachaPool> = {
  standard: {
    id: "standard",
    pityLimit: 50,
    pityRarity: 3,
    items: [
      { petId: "mobby_sample_01", weight: 0.6, rarity: 1 },
      { petId: "mobby_sample_02", weight: 0.3, rarity: 2 },
      { petId: "mobby_sample_03", weight: 0.1, rarity: 3 }
    ]
  }
};

export function validatePool(pool: GachaPool): void {
  if (!pool.id || pool.items.length === 0 || pool.pityLimit < 1) throw new Error("Invalid gacha pool");
  const total = pool.items.reduce((sum, item) => sum + item.weight, 0);
  if (pool.items.some((item) => item.weight <= 0 || !item.petId) || Math.abs(total - 1) > 1e-8) {
    throw new Error("Gacha weights must be positive and sum to 1");
  }
}
