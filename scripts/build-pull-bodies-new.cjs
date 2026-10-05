// Builds the pull assets (assets/mobies/pull/<prefix>-body-clean.webp and the lens / cross / button cut-outs)
// for characters that only have their finished art (assets/mobies/<id>.webp): the eyeball, mouth and hardware
// are cut out of the art and the holes are filled with fur copied from elsewhere on the same character.
// The eyes and mouths themselves come from the shared pull sets (see src/data/mobbyPullAssets.ts).
// Run bleed-pull-bodies.cjs, build-pull-gl-textures.cjs and measure-pull-part-anchors.cjs afterwards.
// Needs ffmpeg (set FFMPEG or have it on PATH). Pass ids to build only some, and --debug to also write previews.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const dir = path.join(root, 'assets/mobies/pull');
const SIZE = 1254;
const OX = 200, OY = 250; // the coordinates below were read off a crop that starts here

// ex/ey/erx/ery: eyeball; lens: [x, y, r]; cross: [x, y, half]; btnL / btnR: [x, y, r]; mouth: optional hole [x, y, halfW, halfH]
// mouthAt: where the pull mouth is drawn (full-canvas coordinates)
const chars = {
  bear: { art: 'bearmobby', eye: [248, 155, 112, 112], lens: [623, 155, 130], cross: [262, 435, 112], btnL: [527, 465, 50], btnR: [629, 402, 50], mouth: [428, 267, 56, 26], mouthAt: [628, 520] },
  boy: { art: 'boymobby', eye: [265, 210, 108, 110], lens: [627, 208, 125], cross: [275, 500, 96], btnL: [530, 505, 47], btnR: [632, 443, 47], mouthAt: [646, 585] },
  dog: { art: 'dogmobby', eye: [248, 152, 112, 112], lens: [621, 138, 130], cross: [253, 576, 108], btnL: [523, 598, 48], btnR: [627, 542, 48], mouth: [422, 315, 105, 60], mouthAt: [622, 565] },
  oji: { art: 'ojimobby', eye: [248, 175, 112, 102], lens: [623, 155, 130], cross: [261, 445, 105], btnL: [525, 466, 48], btnR: [628, 407, 48], mouthAt: [632, 600] },
  rea: { art: 'reamobby', eye: [250, 198, 90, 91], lens: [583, 200, 118], cross: [265, 522, 103], btnL: [505, 560, 43], btnR: [598, 507, 43], mouthAt: [616, 575] },
  shika: { art: 'shikamobby', eye: [287, 210, 108, 110], lens: [638, 213, 122], cross: [292, 465, 105], btnL: [547, 490, 46], btnR: [645, 437, 46], mouthAt: [660, 600] },
  uyu: { art: 'uyumobby', eye: [278, 175, 92, 95], lens: [590, 175, 107], cross: [290, 443, 93], btnL: [512, 467, 40], btnR: [597, 418, 40], mouthAt: [634, 535] },
  wolf: { art: 'wolfmobby', eye: [251, 188, 107, 108], lens: [617, 188, 120], cross: [261, 495, 108], btnL: [522, 520, 48], btnR: [620, 462, 48], mouth: [427, 347, 68, 17], mouthAt: [627, 597] },
};

