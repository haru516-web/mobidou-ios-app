import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { playPageTurn, playSfx } from '../services/audio';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { BookPageTurnHandle } from './BookPageTurn';
import type { NativeBookPageTurnProps } from './NativeBookPageTurn';

type CurlNativeViewRef = { turn: (direction: number) => Promise<void> };
type CurlEvent<T> = { nativeEvent: T };
type CurlNativeViewProps = {
  style?: NativeBookPageTurnProps['style'];
  pagesJson: string;
  selectedIndex: number;
  onPageChange: (event: CurlEvent<{ index: number }>) => void;
  onBusyChange: (event: CurlEvent<{ busy: boolean }>) => void;
  onOpenDetail: (event: CurlEvent<{ index: number }>) => void;
  ref: React.Ref<CurlNativeViewRef>;
};

export const isNativePageCurlAvailable = !!requireOptionalNativeModule('MobiPageCurl');
const CurlNativeView = isNativePageCurlAvailable
  ? requireNativeViewManager<CurlNativeViewProps>('MobiPageCurl')
  : null;

export function NativeBookPageTurn({ spreadUris, selectedIndex, onCommit, onBusyChange, onOpenDetail, style, forwardedRef }: NativeBookPageTurnProps) {
  const nativeRef = useRef<CurlNativeViewRef>(null);

  useImperativeHandle(forwardedRef, (): BookPageTurnHandle => ({
    turn: direction => { void nativeRef.current?.turn(direction); },
  }), []);

  const pagesJson = useMemo(() => JSON.stringify(spreadUris.map(imageUri => ({ imageUri }))), [spreadUris]);

  if (!CurlNativeView) return null;
  return <CurlNativeView
    ref={nativeRef}
    style={style}
    pagesJson={pagesJson}
    selectedIndex={selectedIndex}
    onPageChange={event => onCommit(event.nativeEvent.index)}
    onBusyChange={event => { if (event.nativeEvent.busy) playPageTurn(); onBusyChange?.(event.nativeEvent.busy); }}
    onOpenDetail={event => { playSfx('sfx_stamp_view'); onOpenDetail?.(event.nativeEvent.index); }}
  />;
}
