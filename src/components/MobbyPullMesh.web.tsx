import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Asset } from 'expo-asset';

import type { MobbyPullMeshHandle, MobbyPullMeshLayer, MobbyPullMeshProps } from './MobbyPullMesh.types';

type Vertex = {
  u: number; v: number; baseX: number; baseY: number;
  offsetX: number; offsetY: number; velocityX: number; velocityY: number;
  targetX: number; targetY: number;
};

type MeshImageLayer = {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
};

const layerImageCache = new Map<string, HTMLImageElement>();

function getLayerImage(source: MobbyPullMeshLayer['source']) {
  const uri = Asset.fromModule(source as number).uri;
  const cached = layerImageCache.get(uri);
  if (cached) return cached;
  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  image.src = uri;
  layerImageCache.set(uri, image);
  return image;
}

// Match mobby-main's desktop carousel mesh density. Pointer updates are
// already frame-coalesced by the browser, so the spring remains responsive
// without moving the whole sprite.
const DIVISIONS = 17;
// Keep the mesh deformation inside a conservative envelope.  The original
// pull demo allows a wider stretch, but that can fold the coarse triangles
// when a pointer is moved quickly and makes the face/body look torn apart.
const MAX_PULL_RATIO = 0.36;
const PULL_RADIUS_RATIO = 0.245;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothPull = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function drawTriangle(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  source: { x: number; y: number }[],
  destination: { x: number; y: number }[],
) {
  const [s0, s1, s2] = source;
  const [d0, d1, d2] = destination;
  const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denominator) < 0.0001) return;
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denominator;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denominator;
  const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denominator;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denominator;
  const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator;
  const center = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
  const expanded = destination.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.hypot(dx, dy) || 1;
    return { x: point.x + dx / distance * 0.62, y: point.y + dy / distance * 0.62 };
  });
  context.save();
  context.beginPath();
  context.moveTo(expanded[0].x, expanded[0].y);
  context.lineTo(expanded[1].x, expanded[1].y);
  context.lineTo(expanded[2].x, expanded[2].y);
  context.closePath();
  context.clip();
  context.transform(a, b, c, d, e, f);
  context.drawImage(image, 0, 0);
  context.restore();
}

