const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const metadata = JSON.parse(fs.readFileSync('docs/audio-metadata.json', 'utf8'));
const results = [];
for (const item of metadata) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate', '-of', 'json', item.file], { encoding: 'utf8' });
  if (probe.status !== 0) throw Error(item.id + ' probe');
  const format = JSON.parse(probe.stdout);
  const measure = spawnSync('ffmpeg', ['-hide_banner', '-i', item.file, '-af', 'apad=whole_dur=0.4,loudnorm=I=-20:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const loud = JSON.parse(measure.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
  let seam = null;
  if (item.loop) {
    const pcm = spawnSync('ffmpeg', ['-v', 'error', '-i', item.file, '-f', 'f32le', '-ac', '1', '-ar', '32000', '-'], { maxBuffer: 20 * 1024 * 1024 }).stdout;
    seam = Math.abs(pcm.readFloatLE(0) - pcm.readFloatLE(pcm.length - 4));
  }
  const result = { id: item.id, codec: format.streams[0].codec_name, seconds: Number(format.format.duration), bytes: fs.statSync(item.file).size, lufs: Number(loud.input_i), peak: Number(loud.input_tp), seam };
  if (result.codec !== 'aac' || result.peak > -1 || Math.abs(result.seconds - item.seconds) > .06 || (!item.id.startsWith('bgm_') && !item.id.startsWith('jingle_') && result.bytes > 50000)) throw Error('Asset validation failed: ' + JSON.stringify(result));
  results.push(result);
}
const bgmBytes = results.filter(r => r.id.startsWith('bgm_')).reduce((n, r) => n + r.bytes, 0);
if (bgmBytes > 6000000) throw Error('BGM over budget');
fs.writeFileSync('docs/audio-validation.json', JSON.stringify({ bgmBytes, results }, null, 2) + '\n');
console.log(JSON.stringify({ assets: results.length, bgmBytes, maxPeak: Math.max(...results.map(r => r.peak)), maxLoopSeam: Math.max(...results.filter(r => r.seam !== null).map(r => r.seam)) }));
