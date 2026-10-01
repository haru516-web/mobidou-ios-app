import { useEffect, useRef } from 'react';
import { Asset } from 'expo-asset';

import { MOBIBOU_RELIEF_META, MOBIBOU_RELIEF_SOURCES } from '../data/mobibouRelief';
import type { MobbyReliefProps } from './MobbyRelief.types';
import { configureTexture, createRelief, type GL, type ReliefController, type ReliefTextureLoader } from './reliefCore';

export type { MobbyReliefProps } from './MobbyRelief.types';

export const SUPPORTS_RELIEF = true;

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

const loadTexture: ReliefTextureLoader = async (gl: GL, source) => {
  const image = await loadImage(Asset.fromModule(source as number).uri);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  configureTexture(gl);
  return texture;
};

export function MobbyRelief({ width, height, shade, depth, onError }: MobbyReliefProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reliefRef = useRef<ReliefController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true }) as GL | null;
    if (!gl) {
      onError?.();
      return undefined;
    }
    try {
      reliefRef.current = createRelief(gl, { width, height, sources: MOBIBOU_RELIEF_SOURCES, meta: MOBIBOU_RELIEF_META, loadTexture, shade, depth, onError: () => onError?.() });
    } catch (error) {
      console.warn('Relief unavailable', error);
      onError?.();
      return undefined;
    }
    const at = (event: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const down = (event: PointerEvent) => { canvas.setPointerCapture?.(event.pointerId); reliefRef.current?.pointerDown(...at(event)); };
    const move = (event: PointerEvent) => reliefRef.current?.pointerMove(...at(event));
    const up = () => reliefRef.current?.pointerUp();
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      reliefRef.current?.dispose();
      reliefRef.current = null;
    };
  }, [depth, height, onError, shade, width]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block', touchAction: 'none' }} />;
}
