import type { ImageSourcePropType } from 'react-native';

/** Production artwork. Both box layers share an 880 × 1280 canvas. */
export type GachaArtPart = 'body' | 'front' | 'shadow' | 'glowCore' | 'glowRays' | 'rope' | 'stage';

export const GACHA_ART: Record<GachaArtPart, ImageSourcePropType> = {
  body: require('../../assets/gacha/box-body.webp'),
  front: require('../../assets/gacha/box-front.webp'),
  shadow: require('../../assets/gacha/box-shadow.webp'),
  glowCore: require('../../assets/gacha/glow-core.webp'),
  glowRays: require('../../assets/gacha/glow-rays.webp'),
  rope: require('../../assets/gacha/rope.webp'),
  stage: require('../../assets/gacha/stage-bg.webp'),
};

/** The curtain, and the carrier Mobby with the cart (sheets of 8 frames, see assets/gacha/cart/anchors.json). */
export const GACHA_STAGE_ART = {
  curtainLeft: require('../../assets/gacha/curtain-left.webp'),
  curtainRight: require('../../assets/gacha/curtain-right.webp'),
  valance: require('../../assets/gacha/curtain-valance.webp'),
  carrierWalk: require('../../assets/gacha/cart/carrier-walk.webp'),
  carrierUnload: require('../../assets/gacha/cart/carrier-unload.webp'),
  dust: require('../../assets/gacha/cart/dust.webp'),
} satisfies Record<string, ImageSourcePropType>;

/** Pixel sizes of those pictures: a carrier sheet is 4 × 2 cells of 768 × 512 with a 1px gap, the dust sheet 4 × 2 cells of 256. */
export const GACHA_SHEET = { width: 3075, height: 1025, cellStep: { x: 769, y: 513 } } as const;
export const GACHA_DUST_SHEET = { width: 1024, height: 512, cell: 256 } as const;
export const GACHA_CURTAIN = { width: 700, height: 2532, valanceWidth: 1170, valanceHeight: 320 } as const;
export const GACHA_CART_ANCHORS: import('../components/gachaCart').CartAnchors = require('../../assets/gacha/cart/anchors.json');
