export const DEFAULT_AUDIO_SETTINGS = { bgmEnabled: true, sfxEnabled: true, bgmVolume: .4, sfxVolume: .7 };
export type AudioSettings = typeof DEFAULT_AUDIO_SETTINGS;
export function normalizeAudioSettings(raw: unknown): AudioSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<AudioSettings>;
  const volume = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  return { bgmEnabled: typeof value.bgmEnabled === 'boolean' ? value.bgmEnabled : true, sfxEnabled: typeof value.sfxEnabled === 'boolean' ? value.sfxEnabled : true, bgmVolume: volume(value.bgmVolume, .4), sfxVolume: volume(value.sfxVolume, .7) };
}
export function canPlaySfx(last: number | undefined, now: number, active: number, gap = 80) { return active < 6 && (last === undefined || now - last >= gap); }
export function bgmTarget(enabled: boolean, active: boolean, volume: number, duck: number) { return enabled && active ? volume * duck : 0; }
export function fadeVolumes(progress: number, target: number, outgoing: number) { const t = Math.max(0, Math.min(1, progress)); return { incoming: target * t, outgoing: outgoing * (1 - t) }; }
/** The three tracks that take turns as the main BGM (audioAssets keys). */
export const MAIN_BGM_TRACKS = ['bgm_main', 'bgm_main_matsuri', 'bgm_main_pop'] as const;
export type MainBgmTrack = typeof MAIN_BGM_TRACKS[number];
export const isMainBgmTrack = (id: string): id is MainBgmTrack => (MAIN_BGM_TRACKS as readonly string[]).includes(id);
/** A random main track that is not the one that just played (any of them when none has played yet). */
export function nextMainTrack(previous?: string, random: () => number = Math.random): MainBgmTrack {
  const choices = MAIN_BGM_TRACKS.filter(id => id !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
export function resolveAudioScene<T extends string>(scenes: readonly { id: T; priority: number }[], fallback: T): T { return [...scenes].sort((a, b) => b.priority - a.priority)[0]?.id ?? fallback; }