function containLayer(
  layer: MobbyPullMeshLayer,
  image: HTMLImageElement,
  bodyWidth: number,
  bodyHeight: number,
): MeshImageLayer {
  const frameX = layer.frame.x * bodyWidth / layer.sourceSize;
  const frameY = layer.frame.y * bodyHeight / layer.sourceSize;
  const frameWidth = layer.frame.width * bodyWidth / layer.sourceSize;
  const frameHeight = layer.frame.height * bodyHeight / layer.sourceSize;
  const scale = Math.min(frameWidth / image.naturalWidth, frameHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return {
    image,
    x: frameX + (frameWidth - width) / 2,
    y: frameY + (frameHeight - height) / 2,
    width,
    height,
  };
}

export const SUPPORTS_PULL_MESH = true;

export const MobbyPullMesh = forwardRef<MobbyPullMeshHandle, MobbyPullMeshProps>(function MobbyPullMesh({ source, size, visible, layers = [] }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageLayersRef = useRef<{
    layer: MobbyPullMeshLayer;
    image: HTMLImageElement;
  }[]>([]);
  const verticesRef = useRef<Vertex[]>([]);
  const originRef = useRef({ x: size / 2, y: size / 2 });
  const frameRef = useRef(0);
  const draggingRef = useRef(false);
  const lastAtRef = useRef(0);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const render = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image?.complete || !image.naturalWidth) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const spriteSize = sizeRef.current;
    const padding = Math.max(24, spriteSize * 0.4);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, spriteSize + padding * 2, spriteSize + padding * 2);
    context.translate(padding, padding);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const composite = compositeCanvasRef.current ?? document.createElement('canvas');
    compositeCanvasRef.current = composite;
    if (composite.width !== image.naturalWidth || composite.height !== image.naturalHeight) {
      composite.width = image.naturalWidth;
      composite.height = image.naturalHeight;
    }
    const compositeContext = composite.getContext('2d');
    if (!compositeContext) return;
    compositeContext.clearRect(0, 0, composite.width, composite.height);
    compositeContext.drawImage(image, 0, 0);
    for (const { layer, image: layerImage } of imageLayersRef.current) {
      if (!layerImage.complete || layerImage.naturalWidth <= 0) continue;
      const contained = containLayer(layer, layerImage, image.naturalWidth, image.naturalHeight);
      compositeContext.drawImage(contained.image, contained.x, contained.y, contained.width, contained.height);
    }
    const sourcePoint = (vertex: Vertex) => ({ x: vertex.u * image.naturalWidth, y: vertex.v * image.naturalHeight });
    const destinationPoint = (vertex: Vertex) => ({ x: vertex.baseX + vertex.offsetX, y: vertex.baseY + vertex.offsetY });
    for (let row = 0; row < DIVISIONS; row += 1) {
      for (let column = 0; column < DIVISIONS; column += 1) {
        const index = row * (DIVISIONS + 1) + column;
        const topLeft = verticesRef.current[index];
        const topRight = verticesRef.current[index + 1];
        const bottomLeft = verticesRef.current[index + DIVISIONS + 1];
        const bottomRight = verticesRef.current[index + DIVISIONS + 2];
        drawTriangle(context, composite, [sourcePoint(topLeft), sourcePoint(topRight), sourcePoint(bottomLeft)], [destinationPoint(topLeft), destinationPoint(topRight), destinationPoint(bottomLeft)]);
        drawTriangle(context, composite, [sourcePoint(topRight), sourcePoint(bottomRight), sourcePoint(bottomLeft)], [destinationPoint(topRight), destinationPoint(bottomRight), destinationPoint(bottomLeft)]);
      }
    }
  };

  const startAnimation = () => {
    if (frameRef.current) return;
    lastAtRef.current = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - lastAtRef.current) / 1000, 0.034);
      lastAtRef.current = now;
      const steps = Math.max(1, Math.ceil(delta / (1 / 120)));
      const step = delta / steps;
      const maxOffset = sizeRef.current * MAX_PULL_RATIO;
      let settling = false;
      for (let subStep = 0; subStep < steps; subStep += 1) {
        // mobby-main keeps one spring model for both follow and release. This
        // avoids a velocity discontinuity when pointer events arrive unevenly.
        const damping = Math.exp(-step * 10.2);
        for (const vertex of verticesRef.current) {
          vertex.velocityX += (vertex.targetX - vertex.offsetX) * 118 * step;
          vertex.velocityY += (vertex.targetY - vertex.offsetY) * 118 * step;
          vertex.velocityX *= damping;
          vertex.velocityY *= damping;
          // A spring can briefly overshoot its target.  Clamp the actual
          // vertex position as well as the target so a fast release can
          // never send a triangle outside the safe deformation envelope.
          vertex.offsetX = clamp(vertex.offsetX + vertex.velocityX * step, -maxOffset, maxOffset);
          vertex.offsetY = clamp(vertex.offsetY + vertex.velocityY * step, -maxOffset, maxOffset);
          if (Math.abs(vertex.offsetX - vertex.targetX) > 0.06 || Math.abs(vertex.offsetY - vertex.targetY) > 0.06) settling = true;
        }
      }
      render();
      // Keep rendering while the pointer is still down even when the spring
      // has temporarily caught up with the last input sample. Without this,
      // a slow drag would stop receiving visual updates and snap back before
      // release.
      if (draggingRef.current || settling) frameRef.current = requestAnimationFrame(tick);
      else frameRef.current = 0;
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const resetTargets = () => {
    for (const vertex of verticesRef.current) {
      vertex.targetX = 0;
      vertex.targetY = 0;
    }
  };

  useImperativeHandle(ref, () => ({
    begin(x, y) {
      const spriteSize = sizeRef.current;
      originRef.current = { x: clamp(x, 0, spriteSize), y: clamp(y, 0, spriteSize) };
      draggingRef.current = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      for (const vertex of verticesRef.current) {
        vertex.offsetX = 0; vertex.offsetY = 0; vertex.velocityX = 0; vertex.velocityY = 0;
        vertex.targetX = 0; vertex.targetY = 0;
      }
      render();
    },
    update(dx, dy) {
      const spriteSize = sizeRef.current;
      const magnitude = Math.hypot(dx, dy);
      const maxDistance = spriteSize * MAX_PULL_RATIO;
      const scale = magnitude > maxDistance ? maxDistance / magnitude : 1;
      const offsetX = dx * scale;
      const offsetY = dy * scale;
      const radius = spriteSize * PULL_RADIUS_RATIO;
      for (const vertex of verticesRef.current) {
        const near = smoothPull(1 - Math.hypot(vertex.baseX - originRef.current.x, vertex.baseY - originRef.current.y) / radius);
        const inBody = ((vertex.u - 0.5) / 0.47) ** 6 + ((vertex.v - 0.48) / 0.49) ** 6 <= 1.14
          && vertex.u >= 0.02 && vertex.u <= 0.98 && vertex.v >= 0.01 && vertex.v <= 0.99;
        vertex.targetX = inBody ? offsetX * near : 0;
        vertex.targetY = inBody ? offsetY * near : 0;
      }
      startAnimation();
    },
    release() { draggingRef.current = false; resetTargets(); startAnimation(); },
    reset() {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      draggingRef.current = false;
      resetTargets();
      for (const vertex of verticesRef.current) {
        vertex.offsetX = 0; vertex.offsetY = 0; vertex.velocityX = 0; vertex.velocityY = 0;
      }
      render();
    },
  }));

  useEffect(() => {
    const padding = Math.max(24, size * 0.4);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round((size + padding * 2) * dpr));
    canvas.height = Math.max(1, Math.round((size + padding * 2) * dpr));
    verticesRef.current = [];
    for (let row = 0; row <= DIVISIONS; row += 1) {
      for (let column = 0; column <= DIVISIONS; column += 1) {
        const u = column / DIVISIONS;
        const v = row / DIVISIONS;
        verticesRef.current.push({ u, v, baseX: u * size, baseY: v * size, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, targetX: 0, targetY: 0 });
      }
    }
    const resolved = Asset.fromModule(source as number);
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = render;
    image.src = resolved.uri;
    imageRef.current = image;
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [size, source]);

  useEffect(() => {
    let cancelled = false;
    const previousLayers = imageLayersRef.current;
    const nextLayers = layers.map((layer) => ({ layer, image: getLayerImage(layer.source) }));
    const refresh = () => {
      if (cancelled) return;
      imageLayersRef.current = nextLayers.map((nextLayer, index) => (
        nextLayer.image.complete && nextLayer.image.naturalWidth > 0
          ? nextLayer
          : previousLayers[index] ?? nextLayer
      ));
      render();
    };
    for (const { image } of nextLayers) {
      image.addEventListener('load', refresh);
      image.addEventListener('error', refresh);
    }
    refresh();
    return () => {
      cancelled = true;
      for (const { image } of nextLayers) {
        image.removeEventListener('load', refresh);
        image.removeEventListener('error', refresh);
      }
    };
  }, [layers]);

  const padding = Math.max(24, size * 0.4);
  return <canvas ref={canvasRef} aria-hidden style={{ display: visible ? 'block' : 'none', pointerEvents: 'none', position: 'absolute', left: -padding, top: -padding, width: size + padding * 2, height: size + padding * 2 }} />;
});
