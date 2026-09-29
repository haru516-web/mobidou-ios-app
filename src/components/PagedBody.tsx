import React, { Fragment, isValidElement, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, Icon } from '../components';
import { WashiPressable as Pressable } from './Washi';
import { PagedMeasureContext } from './PagedMeasure';

const PAGER_HEIGHT = 52;

function flatten(nodes: React.ReactNode): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  React.Children.toArray(nodes).forEach(node => {
    if (!isValidElement(node)) return;
    if (node.type === Fragment) out.push(...flatten((node.props as { children?: React.ReactNode }).children));
    else out.push(node);
  });
  return out;
}

/**
 * Nothing in the app scrolls vertically. This lays its children out top to
 * bottom and, when they do not fit, splits them into pages with ‹ › buttons.
 * Each direct child stays whole on one page, so group a heading with its
 * content in one View. Children are measured once in an invisible copy.
 */
export function PagedBody({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  const items = useMemo(() => flatten(children), [children]);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const keyOf = (item: React.ReactElement, index: number) => String(item.key ?? index);
  const measured = items.every((item, index) => heights[keyOf(item, index)] !== undefined);
  const total = items.reduce((sum, item, index) => sum + (heights[keyOf(item, index)] ?? 0) + gap, -gap);
  const needsPager = measured && box.height > 0 && total > box.height;
  const available = needsPager ? box.height - PAGER_HEIGHT : box.height;

  const pages = useMemo(() => {
    if (!measured || !needsPager) return [items];
    const result: React.ReactElement[][] = [];
    let current: React.ReactElement[] = [];
    let used = 0;
    items.forEach((item, index) => {
      const height = (heights[keyOf(item, index)] ?? 0) + (current.length ? gap : 0);
      if (current.length && used + height > available) { result.push(current); current = []; used = 0; }
      current.push(item);
      used += (heights[keyOf(item, index)] ?? 0) + (current.length > 1 ? gap : 0);
    });
    if (current.length) result.push(current);
    return result;
  }, [items, heights, measured, needsPager, available, gap]);

  const current = Math.min(page, pages.length - 1);
  useEffect(() => { if (page !== current) setPage(current); }, [page, current]);

  return <View style={[S.root, style]}><View style={S.root} onLayout={({ nativeEvent }) => setBox(previous => previous.width === nativeEvent.layout.width && previous.height === nativeEvent.layout.height ? previous : { width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
    {/* Invisible copy used only to learn each child's height at this width. */}
    <PagedMeasureContext.Provider value={true}><View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={S.measure}>
      {items.map((item, index) => <View key={keyOf(item, index)} onLayout={({ nativeEvent }) => setHeights(previous => Math.abs((previous[keyOf(item, index)] ?? -1) - nativeEvent.layout.height) < .5 ? previous : { ...previous, [keyOf(item, index)]: nativeEvent.layout.height })}>{item}</View>)}
    </View></PagedMeasureContext.Provider>
    <View style={[S.page, { height: needsPager ? available : undefined, flex: needsPager ? undefined : 1 }]}>
      {(measured ? pages[current] ?? [] : items).map((item, index) => <View key={keyOf(item, index)} style={index > 0 ? { marginTop: gap } : undefined}>{item}</View>)}
    </View>
    {needsPager && <View style={S.pager}>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="前のページ" accessibilityState={{ disabled: current === 0 }} disabled={current === 0} onPress={() => setPage(current - 1)} style={[S.arrow, current === 0 && S.arrowOff]}><Icon name="chevron-back" size={18} /></Pressable>
      <Text style={S.counter}>{current + 1} / {pages.length}</Text>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="次のページ" accessibilityState={{ disabled: current >= pages.length - 1 }} disabled={current >= pages.length - 1} onPress={() => setPage(current + 1)} style={[S.arrow, current >= pages.length - 1 && S.arrowOff]}><Icon name="chevron-forward" size={18} /></Pressable>
    </View>}
  </View></View>;
}

/**
 * For screens that must stay whole (a ceremony, a card): when the content is
 * taller than the space, it is scaled down to fit instead of scrolling.
 */
export function FitToHeight({ children, style, passThrough = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; passThrough?: boolean }) {
  const [outer, setOuter] = useState(0);
  const [inner, setInner] = useState(0);
  const scale = outer > 0 && inner > 0 ? Math.min(1, outer / inner) : 1;
  return <View pointerEvents={passThrough ? 'box-none' : 'auto'} style={[{ flex: 1, justifyContent: 'center' }, style]} onLayout={({ nativeEvent }) => setOuter(nativeEvent.layout.height)}>
    <View pointerEvents={passThrough ? 'box-none' : 'auto'} style={{ flexShrink: 0, transform: [{ scale }] }} onLayout={({ nativeEvent }) => setInner(nativeEvent.layout.height)}>{children}</View>
  </View>;
}

const S = StyleSheet.create({
  root: { flex: 1 },
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  page: { overflow: 'hidden' },
  pager: { height: PAGER_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  arrow: { width: 46, height: 38, borderRadius: 19, backgroundColor: '#EFE6D8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9C9B5' },
  arrowOff: { opacity: .35 },
  counter: { fontFamily: 'Shippori', fontSize: 15, color: C.ink, letterSpacing: 2, minWidth: 64, textAlign: 'center' },
});
