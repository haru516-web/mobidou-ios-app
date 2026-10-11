// Mechanical acceptance check for regenerated sprite sheets (docs/sprite-regeneration/*.md).
//
//   node scripts/check-sprite-sheet.cjs walk   <sheet.png|dir> [more...] [--columns 8] [--review outDir]
//   node scripts/check-sprite-sheet.cjs prayer <source.png|dir> [more...] [--review outDir]
//
// A directory is searched for sheets: walk takes *.png / *.webp directly inside it (map-peek pictures are
// skipped); prayer takes <dir>/<id>/source.png. Exit code is 1 when any sheet has a FAIL.
// FAIL = a criterion with a hard number. WARN = a heuristic that needs a human look at the review sheet.
// Requires sharp (SHARP_MODULE may point at a shared runtime installation).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

// ---- Thresholds (keep in step with the request documents) -------------------------------------
const T = {
  strong: 32,            // alpha counted as "opaque" for margins and sizes
  faint: 8,              // alpha used to find connected pieces (so faint fragments are caught too)
  fragmentPixels: 6,     // a separate piece of at least this many strong pixels is a fragment
  walk: {
    cellWidth: 384, cellHeight: 1024,
    sideMargin: 16,      // px free of opaque pixels at the left and right of every cell
    baselineTol: 3,      // px
    centerTol: 6,        // px, alpha-weighted centre
    heightRatio: 1.10,   // tallest / shortest frame
    halvesSimilar: 0.5,  // distance(i, i+4) must be at least this fraction of a neighbouring step
    jumpFactor: 2.5,     // a step this many times the median step is flagged
  },
  prayer: {
    minCell: 512,
    sideKeep: 0.15,      // the outer 15% on each side stays empty (character inside the central 70%)
    vertMargin: 16,      // px at 512px cell size (scaled with the cell)
    baselineTol: 3,      // px at 512px cell size
    centerTol: 8,        // px at 512px cell size
    scaleTol: 0.03,      // upright frames: height within 3%
    sameFrameIoU: 0.90,  // first and last frame of a row must be the same pose
    areaWarn: 0.15,      // a frame whose silhouette area is this far from the median is flagged (lost item?)
  },
};

// ---- Pixels ---------------------------------------------------------------------------------
async function readSheet(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
  return { alpha, rgb: data, width: info.width, height: info.height };
}

function cellAlpha(sheet, col, row, cw, ch) {
  const out = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y += 1) {
    const from = (row * ch + y) * sheet.width + col * cw;
    out.set(sheet.alpha.subarray(from, from + cw), y * cw);
  }
  return out;
}

/** Connected pieces (4-neighbour) of the faint mask. The biggest by strong pixels is the character. */
function pieces(alpha, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const found = [];
  const stack = [];
  for (let start = 0; start < alpha.length; start += 1) {
    if (label[start] !== -1 || alpha[start] < T.faint) continue;
    const id = found.length;
    const piece = { id, strong: 0, minX: w, maxX: -1, minY: h, maxY: -1 };
    stack.push(start); label[start] = id;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      if (alpha[p] >= T.strong) {
        piece.strong += 1;
        if (x < piece.minX) piece.minX = x;
        if (x > piece.maxX) piece.maxX = x;
        if (y < piece.minY) piece.minY = y;
        if (y > piece.maxY) piece.maxY = y;
      }
      if (x > 0 && label[p - 1] === -1 && alpha[p - 1] >= T.faint) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && label[p + 1] === -1 && alpha[p + 1] >= T.faint) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && label[p - w] === -1 && alpha[p - w] >= T.faint) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && label[p + w] === -1 && alpha[p + w] >= T.faint) { label[p + w] = id; stack.push(p + w); }
    }
    found.push(piece);
  }
  let main = null;
  for (const piece of found) if (!main || piece.strong > main.strong) main = piece;
  return { found, main, label };
}

