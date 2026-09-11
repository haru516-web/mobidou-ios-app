// Inspect generated atlases without altering their artwork. The viewport metadata
// keeps the walk and prayer silhouettes at the same height and baseline.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
async function inspect(file, columns) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width / columns;
  if (!Number.isInteger(width)) throw Error(`Unequal cells: ${file}`);
  let left = width, top = info.height, right = 0, bottom = 0;
  for (let frame = 0; frame < columns; frame++) {
    const xs = Array(width).fill(0), ys = Array(info.height).fill(0);
    for (let y = 0; y < info.height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * info.width + frame * width + x) * 4 + 3] > 128) { xs[x]++; ys[y]++; }
    }
    const xx = xs.map((count, x) => count > info.height * .012 ? x : -1).filter(x => x >= 0);
    const yy = ys.map((count, y) => count > width * .02 ? y : -1).filter(y => y >= 0);
    if (!xx.length || !yy.length) throw Error(`Empty sprite: ${file} frame ${frame}`);
    left = Math.min(left, xx[0]); top = Math.min(top, yy[0]); right = Math.max(right, xx.at(-1)); bottom = Math.max(bottom, yy.at(-1));
  }
  return { columns, width: info.width, height: info.height, cellWidth: width, left: Math.max(0, left - 3), top: Math.max(0, top - 3), cropWidth: Math.min(width, right - left + 7), cropHeight: Math.min(info.height, bottom - top + 7) };
}
(async () => {
  const metrics = {};
  const walks = path.join(root, 'assets/mobies/pilgrimage-walk');
  for (const file of fs.readdirSync(walks).filter(file => file.endsWith('.png'))) {
    const id = path.basename(file, '.png');
    metrics[`${id}/walk`] = await inspect(path.join(walks, file), 4);
  }
  for (const id of fs.readdirSync(path.join(root, 'assets/mobies/prayer-v2'))) {
    const folder = path.join(root, 'assets/mobies/prayer-v2', id);
    if (!fs.statSync(folder).isDirectory()) continue;
    for (const action of ['rei', 'hakushu']) metrics[`${id}/${action}`] = await inspect(path.join(folder, `${action}.png`), 8);
    const a = metrics[`${id}/rei`], b = metrics[`${id}/hakushu`];
    const top = Math.min(a.top, b.top), bottom = Math.max(a.top + a.cropHeight, b.top + b.cropHeight);
    a.top = b.top = top; a.cropHeight = b.cropHeight = bottom - top;
  }
  fs.writeFileSync(path.join(root, 'src/data/pilgrimageSpriteMetrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  process.stdout.write(`Inspected ${Object.keys(metrics).length} generated atlases.\n`);
})().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
