/**
 * Server-owned gacha roster. Keep these IDs in sync with src/petCatalog.ts.
 * Downloadable Mobbies can be added here without importing application code.
 */
export const GACHA_PET_IDS = [
  "mobirin",
  "mobichi",
  "yami",
  "mobiyan",
  "mobiyura",
  "reomoby",
  "potemoby",
  "mobibou",
  "babumoby",
  "bearmobby",
  "boymobby",
  "dogmobby",
  "ojimobby",
  "reamobby",
  "shikamobby",
  "uyumobby",
  "wolfmobby"
] as const;

export const PAID_PITY_INTERVAL = 25;

export function validateGachaPetIds(petIds: readonly string[] = GACHA_PET_IDS): void {
  if (petIds.length === 0 || petIds.some((petId) => !petId) || new Set(petIds).size !== petIds.length) {
    throw new Error("Gacha pet IDs must be non-empty and unique");
  }
}