function measure(alpha, w, h) {
  const { found, main, label } = pieces(alpha, w, h);
  if (!main || main.strong === 0) return { empty: true };
  let sum = 0, sumX = 0, area = 0;
  for (let p = 0; p < alpha.length; p += 1) {
    if (label[p] !== main.id || alpha[p] < T.strong) continue;
    sum += 1; sumX += p % w; area += 1;
  }
  const fragments = found.filter(piece => piece.id !== main.id && piece.strong >= T.fragmentPixels);
  return {
    empty: false,
    bbox: { x0: main.minX, x1: main.maxX, y0: main.minY, y1: main.maxY },
    height: main.maxY - main.minY + 1,
    bottom: main.maxY + 1,
    centerX: sumX / sum,
    area,
    fragments: fragments.map(piece => ({ size: piece.strong, x: Math.round((piece.minX + piece.maxX) / 2), y: Math.round((piece.minY + piece.maxY) / 2) })),
    mainLabel: main.id,
    label,
  };
}

/** Opaque pixels (any piece) within the first/last `margin` columns. */
function sideIntrusion(alpha, w, h, leftMargin, rightMargin) {
  let left = 0, right = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < leftMargin; x += 1) if (alpha[y * w + x] >= T.strong) left += 1;
    for (let x = w - rightMargin; x < w; x += 1) if (alpha[y * w + x] >= T.strong) right += 1;
  }
  return { left, right };
}

function edgeIntrusion(alpha, w, h, top, bottom) {
  let n = 0;
  for (let y = 0; y < top; y += 1) for (let x = 0; x < w; x += 1) if (alpha[y * w + x] >= T.strong) n += 1;
  for (let y = h - bottom; y < h; y += 1) for (let x = 0; x < w; x += 1) if (alpha[y * w + x] >= T.strong) n += 1;
  return n;
}

/** 0 = identical silhouettes, 1 = nothing in common (soft IoU distance on a 4x downsample). */
function distance(a, b, w, h) {
  const bw = Math.floor(w / 4), bh = Math.floor(h / 4);
  let inter = 0, union = 0;
  for (let by = 0; by < bh; by += 1) for (let bx = 0; bx < bw; bx += 1) {
    let sa = 0, sb = 0;
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
      const p = (by * 4 + y) * w + bx * 4 + x;
      sa += a[p]; sb += b[p];
    }
    inter += Math.min(sa, sb); union += Math.max(sa, sb);
  }
  return union === 0 ? 0 : 1 - inter / union;
}

