import type { ImageSourcePropType } from 'react-native';

/**
 * Art for the box-opening scene (see docs/codex-gacha-assets.md). Each entry
 * stays `null` until its file is added to assets/gacha/; the scene draws a
 * plain stand-in shape for any part that has no art yet, so the animation can
 * be built and checked before the illustrations land.
 */
export type GachaArtPart = 'body' | 'front' | 'shadow' | 'glowCore' | 'glowRays' | 'rope' | 'stage';

export const GACHA_ART: Record<GachaArtPart, ImageSourcePropType | null> = {
  body: null,
  front: null,
  shadow: null,
  glowCore: null,
  glowRays: null,
  rope: null,
  stage: null,
};
