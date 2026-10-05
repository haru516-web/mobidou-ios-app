import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync } from 'expo-audio';
import { createManagedAudioPlayer, type ManagedAudioPlayer as AudioPlayer } from './audioPlayer';
import { audioAssets, type AudioId, type BgmId } from '../data/audioAssets';
import { bgmTarget, canPlaySfx, DEFAULT_AUDIO_SETTINGS, fadeVolumes, isMainBgmTrack, nextMainTrack, normalizeAudioSettings, resolveAudioScene, type AudioSettings } from './audioLogic';

const KEY = 'mobidou.audio.v1';
let settings = DEFAULT_AUDIO_SETTINGS;
const subscribers = new Set<() => void>();
let hydrated: Promise<void> | undefined;
let writes = Promise.resolve();
let unlocked = Platform.OS !== 'web';
let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
let desired: BgmId = 'bgm_main';
/** While the main scene is wanted, which of the three main tracks plays; a new one is drawn when it ends or the scene is entered. */
let mainTrack: BgmId = nextMainTrack();
const wanted = (): BgmId => desired === 'bgm_main' ? mainTrack : desired;
let current: { id: BgmId; player: AudioPlayer } | undefined;
const outgoing = new Set<AudioPlayer>();
let fade: ReturnType<typeof setInterval> | undefined;
let duck = 1;
let duckTimer: ReturnType<typeof setTimeout> | undefined;
let duckUntil = 0;
let duckFade: ReturnType<typeof setInterval> | undefined;
const last = new Map<AudioId, number>();
type Slot = { id: AudioId; player: AudioPlayer; busy: boolean; touched: number };
const slots: Slot[] = [];
const scopes = new Map<symbol, { id: BgmId; priority: number }>();
const safe = (fn: () => void) => { try { fn(); } catch { /* Missing native module / browser media rejection must not break UI. */ } };
const target = () => bgmTarget(settings.bgmEnabled, foreground, settings.bgmVolume, duck);
function emit() { subscribers.forEach(fn => fn()); }
export function initAudio() {
  if (!hydrated) hydrated = (async () => {
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) settings = normalizeAudioSettings(JSON.parse(raw)); } catch { /* Keep defaults for unavailable/corrupt storage. */ }
    try { await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }); } catch { /* Web may not implement native session options. */ }
    emit(); syncBgm();
    ['sfx_tap', 'sfx_tap_primary', 'sfx_close', 'sfx_tab', 'sfx_toggle_on', 'sfx_toggle_off'].forEach(id => getSlot(id as AudioId));
  })();
  return hydrated;
}
function stopFade() { if (fade) clearInterval(fade); fade = undefined; for (const p of outgoing) safe(() => p.remove()); outgoing.clear(); }
function syncBgm() {
  if (!unlocked || !foreground || !settings.bgmEnabled) {
    stopFade(); if (current) safe(() => current!.player.pause()); return;
  }
  const id = wanted();
  if (current?.id === id) { safe(() => { current!.player.volume = target(); current!.player.play(); }); return; }
  stopFade();
  const old = current?.player;
  const oldVolume = old?.volume ?? 0;
  try {
    const player = createManagedAudioPlayer(audioAssets[id]);
    const inRotation = isMainBgmTrack(id) && desired === 'bgm_main';
    // Main tracks do not loop: when one ends, the next (random) one starts.
    player.loop = !inRotation && id !== 'bgm_walk_award'; player.volume = 0; player.play();
    if (inRotation) player.addListener('playbackStatusUpdate', status => { if (status.didJustFinish && current?.player === player && desired === 'bgm_main') { mainTrack = nextMainTrack(mainTrack); syncBgm(); } });
    current = { id, player };
    if (old) outgoing.add(old);
    const begun = Date.now();
    fade = setInterval(() => {
      const progress = Math.min(1, (Date.now() - begun) / 1000);
      const volumes = fadeVolumes(progress, target(), oldVolume);
      safe(() => { player.volume = volumes.incoming; if (old) old.volume = volumes.outgoing; });
      if (progress >= 1) stopFade();
    }, 40);
  } catch { if (old) safe(() => old.remove()); current = undefined; }
}
/** Call from a user gesture on web. Idempotent; starts the pending scene only after settings hydrate. */
export function unlockAudio() { unlocked = true; void initAudio().then(syncBgm); }
export function setBgm(id: BgmId) {
  if (desired !== id) {
    if (id === 'bgm_main') mainTrack = nextMainTrack(mainTrack);
    if (duckTimer) clearTimeout(duckTimer);
    if (duckFade) clearInterval(duckFade);
    duckTimer = undefined; duckFade = undefined; duck = 1; duckUntil = 0;
  }
  desired = id; void initAudio().then(syncBgm);
}
/** Overlay ownership lets nested scenes restore the previous scene on unmount. */
export function useSceneBgm(id: BgmId, enabled = true, priority = 10) {
  useEffect(() => {
    if (!enabled) return;
    const token = Symbol(); scopes.set(token, { id, priority }); updateScene();
    return () => { scopes.delete(token); updateScene(); };
  }, [id, enabled, priority]);
}
function updateScene() { setBgm(resolveAudioScene([...scopes.values()], 'bgm_main' as BgmId)); }
function getSlot(id: AudioId): Slot | undefined {
  let slot = slots.find(s => s.id === id && !s.busy);
  if (slot) return slot;
  if (slots.length >= 24) {
    const idle = slots.filter(s => !s.busy).sort((a, b) => a.touched - b.touched)[0];
    if (!idle) return;
    safe(() => idle.player.remove()); slots.splice(slots.indexOf(idle), 1);
  }
  try {
    const player = createManagedAudioPlayer(audioAssets[id]);
    slot = { id, player, busy: false, touched: Date.now() }; slots.push(slot);
    const owned = slot;
    player.addListener('playbackStatusUpdate', status => { if (status.didJustFinish) { owned.busy = false; safe(() => player.pause()); } });
    return slot;
  } catch { return undefined; }
}
export function playSfx(id: Exclude<AudioId, BgmId>, options: { rate?: number; debounceMs?: number; gain?: number } = {}) {
  if (!unlocked) return;
  void initAudio().then(async () => {
    const now = Date.now();
    if (!foreground || !settings.sfxEnabled || !canPlaySfx(last.get(id), now, slots.filter(s => s.busy).length, options.debounceMs ?? 80)) return;
    const slot = getSlot(id); if (!slot) return;
    last.set(id, now); slot.busy = true; slot.touched = now;
    try {
      slot.player.volume = settings.sfxVolume * (options.gain ?? 1);
      slot.player.setPlaybackRate(Math.max(.5, Math.min(2, options.rate ?? 1)));
      await slot.player.seekTo(0);
      if (!foreground || !settings.sfxEnabled || !slot.busy) { slot.busy = false; return; }
      slot.player.play();
    } catch { slot.busy = false; }
  });
}
export function playPageTurn(fast = false) { playSfx(fast ? 'sfx_page_flip_fast' : (['sfx_page_turn_1', 'sfx_page_turn_2', 'sfx_page_turn_3'] as const)[Math.floor(Math.random() * 3)]); }
export function duckBgm(ms = 4500) {
  duckUntil = Math.max(duckUntil, Date.now() + ms);
  if (duckTimer) clearTimeout(duckTimer);
  const animateDuck = (to: number, duration: number) => {
    if (duckFade) clearInterval(duckFade);
    const from = duck, started = Date.now();
    duckFade = setInterval(() => { const t = Math.min(1, (Date.now() - started) / duration); duck = from + (to - from) * t; if (current) safe(() => { current!.player.volume = target(); }); if (t === 1 && duckFade) { clearInterval(duckFade); duckFade = undefined; } }, 40);
  };
  animateDuck(.4, 300);
  duckTimer = setTimeout(() => { duckTimer = undefined; animateDuck(1, 1000); }, Math.max(0, duckUntil - Date.now()));
}
export function playJingle(id: 'jingle_gacha_reveal' | 'jingle_gacha_reveal_rare' | 'jingle_complete' | 'sfx_special_reveal') {
  if (!unlocked) return;
  void initAudio().then(() => { if (settings.sfxEnabled && foreground) { duckUntil = 0; duckBgm(id === 'jingle_gacha_reveal_rare' || id === 'jingle_complete' ? 5000 : id === 'sfx_special_reveal' ? 850 : 4000); playSfx(id); } });
}
export function updateAudioSettings(patch: Partial<AudioSettings>) {
  settings = normalizeAudioSettings({ ...settings, ...patch }); emit(); syncBgm();
  if (!settings.sfxEnabled) slots.forEach(s => { safe(() => s.player.pause()); s.busy = false; });
  else slots.filter(s => s.busy).forEach(s => safe(() => { s.player.volume = settings.sfxVolume; }));
  const saved = JSON.stringify(settings); writes = writes.then(() => AsyncStorage.setItem(KEY, saved)).catch(() => {});
}
export function useAudioSettings() {
  useEffect(() => { void initAudio(); }, []);
  const value = useSyncExternalStore(callback => { subscribers.add(callback); return () => { subscribers.delete(callback); }; }, () => settings, () => DEFAULT_AUDIO_SETTINGS);
  return { ...value, update: updateAudioSettings };
}
AppState.addEventListener('change', state => {
  foreground = state === 'active';
  if (!foreground) slots.forEach(s => { safe(() => s.player.pause()); s.busy = false; });
  syncBgm();
});
// Browser autoplay permission comes only from an actual pointer/keyboard gesture.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  document.addEventListener('keydown', unlockAudio, { once: true, capture: true });
}