const decode = file => execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: SIZE * SIZE * 8 });
const encode = (px, file, lossless) => execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SIZE}x${SIZE}`, '-i', '-', '-c:v', 'libwebp', '-lossless', lossless ? '1' : '0', '-compression_level', '6', file], { input: px, maxBuffer: 1 << 26 });

// Signed distance (px, negative inside) of the shapes.
const sdfEllipse = (x, y, cx, cy, rx, ry) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const sdfBox = (x, y, cx, cy, hw, hh, rad) => {
  const qx = Math.abs(x - cx) - (hw - rad), qy = Math.abs(y - cy) - (hh - rad);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
};
const sdfCross = (x, y, cx, cy, half) => {
  const thick = half * 0.34, rad = half * 0.12;
  return Math.min(sdfBox(x, y, cx, cy, half, thick, rad), sdfBox(x, y, cx, cy, thick, half, rad));
};

function shapesFor(c) {
  const o = ([x, y, ...r]) => [x + OX, y + OY, ...r];
  const [ex, ey, erx, ery] = o(c.eye), [lx, ly, lr] = o(c.lens), [cx, cy, ch] = o(c.cross), [lx2, ly2, lr2] = o(c.btnL), [rx2, ry2, rr2] = o(c.btnR);
  const shapes = {
    eye: (x, y) => sdfEllipse(x, y, ex, ey, erx, ery),
    lens: (x, y) => sdfEllipse(x, y, lx, ly, lr, lr),
    cross: (x, y) => sdfCross(x, y, cx, cy, ch),
    buttonLeft: (x, y) => sdfEllipse(x, y, lx2, ly2, lr2, lr2),
    buttonRight: (x, y) => sdfEllipse(x, y, rx2, ry2, rr2, rr2),
  };
  const bounds = { eye: [ex, ey, erx, ery], lens: [lx, ly, lr, lr], cross: [cx, cy, ch, ch], buttonLeft: [lx2, ly2, lr2, lr2], buttonRight: [rx2, ry2, rr2, rr2] };
  if (c.mouth) {
    const [mx, my, mw, mh] = o(c.mouth);
    shapes.mouth = (x, y) => sdfBox(x, y, mx, my, mw, mh, Math.min(mw, mh) * 0.5);
    bounds.mouth = [mx, my, mw, mh];
  }
  return { shapes, bounds };
}

// Coverage of a shape grown by `grow` px with a `soft` px antialiased edge.
const cover = (d, grow, soft) => Math.min(1, Math.max(0, (grow - d) / soft + 0.5));

// Smooth fill for small marks on soft fur (a mouth): relax the hole towards its surroundings, then add a little grain.
function diffuseFill(px, holeMask, bound) {
  const [bx, by, brx, bry] = bound;
  const x0 = Math.max(1, Math.floor(bx - brx - 26)), x1 = Math.min(SIZE - 2, Math.ceil(bx + brx + 26));
  const y0 = Math.max(1, Math.floor(by - bry - 26)), y1 = Math.min(SIZE - 2, Math.ceil(by + bry + 26));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const hole = new Uint8Array(w * h), val = new Float32Array(w * h * 3);
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = (y + y0) * SIZE + x + x0, k = y * w + x;
    hole[k] = holeMask[p] > 0.01 ? 1 : 0;
    for (let c = 0; c < 3; c += 1) val[k * 3 + c] = px[p * 4 + c];
    if (!hole[k] && x > 0 && y > 0 && x < w - 1 && y < h - 1) {
      let edge = false;
      for (let dy = -2; dy <= 2 && !edge; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && xx >= 0 && yy < h && xx < w && holeMask[(yy + y0) * SIZE + xx + x0] > 0.01) { edge = true; break; }
      }
      if (edge) { sr += px[p * 4]; sg += px[p * 4 + 1]; sb += px[p * 4 + 2]; n += 1; }
    }
  }
  for (let k = 0; k < w * h; k += 1) if (hole[k]) { val[k * 3] = sr / n; val[k * 3 + 1] = sg / n; val[k * 3 + 2] = sb / n; }
  for (let it = 0; it < 900; it += 1) {
    for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
      const k = y * w + x;
      if (!hole[k]) continue;
      for (let c = 0; c < 3; c += 1) val[k * 3 + c] = (val[(k - 1) * 3 + c] + val[(k + 1) * 3 + c] + val[(k - w) * 3 + c] + val[(k + w) * 3 + c]) / 4;
    }
  }
  let seed = 12345;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const k = y * w + x, p = (y + y0) * SIZE + x + x0, m = holeMask[p];
    if (!hole[k]) continue;
    const grain = rand() * 9;
    for (let c = 0; c < 3; c += 1) px[p * 4 + c] = Math.round(px[p * 4 + c] * (1 - m) + Math.min(255, Math.max(0, val[k * 3 + c] + grain)) * m);
  }
  console.log('  smooth fill');
}

const TILE = 32, PAD = 14, STEP = 6, REACH = 420;
// Fills the hole tile by tile (the ones touching the most known pixels first). Each tile copies the donor patch whose
// surroundings best match the known pixels around it, so the fur texture is real fur and not a blur.
function fillHole(px, holeMask, invalid, bound) {
  const [bx, by, brx, bry] = bound;
  const x0 = Math.max(0, Math.floor(bx - brx - 26)), x1 = Math.min(SIZE - 1, Math.ceil(bx + brx + 26));
  const y0 = Math.max(0, Math.floor(by - bry - 26)), y1 = Math.min(SIZE - 1, Math.ceil(by + bry + 26));
  const stride = SIZE + 1;
  const integral = fillHole.integral || (fillHole.integral = new Int32Array(stride * stride));
  for (let y = 0; y < SIZE; y += 1) {
    let run = 0;
    for (let x = 0; x < SIZE; x += 1) {
      run += invalid[y * SIZE + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + run;
    }
  }
  const boxInvalid = (ax, ay, bx2, by2) => integral[(by2 + 1) * stride + bx2 + 1] - integral[ay * stride + bx2 + 1] - integral[(by2 + 1) * stride + ax] + integral[ay * stride + ax];
  const known = new Uint8Array(SIZE * SIZE);
  for (let p = 0; p < SIZE * SIZE; p += 1) known[p] = holeMask[p] > 0.01 ? 0 : 1;
  const tiles = [];
  for (let ty = y0; ty <= y1; ty += TILE) for (let tx = x0; tx <= x1; tx += TILE) {
    let any = false;
    for (let y = ty; y < Math.min(ty + TILE, y1 + 1) && !any; y += 1) for (let x = tx; x < Math.min(tx + TILE, x1 + 1); x += 1) if (!known[y * SIZE + x]) { any = true; break; }
    if (any) tiles.push({ tx, ty, done: false });
  }
  const knownIn = (t) => { // known pixel samples in the tile's padded box
    const out = [];
    for (let y = Math.max(0, t.ty - PAD); y < Math.min(SIZE, t.ty + TILE + PAD); y += 2) for (let x = Math.max(0, t.tx - PAD); x < Math.min(SIZE, t.tx + TILE + PAD); x += 2) if (known[y * SIZE + x] && px[(y * SIZE + x) * 4 + 3] >= 250) out.push(y * SIZE + x);
    return out;
  };
  let remaining = tiles.length, worst = 0;
  while (remaining > 0) {
    let pick = null, pickSamples = null;
    for (const t of tiles) {
      if (t.done) continue;
      const samples = knownIn(t);
      if (!pick || samples.length > pickSamples.length) { pick = t; pickSamples = samples; }
    }
    const t = pick, samples = pickSamples;
    if (samples.length < 12) throw new Error('tile has no known surroundings');
    const ax = Math.max(0, t.tx - PAD), ay = Math.max(0, t.ty - PAD);
    const bx2 = Math.min(SIZE - 1, t.tx + TILE + PAD - 1), by2 = Math.min(SIZE - 1, t.ty + TILE + PAD - 1);
    // What fur here looks like: donors with a very different average colour or a lot more contrast (a nose, a seam) are skipped.
    const stats = (pts, shift) => {
      let r = 0, g = 0, b = 0, l = 0, l2 = 0;
      for (const p of pts) { const i = p * 4 + shift; const lum = (px[i] + px[i + 1] + px[i + 2]) / 3; r += px[i]; g += px[i + 1]; b += px[i + 2]; l += lum; l2 += lum * lum; }
      const n = pts.length;
      return { r: r / n, g: g / n, b: b / n, v: l2 / n - (l / n) * (l / n) };
    };
    const ref = stats(samples, 0);
    const inner = [];
    for (let y = t.ty; y < Math.min(t.ty + TILE, SIZE); y += 4) for (let x = t.tx; x < Math.min(t.tx + TILE, SIZE); x += 4) inner.push(y * SIZE + x);
    let best = null, bestScore = Infinity;
    for (const [maxDist, varMul, varAdd] of [[35, 2.2, 120], [60, 3.5, 400], [90, 6, 1200]]) {
    if (best) break;
    for (let dy = -REACH; dy <= REACH; dy += STEP) for (let dx = -REACH; dx <= REACH; dx += STEP) {
      if (ax + dx < 0 || ay + dy < 0 || bx2 + dx >= SIZE || by2 + dy >= SIZE) continue;
      if (boxInvalid(ax + dx, ay + dy, bx2 + dx, by2 + dy) > 0) continue;
      let sum = 0;
      for (let k = 0; k < samples.length; k += 1) {
        const p = samples[k] * 4, q = samples[k] * 4 + (dy * SIZE + dx) * 4;
        const a = px[p] - px[q], b = px[p + 1] - px[q + 1], c = px[p + 2] - px[q + 2];
        sum += a * a + b * b + c * c;
        if (sum >= bestScore * samples.length) break;
      }
      const score = sum / samples.length;
      if (score < bestScore) {
        const d = stats(inner, (dy * SIZE + dx) * 4);
        if (Math.hypot(d.r - ref.r, d.g - ref.g, d.b - ref.b) > maxDist || d.v > ref.v * varMul + varAdd) continue;
        bestScore = score; best = [dx, dy];
      }
    }
    }
    if (!best) throw new Error('no donor patch found');
    const [dx, dy] = best;
    let mr = 0, mg = 0, mb = 0;
    for (const s of samples) { const q = s * 4 + (dy * SIZE + dx) * 4; mr += px[s * 4] - px[q]; mg += px[s * 4 + 1] - px[q + 1]; mb += px[s * 4 + 2] - px[q + 2]; }
    mr /= samples.length; mg /= samples.length; mb /= samples.length;
    const writes = [];
    for (let y = t.ty; y < Math.min(t.ty + TILE, SIZE); y += 1) for (let x = t.tx; x < Math.min(t.tx + TILE, SIZE); x += 1) {
      const p = y * SIZE + x, m = holeMask[p];
      if (m <= 0) continue;
      const q = p * 4 + (dy * SIZE + dx) * 4;
      writes.push([p, m, px[q] + mr, px[q + 1] + mg, px[q + 2] + mb]);
    }
    for (const [p, m, r, g, b] of writes) {
      const i = p * 4;
      px[i] = Math.round(px[i] * (1 - m) + Math.min(255, Math.max(0, r)) * m);
      px[i + 1] = Math.round(px[i + 1] * (1 - m) + Math.min(255, Math.max(0, g)) * m);
      px[i + 2] = Math.round(px[i + 2] * (1 - m) + Math.min(255, Math.max(0, b)) * m);
      known[p] = 1;
    }
    t.done = true; remaining -= 1; worst = Math.max(worst, Math.sqrt(bestScore));
  }
  console.log('  tiles', tiles.length, 'worst match error', Math.round(worst));
}

const args = process.argv.slice(2);
const debug = args.includes('--debug');
const only = args.filter(a => !a.startsWith('--'));
for (const [prefix, c] of Object.entries(chars)) {
  if (only.length && !only.includes(prefix)) continue;
  console.log(prefix);
  const art = decode(path.join(root, 'assets/mobies', `${c.art}.webp`));
  const { shapes, bounds } = shapesFor(c);
  const names = Object.keys(shapes);
  // Cut-outs for the fixed hardware (the eye and mouth are replaced by the pull sets).
  for (const [part, file] of [['lens', 'lens'], ['cross', 'cross'], ['buttonLeft', 'button-left'], ['buttonRight', 'button-right']]) {
    const layer = Buffer.alloc(SIZE * SIZE * 4);
    const [bx, by, brx, bry] = bounds[part];
    for (let y = Math.max(0, Math.floor(by - bry - 8)); y <= Math.min(SIZE - 1, Math.ceil(by + bry + 8)); y += 1) {
      for (let x = Math.max(0, Math.floor(bx - brx - 8)); x <= Math.min(SIZE - 1, Math.ceil(bx + brx + 8)); x += 1) {
        const a = cover(shapes[part](x, y), 2, 2);
        if (a <= 0) continue;
        const i = (y * SIZE + x) * 4;
        layer[i] = art[i]; layer[i + 1] = art[i + 1]; layer[i + 2] = art[i + 2]; layer[i + 3] = Math.round(art[i + 3] * a);
      }
    }
    encode(layer, path.join(dir, `${prefix}-${file}.webp`), true);
  }
  // Pixels no donor patch may come from: transparent ones and anywhere near a feature.
  const invalid = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    const p = y * SIZE + x;
    if (art[p * 4 + 3] < 250) { invalid[p] = 1; continue; }
    for (const name of names) if (shapes[name](x, y) < 14) { invalid[p] = 1; break; }
  }
  // Features the body keeps (nose, collar...) are not known here, so the ring match is what keeps donors sensible.
  const body = Buffer.from(art);
  for (const name of names) {
    const [bx, by, brx, bry] = bounds[name];
    const mask = new Float32Array(SIZE * SIZE);
    const grow = name === 'eye' || name === 'mouth' ? 7 : 8;
    for (let y = Math.max(0, Math.floor(by - bry - 24)); y <= Math.min(SIZE - 1, Math.ceil(by + bry + 24)); y += 1) {
      for (let x = Math.max(0, Math.floor(bx - brx - 24)); x <= Math.min(SIZE - 1, Math.ceil(bx + brx + 24)); x += 1) {
        mask[y * SIZE + x] = cover(shapes[name](x, y), grow, 8);
      }
    }
    console.log(' fill', name);
    if (name === 'mouth') diffuseFill(body, mask, bounds[name]); else fillHole(body, mask, invalid, bounds[name]);
  }
  encode(body, path.join(dir, `${prefix}-body-clean.webp`), true);
  if (debug) {
    const dbg = path.join(process.env.DEBUG_DIR || dir, `_debug-${prefix}.png`);
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SIZE}x${SIZE}`, '-i', '-', '-frames:v', '1', dbg], { input: body, maxBuffer: 1 << 26 });
  }
  const [ex, ey, erx, ery] = bounds.eye;
  const w = Math.round(erx * 2 * 1.27), h = Math.round(ery * 2 * 1.09);
  console.log(` eyeFrame: { x: ${Math.round(ex - w / 2)}, y: ${Math.round(ey - h / 2)}, width: ${w}, height: ${h} }, mouthFrame: { x: ${c.mouthAt[0] - 75}, y: ${c.mouthAt[1] - 35}, width: 150, height: 69 }`);
}
