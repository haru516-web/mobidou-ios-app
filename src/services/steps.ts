import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Pedometer } from 'expo-sensors';
import { missedDays, type SyncMark } from './progress';

type HealthModule = { isAvailable(): Promise<boolean>; requestPermission(): Promise<boolean>; readSteps(start: number, end: number): Promise<number> };
const health = Platform.OS === 'ios' ? requireOptionalNativeModule<HealthModule>('MobiHealth') : null;
export type StepSource = 'healthkit' | 'motion' | 'none';
export const sourceLabel = { healthkit: 'ヘルスケア', motion: 'モーションとフィットネス', none: '未接続' };
export async function connectSteps(): Promise<StepSource> {
  if (Platform.OS !== 'ios') throw new Error('実歩数の連携はiPhoneで利用できます。ここでは体験モードをお楽しみください。');
  if (health && await health.isAvailable()) {
    if (!await health.requestPermission()) throw new Error('歩数の連携を完了できませんでした。設定からもう一度お試しください。');
    // HealthKit intentionally does not reveal read permission denial.
    return 'healthkit';
  }
  if (!await Pedometer.isAvailableAsync()) throw new Error('この端末では歩数を読み取れません。体験モードをお試しください。');
  const permission = await Pedometer.requestPermissionsAsync();
  if (!permission.granted) throw new Error('歩数へのアクセスが許可されていません。iPhoneの設定で「モーションとフィットネス」を確認してください。');
  return 'motion';
}
/** Steps between two instants (epoch milliseconds), from whichever source is connected. */
export async function readStepsBetween(source: StepSource, start: number, end: number): Promise<number> {
  let steps: number;
  if (source === 'healthkit' && health) steps = await health.readSteps(start, end);
  else if (source === 'motion' && Platform.OS === 'ios') steps = (await Pedometer.getStepCountAsync(new Date(start), new Date(end))).steps;
  else throw new Error('歩数の連携が必要です。設定から接続してください。');
  if (!Number.isFinite(steps) || steps < 0) throw new Error('歩数を読み取れませんでした。少し待ってから更新してください。');
  return steps;
}
export async function readTodaySteps(source: StepSource): Promise<{ steps: number; at: Date }> {
  const end = new Date();
  const start = new Date(end); start.setHours(0, 0, 0, 0);
  return { steps: await readStepsBetween(source, start.getTime(), end.getTime()), at: end };
}
/**
 * Full-day counts for the days since the last credited reading, oldest first.
 * The motion sensor only keeps about a week of history; HealthKit keeps more.
 * A failed read throws so the caller retries instead of moving past a gap.
 */
export async function readMissedDays(source: StepSource, mark: SyncMark | undefined, now = new Date()): Promise<{ day: string; steps: number }[]> {
  if (!mark || source === 'none') return [];
  const days = missedDays(mark.day, now, source === 'motion' ? 7 : 14);
  const readings: { day: string; steps: number }[] = [];
  for (const day of days) readings.push({ day: day.day, steps: await readStepsBetween(source, day.start, day.end) });
  return readings;
}
