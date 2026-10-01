// Plain Mobby (golden fluffy block): rounded-box body, little arms, stubby feet.
// Numbers are read off the reference photo at 400px = 1 unit, centred on the body.
import * as THREE from 'three';
export { surfaceNets } from './mesh.js';

const len3 = (x, y, z) => Math.hypot(x, y, z);
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const sdEllipsoid = (x, y, z, rx, ry, rz) => {
  const k0 = len3(x / rx, y / ry, z / rz);
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return (k0 * (k0 - 1)) / Math.max(k1, 1e-5);
};
const sdRoundBox = (x, y, z, hx, hy, hz, r) => {
  const qx = Math.abs(x) - hx + r, qy = Math.abs(y) - hy + r, qz = Math.abs(z) - hz + r;
  return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

export const LAYOUT = {
  eye: { x: -0.38, y: 0.45 },
  lens: { x: 0.385, y: 0.445 },
  dpad: { x: -0.35, y: -0.125 },
  buttons: [{ x: 0.19, y: -0.18 }, { x: 0.395, y: -0.06 }],
};

export function bodySDF(x, y, z) {
  const ax = Math.abs(x);
  let d = sdRoundBox(x, y - 0.14, z, 0.87, 0.86, 0.68, 0.3);
  d = smin(d, sdEllipsoid(ax - 0.41, y + 0.85, z, 0.29, 0.17, 0.3), 0.14);        // feet
  d = smin(d, sdEllipsoid(ax - 0.96, y + 0.19, z, 0.16, 0.28, 0.2), 0.12);        // arms
  return d;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = (hex) => new THREE.Color(hex);

// Per-vertex fur description: root/tip colour, length factor, growth direction.
export function furAttributes(geo) {
  const p = geo.position, n = geo.normal;
  const count = p.length / 3;
  const aRoot = new Float32Array(count * 3), aTip = new Float32Array(count * 3);
  const aLen = new Float32Array(count), aDir = new Float32Array(count * 3);
  const root = col('#6e3f04'), tip = col('#f0b535');
  const spots = [
    [LAYOUT.eye.x, LAYOUT.eye.y, 0.27], [LAYOUT.lens.x, LAYOUT.lens.y, 0.31],
    [LAYOUT.dpad.x, LAYOUT.dpad.y, 0.3], ...LAYOUT.buttons.map((b) => [b.x, b.y, 0.14]),
  ];
  for (let v = 0; v < count; v++) {
    const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2];
    let len = 1;
    // a bit shaggier along the top and the sides, short and flat under the parts that sit on the front
    len *= 1 + 0.5 * smooth(0.55, 1.0, y) + 0.25 * smooth(0.7, 1.0, Math.abs(x));
    if (z > 0.3) for (const [sx, sy, r] of spots) len *= 1 - 0.75 * smooth(r + 0.08, r - 0.02, Math.hypot(x - sx, y - sy));
    const dirx = n[v * 3], diry = n[v * 3 + 1] - 0.12, dirz = n[v * 3 + 2];
    const l = Math.hypot(dirx, diry, dirz) || 1;
    aDir[v * 3] = dirx / l; aDir[v * 3 + 1] = diry / l; aDir[v * 3 + 2] = dirz / l;
    aLen[v] = len;
    aRoot.set([root.r, root.g, root.b], v * 3);
    aTip.set([tip.r, tip.g, tip.b], v * 3);
  }
  return { aRoot, aTip, aLen, aDir };
}

// Where the front surface sits for a given (x, y): used to seat eyes and buttons on the body.
export function surfaceZ(x, y) {
  let lo = -0.2, hi = 1.2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bodySDF(x, y, mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
