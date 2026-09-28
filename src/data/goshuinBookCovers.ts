import type React from 'react';
import type { Image } from 'expo-image';
import { PILGRIMAGE_IMAGES } from './pilgrimageImages';

// Route cover artwork is registered here. A route miniature is a deliberate,
// stable fallback while a new cover asset is being produced or migrated.
export type GoshuinBookCoverSource = React.ComponentProps<typeof Image>['source'];
export const GOSHUIN_BOOK_COVERS: Partial<Record<string, GoshuinBookCoverSource>> = {
  sanctuary: require('../../assets/goshuin-book-covers/sanctuary.webp'),
  mountain: require('../../assets/goshuin-book-covers/mountain.webp'),
  circuit: require('../../assets/goshuin-book-covers/circuit.webp'),
  compassion: require('../../assets/goshuin-book-covers/compassion.webp'),
  vow: require('../../assets/goshuin-book-covers/vow.webp'),
  story: require('../../assets/goshuin-book-covers/story.webp'),
  sanctuaryDawn: require('../../assets/goshuin-book-covers/sanctuaryDawn.webp'),
  mountainRidge: require('../../assets/goshuin-book-covers/mountainRidge.webp'),
  circuitWater: require('../../assets/goshuin-book-covers/circuitWater.webp'),
  compassionMoon: require('../../assets/goshuin-book-covers/compassionMoon.webp'),
  vowSevenLights: require('../../assets/goshuin-book-covers/vowSevenLights.webp'),
  storyRiver: require('../../assets/goshuin-book-covers/storyRiver.webp'),
};

export function getGoshuinBookCover(routeId?: string | null): GoshuinBookCoverSource {
  if (routeId && GOSHUIN_BOOK_COVERS[routeId]) return GOSHUIN_BOOK_COVERS[routeId]!;
  return (routeId && PILGRIMAGE_IMAGES[routeId]) || PILGRIMAGE_IMAGES.sanctuary;
}
