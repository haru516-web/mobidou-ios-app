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
