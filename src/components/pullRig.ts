import { Animated } from 'react-native';

import type { PullPartAnchors } from '../data/pullPartAnchors';
import type { PullSample } from './pullMeshCore';

/**
 * Lets the eyes, mouth and hardware (lens, D-pad, buttons) ride the stretching
 * body instead of being left behind: every frame each piece samples how the
 * mesh moved under it and follows that movement.
 */
export type RigNode = { x: Animated.Value; y: Animated.Value; rotate: Animated.Value; sx: Animated.Value; sy: Animated.Value };
export type PullRig = Record<'eye' | 'mouth' | 'lens' | 'cross' | 'buttonLeft' | 'buttonRight', RigNode>;
export type RigSpec = {
  /** Centers in sprite pixels (0..size). */
  eye: { x: number; y: number };
  mouth: { x: number; y: number };
  parts?: PullPartAnchors;
  size: number;
};

const RAD_TO_DEG = 57.29578;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createNode = (): RigNode => ({
  x: new Animated.Value(0),
  y: new Animated.Value(0),
  rotate: new Animated.Value(0),
  sx: new Animated.Value(1),
  sy: new Animated.Value(1),
});

export function createPullRig(): PullRig {
  return { eye: createNode(), mouth: createNode(), lens: createNode(), cross: createNode(), buttonLeft: createNode(), buttonRight: createNode() };
}

export function rigTransform(node: RigNode) {
  return [
    { translateX: node.x },
    { translateY: node.y },
    { rotate: node.rotate.interpolate({ inputRange: [-1, 1], outputRange: [`${-RAD_TO_DEG}deg`, `${RAD_TO_DEG}deg`] }) },
    { scaleX: node.sx },
    { scaleY: node.sy },
  ];
}

export function resetPullRig(rig: PullRig) {
  for (const node of Object.values(rig)) {
    node.x.setValue(0);
    node.y.setValue(0);
    node.rotate.setValue(0);
    node.sx.setValue(1);
    node.sy.setValue(1);
  }
}

function place(node: RigNode, sample: PullSample, follow: { rotation: number; scale: number }, pivot?: { ax: number; ay: number; cx: number; cy: number }) {
  const angle = clamp(Math.atan2(sample.m21, sample.m11), -0.6, 0.6) * follow.rotation;
  const stretchX = 1 + (clamp(Math.hypot(sample.m11, sample.m21), 0.8, 1.3) - 1) * follow.scale;
  const stretchY = 1 + (clamp(Math.hypot(sample.m12, sample.m22), 0.8, 1.3) - 1) * follow.scale;
  let tx = sample.dx;
  let ty = sample.dy;
  if (pivot) {
    // The piece is a full-canvas layer that turns about its own center, but the
    // hardware should turn about itself: shift so its anchor lands where the body put it.
    const rx = pivot.ax - pivot.cx;
    const ry = pivot.ay - pivot.cy;
    tx -= Math.cos(angle) * rx - Math.sin(angle) * ry - rx;
    ty -= Math.sin(angle) * rx + Math.cos(angle) * ry - ry;
  }
  node.x.setValue(tx);
  node.y.setValue(ty);
  node.rotate.setValue(angle);
  node.sx.setValue(stretchX);
  node.sy.setValue(stretchY);
}

export function applyPullRig(rig: PullRig, sampleAt: (x: number, y: number) => PullSample, spec: RigSpec) {
  const { size } = spec;
  const center = size / 2;
  // Eyes and mouth are painted on the skin: they stretch and tilt a little with it.
  place(rig.eye, sampleAt(spec.eye.x, spec.eye.y), { rotation: 0.6, scale: 0.7 });
  place(rig.mouth, sampleAt(spec.mouth.x, spec.mouth.y), { rotation: 0.6, scale: 0.7 });
  if (!spec.parts) return;
  // Hardware is rigid: it rides along and turns with the body, but never stretches.
  for (const key of ['lens', 'cross', 'buttonLeft', 'buttonRight'] as const) {
    const ax = spec.parts[key].x * size;
    const ay = spec.parts[key].y * size;
    place(rig[key], sampleAt(ax, ay), { rotation: 0.8, scale: 0 }, { ax, ay, cx: center, cy: center });
  }
}
