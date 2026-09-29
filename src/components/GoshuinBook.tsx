import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C, Icon } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import type { Pilgrimage } from '../data/pilgrimages';
import { getGoshuinBookCover } from '../data/goshuinBookCovers';
import { WashiArt, WashiPressable as Pressable } from './Washi';

export type ShrineGridKind = 'goshuin' | 'miniature';

const INDEX_POPUP = require('../../assets/ui-washi/goshuin/index-popup.webp');
const UNDERLINE_BRUSH = require('../../assets/ui-washi/common/underline-brush.webp');
// The scroll art keeps transparent margins; only this part of the picture is the scroll itself.
const SCROLL_LEFT = 0.165;
const SCROLL_WIDTH = 0.669;
const SCROLL_ASPECT = (0.669 * 1024) / (0.973 * 1400);

/**
 * The book's table of contents, opened as a hanging scroll over the page
 * instead of a plain sheet.
 */
export function BookIndexPopup({ visible, title, subtitle, shrines, ownedIds, onSelect, onClose }: { visible: boolean; title: string; subtitle?: string; shrines: readonly Shrine[]; ownedIds: readonly string[]; onSelect: (shrine: Shrine, index: number) => void; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const scrollWidth = Math.min(width - 24, (height - 96) * SCROLL_ASPECT, 380);
  const scrollHeight = scrollWidth / SCROLL_ASPECT;
  const artWidth = scrollWidth / SCROLL_WIDTH;
  const artHeight = artWidth * 1400 / 1024;
  const paperHeight = scrollHeight * .745;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.scrim}>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="目次を閉じる" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={{ width: scrollWidth, height: scrollHeight, overflow: 'hidden' }}>
        <Image accessible={false} source={INDEX_POPUP} contentFit="fill" pointerEvents="none" style={{ position: 'absolute', left: -SCROLL_LEFT * artWidth, top: 0, width: artWidth, height: artHeight }} />
        <View style={[S.scrollContent, { left: scrollWidth * .12, right: scrollWidth * .12, top: scrollHeight * .165, height: paperHeight }]}>
          <Text accessibilityRole="header" style={S.scrollTitle}>{title}</Text>
          {!!subtitle && <Text numberOfLines={1} style={S.scrollSubtitle}>{subtitle}</Text>}
          <PagedShrineGrid bare kind="goshuin" title="" shrines={shrines} ownedIds={ownedIds} onSelect={onSelect} height={paperHeight - 96} />
          <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose} style={S.scrollClose}>
            <Text style={S.scrollCloseText}>とじる</Text>
            <Image accessible={false} source={UNDERLINE_BRUSH} contentFit="fill" style={S.scrollCloseLine} />
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

export function GoshuinBookCover({ route, onOpen }: { route: Pilgrimage; onOpen: () => void }) {
  return <View style={S.coverStage}>
        <Pressable artwork={false} accessibilityRole="button" accessibilityLabel={`${route.name}の御朱印帳をひらく`} accessibilityHint="御朱印帳の見開きを表示します" onPress={onOpen} style={S.cover}>
          <Image source={getGoshuinBookCover(route.id)} contentFit="contain" style={S.coverImage} />
    </Pressable>
  </View>;
}

/**
 * The one grid used for every goshuin / miniature list (御朱印帳の一覧 and
 * コレクションの一覧), so both places look and behave the same.
 */
