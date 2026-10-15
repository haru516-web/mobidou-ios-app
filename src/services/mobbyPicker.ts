/**
 * The order of the Mobbies in the picker: the ones the player has come first, from the left, in the catalog's order;
 * the ones not met yet (shown locked) follow. Event Mobbies are listed only once they are owned.
 * Without an ownership check (the first pick) the catalog order is kept as it is.
 */
export function orderForPicker<T extends { id: string }>(ordinary: readonly T[], event: readonly T[], isOwned?: (id: T['id']) => boolean): T[] {
  if (!isOwned) return [...ordinary];
  const owned = [...ordinary, ...event].filter(pet => isOwned(pet.id));
  const notYet = ordinary.filter(pet => !isOwned(pet.id));
  return [...owned, ...notYet];
}
