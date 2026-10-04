import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGAL_MARKDOWN } from '../server/src/legalNotice.ts';
import { PRIVACY_MARKDOWN } from '../server/src/privacyPolicy.ts';
import { SHOP_PRODUCTS } from '../src/data/shop.ts';

test('the prices in the legal notice are the ones the shop shows', () => {
  for (const product of SHOP_PRODUCTS.filter(item => item.kind === 'pull')) {
    assert.ok(LEGAL_MARKDOWN.includes(`${product.title} ${product.price}`), `${product.title} ${product.price}`);
  }
});

test('the monthly caps for minors are the same in the legal notice and the privacy policy', () => {
  for (const text of [LEGAL_MARKDOWN, PRIVACY_MARKDOWN]) {
    assert.ok(text.includes('5,000円'));
    assert.ok(text.includes('10,000円'));
  }
});
