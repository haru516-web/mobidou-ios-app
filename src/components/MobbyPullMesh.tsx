import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';

import type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';
import { configureTexture, createPullMesh, type GL, type PullMeshController, type PullTextureLoader } from './pullMeshCore';

export type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';

export const SUPPORTS_PULL_MESH = true;

const loadTexture: PullTextureLoader = async (gl: GL, source) => {
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

export const MobbyPullMesh = forwardRef<MobbyPullMeshHandle, MobbyPullMeshProps>(function MobbyPullMesh({ source, mask, glSource, size, visible, onFrame, onError }, ref) {
  const meshRef = useRef<PullMeshController | null>(null);
  // On device the texture is the pre-masked PNG; without one, fall back to the WebP art.
  const bodySource = glSource ?? source;
  const maskSource = glSource ? undefined : mask;
  const sourcesRef = useRef({ source: bodySource, mask: maskSource });
  sourcesRef.current = { source: bodySource, mask: maskSource };
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const padding = Math.max(24, size * 0.4);
  const canvasSize = size + padding * 2;

  useImperativeHandle(ref, () => ({
    begin: (x, y) => meshRef.current?.begin(x, y),
    update: (dx, dy) => meshRef.current?.update(dx, dy),
    release: () => meshRef.current?.release(),
    reset: () => meshRef.current?.reset(),
    sample: (x, y) => meshRef.current?.sample(x, y) ?? { dx: 0, dy: 0, m11: 1, m12: 0, m21: 0, m22: 1 },
  }), []);

  useEffect(() => () => {
    meshRef.current?.dispose();
    meshRef.current = null;
  }, []);

  const handleContext = useCallback((gl: ExpoWebGLRenderingContext) => {
    try {
      const context = gl as unknown as GL;
      meshRef.current?.dispose();
      meshRef.current = createPullMesh(context, {
        size,
        padding,
        // GLView's drawing buffer is already in device pixels.
        dpr: gl.drawingBufferWidth / canvasSize,
        loadTexture,
        present: () => gl.endFrameEXP(),
        onFrame: () => onFrameRef.current?.(),
        onError,
      });
      meshRef.current.setSources(sourcesRef.current.source, sourcesRef.current.mask);
    } catch (error) {
      console.warn('Pull mesh unavailable', error);
      onError?.();
    }
  }, [canvasSize, onError, padding, size]);

  useEffect(() => {
    meshRef.current?.setSources(bodySource, maskSource);
  }, [bodySource, maskSource]);

  return <GLView
    pointerEvents="none"
    onContextCreate={handleContext}
    style={[styles.canvas, { left: -padding, top: -padding, width: canvasSize, height: canvasSize, opacity: visible ? 1 : 0 }]}
  />;
});

const styles = StyleSheet.create({
  canvas: { position: 'absolute' },
});