/** The biggest few pieces, then a count: a speckled sheet would otherwise print hundreds of them. */
const describePieces = list => { const top = [...list].sort((a, b) => b.size - a.size); return `${top.slice(0, 2).map(f => `${f.size}px@${f.x},${f.y}`).join(' ')}${top.length > 2 ? ` 他${top.length - 2}個` : ''}`; };
const median = values => { const s = [...values].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const range = values => Math.max(...values) - Math.min(...values);

/**
 * Colour bins (4 bits per channel) that cover a real share of a row's first frame but nearly vanish in
 * another frame of the row: a held item that disappears (the pipe in the clap) leaves exactly this.
 */
function colourBins(sheet, col, row, cw, ch) {
  const bins = new Map();
  let total = 0;
  for (let y = 0; y < ch; y += 1) for (let x = 0; x < cw; x += 1) {
    const p = (row * ch + y) * sheet.width + col * cw + x;
    if (sheet.alpha[p] < 200) continue;
    const key = ((sheet.rgb[p * 4] >> 4) << 8) | ((sheet.rgb[p * 4 + 1] >> 4) << 4) | (sheet.rgb[p * 4 + 2] >> 4);
    bins.set(key, (bins.get(key) ?? 0) + 1);
    total += 1;
  }
  return { bins, total };
}

/** Share of a frame covered by a colour bin and its 26 neighbours, so a small shading change is not a loss. */
function nearShare(frame, key) {
  const r = key >> 8, g = (key >> 4) & 15, b = key & 15;
  let n = 0;
  for (let dr = -1; dr <= 1; dr += 1) for (let dg = -1; dg <= 1; dg += 1) for (let db = -1; db <= 1; db += 1) {
    const rr = r + dr, gg = g + dg, bb = b + db;
    if (rr < 0 || gg < 0 || bb < 0 || rr > 15 || gg > 15 || bb > 15) continue;
    n += frame.bins.get((rr << 8) | (gg << 4) | bb) ?? 0;
  }
  return n / frame.total;
}

function vanishedColours(frames, label) {
  const reference = frames[0], found = new Map();
  for (const [key, count] of reference.bins) {
    if (count / reference.total < 0.0015) continue;
    const expected = nearShare(reference, key);
    frames.forEach((frame, i) => {
      if (i === 0 || found.has(i)) return;
      const got = nearShare(frame, key);
      if (got < expected * 0.2) found.set(i, label + (i + 1) + '(' + (expected * 100).toFixed(1) + '%→' + (got * 100).toFixed(1) + '%)');
    });
  }
  return [...found.values()];
}

// ---- Report ---------------------------------------------------------------------------------
class Report {
  constructor(name) { this.name = name; this.rows = []; }
  add(level, code, text) { this.rows.push({ level, code, text }); }
  ok(code, text) { this.add('OK', code, text); }
  fail(code, text) { this.add('FAIL', code, text); }
  warn(code, text) { this.add('WARN', code, text); }
  get failed() { return this.rows.some(row => row.level === 'FAIL'); }
  print(verbose) {
    const fails = this.rows.filter(row => row.level === 'FAIL').length, warns = this.rows.filter(row => row.level === 'WARN').length;
    console.log(`\n${fails ? '✖' : warns ? '△' : '✔'} ${this.name}  FAIL ${fails} / WARN ${warns}`);
    for (const row of this.rows) if (verbose || row.level !== 'OK') console.log(`   [${row.level.padEnd(4)}] ${row.code} ${row.text}`);
  }
}

async function writeReview(file, outDir, sheet, cols, rows, cw, ch, guides) {
  fs.mkdirSync(outDir, { recursive: true });
  const lines = [];
  for (let c = 0; c <= cols; c += 1) lines.push(`<line x1="${c * cw}" y1="0" x2="${c * cw}" y2="${rows * ch}" stroke="#e03" stroke-width="2"/>`);
  for (let r = 0; r <= rows; r += 1) lines.push(`<line x1="0" y1="${r * ch}" x2="${cols * cw}" y2="${r * ch}" stroke="#e03" stroke-width="2"/>`);
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    for (const x of guides.xs) lines.push(`<line x1="${c * cw + x}" y1="${r * ch}" x2="${c * cw + x}" y2="${(r + 1) * ch}" stroke="#08c" stroke-width="1" stroke-dasharray="6 6"/>`);
    for (const y of guides.ys) lines.push(`<line x1="${c * cw}" y1="${r * ch + y}" x2="${(c + 1) * cw}" y2="${r * ch + y}" stroke="#08c" stroke-width="1" stroke-dasharray="6 6"/>`);
  }
  const svg = Buffer.from(`<svg width="${cols * cw}" height="${rows * ch}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`);
  const base = await sharp(file).ensureAlpha().flatten({ background: '#ffffff' }).png().toBuffer();
  const stem = path.basename(file) === 'source.png' ? path.basename(path.dirname(file)) : path.basename(file, path.extname(file));
  const out = path.join(outDir, `${stem}-review.png`);
  // Sharp resizes before it composites, so the guides are drawn at full size first and the result scaled down after.
  const drawn = await sharp(base).composite([{ input: svg }]).png().toBuffer();
  await sharp(drawn).resize({ width: Math.min(cols * cw, 2400) }).png().toFile(out);
  return out;
}

