// 1. Some bodies have the exported art's grey/white checkerboard baked in *inside* the character's silhouette
//    (fluffy foot edges, for example), where the silhouette mask keeps it visible. Those pixels are restored
//    from the character art itself (assets/mobies/<id>.webp), which has the real fur there.
// 2. The pull mesh filters the body texture bilinearly, so whatever RGB sits under transparent
// (or nearly transparent) pixels bleeds into the silhouette edge. The exported bodies carry
// white/grey checkerboard colour there, which shows up as a pale rim when a character is pulled.
// This paints those pixels with the colour of the nearest solid pixel. Fully transparent pixels get
// alpha 1/255 (invisible) because the webp encoder otherwise wipes the colour of fully transparent blocks.
// Needs ffmpeg (set FFMPEG or have it on PATH). Run build-pull-gl-textures.cjs afterwards.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const dir = path.join(root, 'assets/mobies/pull');
const SIZE = 1254;
const SOLID = 180; // alpha at or above this is a colour source for the fill
const FILL_BELOW = 40; // only pixels fainter than this are repainted; the rest keep their own real colour
const EDGE_REACH = 45; // the baked-in checkerboard only sits within this many px of the silhouette edge
// pull-body prefix -> the character art whose silhouette is used as the mask
const bodies = { mobirin: 'mobirin', mobichi: 'mobichi', yami: 'yami-mobby', mobiyan: 'mobiyan', yura: 'mobiyura', reo: 'reomoby', pote: 'potemoby', mobibou: 'mobibou', babu: 'babumoby' };
const decode = file => execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', `scale=${SIZE}:${SIZE}:flags=lanczos`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: SIZE * SIZE * 8 });
const channelGap = (a, i) => Math.max(Math.abs(a[i] - a[i + 1]), Math.abs(a[i + 1] - a[i + 2]));
// The art must be clearly more colourful than the grey checkerboard (or, low down where there are no eyes or
// lenses to mistake for it, clearly darker); a white patch that merely differs in shading (a bandage, a
// moustache) is real artwork and stays.
const isRealFur = (body, art, i, y) => (y >= SIZE * 0.7 && channelGap(art, i) > channelGap(body, i) + 12) || (y >= SIZE * 0.75 && luma(body, i) - luma(art, i) > 60);
const luma = (a, i) => (a[i] + a[i + 1] + a[i + 2]) / 3;
const meanDiff = (a, b, i) => (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;

for (const [name, artName] of Object.entries(bodies)) {
  const file = path.join(dir, `${name}-body-clean.webp`);
  const px = decode(file);
  const art = decode(path.join(root, 'assets/mobies', `${artName}.webp`));
  const total = SIZE * SIZE;
  // How far each pixel is from the outside of the character (art alpha < 128), up to EDGE_REACH px. The baked-in
  // checkerboard only ever sits along the silhouette, so anything deeper in is real artwork.
  const reach = new Uint8Array(total).fill(255);
  let ring = [];
  for (let p = 0; p < total; p += 1) if (art[p * 4 + 3] < 128) { reach[p] = 0; ring.push(p); }
  for (let step = 1; step <= EDGE_REACH; step += 1) {
    const next = [];
    for (const p of ring) {
      const x = p % SIZE, y = (p - x) / SIZE;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const q = ny * SIZE + nx;
        if (reach[q] === 255) { reach[q] = step; next.push(q); }
      }
    }
    ring = next;
  }
  // Checkerboard pixels: solid, light and colourless in the body, but a different colour in the character art.
  const checker = new Uint8Array(total);
  let frontierChecker = [];
  for (let p = 0; p < total; p += 1) {
    const i = p * 4;
    if (reach[p] <= EDGE_REACH && px[i + 3] >= 200 && art[i + 3] >= 200 && px[i] > 165 && channelGap(px, i) < 12 && meanDiff(px, art, i) > 35 && isRealFur(px, art, i, Math.floor(p / SIZE))) { checker[p] = 1; frontierChecker.push(p); }
  }
  // The checkerboard's antialiased edge is softer, so grow the set a little into similar pixels.
  for (let pass = 0; pass < 2; pass += 1) {
    const grown = [];
    for (const p of frontierChecker) {
      const x = p % SIZE, y = (p - x) / SIZE;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const q = ny * SIZE + nx, j = q * 4;
        if (!checker[q] && reach[q] <= EDGE_REACH && px[j + 3] >= 128 && art[j + 3] >= 128 && px[j] > 150 && channelGap(px, j) < 16 && meanDiff(px, art, j) > 20) { checker[q] = 1; grown.push(q); }
      }
    }
    frontierChecker = grown;
  }
  // Under the feet the character art has a soft, semi-transparent shadow instead of fur; the body's checkerboard there is not
  // artwork at all, so it is made transparent (the pull view drops the shadow, the still view keeps its own).
  let erased = 0;
  for (let p = 0; p < total; p += 1) {
    const i = p * 4;
    if (Math.floor(p / SIZE) >= SIZE * 0.8 && px[i + 3] >= 16 && art[i + 3] < 200 && px[i] > 150 && channelGap(px, i) < 16) { px[i + 3] = 0; erased += 1; }
  }
  if (erased) console.log(name, 'erased checkerboard under the feet:', erased);
  let restored = 0;
  for (let p = 0; p < total; p += 1) if (checker[p]) { px[p * 4] = art[p * 4]; px[p * 4 + 1] = art[p * 4 + 1]; px[p * 4 + 2] = art[p * 4 + 2]; restored += 1; }
  console.log(name, 'restored checkerboard pixels:', restored);
  const source = new Int32Array(total).fill(-1); // index of the solid pixel each pixel copies from
  let frontier = [];
  for (let p = 0; p < total; p += 1) if (px[p * 4 + 3] >= SOLID) { source[p] = p; frontier.push(p); }
  while (frontier.length) {
    const next = [];
    for (const p of frontier) {
      const x = p % SIZE, y = (p - x) / SIZE;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const q = ny * SIZE + nx;
        if (source[q] === -1) { source[q] = source[p]; next.push(q); }
      }
    }
    frontier = next;
  }
  for (let p = 0; p < total; p += 1) {
    if (px[p * 4 + 3] === 0) px[p * 4 + 3] = 1;
    if (px[p * 4 + 3] >= FILL_BELOW || source[p] < 0) continue;
    const s = source[p] * 4;
    px[p * 4] = px[s]; px[p * 4 + 1] = px[s + 1]; px[p * 4 + 2] = px[s + 2];
  }
  const tmp = file + '.tmp.webp';
  // Encode losslessly so all visible character pixels remain byte-for-byte unchanged.
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${SIZE}x${SIZE}`, '-i', '-', '-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6', tmp], { input: px, maxBuffer: 1 << 26 });
  execFileSync(ffmpeg, ['-v', 'error', '-i', tmp, '-frames:v', '1', '-f', 'null', '-'], { stdio: 'pipe' });
  fs.renameSync(tmp, file);
  console.log(name, Math.round(fs.statSync(file).size / 1024) + 'KB');
}
