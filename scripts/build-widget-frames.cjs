// Cuts the pilgrimage walk sheets into the small per-frame PNGs the home screen widget shows.
// The widget cannot slice a sheet at run time cheaply, and its memory budget is small, so every
// frame is cropped to the shared silhouette bounds and scaled down once, here.
// Requires sharp (SHARP_MODULE may point at a shared runtime installation).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.join(__dirname, '..');
const metrics = require('../src/data/pilgrimageSpriteMetrics.json');
const sheets = path.join(root, 'assets/mobies/pilgrimage-walk');
// A catalog of its own: the widget plugin generates its Assets.xcassets next to it.
const out = path.join(root, 'targets/widget/WalkFrames.xcassets');
const FRAME_HEIGHT = 300;
// Generated sheets carry stray specks far from the character; the stored metrics include them and
// would shrink the Mobby. Measure the real silhouette instead: the outermost sliver of
// opaque pixels on each side does not count, and the same box is used for all four poses so the walk does not jitter.
async function silhouette(file, m) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const TAIL = 0.003; // the outermost 0.3% of the opaque pixels on each side are treated as specks
  let box = null;
  for (let frame = 0; frame < m.columns; frame += 1) {
    const cols = new Array(m.cellWidth).fill(0), rows = new Array(info.height).fill(0);
    let total = 0;
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < m.cellWidth; x += 1) {
      if (data[(y * info.width + frame * m.cellWidth + x) * 4 + 3] > 40) { cols[x] += 1; rows[y] += 1; total += 1; }
    }
    const edge = (hist, fromEnd) => {
      let seen = 0;
      for (let i = 0; i < hist.length; i += 1) {
        const index = fromEnd ? hist.length - 1 - i : i;
        seen += hist[index];
        if (seen > total * TAIL) return index;
      }
      return fromEnd ? hist.length - 1 : 0;
    };
    const next = { x0: edge(cols, false), x1: edge(cols, true), y0: edge(rows, false), y1: edge(rows, true) };
    box = box ? { x0: Math.min(box.x0, next.x0), x1: Math.max(box.x1, next.x1), y0: Math.min(box.y0, next.y0), y1: Math.max(box.y1, next.y1) } : next;
  }
  return { left: box.x0, top: box.y0, width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 };
}
(async () => {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'Contents.json'), JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2));
  const ids = Object.keys(metrics).filter(key => key.endsWith('/walk')).map(key => key.slice(0, -5)).sort();
  for (const id of ids) {
    const m = metrics[`${id}/walk`];
    const webp = path.join(sheets, `${id}.webp`);
    const file = fs.existsSync(webp) ? webp : path.join(sheets, `${id}.png`);
    const box = await silhouette(file, m);
    for (let frame = 0; frame < m.columns; frame += 1) {
      const set = path.join(out, `${id}_${frame}.imageset`);
      fs.mkdirSync(set);
      fs.writeFileSync(path.join(set, 'Contents.json'), JSON.stringify({ images: [{ filename: `${id}_${frame}.png`, idiom: 'universal' }], info: { author: 'xcode', version: 1 } }, null, 2));
      await sharp(file)
        .extract({ left: frame * m.cellWidth + box.left, top: box.top, width: box.width, height: box.height })
        .resize({ height: FRAME_HEIGHT })
        .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
                    .toFile(path.join(set, `${id}_${frame}.png`));
    }
  }
  console.log(`wrote ${ids.length * 4} frames for ${ids.length} mobbies to ${path.relative(root, out)}`);
})();