// ---- Walk -----------------------------------------------------------------------------------
async function checkWalk(file, options) {
  const rep = new Report(file);
  const W = T.walk, cols = options.columns;
  const sheet = await readSheet(file);
  const expectW = W.cellWidth * cols;
  if (sheet.width !== expectW || sheet.height !== W.cellHeight) {
    rep.fail('D14', `寸法が ${sheet.width}×${sheet.height}。必要: ${expectW}×${W.cellHeight}`);
    return rep;
  }
  rep.ok('D14', `寸法 ${expectW}×${W.cellHeight}`);
  const cells = [], m = [];
  for (let c = 0; c < cols; c += 1) {
    cells.push(cellAlpha(sheet, c, 0, W.cellWidth, W.cellHeight));
    m.push(measure(cells[c], W.cellWidth, W.cellHeight));
  }
  const empty = m.map((v, i) => (v.empty ? i + 1 : 0)).filter(Boolean);
  if (empty.length) { rep.fail('A', `空のコマ: ${empty.join(',')}`); return rep; }
  const transparent = sheet.alpha.filter(v => v === 0).length / sheet.alpha.length;
  if (transparent < 0.4) rep.fail('D13', `完全透明の割合が ${(transparent * 100).toFixed(0)}%。背景が焼き込まれている可能性`);
  else rep.ok('D13', `完全透明 ${(transparent * 100).toFixed(0)}%`);

  const side = cells.map(a => sideIntrusion(a, W.cellWidth, W.cellHeight, W.sideMargin, W.sideMargin));
  const sideBad = side.map((s, i) => (s.left || s.right ? `コマ${i + 1}(左${s.left}/右${s.right}px)` : '')).filter(Boolean);
  sideBad.length ? rep.fail('B5', `左右端${W.sideMargin}px以内に不透明: ${sideBad.join(' ')}`) : rep.ok('B5', `左右端${W.sideMargin}px以内は透明`);

  const frag = m.map((v, i) => (v.fragments.length ? `コマ${i + 1}(${describePieces(v.fragments)})` : '')).filter(Boolean);
  frag.length ? rep.fail('B6', `別の断片あり: ${frag.join(' / ')}`) : rep.ok('B6', '断片なし');

  const bottoms = m.map(v => v.bottom);
  range(bottoms) > W.baselineTol ? rep.fail('C8', `接地線のばらつき ${range(bottoms)}px（許容${W.baselineTol}）: ${bottoms.join(',')}`) : rep.ok('C8', `接地線 ${bottoms.join(',')}`);
  const heights = m.map(v => v.height);
  const ratio = Math.max(...heights) / Math.min(...heights);
  ratio > W.heightRatio ? rep.fail('C8', `背丈のばらつき ${ratio.toFixed(3)}（許容${W.heightRatio}）: ${heights.join(',')}`) : rep.ok('C8', `背丈 ${heights.join(',')}`);
  const centers = m.map(v => v.centerX), cm = median(centers);
  const drift = Math.max(...centers.map(x => Math.abs(x - cm)));
  drift > W.centerTol ? rep.fail('C9', `中心のずれ ${drift.toFixed(1)}px（許容${W.centerTol}）`) : rep.ok('C9', `中心ずれ ${drift.toFixed(1)}px`);
  const areas = m.map(v => v.area), am = median(areas);
  const area = areas.map((v, i) => (Math.abs(v / am - 1) > T.prayer.areaWarn ? `コマ${i + 1}(${((v / am - 1) * 100).toFixed(0)}%)` : '')).filter(Boolean);
  area.length ? rep.warn('C10', `シルエット面積が中央値から大きく違う（持ち物の消えを確認）: ${area.join(' ')}`) : rep.ok('C10', 'シルエット面積は揃っている');

  // Motion: consecutive steps, the loop seam, and whether the second half repeats the first.
  const step = [];
  for (let i = 0; i < cols; i += 1) step.push(distance(cells[i], cells[(i + 1) % cols], W.cellWidth, W.cellHeight));
  const inner = step.slice(0, cols - 1), medStep = median(inner);
  const jumps = inner.map((d, i) => (d > medStep * W.jumpFactor ? `${i + 1}→${i + 2}` : '')).filter(Boolean);
  jumps.length ? rep.warn('A3', `コマ間の変化が大きい箇所（目視）: ${jumps.join(' ')}`) : rep.ok('A3', 'コマ間の変化は均一');
  step[cols - 1] > medStep * W.jumpFactor ? rep.warn('A4', `${cols}→1 の継ぎ目の変化が大きい（目視）`) : rep.ok('A4', `${cols}→1 の継ぎ目 ${step[cols - 1].toFixed(2)}（通常 ${medStep.toFixed(2)}）`);
  if (cols % 2 === 0 && cols >= 8) {
    const half = cols / 2, apart = [];
    for (let i = 0; i < half; i += 1) apart.push(distance(cells[i], cells[i + half], W.cellWidth, W.cellHeight));
    const medApart = median(apart);
    medApart < medStep * W.halvesSimilar
      ? rep.fail('A1', `前半と後半がほぼ同じ（差 ${medApart.toFixed(3)}、隣のコマ差 ${medStep.toFixed(3)}）。同じ足を繰り返している`)
      : rep.ok('A1', `前半と後半の差 ${medApart.toFixed(3)}（隣のコマ差 ${medStep.toFixed(3)}）。足の入れ替えは目視で確認`);
  } else {
    rep.warn('A1', `${cols}コマのため、左右の足の交互チェックは省略（8コマが必要）`);
  }
  rep.review = options.review && await writeReview(file, options.review, sheet, cols, 1, W.cellWidth, W.cellHeight, { xs: [W.sideMargin, W.cellWidth - W.sideMargin], ys: [] });
  return rep;
}

