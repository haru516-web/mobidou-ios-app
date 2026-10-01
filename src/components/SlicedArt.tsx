import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { UI_ART, type UiArt, type UiArtName } from '../data/uiArt';
import { CroppedArt } from './CroppedArt';

type Edges = { left: number; right: number; top: number; bottom: number };

/**
 * Paints a piece of hand-made washi art behind its parent, stretched to any size
 * without distorting its torn edges. Parts with only left/right edges (buttons,
 * strips) keep their height ratio and stretch across; parts with all four edges
 * (cards, tiles, frames) keep their corners and stretch the middle both ways.
 *
 * `corner` is how big the fixed edge is on screen, in points.
 */
export function SlicedArt({ name, art: given, corner, style }: { name?: UiArtName; /** Artwork that is not in the shared set (such as the gacha shop's). */ art?: UiArt; corner?: number; style?: StyleProp<ViewStyle> }) {
  const art = given ?? UI_ART[name as UiArtName];
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(previous => (previous.width === width && previous.height === height ? previous : { width, height }));
  };
  const box = art.box;
  const boxWidth = box.x1 - box.x0;
  const boxHeight = box.y1 - box.y0;
  const slice: { left?: number; right?: number; top?: number; bottom?: number } = 'slice' in art && art.slice ? art.slice : {};
  // Fixed edge widths inside the artwork box, in source pixels.
  const edges: Edges = {
    left: Math.max(1, (slice.left ?? 0) - box.x0),
    right: Math.max(1, (slice.right ?? 0) - (art.width - box.x1)),
    top: slice.top ? Math.max(1, slice.top - box.y0) : 0,
    bottom: slice.bottom ? Math.max(1, slice.bottom - (art.height - box.y1)) : 0,
  };
  const nine = edges.top > 0 && edges.bottom > 0;
  const ready = size.width > 0 && size.height > 0;

  // How many screen points one source pixel is worth at the corners.
  const scaleX = nine ? (corner ?? 20) / Math.max(edges.left, edges.top) : size.height / boxHeight;
  const scaleY = nine ? scaleX : size.height / boxHeight;
  const leftWidth = Math.min(edges.left * scaleX, size.width / 2 - 0.5);
  const rightWidth = Math.min(edges.right * scaleX, size.width / 2 - 0.5);
  const topHeight = nine ? Math.min(edges.top * scaleY, size.height / 2 - 0.5) : 0;
  const bottomHeight = nine ? Math.min(edges.bottom * scaleY, size.height / 2 - 0.5) : 0;

  const frac = (px: number, total: number) => px / total;
  const columns = [
    { from: 0, to: leftWidth, a: box.x0, b: box.x0 + edges.left },
    { from: leftWidth - 0.5, to: size.width - rightWidth + 0.5, a: box.x0 + edges.left, b: box.x1 - edges.right },
    { from: size.width - rightWidth, to: size.width, a: box.x1 - edges.right, b: box.x1 },
  ];
  const rows = nine
    ? [
      { from: 0, to: topHeight, a: box.y0, b: box.y0 + edges.top },
      { from: topHeight - 0.5, to: size.height - bottomHeight + 0.5, a: box.y0 + edges.top, b: box.y1 - edges.bottom },
      { from: size.height - bottomHeight, to: size.height, a: box.y1 - edges.bottom, b: box.y1 },
    ]
    : [{ from: 0, to: size.height, a: box.y0, b: box.y1 }];

  void boxWidth;
  return <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, style]}>
    {ready && rows.flatMap((row, r) => columns.map((column, c) => <View key={`${r}-${c}`} style={{ position: 'absolute', left: column.from, width: Math.max(0, column.to - column.from), top: row.from, height: Math.max(0, row.to - row.from), overflow: 'hidden' }}>
      <CroppedArt source={art.source} bounds={{ x0: frac(column.a, art.width), x1: frac(column.b, art.width), y0: frac(row.a, art.height), y1: frac(row.b, art.height) }} />
    </View>))}
  </View>;
}
