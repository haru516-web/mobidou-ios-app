import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** Takes a picture of a view and returns its file URI. Only iOS has it (react-native-view-shot); elsewhere it always fails. */
export async function captureView(view: View): Promise<string> {
  return captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
}
