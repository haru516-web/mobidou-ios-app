import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const COLLECTION_BACKDROP = require('../../assets/ui-round3/collection/collection-room-home-harmony-v1.webp');
const HOME_SCENE_BACKGROUND = require('../../assets/backgrounds/mobidou-home-cushion-background-extended-v2.webp');
const HOME_BACKGROUND_SOURCE_HEIGHT = 2880;
const HOME_BACKGROUND_FLOOR_SOURCE_Y = 862;
const HOME_BACKGROUND_CUSHION_SOURCE_Y = 820;
const HOME_BACKGROUND_FLOOR_RATIO = HOME_BACKGROUND_FLOOR_SOURCE_Y / HOME_BACKGROUND_SOURCE_HEIGHT;
const HOME_BACKGROUND_CUSHION_OFFSET_RATIO = (HOME_BACKGROUND_FLOOR_SOURCE_Y - HOME_BACKGROUND_CUSHION_SOURCE_Y) / HOME_BACKGROUND_SOURCE_HEIGHT;

export function CollectionBackdrop({ scrollY, viewportWidth, viewportHeight }: { scrollY: Animated.Value; viewportWidth: number; viewportHeight: number }) {
  const tileWidth = Math.max(1, Math.round(viewportHeight * (1024 / 1536)));
  const initialInset = Math.max(0, Math.floor((tileWidth - viewportWidth) / 2));
  const backgroundWidth = viewportWidth + initialInset + tileWidth;
  const tileCount = Math.ceil(backgroundWidth / tileWidth) + 1;
  const translateY = scrollY.interpolate({ inputRange: [0, 520], outputRange: [0, -260], extrapolate: 'clamp' });
  return <View pointerEvents="none" style={S.collectionBackdropViewport}>
    <Animated.View style={[S.collectionBackdropTrack, { left: -initialInset, width: tileCount * tileWidth }, { transform: [{ translateY }] }]}>
      {Array.from({ length: tileCount }, (_, index) => <Image key={index} source={COLLECTION_BACKDROP} contentFit="cover" style={[{ width: tileWidth, height: '100%', flexShrink: 0 }, index % 2 === 1 && { transform: [{ scaleX: -1 }] }]} />)}
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
