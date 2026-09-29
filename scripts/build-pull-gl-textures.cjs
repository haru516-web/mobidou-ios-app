// expo-gl decodes only PNG/JPEG (no WebP), so the device build of the cheek pull
// needs PNG textures. This bakes each pull body together with the character's
// alpha silhouette (smoothstepped like the web shader) into one 768px PNG.
// Needs ffmpeg (set FFMPEG or have it on PATH).
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const SIZE = 768;
const out = path.join(root, 'assets/mobies/pull/gl');
const pets = {
  mobirin: ['mobirin-body-clean', 'mobirin'],
  mobichi: ['mobichi-body-clean', 'mobichi'],
  yami: ['yami-body-clean', 'yami-mobby'],
  mobiyan: ['mobiyan-body-clean', 'mobiyan'],
  mobiyura: ['yura-body-clean', 'mobiyura'],
  reomoby: ['reo-body-clean', 'reomoby'],
  potemoby: ['pote-body-clean', 'potemoby'],
  mobibou: ['mobibou-body-clean', 'mobibou'],
  babumoby: ['babu-body-clean', 'babumoby'],
};
const t = 'clip((val-77)/102,0,1)';
const graph = [
  `[0:v]scale=${SIZE}:${SIZE}:flags=lanczos,format=rgba,split[b1][b2]`,
  '[b1]alphaextract[ba]',
  '[b2]format=rgb24[rgb]',
  `[1:v]scale=${SIZE}:${SIZE}:flags=lanczos,format=rgba,alphaextract,lut=y='255*pow(${t},2)*(3-2*${t})'[ma]`,
  '[ba][ma]blend=all_mode=multiply[a]',
  '[rgb][a]alphamerge[o]',
].join(';');

fs.mkdirSync(out, { recursive: true });
for (const [id, [body, mask]] of Object.entries(pets)) {
  const target = path.join(out, `${id}-body.png`);
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', path.join(root, 'assets/mobies/pull', `${body}.webp`), '-i', path.join(root, 'assets/mobies', `${mask}.webp`),
    '-filter_complex', graph, '-map', '[o]', '-frames:v', '1', '-compression_level', '9', target]);
  console.log(id, Math.round(fs.statSync(target).size / 1024) + 'KB');
}
