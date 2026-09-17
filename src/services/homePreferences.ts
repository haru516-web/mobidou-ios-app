export const HOME_WIDGET_IDS = ['goshuin', 'miniature', 'map', 'steps'] as const;
export const CUSTOM_HOME_WIDGET_IDS = ['goshuin', 'miniature', 'map'] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];
export type CustomHomeWidgetId = (typeof CUSTOM_HOME_WIDGET_IDS)[number];

/** The two home cards, in left-to-right order. */
export type HomeWidgetOrder = [CustomHomeWidgetId, CustomHomeWidgetId];
export type HomeWidgetItems = [string | null, string | null];

export const DEFAULT_HOME_WIDGET_ORDER: HomeWidgetOrder = ['goshuin', 'miniature'];
export const DEFAULT_HOME_WIDGET_ITEMS: HomeWidgetItems = [null, null];

const HOME_WIDGET_SET = new Set<string>(HOME_WIDGET_IDS);
const CUSTOM_HOME_WIDGET_SET = new Set<string>(CUSTOM_HOME_WIDGET_IDS);

export function isHomeWidgetId(value: unknown): value is HomeWidgetId {
  return typeof value === 'string' && HOME_WIDGET_SET.has(value);
}

export function isCustomHomeWidgetId(value: unknown): value is CustomHomeWidgetId {
  return typeof value === 'string' && CUSTOM_HOME_WIDGET_SET.has(value);
}

/**
 * Read both the current two-slot value and the previous four-item order.
 * Invalid entries are ignored while collecting the first two unique IDs so a
 * malformed legacy value cannot create duplicate cards on the home screen.
 */
export function normalizeHomeWidgetOrder(value: unknown): HomeWidgetOrder {
  if (!Array.isArray(value)) return [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder;
  const valid: CustomHomeWidgetId[] = [];
  for (const item of value) {
    if (isCustomHomeWidgetId(item) && ((item === 'goshuin' || item === 'miniature') || !valid.includes(item))) valid.push(item);
    if (valid.length === 2) break;
  }
  return valid.length === 2 ? [valid[0], valid[1]] : [...DEFAULT_HOME_WIDGET_ORDER] as HomeWidgetOrder;
}

export function normalizeHomeWidgetItems(value: unknown): HomeWidgetItems {
  if (!Array.isArray(value)) return [...DEFAULT_HOME_WIDGET_ITEMS];
  return [typeof value[0] === 'string' ? value[0] : null, typeof value[1] === 'string' ? value[1] : null];
}

/** Replace one slot while preserving the no-duplicates invariant. */
export function setHomeWidgetSlot(order: HomeWidgetOrder, slot: 0 | 1, widget: HomeWidgetId): HomeWidgetOrder {
  if (!isCustomHomeWidgetId(widget)) return [...order] as HomeWidgetOrder;
  if (order[slot] === widget) return [...order] as HomeWidgetOrder;
  if (widget === 'map' && order[1 - slot] === widget) return [order[1], order[0]] as HomeWidgetOrder;
  return slot === 0 ? [widget, order[1]] : [order[0], widget];
}

/** Swap the left and right cards. */
export function swapHomeWidgets(order: HomeWidgetOrder): HomeWidgetOrder {
  return [order[1], order[0]];
}
