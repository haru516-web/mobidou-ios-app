import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOME_WIDGET_ORDER, normalizeHomeWidgetItems, setHomeWidgetSlot, swapHomeWidgets, normalizeHomeWidgetOrder } from '../src/services/homePreferences.ts';

test('home cards migrate old orders and allow two goshuin or miniature cards', () => {
  assert.deepEqual(normalizeHomeWidgetOrder(['steps', 'map', 'miniature', 'goshuin']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(['miniature', 'steps']), ['miniature', 'steps']);
  assert.deepEqual(normalizeHomeWidgetOrder(['steps', 'steps', 'map', 'goshuin']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(['goshuin', 'goshuin']), ['goshuin', 'goshuin']);
  assert.deepEqual(normalizeHomeWidgetOrder(['miniature', 'miniature']), ['miniature', 'miniature']);
  assert.deepEqual(normalizeHomeWidgetOrder(['steps']), DEFAULT_HOME_WIDGET_ORDER);
  assert.deepEqual(normalizeHomeWidgetOrder(['unknown', 'steps', 'map']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(null), DEFAULT_HOME_WIDGET_ORDER);
});

test('slot replacement allows art duplicates but keeps utility cards unique', () => {
  const initial = DEFAULT_HOME_WIDGET_ORDER;
  assert.deepEqual(setHomeWidgetSlot(initial, 0, 'steps'), ['steps', 'miniature']);
  assert.deepEqual(setHomeWidgetSlot(initial, 1, 'map'), ['goshuin', 'map']);
  assert.deepEqual(setHomeWidgetSlot(initial, 0, 'miniature'), ['miniature', 'miniature']);
  assert.deepEqual(setHomeWidgetSlot(initial, 1, 'goshuin'), ['goshuin', 'goshuin']);
  assert.deepEqual(initial, DEFAULT_HOME_WIDGET_ORDER);
});

test('per-slot shrine choices normalize independently', () => {
  assert.deepEqual(normalizeHomeWidgetItems(['asagiri', 'rain']), ['asagiri', 'rain']);
  assert.deepEqual(normalizeHomeWidgetItems(['asagiri']), ['asagiri', null]);
  assert.deepEqual(normalizeHomeWidgetItems(null), [null, null]);
});

test('left and right order can be swapped without changing the selected pair', () => {
  const swapped = swapHomeWidgets(DEFAULT_HOME_WIDGET_ORDER);
  assert.deepEqual(swapped, ['miniature', 'goshuin']);
  assert.deepEqual(swapHomeWidgets(swapped), DEFAULT_HOME_WIDGET_ORDER);
});
