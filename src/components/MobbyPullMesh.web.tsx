import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Asset } from 'expo-asset';

import type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';
import { configureTexture, createPullMesh, type GL, type PullMeshController, type PullTextureLoader } from './pullMeshCore';

export type { MobbyPullMeshHandle, MobbyPullMeshProps } from './MobbyPullMesh.types';

export const SUPPORTS_PULL_MESH = true;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(uri: string) {
  let pending = imageCache.get(uri);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = uri;
    });
    imageCache.set(uri, pending);
  }
  return pending;
}

const loadTexture: PullTextureLoader = async (gl: GL, source) => {
  const image = await loadImage(Asset.fromModule(source as number).uri);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  configureTexture(gl);
  return texture;
};

export const MobbyPullMesh = forwardRef<MobbyPullMeshHandle, MobbyPullMeshProps>(function MobbyPullMesh({ source, mask, size, visible, onFrame, onError }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshRef = useRef<PullMeshController | null>(null);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvasSize * dpr);
    canvas.height = Math.round(canvasSize * dpr);
    const gl = (canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false })
      ?? canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false })) as GL | null;
    if (!gl) {
      onError?.();
      return undefined;
    }
    try {
      meshRef.current = createPullMesh(gl, { size, padding, dpr, loadTexture, onFrame: () => onFrameRef.current?.(), onError });
    } catch (error) {
      console.warn('Pull mesh unavailable', error);
      onError?.();
      return undefined;
    }
    return () => {
      meshRef.current?.dispose();
      meshRef.current = null;
    };
  }, [canvasSize, onError, padding, size]);

  useEffect(() => {
    meshRef.current?.setSources(source, mask);
  }, [source, mask, canvasSize]);

  return <canvas ref={canvasRef} aria-hidden style={{ display: visible ? 'block' : 'none', pointerEvents: 'none', position: 'absolute', left: -padding, top: -padding, width: canvasSize, height: canvasSize }} />;
});
