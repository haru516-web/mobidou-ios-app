import type React from 'react';
import type { Image } from 'expo-image';
import { PILGRIMAGE_IMAGES } from './pilgrimageImages';

// Route cover artwork is registered here. A route miniature is a deliberate,
// stable fallback while a new cover asset is being produced or migrated.
export type GoshuinBookCoverSource = React.ComponentProps<typeof Image>['source'];
export const GOSHUIN_BOOK_COVERS: Partial<Record<string, GoshuinBookCoverSource>> = {
  sanctuary: require('../../assets/goshuin-book-covers/sanctuary.png'),
  mountain: require('../../assets/goshuin-book-covers/mountain.png'),
  circuit: require('../../assets/goshuin-book-covers/circuit.png'),
  compassion: require('../../assets/goshuin-book-covers/compassion.png'),
  vow: require('../../assets/goshuin-book-covers/vow.png'),
  story: require('../../assets/goshuin-book-covers/story.png'),
  sanctuaryDawn: require('../../assets/goshuin-book-covers/sanctuaryDawn.png'),
  mountainRidge: require('../../assets/goshuin-book-covers/mountainRidge.png'),
  circuitWater: require('../../assets/goshuin-book-covers/circuitWater.png'),
  compassionMoon: require('../../assets/goshuin-book-covers/compassionMoon.png'),
  vowSevenLights: require('../../assets/goshuin-book-covers/vowSevenLights.png'),
  storyRiver: require('../../assets/goshuin-book-covers/storyRiver.png'),
};

export function getGoshuinBookCover(routeId?: string | null): GoshuinBookCoverSource {
  if (routeId && GOSHUIN_BOOK_COVERS[routeId]) return GOSHUIN_BOOK_COVERS[routeId]!;
  return (routeId && PILGRIMAGE_IMAGES[routeId]) || PILGRIMAGE_IMAGES.sanctuary;
}
