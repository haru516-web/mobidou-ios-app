// Artwork for the gacha tabs, the gacha navigation icon and the shop (assets/ui-round5; sizes and fixed edges are listed in
// its MANIFEST.md and slices.json). The pictures fill their whole canvas, so `box` is the full picture.
import type { UiArt } from './uiArt';
import type { ShopProduct } from './shop';

export const GACHA_NAV_ICON = require('../../assets/ui-round5/icons/icon-gacha.webp');

export const GACHA_UI_ART = {
  tabOn: { source: require('../../assets/ui-round5/tabs/tab-on.webp'), width: 480, height: 128, box: { x0: 0, x1: 480, y0: 0, y1: 128 }, slice: { left: 56, right: 56 } },
  tabOff: { source: require('../../assets/ui-round5/tabs/tab-off.webp'), width: 480, height: 128, box: { x0: 0, x1: 480, y0: 0, y1: 128 }, slice: { left: 56, right: 56 } },
  shopCard: { source: require('../../assets/ui-round5/shop/card-plate.webp'), width: 1000, height: 300, box: { x0: 0, x1: 1000, y0: 0, y1: 300 }, slice: { left: 80, right: 80, top: 60, bottom: 60 } },
  shopHeading: { source: require('../../assets/ui-round5/shop/heading-plate.webp'), width: 480, height: 96, box: { x0: 0, x1: 480, y0: 0, y1: 96 }, slice: { left: 40, right: 40 } },
} satisfies Record<string, UiArt>;

export type GachaUiArtName = keyof typeof GACHA_UI_ART;

export const SHOP_PRODUCT_ART: Record<ShopProduct['id'], number> = {
  pull1: require('../../assets/ui-round5/shop/product-pull1.webp'),
  pull5: require('../../assets/ui-round5/shop/product-pull5.webp'),
  light: require('../../assets/ui-round5/shop/product-plan-light.webp'),
  plus: require('../../assets/ui-round5/shop/product-plan-plus.webp'),
};
