import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { UI_ART } from '../data/uiArt';
import { CroppedArt } from './CroppedArt';

/** The hand-cut lock tag (the padlock is already drawn on it), sized as a square of `size` points. */
export function LockTag({ size = 30, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const art = UI_ART.lockTag;
  return <View pointerEvents="none" accessible={false} style={[{ width: size, height: size }, style]}>
    <CroppedArt source={art.source} bounds={{ x0: art.box.x0 / art.width, x1: art.box.x1 / art.width, y0: art.box.y0 / art.height, y1: art.box.y1 / art.height }} />
  </View>;
}
