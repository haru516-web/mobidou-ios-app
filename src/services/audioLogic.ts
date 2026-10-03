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
export function resolveAudioScene<T extends string>(scenes: readonly { id: T; priority: number }[], fallback: T): T { return [...scenes].sort((a, b) => b.priority - a.priority)[0]?.id ?? fallback; }
