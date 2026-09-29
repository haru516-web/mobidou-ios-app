import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImageSourcePropType } from 'react-native';

/** The part of an image that holds the artwork, as 0..1 fractions of its width and height. */
export type ArtBounds = { x0: number; x1: number; y0: number; y1: number };

/**
 * Fills its parent with just the artwork of an image, cropping the transparent
 * margin around it. The art is stretched to the box, so it only suits a box that
 * is close to the art's own shape.
 */
export function CroppedArt({ source, bounds, style }: { source: ImageSourcePropType; bounds: ArtBounds; style?: StyleProp<ViewStyle> }) {
  const width = bounds.x1 - bounds.x0;
  const height = bounds.y1 - bounds.y0;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}>
    <Image accessible={false} source={source} contentFit="fill" style={{ position: 'absolute', left: `${-bounds.x0 / width * 100}%`, top: `${-bounds.y0 / height * 100}%`, width: `${100 / width}%`, height: `${100 / height}%` }} />
  </View>;
}
