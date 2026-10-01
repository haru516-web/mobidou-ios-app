import { useCallback, useEffect, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';

import { MOBIBOU_RELIEF_META, MOBIBOU_RELIEF_SOURCES } from '../data/mobibouRelief';
import type { MobbyReliefProps } from './MobbyRelief.types';
import { configureTexture, createRelief, type GL, type ReliefController, type ReliefTextureLoader } from './reliefCore';

export type { MobbyReliefProps } from './MobbyRelief.types';

export const SUPPORTS_RELIEF = true;

const loadTexture: ReliefTextureLoader = async (gl: GL, source) => {
  const asset = Asset.fromModule(source as number);
  if (!asset.localUri) await asset.downloadAsync();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // expo-gl accepts an asset-like object ({ localUri, width, height }) as pixels.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, {
    localUri: asset.localUri ?? asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  } as unknown as TexImageSource);
  configureTexture(gl);
  return texture;
};

/** Mobibou as a touchable relief: turn it, pull it, poke it, ruffle its fur. */
export function MobbyRelief({ width, height, shade, depth, onError }: MobbyReliefProps) {
  const reliefRef = useRef<ReliefController | null>(null);
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => () => {
    reliefRef.current?.dispose();
    reliefRef.current = null;
  }, []);

  const handleContext = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      reliefRef.current?.dispose();
      reliefRef.current = createRelief(gl as unknown as GL, {
        width,
        height,
        sources: MOBIBOU_RELIEF_SOURCES,
        meta: MOBIBOU_RELIEF_META,
        loadTexture,
        shade,
        depth,
        present: () => gl.endFrameEXP(),
        onError: () => onError?.(),
      });
    } catch (error) {
      console.warn('Relief unavailable', error);
      onError?.();
    }
  }, [depth, height, onError, shade, width]);

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      start.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      reliefRef.current?.pointerDown(start.current.x, start.current.y);
    },
    onPanResponderMove: (_event, gesture) => reliefRef.current?.pointerMove(start.current.x + gesture.dx, start.current.y + gesture.dy),
    onPanResponderRelease: () => reliefRef.current?.pointerUp(),
    onPanResponderTerminate: () => reliefRef.current?.pointerUp(),
  })).current;

  return (
    <View style={{ width, height }} {...responder.panHandlers}>
      <GLView style={StyleSheet.absoluteFill} pointerEvents="none" onContextCreate={handleContext} />
    </View>
  );
}
