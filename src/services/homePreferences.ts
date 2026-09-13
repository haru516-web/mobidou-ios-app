export const HOME_WIDGET_IDS = ['goshuin', 'miniature', 'map', 'steps'] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

/** The two home cards, in left-to-right order. */
export type HomeWidgetOrder = [HomeWidgetId, HomeWidgetId];

export const DEFAULT_HOME_WIDGET_ORDER: HomeWidgetOrder = ['goshuin', 'miniature'];

const HOME_WIDGET_SET = new Set<string>(HOME_WIDGET_IDS);

export function isHomeWidgetId(value: unknown): value is HomeWidgetId {
  return typeof value === 'string' && HOME_WIDGET_SET.has(value);
}

/**
 * Read both the current two-slot value and the previous four-item order.
 * Invalid entries are ignored while collecting the first two unique IDs so a
 * malformed legacy value cannot create duplicate cards on the home screen.
 */
export function normalizeHomeWidgetOrder(value: unknown): HomeWidgetOrder {
  if (!Array.isArray(value)) return [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder;
  const unique: HomeWidgetId[] = [];
  for (const item of value) {
    if (isHomeWidgetId(item) && !unique.includes(item)) unique.push(item);
    if (unique.length === 2) break;
  }
  return unique.length === 2 ? [unique[0], unique[1]] : [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder;
}

/** Replace one slot while preserving the no-duplicates invariant. */
export function setHomeWidgetSlot(order: HomeWidgetOrder, slot: 0 | 1, widget: HomeWidgetId): HomeWidgetOrder {
  if (order[slot] === widget) return [...order] as HomeWidgetOrder;
  if (order[1 - slot] === widget) return [order[1], order[0]] as HomeWidgetOrder;
  return slot === 0 ? [widget, order[1]] : [order[0], widget];
}

/** Swap the left and right cards. */
export function swapHomeWidgets(order: HomeWidgetOrder): HomeWidgetOrder {
  return [order[1], order[0]];
}
