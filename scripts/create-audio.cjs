// Original procedural compositions. No recordings or third-party samples.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sr = 32000;
let seed = 20261003;
const noise = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hz = n => 440 * 2 ** ((n - 69) / 12);
function voice(kind, frequency, duration) {
  const out = new Float32Array(Math.ceil(sr * duration));
  let breath = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr, p = 2 * Math.PI * frequency * t;
    breath = .85 * breath + .15 * noise();
    const edge = Math.min(1, t / .008, (duration - t) / .025);
    if (kind === 'koto') out[i] = edge * Math.exp(-t * 3) * (Math.sin(p) + .48 * Math.sin(p * 2.005) + .22 * Math.sin(p * 3.012) + .1 * Math.sin(p * 6.03) + breath * Math.exp(-t * 40));
    else if (kind === 'bell') out[i] = edge * Math.exp(-t * 2.5) * (Math.sin(p) + .35 * Math.sin(p * 2.71) + .2 * Math.sin(p * 4.13));
    else if (kind === 'wood') out[i] = edge * Math.exp(-t * 45) * (Math.sin(p) + .5 * Math.sin(p * 2.43) + breath);
    else if (kind === 'paper') out[i] = edge * Math.sin(Math.PI * t / duration) ** 2 * breath;
    else if (kind === 'drum') out[i] = edge * Math.exp(-t * 10) * (Math.sin(p + 12 * (1 - Math.exp(-t * 15))) + .25 * breath * Math.exp(-t * 20));
    else if (kind === 'sho') out[i] = edge * Math.sin(Math.PI * t / duration) ** 2 * (Math.sin(p) + .25 * Math.sin(p * 3) + .08 * Math.sin(p * 5) + .04 * breath);
    else out[i] = edge * Math.sin(Math.PI * t / duration) ** 2 * (Math.sin(p + .04 * Math.sin(2 * Math.PI * 4.3 * t)) + .18 * Math.sin(p * 2) + .15 * breath);
  }
  return out;
}
function add(out, kind, note, at, duration, gain = .15, loop = false) {
  const v = voice(kind, hz(note), duration), offset = Math.round(at * sr);
  for (let i = 0; i < v.length; i++) { const j = offset + i; if (j < out.length || loop) out[j % out.length] += gain * v[i]; }
}
function wav(data, file) {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  let peak = 0; for (const n of data) peak = Math.max(peak, Math.abs(n));
  const gain = peak > .75 ? .75 / peak : 1;
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}
const manifest = [];
function save(id, data, loop, use) {
  const group = id.startsWith('bgm_') ? 'bgm' : 'sfx';
  const dest = path.join(root, 'assets/audio', group); fs.mkdirSync(dest, { recursive: true });
  const source = path.join(dest, id + '.wav'), file = path.join(dest, id + '.m4a'); wav(data, source);
  const target = group === 'bgm' ? -20 : -16;
  // Fixed gain preserves periodic tails. Measure first, then apply a constant gain.
  const measured = spawnSync('ffmpeg', ['-hide_banner', '-i', source, '-af', 'apad=whole_dur=0.4,loudnorm=I=' + target + ':TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const match = measured.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  const info = match ? JSON.parse(match[0]) : null;
  if (!info || !Number.isFinite(Number(info.input_i))) throw Error('Cannot measure ' + id);
  let gain = Math.min(target - Number(info.input_i), -1.5 - Number(info.input_tp));
  for (let attempt = 0; attempt < 3; attempt++) {
    const enc = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-af', 'volume=' + gain + 'dB', '-c:a', 'aac', '-b:a', group === 'bgm' ? '128k' : '96k', '-movflags', '+faststart', file], { encoding: 'utf8' });
    if (enc.status !== 0) throw Error(enc.stderr);
    const decoded = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'apad=whole_dur=0.4,loudnorm=I=-20:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
    const peak = Number(JSON.parse(decoded.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]).input_tp);
    if (peak <= -1) break;
    if (attempt === 2) throw Error('AAC peak ' + id);
    gain -= peak + 1.5;
  }
  fs.unlinkSync(source);
  manifest.push({ id, file: 'assets/audio/' + group + '/' + id + '.m4a', seconds: data.length / sr, bytes: fs.statSync(file).size, loop, use, lufs: +(Number(info.input_i) + gain).toFixed(2), peak: +(Number(info.input_tp) + gain).toFixed(2) });
  console.log(id);
}
for (const [id, seconds, mode] of [['bgm_main', 72, 0], ['bgm_opening', 36, 1], ['bgm_gacha', 54, 2], ['bgm_walk_award', 16, 3], ['bgm_omikuji', 24, 4]]) {
  const out = new Float32Array(sr * seconds), loop = mode !== 3;
  const notes = mode === 2 ? [62, 63, 67, 69, 70] : [62, 64, 67, 69, 71];
  for (let at = 0; at < seconds; at += 3) {
    const index = Math.round(at / 3), n = notes[(index * 3 + Math.floor(index / 4)) % notes.length];
    add(out, mode === 2 || mode === 3 ? 'sho' : 'koto', n, at, mode === 2 ? 6 : 2.8, .14, loop);
    if (index % 4 === 0) add(out, 'flute', n + 12, at + .8, 2, .08, loop);
    if (index % 6 === 2) add(out, 'bell', 86, at + 1.2, 2, .035, loop);
    if (mode === 2 || mode === 3) add(out, 'drum', 38, at + .2, .6, .06, loop);
    if (mode === 0 && index % 2 === 1) add(out, 'koto', n - 12, at + 1.5, 2, .07, loop);
  }
  if (!loop) for (let i = 0; i < out.length; i++) out[i] *= Math.min(1, i / sr, (out.length - i) / (sr * 2));
  save(id, out, loop, ['共通画面', '起動・導入', 'ガチャ待機', '授与演出', 'おみくじ'][mode]);
}
const ids = `tap tap_primary tap_round pop close open toggle_on toggle_off disabled tab toast error mobby_pet mobby_pray clap pull_stretch pull_release pull_release_special mobby_drag menu_open menu_close home_card_edit bond_up page_turn_1 page_turn_2 page_turn_3 page_flip_fast book_open stamp_view stamp_press cover_change gacha_enter curtain roll_walk unload box_settle rope_ready rope_pull rope_catch rope_cancel gacha_charge gacha_burst gacha_burst_rare card_flip ticket_use shop_buy cart_add cart_remove purchase_done duplicate award_footsteps bow stamp_reveal special_reveal keychain_roll keychain_get arrive_point scroll_open steps_refresh demo_walk route_advance omikuji_shake omikuji_reveal omikuji_rank_great omikuji_rank_good omikuji_rank_quiet omikuji_tie room_place room_pick pet_select item_unlock gift_open gift_receive send success opening_logo tutorial_next tour_step`.split(' ');
for (const [index, name] of ids.entries()) {
  const paper = /page|open|close|curtain|bow|tie/.test(name), bell = /reveal|success|get|rank|gift|bond|logo|toast|arrive|primary|special/.test(name), stretch = /stretch|rope_pull|charge/.test(name);
  const seconds = name === 'curtain' ? 1.1 : name === 'roll_walk' ? 1.28 : name === 'gacha_charge' ? 1.5 : name === 'tap_primary' || name === 'bond_up' ? .24 : bell ? .85 : paper ? .32 : name === 'tap' ? .075 : .18;
  const out = new Float32Array(Math.round(sr * seconds));
  const note = /off|error|disabled|settle|unload/.test(name) ? 48 : 72 + index % 5;
  add(out, paper ? 'paper' : bell ? 'bell' : stretch ? 'flute' : 'wood', note, 0, seconds, .3);
  if (name === 'clap') add(out, 'paper', 65, 0, .09, .6);
  if (name === 'curtain') add(out, 'wood', 83, .02, .07, .4);
  if (name === 'roll_walk' || name === 'award_footsteps') for (let t = 0; t < seconds; t += .32) add(out, 'wood', 47, t, .075, .3);
  if (/rare|special|great/.test(name)) add(out, 'bell', note + 7, .14, seconds - .14, .18);
  save('sfx_' + name, out, false, name);
}
for (const [id, seconds, rare] of [['jingle_gacha_reveal', 4, false], ['jingle_gacha_reveal_rare', 5, true], ['jingle_complete', 5, true]]) {
  const out = new Float32Array(sr * seconds);
  [62, 67, 69, 74].forEach((n, i) => { add(out, 'koto', n, i * .65, 2, .2); add(out, 'sho', n, i * .65, 2, .08); });
  if (rare) add(out, 'bell', 86, 1.8, 2.5, .08);
  save(id, out, false, 'BGMダック中のジングル');
}
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/audio-metadata.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'src/data/audioAssets.ts'), '// Static Metro asset table, generated by scripts/create-audio.cjs.\nexport const audioAssets = {\n' + manifest.map(m => `  ${m.id}: require('../../${m.file}'),`).join('\n') + '\n} as const;\nexport type AudioId = keyof typeof audioAssets;\nexport type BgmId = Extract<AudioId, `bgm_${string}`>;\n');
fs.writeFileSync(path.join(root, 'docs/audio-manifest.md'), '# 音源一覧\n\n手続き合成によるオリジナル。AACのエンコーダ遅延はコンテナのtrim情報に依存するため、iOSでの実際の継ぎ目は未確認。\n\n| ID | ファイル | 秒 | bytes | ループ | 用途 | LUFS (PCM) | peak dBTP (PCM) |\n|---|---|---:|---:|---|---|---:|---:|\n' + manifest.map(m => `| ${m.id} | ${m.file} | ${m.seconds} | ${m.bytes} | ${m.loop ? '有' : '無'} | ${m.use} | ${m.lufs} | ${m.peak} |`).join('\n') + '\n');
