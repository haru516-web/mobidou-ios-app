import React from 'react';
import { Image as CoreImage, StyleSheet, View, type ImageResizeMode, type ImageSourcePropType, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/**
 * The app's image component. It takes the props the app used with expo-image (`contentFit`, `tintColor`, `transition`),
 * but draws with React Native's own Image: on a device expo-image never finished loading some pictures (the Mobbies in
 * the gacha, the curtain) and drew nothing, with no error.
 *
 * The picture sits inside a view that carries the style (position, size, opacity, transform, rounded corners) and fills
 * it. A core Image that is only told to stretch (absoluteFill, no width or height) is drawn at its own pixel size instead.
 */
type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

const RESIZE_MODE: Record<ContentFit, ImageResizeMode> = { cover: 'cover', contain: 'contain', fill: 'stretch', none: 'center', 'scale-down': 'contain' };

export type AppImageProps = Omit<ViewProps, 'children'> & {
  source: ImageSourcePropType;
  contentFit?: ContentFit;
  tintColor?: string;
  /** Accepted for compatibility with expo-image; the core Image has no fade-in. */
  transition?: number;
  /** Accepted for compatibility with expo-image; the core Image always centres the picture. */
  contentPosition?: unknown;
  onLoad?: () => void;
  onError?: () => void;
};

const hasRoundedCorners = (style: ViewStyle) => Object.keys(style).some(key => /Radius$/.test(key) && (style as Record<string, unknown>)[key]);

export function Image({ source, style, contentFit = 'cover', tintColor, transition: _transition, contentPosition: _position, onLoad, onError, ...view }: AppImageProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle & { tintColor?: string };
  const tint = tintColor ?? flat.tintColor;
  return <View {...view} style={[style, hasRoundedCorners(flat) ? { overflow: 'hidden' } : null]}>
    <CoreImage accessible={false} source={source} resizeMode={RESIZE_MODE[contentFit]} onLoad={onLoad ? () => onLoad() : undefined} onError={onError ? () => onError() : undefined} style={tint ? { width: '100%', height: '100%', tintColor: tint } : { width: '100%', height: '100%' }} />
  </View>;
}

/** A view with a picture behind its children. `imageStyle` styles the picture, as in React Native's ImageBackground. */
export function ImageBackground({ source, contentFit = 'cover', imageStyle, style, children, ...view }: Omit<AppImageProps, 'style' | 'onLoad' | 'onError'> & { imageStyle?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return <View {...view} style={style}>
    <Image source={source} contentFit={contentFit} style={[StyleSheet.absoluteFill, imageStyle]} pointerEvents="none" accessible={false} />
    {children}
  </View>;
}

export type { ImageSourcePropType as ImageSource };
