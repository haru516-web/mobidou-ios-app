import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
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

export function NativeBookPageTurn({ pages, selectedIndex, onCommit, onBusyChange, onOpenDetail, style, forwardedRef }: NativeBookPageTurnProps) {
  const nativeRef = useRef<CurlNativeViewRef>(null);
  const [imageUris, setImageUris] = useState<Record<number, string>>({});
  const sourceKey = pages.map(page => page.imageSource).join(',');

  useEffect(() => {
    let cancelled = false;
    setImageUris({});
    void Promise.all(pages.map(async (page, index) => {
      if (!page.acquired) return [index, ''] as const;
      const asset = await Asset.fromModule(page.imageSource).downloadAsync();
      return [index, asset.localUri ?? asset.uri] as const;
    })).then(entries => {
      if (!cancelled) setImageUris(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setImageUris({});
    });
    return () => { cancelled = true; };
  }, [sourceKey, pages.map(page => page.acquired).join(',')]);

  useImperativeHandle(forwardedRef, (): BookPageTurnHandle => ({
    turn: direction => { void nativeRef.current?.turn(direction); },
  }), []);

  const pagesJson = useMemo(() => JSON.stringify(pages.map((page, index) => ({
    name: page.name,
    reading: page.reading,
    theme: page.theme,
    place: page.place,
    acquired: page.acquired,
    imageUri: imageUris[index] || null,
  }))), [pages, imageUris]);

  if (!CurlNativeView) return null;
  return <CurlNativeView
    ref={nativeRef}
    style={style}
    pagesJson={pagesJson}
    selectedIndex={selectedIndex}
    onPageChange={event => onCommit(event.nativeEvent.index)}
    onBusyChange={event => onBusyChange?.(event.nativeEvent.busy)}
    onOpenDetail={event => onOpenDetail?.(event.nativeEvent.index)}
  />;
}
