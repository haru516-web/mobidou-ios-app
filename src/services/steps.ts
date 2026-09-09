import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Pedometer } from 'expo-sensors';

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
export async function readTodaySteps(source: StepSource): Promise<{ steps: number; at: Date }> {
  const end = new Date();
  const start = new Date(end); start.setHours(0, 0, 0, 0);
  let steps: number;
  if (source === 'healthkit' && health) steps = await health.readSteps(start.getTime(), end.getTime());
  else if (source === 'motion' && Platform.OS === 'ios') steps = (await Pedometer.getStepCountAsync(start, end)).steps;
  else throw new Error('歩数の連携が必要です。設定から接続してください。');
  if (!Number.isFinite(steps) || steps < 0) throw new Error('歩数を読み取れませんでした。少し待ってから更新してください。');
  return { steps, at: end };
}
