import test from 'node:test';
import assert from 'node:assert/strict';
import { bgmTarget, canPlaySfx, fadeVolumes, MAIN_BGM_TRACKS, nextMainTrack, normalizeAudioSettings, resolveAudioScene } from '../src/services/audioLogic.ts';
test('SFX accepts first hit, rejects repetition within 80ms and seventh voice', () => {
  assert.equal(canPlaySfx(undefined, 0, 0), true);
  assert.equal(canPlaySfx(100, 179, 5), false);
  assert.equal(canPlaySfx(100, 180, 5), true);
  assert.equal(canPlaySfx(undefined, 200, 6), false);
  assert.equal(canPlaySfx(0, 150, 0, 200), false);
});
test('Corrupt settings preserve safe defaults and clamp valid finite volume', () => {
  assert.deepEqual(normalizeAudioSettings(null), { bgmEnabled: true, sfxEnabled: true, bgmVolume: .4, sfxVolume: .7 });
  assert.deepEqual(normalizeAudioSettings({ bgmEnabled: false, sfxEnabled: 'false', bgmVolume: 2, sfxVolume: NaN }), { bgmEnabled: false, sfxEnabled: true, bgmVolume: 1, sfxVolume: .7 });
});
test('Crossfade preserves gain at midpoint, releases old track and respects duck/background', () => {
  assert.deepEqual(fadeVolumes(0, .4, .4), { incoming: 0, outgoing: .4 });
  assert.deepEqual(fadeVolumes(.5, .4, .4), { incoming: .2, outgoing: .2 });
  assert.deepEqual(fadeVolumes(1, .4, .4), { incoming: .4, outgoing: 0 });
  assert.equal(bgmTarget(true, true, .4, .4), .4 * .4);
  assert.equal(bgmTarget(true, false, .4, 1), 0);
  assert.equal(bgmTarget(false, true, .4, 1), 0);
});
test('Scene transitions restore lower-priority BGM after closing an overlay', () => {
  const main = { id: 'main', priority: 0 }, gacha = { id: 'gacha', priority: 20 }, award = { id: 'award', priority: 40 };
  assert.equal(resolveAudioScene([main, gacha, award], 'main'), 'award');
  assert.equal(resolveAudioScene([main, gacha], 'main'), 'gacha');
  assert.equal(resolveAudioScene([main], 'main'), 'main');
  assert.equal(resolveAudioScene([], 'main'), 'main');
});

test('the main BGM rotates over three tracks and never repeats the one that just ended', () => {
  assert.equal(MAIN_BGM_TRACKS.length, 3);
  for (const previous of MAIN_BGM_TRACKS) for (const roll of [0, .3, .5, .99]) assert.notEqual(nextMainTrack(previous, () => roll), previous);
  assert.deepEqual(new Set(MAIN_BGM_TRACKS.map(previous => nextMainTrack(previous, () => 0))).size > 1, true);
  assert.ok((MAIN_BGM_TRACKS as readonly string[]).includes(nextMainTrack(undefined, () => .99)));
});