export function ShrineGrid({ kind, shrines, ownedIds, onSelect, showCount = true }: { kind: ShrineGridKind; shrines: readonly Shrine[]; ownedIds: readonly string[]; onSelect: (shrine: Shrine, index: number) => void; showCount?: boolean }) {
  const owned = new Set(ownedIds);
  const ownedCount = shrines.filter(shrine => owned.has(shrine.id)).length;
  const noun = kind === 'goshuin' ? '御朱印' : 'ミニチュア';
  return <View style={S.card} accessibilityLabel={`${noun}の一覧`}>
    <WashiArt />
    {showCount && <Text style={S.count}>{`${noun} ${ownedCount} / ${shrines.length}`}</Text>}
    <View style={S.grid}>
      {shrines.map((shrine, index) => {
        const acquired = owned.has(shrine.id);
        const source = kind === 'goshuin' ? STAMP_IMAGES[shrine.id] : COLLECTION_KEYCHAINS[shrine.id as keyof typeof COLLECTION_KEYCHAINS];
        return <Pressable artwork={false} key={`${shrine.id}-${index}`} accessibilityRole="button" accessibilityLabel={`${shrine.name}の${noun}、${acquired ? '取得済み' : '未取得'}`} onPress={() => onSelect(shrine, index)} style={S.cell}>
          <View style={[S.tile, !acquired && S.tileUnacquired]}>
            {source ? <Image source={source} contentFit="contain" style={[S.image, !acquired && S.imageUnacquired]} /> : null}
          </View>
          <Text numberOfLines={1} style={[S.name, !acquired && S.nameUnacquired]}>{acquired ? shrine.name : '未取得'}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

const PAGED_COLUMNS = 4;
const PAGED_GAP = 9;
const PAGED_NAME_HEIGHT = 22;

/**
 * The same grid as ShrineGrid, but split into pages instead of scrolling: it
 * fits as many rows as the given height allows and offers ‹ › to turn pages.
 */
export function PagedShrineGrid({ kind, title, shrines, ownedIds, onSelect, height, bare = false }: { bare?: boolean; kind: ShrineGridKind; title: string; shrines: readonly Shrine[]; ownedIds: readonly string[]; onSelect: (shrine: Shrine, index: number) => void; height: number }) {
  const owned = new Set(ownedIds);
  const ownedCount = shrines.filter(shrine => owned.has(shrine.id)).length;
  const noun = kind === 'goshuin' ? '御朱印' : 'ミニチュア';
  const [grid, setGrid] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState(0);
  const tileWidth = grid.width > 0 ? (grid.width - PAGED_GAP * (PAGED_COLUMNS - 1)) / PAGED_COLUMNS : 0;
  const rowHeight = tileWidth / .82 + PAGED_NAME_HEIGHT + PAGED_GAP;
  const rows = tileWidth > 0 && grid.height > 0 ? Math.max(1, Math.floor((grid.height + PAGED_GAP) / rowHeight)) : 1;
  const perPage = rows * PAGED_COLUMNS;
  const pageCount = Math.max(1, Math.ceil(shrines.length / perPage));
  const current = Math.min(page, pageCount - 1);
  useEffect(() => { if (page !== current) setPage(current); }, [page, current]);
  const visible = shrines.slice(current * perPage, (current + 1) * perPage);
  return <View style={[S.card, bare && S.cardBare, { flex: 1, maxHeight: height > 0 ? height : undefined, marginBottom: 4 }]} accessibilityLabel={noun + 'の一覧'}>
    {!bare && <WashiArt />}
    {!bare && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF9EFD9' }]} />}
    <View style={S.pagedHead}><Text style={S.pagedTitle}>{title}</Text><Text style={S.count2}>{ownedCount} / {shrines.length}</Text></View>
    <View style={{ flex: 1 }} onLayout={({ nativeEvent }) => setGrid(previous => previous.width === nativeEvent.layout.width && previous.height === nativeEvent.layout.height ? previous : nativeEvent.layout)}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: PAGED_GAP, rowGap: PAGED_GAP, overflow: 'hidden', maxHeight: '100%' }}>
        {tileWidth > 0 && visible.map((shrine, offset) => {
          const index = current * perPage + offset;
          const acquired = owned.has(shrine.id);
          const source = kind === 'goshuin' ? STAMP_IMAGES[shrine.id] : COLLECTION_KEYCHAINS[shrine.id as keyof typeof COLLECTION_KEYCHAINS];
          return <Pressable artwork={false} key={shrine.id + '-' + index} accessibilityRole="button" accessibilityLabel={shrine.name + 'の' + noun + '、' + (acquired ? '取得済み' : '未取得')} onPress={() => onSelect(shrine, index)} style={{ width: tileWidth }}>
            <View style={[S.tile, !acquired && S.tileUnacquired, { height: tileWidth / .82 }]}>
              {source ? <Image source={source} contentFit="contain" style={[S.image, !acquired && S.imageUnacquired]} /> : null}
            </View>
            <Text numberOfLines={1} style={[S.pagedName, !acquired && S.nameUnacquired]}>{acquired ? shrine.name : '未取得'}</Text>
          </Pressable>;
        })}
      </View>
    </View>
    <View style={S.pagedPager}>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="前のページ" accessibilityState={{ disabled: current === 0 }} disabled={current === 0} onPress={() => setPage(current - 1)} style={[S.pagedArrow, current === 0 && { opacity: .35 }]}><Icon name="chevron-back" size={18} /></Pressable>
      <Text style={S.pagedCounter}>{current + 1} / {pageCount}</Text>
      <Pressable artwork={false} accessibilityRole="button" accessibilityLabel="次のページ" accessibilityState={{ disabled: current >= pageCount - 1 }} disabled={current >= pageCount - 1} onPress={() => setPage(current + 1)} style={[S.pagedArrow, current >= pageCount - 1 && { opacity: .35 }]}><Icon name="chevron-forward" size={18} /></Pressable>
    </View>
  </View>;
}

const S = StyleSheet.create({
  coverStage: { minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  cover: { width: '68%', maxWidth: 288, aspectRatio: 2 / 3, overflow: 'visible', backgroundColor: 'transparent' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  scrim: { flex: 1, backgroundColor: '#241B14B3', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { position: 'absolute', alignItems: 'stretch' },
  scrollTitle: { fontFamily: BRUSH, fontSize: 24, color: C.ink, textAlign: 'center', letterSpacing: 4 },
  scrollSubtitle: { fontFamily: BRUSH, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 2, marginBottom: 8 },
  scrollClose: { alignSelf: 'center', alignItems: 'center', minHeight: 44, minWidth: 88, justifyContent: 'center', marginTop: 4 },
  scrollCloseText: { fontFamily: BRUSH, fontSize: 15, color: C.red, letterSpacing: 2 },
  scrollCloseLine: { width: 72, height: 8, marginTop: -1 },
  cardBare: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, borderRadius: 0 },
  card: { borderRadius: 20, backgroundColor: '#FFF9EF', padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  count: { color: C.muted, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '3.5%', rowGap: 12 },
  cell: { width: '31%' },
  tile: { width: '100%', aspectRatio: .82, borderRadius: 10, borderWidth: 1, borderColor: '#DED0BD', backgroundColor: '#FFFDF7', padding: 5, overflow: 'hidden' },
  tileUnacquired: { backgroundColor: '#EEE7DC', borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  imageUnacquired: { opacity: .22 },
  name: { color: C.ink, fontFamily: BRUSH, fontSize: 12, marginTop: 5, textAlign: 'center' },
  nameUnacquired: { color: '#9A8F80' },
  count2: { color: C.muted, fontSize: 13 },
  pagedHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  pagedTitle: { fontFamily: BRUSH, fontSize: 19, color: C.ink, letterSpacing: 1 },
  pagedName: { color: C.ink, fontFamily: BRUSH, fontSize: 11, marginTop: 4, textAlign: 'center' },
  pagedPager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 8 },
  pagedArrow: { width: 44, height: 36, borderRadius: 18, backgroundColor: '#EFE6D8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D9C9B5' },
  pagedCounter: { fontFamily: 'Shippori', fontSize: 15, color: C.ink, letterSpacing: 2, minWidth: 64, textAlign: 'center' },
});
