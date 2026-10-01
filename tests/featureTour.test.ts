import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_SECTIONS, buildTourPlan, navSlice, tourPickerSections } from '../src/data/featureTour.ts';

test('"all" runs every section in tab-bar order, starting at the home', () => {
  const plan = buildTourPlan('all', { gacha: true });
  assert.deepEqual([...new Set(plan.map(step => step.section))], ['home', 'book', 'gacha', 'walk', 'collection']);
  assert.equal(plan[0].section, 'home');
  assert.deepEqual(plan.map(step => step.index), plan.map((_, i) => i + 1));
  assert.ok(plan.every(step => step.total === plan.length));
});

test('one section yields only its own steps', () => {
  const plan = buildTourPlan('walk', { gacha: true });
  assert.ok(plan.length > 0 && plan.every(step => step.section === 'walk' && step.tab === 'walk'));
});

test('the gacha is left out while its tab is not on the bar', () => {
  assert.ok(buildTourPlan('all', { gacha: false }).every(step => step.section !== 'gacha'));
  assert.equal(buildTourPlan('gacha', { gacha: false }).length, 0);
  assert.ok(!tourPickerSections({ gacha: false }).some(section => section.id === 'gacha'));
});

test('nav anchors map to the tab slots, which shift with the gacha tab', () => {
  assert.deepEqual(navSlice('nav-walk', { gacha: true }), { index: 3, count: 5 });
  assert.deepEqual(navSlice('nav-walk', { gacha: false }), { index: 2, count: 4 });
  assert.equal(navSlice('nav-gacha', { gacha: false }), null);
  assert.equal(navSlice('home-steps', { gacha: true }), null);
});

test('every step reads as a short card', () => {
  for (const section of TOUR_SECTIONS) for (const step of section.steps) {
    assert.ok(step.title.length <= 14, step.title);
    assert.ok(step.detail.length <= 80, step.detail);
  }
});
