// Rebuild: node docs/collection-space-backdrop-build.cjs <generated-panorama.png>
// Requires the project's jimp-compact and ffmpeg (libwebp) on PATH.
const Jimp = require('jimp-compact');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mobidou-space-'));
  const out = 'assets/collection/space';
  fs.mkdirSync(out, { recursive: true });
  const image = await Jimp.read(process.argv[2]);
  const original = [image.bitmap.width, image.bitmap.height];
  image.resize(6656, 2560, Jimp.RESIZE_BICUBIC);
  const overlap = image.clone().crop(6144, 0, 512, 2560);
  image.crop(0, 0, 6144, 2560);
  const { data, width: w, height: h } = image.bitmap;
  // Crossfade two spatially varying strips; the final pixel flows into the
  // next source pixel at the start of the panorama, without row-color streaks.
  const smooth = t => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < 512; x++) for (let c = 0; c < 3; c++) {
      const weight = 1 - smooth(x / 511);
      const i = (y * w + x) * 4 + c;
      const target = overlap.bitmap.data[(y * 512 + x) * 4 + c];
      data[i] = Math.round(data[i] * (1 - weight) + target * weight);
    }
  }
  const bg = [27, 20, 38];
  for (let y = 0; y < h; y++) {
    const edge = smooth(Math.min(1, Math.min(y, h - 1 - y) / 280));
    const center = 1 - 0.18 * Math.exp(-Math.pow((y / h - 0.5) / 0.22, 4));
    const keep = edge * center;
    for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      const i = (y * w + x) * 4 + c;
      data[i] = Math.round(data[i] * keep + bg[c] * (1 - keep));
    }
  }
  await image.writeAsync(path.join(temp, 'panorama.png'));
  const rows = [];
  const joined = new Jimp(w, h);
  for (let n = 1; n <= 4; n++) {
    const png = path.join(temp, `tile-${n}.png`);
    const file = `${out}/space-bg-${n}.webp`;
    await image.clone().crop((n - 1) * 1536, 0, 1536, h).writeAsync(png);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', file]);
    const decoded = path.join(temp, `decoded-${n}.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, decoded]);
    const tile = await Jimp.read(decoded);
    const bytes = fs.statSync(file).size;
    const header = fs.readFileSync(file);
    if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP' || tile.bitmap.width !== 1536 || tile.bitmap.height !== 2560 || bytes > 700000 || tile.hasAlpha()) throw new Error(`Invalid tile: ${file}`);
    joined.composite(tile, (n - 1) * 1536, 0);
    rows.push({ file, format: 'WebP', width: 1536, height: 2560, alpha: false, bytes });
  }
  const seams = [];
  for (let n = 1; n <= 4; n++) {
    const x1 = n * 1536 - 1, x2 = n === 4 ? 0 : n * 1536;
    let sum = 0, max = 0;
    for (let y = 0; y < h; y++) for (let c = 0; c < 3; c++) {
      const delta = Math.abs(joined.bitmap.data[(y * w + x1) * 4 + c] - joined.bitmap.data[(y * w + x2) * 4 + c]);
      sum += delta; max = Math.max(max, delta);
    }
    seams.push({ seam: `${n}->${n === 4 ? 1 : n + 1}`, meanChannelDelta: +(sum / (h * 3)).toFixed(3), maxChannelDelta: max });
  }
  // Preview uses the decoded delivery files, in exact registration order.
  await joined.clone().resize(2304, 960).writeAsync('docs/collection-space-backdrop-preview.png');
  const wrap = new Jimp(768, h);
  wrap.composite(joined.clone().crop(w - 384, 0, 384, h), 0, 0);
  wrap.composite(joined.clone().crop(0, 0, 384, h), 384, 0);
  await wrap.resize(384, 1280).writeAsync('docs/collection-space-backdrop-wrap-preview.png');
  fs.writeFileSync('docs/collection-space-backdrop-validation.json', JSON.stringify({ originalGeneratedSize: original, masterSize: [w,h], workflow: 'single generated panorama, bicubic upscale, periodic edge blend, dark edge fade, four equal crops, WebP quality 82', tiles: rows, seams }, null, 2) + '\n');
  console.log(JSON.stringify({ tiles: rows, seams }, null, 2));
  // Only files in this newly created temporary directory are removed.
  fs.rmSync(temp, { recursive: true });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
