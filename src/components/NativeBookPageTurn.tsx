import { type Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { BookPageTurnHandle } from './BookPageTurn';

export type NativeBookPage = {
  name: string;
  reading: string;
  theme: string;
  place: string;
  imageSource: number;
  acquired: boolean;
};

export type NativeBookPageTurnProps = {
  /** One picture per open spread (file URIs), drawn by the app so the curl shows the same book as everywhere else. */
  spreadUris: string[];
  selectedIndex: number;
  onCommit: (index: number) => void;
  onBusyChange?: (busy: boolean) => void;
  onOpenDetail?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  forwardedRef: Ref<BookPageTurnHandle>;
};

export const isNativePageCurlAvailable = false;

export function NativeBookPageTurn(_props: NativeBookPageTurnProps) {
  return null;
}
