import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HOME_WIDGET_ORDER, setHomeWidgetSlot, swapHomeWidgets, normalizeHomeWidgetOrder } from '../src/services/homePreferences.ts';

test('home cards keep two unique selections and migrate legacy four-item orders', () => {
  assert.deepEqual(normalizeHomeWidgetOrder(['steps', 'map', 'miniature', 'goshuin']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(['miniature', 'steps']), ['miniature', 'steps']);
  assert.deepEqual(normalizeHomeWidgetOrder(['steps', 'steps', 'map', 'goshuin']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(['steps']), DEFAULT_HOME_WIDGET_ORDER);
  assert.deepEqual(normalizeHomeWidgetOrder(['unknown', 'steps', 'map']), ['steps', 'map']);
  assert.deepEqual(normalizeHomeWidgetOrder(null), DEFAULT_HOME_WIDGET_ORDER);
});

test('selecting a slot replaces it and never creates a duplicate', () => {
  const initial = DEFAULT_HOME_WIDGET_ORDER;
  assert.deepEqual(setHomeWidgetSlot(initial, 0, 'steps'), ['steps', 'miniature']);
  assert.deepEqual(setHomeWidgetSlot(initial, 1, 'map'), ['goshuin', 'map']);
  assert.deepEqual(setHomeWidgetSlot(initial, 0, 'miniature'), ['miniature', 'goshuin']);
  assert.deepEqual(setHomeWidgetSlot(initial, 1, 'goshuin'), ['miniature', 'goshuin']);
  assert.deepEqual(initial, DEFAULT_HOME_WIDGET_ORDER);
});

test('left and right order can be swapped without changing the selected pair', () => {
  const swapped = swapHomeWidgets(DEFAULT_HOME_WIDGET_ORDER);
  assert.deepEqual(swapped, ['miniature', 'goshuin']);
  assert.deepEqual(swapHomeWidgets(swapped), DEFAULT_HOME_WIDGET_ORDER);
});
