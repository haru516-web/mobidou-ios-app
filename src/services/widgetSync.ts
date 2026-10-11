import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ExtensionStorage } from '@bacons/apple-targets';

/**
 * Hands today's steps and the chosen Mobby to the home screen widget (targets/widget).
 * The two sides meet in an App Group; its id comes from app.json / app.config.js.
 * Anything that goes wrong here is ignored: the widget is a nicety, never a reason to fail a step reading.
 */
const group = Platform.OS === 'ios' ? (Constants.expoConfig?.extra as { widgetAppGroup?: string } | undefined)?.widgetAppGroup : undefined;
let storage: ExtensionStorage | null = null;
let lastKey = '';

export function syncWidget(snapshot: { petId: string; steps: number; day: string }) {
  if (!group) return;
  const steps = Math.max(0, Math.round(snapshot.steps));
  const key = `${snapshot.petId}|${steps}|${snapshot.day}`;
  if (key === lastKey) return;
  try {
    storage ??= new ExtensionStorage(group);
    storage.set('petId', snapshot.petId);
    storage.set('steps', steps);
    storage.set('day', snapshot.day);
    ExtensionStorage.reloadWidget();
    lastKey = key;
  } catch {
    // Builds without the widget target (web, older development builds) have no such module.
  }
}
