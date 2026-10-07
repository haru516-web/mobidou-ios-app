import type { View } from 'react-native';

/** Takes a picture of a view and returns its file URI. Only iOS has it (react-native-view-shot); elsewhere it always fails. */
export async function captureView(_view: View): Promise<string> {
  throw new Error('captureView is only available on iOS');
}
