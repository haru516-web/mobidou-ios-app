import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';

export interface ManagedAudioPlayer {
  volume: number;
  loop: boolean;
  play(): void;
  pause(): void;
  remove(): void;
  seekTo(seconds: number): Promise<void>;
  setPlaybackRate(rate: number): void;
  addListener(event: 'playbackStatusUpdate', listener: (status: { didJustFinish: boolean }) => void): unknown;
}
/** SDK54's web play() discards the media promise. Catch expected autoplay/abort failures here. */
export function createManagedAudioPlayer(source: number | string): ManagedAudioPlayer {
  if (Platform.OS !== 'web') return createAudioPlayer(source, { updateInterval: 50 });
  const media = new Audio(Asset.fromModule(source).uri);
  media.preload = 'auto';
  const ended = new Set<() => void>();
  return {
    get volume() { return media.volume; }, set volume(value) { media.volume = value; },
    get loop() { return media.loop; }, set loop(value) { media.loop = value; },
    play() { void media.play().catch(() => { for (const handler of ended) handler(); }); },
    pause() { media.pause(); },
    remove() { media.pause(); for (const listener of ended) media.removeEventListener('ended', listener); ended.clear(); media.removeAttribute('src'); media.load(); },
    async seekTo(seconds) { media.currentTime = seconds; },
    setPlaybackRate(rate) { media.preservesPitch = false; media.playbackRate = rate; },
    addListener(_event, listener) { const handler = () => listener({ didJustFinish: true }); ended.add(handler); media.addEventListener('ended', handler); return { remove: () => { ended.delete(handler); media.removeEventListener('ended', handler); } }; },
  };
}
