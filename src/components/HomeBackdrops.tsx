import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from './AppImage';
import { type CollectionRoomGeometry } from './collectionRoomArt';
import { EVENT_FEEL } from '../data/eventImages';

const COLLECTION_BACKDROP = require('../../assets/ui-round3/collection/collection-room-harmony-v6.webp');
const HOME_SCENE_BACKGROUND = require('../../assets/backgrounds/mobidou-home-cushion-background-extended-v2.webp');
const HOME_BACKGROUND_SOURCE_HEIGHT = 2880;
const HOME_BACKGROUND_FLOOR_SOURCE_Y = 862;
const HOME_BACKGROUND_CUSHION_SOURCE_Y = 820;
const HOME_BACKGROUND_FLOOR_RATIO = HOME_BACKGROUND_FLOOR_SOURCE_Y / HOME_BACKGROUND_SOURCE_HEIGHT;
const HOME_BACKGROUND_CUSHION_OFFSET_RATIO = (HOME_BACKGROUND_FLOOR_SOURCE_Y - HOME_BACKGROUND_CUSHION_SOURCE_Y) / HOME_BACKGROUND_SOURCE_HEIGHT;

/** The collection room picture over the whole window; it slides sideways with the room's scroll position. */
export function CollectionBackdrop({ scrollX, viewportWidth, windowHeight, tileCount, art, event = false }: { scrollX: Animated.Value; viewportWidth: number; windowHeight: number; tileCount: number; art: CollectionRoomGeometry; /** The event's own room (same shelves and pillars). */ event?: boolean }) {
  const translateX = Animated.multiply(scrollX, -1);
  return <View pointerEvents="none" style={[S.collectionBackdropViewport, { top: 0, bottom: undefined, width: viewportWidth, height: windowHeight }]}>
    <Animated.View style={[S.collectionBackdropTrack, { width: tileCount * viewportWidth, bottom: 0 }, { transform: [{ translateX }] }]}>
      {Array.from({ length: tileCount }, (_, index) => <View key={index} style={{ width: viewportWidth, height: windowHeight, flexShrink: 0, overflow: 'hidden', transform: [{ scaleX: index % 2 === 1 ? -1 : 1 }] }}>
        <Image source={event ? EVENT_FEEL.collectionRoom : COLLECTION_BACKDROP} contentFit="fill" style={{ position: 'absolute', left: art.left, top: art.top, width: art.width, height: art.height }} />
      </View>)}
    </Animated.View>
  </View>;
}

export function getHomeBackgroundMetrics(floorY: number | null, viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  const measuredFloorY = Math.max(0, Math.min(height, floorY ?? Math.round(height * HOME_BACKGROUND_FLOOR_RATIO)));
  const artHeight = floorY === null
    ? height
    : Math.max(
      height,
      measuredFloorY / HOME_BACKGROUND_FLOOR_RATIO,
      (height - measuredFloorY) / Math.max(.001, 1 - HOME_BACKGROUND_FLOOR_RATIO),
    );
  return {
    measuredFloorY,
    artHeight,
    artTop: measuredFloorY - artHeight * HOME_BACKGROUND_FLOOR_RATIO,
    cushionOffset: artHeight * HOME_BACKGROUND_CUSHION_OFFSET_RATIO,
  };
}

export function HomeAnchoredBackground({ floorY, viewportHeight }: { floorY: number | null; viewportHeight: number }) {
  // Anchor the source row where the cushion meets the floor to the measured
  // card position. The extended floor absorbs extra height on tall screens.
  const { artHeight, artTop } = getHomeBackgroundMetrics(floorY, viewportHeight);
  const artStyle = { position: 'absolute' as const, left: 0, right: 0, top: artTop, height: artHeight };

  return <View pointerEvents="none" style={S.backgroundScrollLayer}>
    <Image source={HOME_SCENE_BACKGROUND} contentFit="fill" style={artStyle} />
  </View>;
}

const S = StyleSheet.create({
  backgroundScrollLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  collectionBackdropViewport: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#F5E8D4' },
  collectionBackdropTrack: { position: 'absolute', left: 0, top: 0, bottom: -260, flexDirection: 'row' },
});
