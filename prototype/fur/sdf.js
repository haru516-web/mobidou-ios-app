// Body SDF + naive Surface Nets mesher. The SDF is only used once, at load time,
// to build the base mesh the fur shells are extruded from.
import * as THREE from 'three';

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
const sdCapsule = (x, y, z, ax, ay, az, bx, by, bz, r) => {
  const pax = x - ax, pay = y - ay, paz = z - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r;
};

// Mobibou: chubby bean body with head merged in, short legs, stubby arms ending in paws.
export const PAWS = [[-0.8, -0.34, 0.12], [0.8, -0.34, 0.12]];
export function bodySDF(x, y, z) {
  const ax = Math.abs(x);
  const sx = x < 0 ? -1 : 1;
  let d = sdEllipsoid(x, y + 0.02, z, 0.64, 0.68, 0.52);
  d = smin(d, sdEllipsoid(x, y - 0.34, z, 0.68, 0.5, 0.54), 0.3);
  d = smin(d, sdCapsule(ax, y, z, 0.28, -0.55, 0.04, 0.28, -0.8, 0.07, 0.21), 0.18);
  d = smin(d, sdCapsule(ax, y, z, 0.6, 0.0, 0.05, 0.78, -0.3, 0.12, 0.15), 0.14);
  d = smin(d, len3(ax - 0.8, y + 0.34, z - 0.12) - 0.17, 0.08);
  void sx;
  return d;
}

export function surfaceNets(f, bmin, bmax, n) {
  const [nx, ny, nz] = n;
  const dx = (bmax[0] - bmin[0]) / nx, dy = (bmax[1] - bmin[1]) / ny, dz = (bmax[2] - bmin[2]) / nz;
  const sx = nx + 1, sy = ny + 1, sz = nz + 1;
  const val = new Float32Array(sx * sy * sz);
  const gi = (i, j, k) => i + sx * (j + sy * k);
  for (let k = 0; k < sz; k++) for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++)
    val[gi(i, j, k)] = f(bmin[0] + i * dx, bmin[1] + j * dy, bmin[2] + k * dz);

  const corner = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const cid = (i, j, k) => i + nx * (j + ny * k);
  const vid = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const v8 = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const o = corner[c];
      v8[c] = val[gi(i + o[0], j + o[1], k + o[2])];
      if (v8[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let px = 0, py = 0, pz = 0, cnt = 0;
    for (const [a, b] of edges) {
      if ((v8[a] < 0) === (v8[b] < 0)) continue;
      const t = v8[a] / (v8[a] - v8[b]);
      px += corner[a][0] + (corner[b][0] - corner[a][0]) * t;
      py += corner[a][1] + (corner[b][1] - corner[a][1]) * t;
      pz += corner[a][2] + (corner[b][2] - corner[a][2]) * t;
      cnt++;
    }
    vid[cid(i, j, k)] = pos.length / 3;
    pos.push(bmin[0] + (i + px / cnt) * dx, bmin[1] + (j + py / cnt) * dy, bmin[2] + (k + pz / cnt) * dz);
  }

  const idx = [];
  const quad = (a, b, c, d, axis, sign) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
    const wx = pos[c * 3] - ax, wy = pos[c * 3 + 1] - ay, wz = pos[c * 3 + 2] - az;
    const nrm = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx][axis];
    if (nrm * sign >= 0) idx.push(a, b, c, a, c, d);
    else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz; k++) for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) {
    const v0 = val[gi(i, j, k)];
    const inside = v0 < 0;
    const sign = inside ? 1 : -1;
    if ((val[gi(i + 1, j, k)] < 0) !== inside)
      quad(vid[cid(i, j - 1, k - 1)], vid[cid(i, j, k - 1)], vid[cid(i, j, k)], vid[cid(i, j - 1, k)], 0, sign);
    if ((val[gi(i, j + 1, k)] < 0) !== inside)
      quad(vid[cid(i - 1, j, k - 1)], vid[cid(i, j, k - 1)], vid[cid(i, j, k)], vid[cid(i - 1, j, k)], 1, sign);
    if ((val[gi(i, j, k + 1)] < 0) !== inside)
      quad(vid[cid(i - 1, j - 1, k)], vid[cid(i, j - 1, k)], vid[cid(i, j, k)], vid[cid(i - 1, j, k)], 2, sign);
  }

  const nrm = new Float32Array(pos.length);
  const e = 0.012;
  for (let v = 0; v < pos.length; v += 3) {
    const x = pos[v], y = pos[v + 1], z = pos[v + 2];
    const gx = f(x + e, y, z) - f(x - e, y, z);
    const gy = f(x, y + e, z) - f(x, y - e, z);
    const gz = f(x, y, z + e) - f(x, y, z - e);
    const l = len3(gx, gy, gz) || 1;
    nrm[v] = gx / l; nrm[v + 1] = gy / l; nrm[v + 2] = gz / l;
  }
  return { position: new Float32Array(pos), normal: nrm, index: new Uint32Array(idx) };
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

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = (hex) => new THREE.Color(hex);

