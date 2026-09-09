export type BackgroundSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export const BACKGROUND_SEASONS = [
  { id: 'spring', label: '春', color: '#D98982' },
  { id: 'summer', label: '夏', color: '#5E8F73' },
  { id: 'autumn', label: '秋', color: '#B56A45' },
  { id: 'winter', label: '冬', color: '#6C8EA4' },
] as const satisfies ReadonlyArray<{ id: BackgroundSeason; label: string; color: string }>;

export const BACKGROUND_OPTIONS = [
  { id: 'spring-dawn', season: 'spring', label: '花明かり', note: '桜霞の朝', image: require('../../assets/backgrounds/spring-dawn.png') },
  { id: 'spring-rain', season: 'spring', label: '雨花の道', note: '紫陽花しずく', image: require('../../assets/backgrounds/spring-rain.png') },
  { id: 'summer-green', season: 'summer', label: '青葉の径', note: '木漏れ日と蛍', image: require('../../assets/backgrounds/summer-green.png') },
  { id: 'summer-evening', season: 'summer', label: '宵あかり', note: '夕暮れの灯', image: require('../../assets/backgrounds/summer-evening.png') },
  { id: 'autumn-maple', season: 'autumn', label: '紅葉の峰', note: '落ち葉の小径', image: require('../../assets/backgrounds/autumn-maple.png') },
  { id: 'autumn-mist', season: 'autumn', label: '秋霧の湖', note: 'すすきと朝霧', image: require('../../assets/backgrounds/autumn-mist.png') },
  { id: 'winter-snow', season: 'winter', label: '雪明かり', note: '雪道の足あと', image: require('../../assets/backgrounds/winter-snow.png') },
  { id: 'winter-clear', season: 'winter', label: '冬晴れ', note: '南天の赤い実', image: require('../../assets/backgrounds/winter-clear.png') },
] as const satisfies ReadonlyArray<{ id: string; season: BackgroundSeason; label: string; note: string; image: number }>;

export type BackgroundId = typeof BACKGROUND_OPTIONS[number]['id'];

export function isBackgroundId(value: unknown): value is BackgroundId {
  return typeof value === 'string' && BACKGROUND_OPTIONS.some(option => option.id === value);
}

export function getBackgroundOption(id: BackgroundId) {
  return BACKGROUND_OPTIONS.find(option => option.id === id) ?? BACKGROUND_OPTIONS[0];
}

export function defaultBackgroundId(): BackgroundId {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring-dawn';
  if (month >= 6 && month <= 8) return 'summer-green';
  if (month >= 9 && month <= 11) return 'autumn-maple';
  return 'winter-snow';
}