// ---- Prayer ---------------------------------------------------------------------------------
async function checkPrayer(file, options) {
  const rep = new Report(file);
  const P = T.prayer, cols = 8, rows = 2;
  const sheet = await readSheet(file);
  if (sheet.width % cols || sheet.height % rows) { rep.fail('D13', `寸法 ${sheet.width}×${sheet.height} が8列×2行で割り切れない`); return rep; }
  const cw = sheet.width / cols, ch = sheet.height / rows;
  if (cw < P.minCell || ch < P.minCell) { rep.fail('D13', `1コマ ${cw}×${ch}px。${P.minCell}px以上が必要`); return rep; }
  rep.ok('D13', `8×2、1コマ ${cw}×${ch}px`);
  const transparent = sheet.alpha.filter(v => v === 0).length / sheet.alpha.length;
  transparent < 0.4 ? rep.fail('D12', `完全透明 ${(transparent * 100).toFixed(0)}%。背景が焼き込まれている可能性`) : rep.ok('D12', `完全透明 ${(transparent * 100).toFixed(0)}%`);

  const unit = Math.min(cw, ch) / 512;
  const keep = Math.round(cw * P.sideKeep), vert = Math.round(P.vertMargin * unit);
  const cells = [], m = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const a = cellAlpha(sheet, c, r, cw, ch);
    cells.push(a); m.push(measure(a, cw, ch));
  }
  const name = i => `${i < cols ? '礼' : '拍手'}${(i % cols) + 1}`;
  const empty = m.map((v, i) => (v.empty ? name(i) : '')).filter(Boolean);
  if (empty.length) { rep.fail('A', `空のコマ: ${empty.join(',')}`); return rep; }

  const side = cells.map(a => sideIntrusion(a, cw, ch, keep, keep));
  const sideBad = side.map((s, i) => (s.left || s.right ? `${name(i)}(左${s.left}/右${s.right}px)` : '')).filter(Boolean);
  sideBad.length ? rep.fail('A1', `中央70%の外に不透明（見切れ・はみ出し）: ${sideBad.join(' ')}`) : rep.ok('A1', '全コマが中央70%に収まる');
  const vertBad = cells.map((a, i) => (edgeIntrusion(a, cw, ch, vert, vert) ? name(i) : '')).filter(Boolean);
  vertBad.length ? rep.fail('A2', `上下${vert}px以内に不透明: ${vertBad.join(' ')}`) : rep.ok('A2', `上下${vert}px以内は透明`);
  const frag = m.map((v, i) => (v.fragments.length ? `${name(i)}(${describePieces(v.fragments)})` : '')).filter(Boolean);
  frag.length ? rep.fail('A3', `別の断片あり: ${frag.join(' / ')}`) : rep.ok('A3', '断片なし');

  const bottoms = m.map(v => v.bottom);
  const baseTol = Math.max(1, Math.round(P.baselineTol * unit));
  range(bottoms) > baseTol ? rep.fail('C8', `足元のばらつき ${range(bottoms)}px（許容${baseTol}）: ${bottoms.join(',')}`) : rep.ok('C8', `足元 ${bottoms.join(',')}`);
  const upright = [0, cols - 1, cols, cols * 2 - 1].map(i => m[i].height);
  const scaleSpread = Math.max(...upright) / Math.min(...upright) - 1;
  scaleSpread > P.scaleTol ? rep.fail('C8', `直立コマの背丈が揃っていない（差 ${(scaleSpread * 100).toFixed(1)}%、許容${P.scaleTol * 100}%）: ${upright.join(',')}`) : rep.ok('C8', `直立コマの背丈 ${upright.join(',')}`);
  const centers = m.map(v => v.centerX), cm = median(centers);
  const centerTol = P.centerTol * unit, drift = Math.max(...centers.map(x => Math.abs(x - cm)));
  drift > centerTol ? rep.fail('C9', `中心のずれ ${drift.toFixed(1)}px（許容${centerTol.toFixed(0)}）`) : rep.ok('C9', `中心ずれ ${drift.toFixed(1)}px`);

  for (let r = 0; r < rows; r += 1) {
    const first = cells[r * cols], last = cells[r * cols + cols - 1];
    const d = distance(first, last, cw, ch);
    const label = r === 0 ? '礼' : '拍手';
    d > 1 - P.sameFrameIoU ? rep.fail('C11', `${label}の1コマ目と8コマ目が違う姿勢（差 ${d.toFixed(3)}、許容${(1 - P.sameFrameIoU).toFixed(2)}）`) : rep.ok('C11', `${label}の1コマ目＝8コマ目（差 ${d.toFixed(3)}）`);
  }
  const areas = m.map(v => v.area), am = median(areas);
  const lost = areas.map((v, i) => (Math.abs(v / am - 1) > P.areaWarn ? `${name(i)}(${((v / am - 1) * 100).toFixed(0)}%)` : '')).filter(Boolean);
  lost.length ? rep.warn('B5', `シルエット面積が中央値から大きく違う（持ち物の消え・腕の広がりを目視）: ${lost.join(' ')}`) : rep.ok('B5', 'シルエット面積は揃っている（持ち物の消えは目視でも確認）');
  // Only the clap row: in the bow row the face and chest legitimately turn away, which looks like a lost colour.
  // A small held item (a pipe) in a similar dark colour is not reliably caught either; the review sheet is the check.
  for (let r = 1; r < rows; r += 1) {
    const label = r === 0 ? '礼' : '拍手';
    const frames = [];
    for (let c = 0; c < cols; c += 1) frames.push(colourBins(sheet, c, r, cw, ch));
    const gone = vanishedColours(frames, label);
    gone.length
      ? rep.warn('B5', label + ': 1コマ目にあった色がほぼ消えているコマ（持ち物の消え？目視）: ' + gone.join(' '))
      : rep.ok('B5', label + ': 主要な色は全コマに残っている');
  }
  rep.warn('B5', '持ち物が全コマにあるか（パイプ・帽子など）は自動では確実に判定できない。確認シートで全16コマを目視');
  rep.warn('C10', '礼の深さ・拍手の接触は目視（確認シートで見る）');
  rep.review = options.review && await writeReview(file, options.review, sheet, cols, rows, cw, ch, { xs: [keep, cw - keep], ys: [vert, ch - vert] });
  return rep;
}

