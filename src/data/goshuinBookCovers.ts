import type { ImageSourcePropType } from 'react-native';
import { PILGRIMAGE_IMAGES } from './pilgrimageImages';

// Route cover artwork is registered here. A route miniature is a deliberate,
// stable fallback while a new cover asset is being produced or migrated.
export type GoshuinBookCoverSource = ImageSourcePropType;
export const GOSHUIN_BOOK_COVERS: Partial<Record<string, GoshuinBookCoverSource>> = {
  sanctuary: require('../../assets/ui-round3/covers/sanctuary.webp'),
  mountain: require('../../assets/ui-round3/covers/mountain.webp'),
  circuit: require('../../assets/ui-round3/covers/circuit.webp'),
  compassion: require('../../assets/ui-round3/covers/compassion.webp'),
  vow: require('../../assets/ui-round3/covers/vow.webp'),
  story: require('../../assets/ui-round3/covers/story.webp'),
  sanctuaryDawn: require('../../assets/ui-round3/covers/sanctuaryDawn.webp'),
  mountainRidge: require('../../assets/ui-round3/covers/mountainRidge.webp'),
  circuitWater: require('../../assets/ui-round3/covers/circuitWater.webp'),
  compassionMoon: require('../../assets/ui-round3/covers/compassionMoon.webp'),
  vowSevenLights: require('../../assets/ui-round3/covers/vowSevenLights.webp'),
  storyRiver: require('../../assets/ui-round3/covers/storyRiver.webp'),
};

export function getGoshuinBookCover(routeId?: string | null): GoshuinBookCoverSource {
  if (routeId && GOSHUIN_BOOK_COVERS[routeId]) return GOSHUIN_BOOK_COVERS[routeId]!;
  return (routeId && PILGRIMAGE_IMAGES[routeId]) || PILGRIMAGE_IMAGES.sanctuary;
}
