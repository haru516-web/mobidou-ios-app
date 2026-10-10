import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { getInfoAsync } from 'expo-file-system/legacy';

/** Takes a picture of a view and returns its file URI. Only iOS has it (react-native-view-shot); elsewhere it always fails. */
export async function captureView(view: View): Promise<string> {
  const captured = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  // view-shot returns a bare absolute path on iOS, but the native curl view only accepts a file:// URL: a bare path came out as an empty paper.
  const uri = captured.startsWith('/') ? `file://${captured}` : captured;
  // A picture of a view that was not really drawn comes out as an almost empty file: refuse it so the caller falls back.
  const info = await getInfoAsync(uri);
  if (!info.exists || (info.size ?? 0) < 30000) throw new Error('captured picture is empty');
  return uri;
}