// ---- Main -----------------------------------------------------------------------------------
function collect(mode, inputs) {
  const files = [];
  for (const input of inputs) {
    if (!fs.existsSync(input)) { console.error(`見つかりません: ${input}`); process.exitCode = 2; continue; }
    if (!fs.statSync(input).isDirectory()) { files.push(input); continue; }
    if (mode === 'walk') {
      for (const name of fs.readdirSync(input).sort()) if (/\.(png|webp)$/.test(name) && !name.includes('map-peek')) files.push(path.join(input, name));
    } else {
      for (const id of fs.readdirSync(input).sort()) {
        const source = path.join(input, id, 'source.png');
        if (fs.existsSync(source)) files.push(source);
      }
    }
  }
  return files;
}

(async () => {
  const args = process.argv.slice(2);
  const mode = args.shift();
  const options = { columns: 8, review: null, verbose: false };
  const inputs = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--columns') options.columns = Number(args[++i]);
    else if (args[i] === '--review') options.review = args[++i];
    else if (args[i] === '--verbose') options.verbose = true;
    else inputs.push(args[i]);
  }
  if (!['walk', 'prayer'].includes(mode) || !inputs.length) {
    console.error('usage: check-sprite-sheet.cjs <walk|prayer> <file|dir>... [--columns 8] [--review outDir] [--verbose]');
    process.exit(2);
  }
  const files = collect(mode, inputs);
  let failed = 0;
  for (const file of files) {
    const rep = mode === 'walk' ? await checkWalk(file, options) : await checkPrayer(file, options);
    rep.print(options.verbose);
    if (rep.review) console.log(`   確認シート: ${rep.review}`);
    if (rep.failed) failed += 1;
  }
  console.log(`\n${files.length}枚中 ${failed}枚が不合格`);
  if (failed) process.exitCode = 1;
})();