// Per-vertex fur description: root/tip colour, length factor, growth direction.
export function furAttributes(geo) {
  const p = geo.position, n = geo.normal;
  const count = p.length / 3;
  const aRoot = new Float32Array(count * 3), aTip = new Float32Array(count * 3);
  const aLen = new Float32Array(count), aDir = new Float32Array(count * 3);
  const bodyRoot = col('#140e0c'), bodyTip = col('#4a382c');
  const redRoot = col('#5a0d0b'), redTip = col('#e0281c');
  const creamRoot = col('#a98c66'), creamTip = col('#f3e1c2');
  const tmpR = new THREE.Color(), tmpT = new THREE.Color();
  for (let v = 0; v < count; v++) {
    const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2];
    let len = 1;
    let dirx = n[v * 3], diry = n[v * 3 + 1], dirz = n[v * 3 + 2];
    tmpR.copy(bodyRoot); tmpT.copy(bodyTip);

    // Spiky red tufts at the sides of the head.
    const tuft = smooth(0.42, 0.62, Math.abs(x)) * smooth(0.18, 0.5, y) * smooth(0.25, 0.1, Math.abs(z - 0.05) - 0.3);
    // Red tail tuft on the back, and a red patch on the lower-left of the front.
    const tail = smooth(0.2, 0.42, -z) * smooth(-0.35, -0.6, y) * smooth(0.3, 0.1, Math.abs(x));
    const patch = smooth(-0.2, -0.45, x) * smooth(-0.25, -0.5, y) * smooth(0.0, 0.3, z) * 0.45;
    const red = Math.max(tuft, tail, patch);
    tmpR.lerp(redRoot, red); tmpT.lerp(redTip, red);
    len *= 1 + 3.4 * tuft + 1.4 * tail + 0.5 * patch;
    const lift = tuft * 0.9;
    dirx += Math.sign(x) * lift * 0.9; diry += lift * 0.7; dirz += 0;

    // Cream paws, shorter and denser like knitted felt.
    let paw = 0;
    for (const c of PAWS) {
      const d = Math.hypot(Math.abs(x) - Math.abs(c[0]), y - c[1], z - c[2]);
      paw = Math.max(paw, smooth(0.27, 0.19, d));
    }
    tmpR.lerp(creamRoot, paw); tmpT.lerp(creamTip, paw);
    len *= 1 - 0.35 * paw;

    const l = Math.hypot(dirx, diry, dirz) || 1;
    aDir[v * 3] = dirx / l; aDir[v * 3 + 1] = diry / l; aDir[v * 3 + 2] = dirz / l;
    aLen[v] = len;
    aRoot.set([tmpR.r, tmpR.g, tmpR.b], v * 3);
    aTip.set([tmpT.r, tmpT.g, tmpT.b], v * 3);
  }
  return { aRoot, aTip, aLen, aDir };
}
