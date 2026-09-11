const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error('usage: node scripts/clean-keychain-png.cjs <input.png> <output.png>');
  process.exit(1);
}

const source = PNG.sync.read(fs.readFileSync(inputPath));
const { width, height, data } = source;
const seen = new Uint8Array(width * height);
const queue = [];

function isBackdrop(x, y) {
  const offset = (y * width + x) * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const average = (red + green + blue) / 3;
  const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
  return alpha > 0 && average >= 90 && spread <= 20;
}

function enqueue(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const index = y * width + x;
  if (seen[index] || !isBackdrop(x, y)) return;
  seen[index] = 1;
  queue.push(index);
}

for (let x = 0; x < width; x += 1) {
  enqueue(x, 0);
  enqueue(x, height - 1);
}
for (let y = 1; y < height - 1; y += 1) {
  enqueue(0, y);
  enqueue(width - 1, y);
}

for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const index = queue[cursor];
  const x = index % width;
  const y = Math.floor(index / width);
  enqueue(x - 1, y);
  enqueue(x + 1, y);
  enqueue(x, y - 1);
  enqueue(x, y + 1);
}

let cleared = 0;
for (let index = 0; index < seen.length; index += 1) {
  if (!seen[index]) continue;
  data[index * 4 + 3] = 0;
  cleared += 1;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, PNG.sync.write(source));
console.log(JSON.stringify({ inputPath, outputPath, width, height, cleared }));
