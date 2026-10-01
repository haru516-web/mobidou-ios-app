// Naive Surface Nets: turns an SDF into an indexed mesh with gradient normals.
const len3 = (x, y, z) => Math.hypot(x, y, z);
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

