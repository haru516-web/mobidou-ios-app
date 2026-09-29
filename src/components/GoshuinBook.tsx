import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BRUSH, C, Icon } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import type { Pilgrimage } from '../data/pilgrimages';
import { getGoshuinBookCover } from '../data/goshuinBookCovers';
import { WashiArt, WashiPressable as Pressable } from './Washi';
import { ScrollPopup } from './ScrollPopup';
import { SlicedArt } from './SlicedArt';

export type ShrineGridKind = 'goshuin' | 'miniature';

/**
 * The book's table of contents, opened as a hanging scroll over the page
 * instead of a plain sheet.
 */
export function BookIndexPopup({ visible, title, subtitle, shrines, ownedIds, onSelect, onClose }: { visible: boolean; title: string; subtitle?: string; shrines: readonly Shrine[]; ownedIds: readonly string[]; onSelect: (shrine: Shrine, index: number) => void; onClose: () => void }) {
  return <ScrollPopup visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
    {paper => <PagedShrineGrid bare kind="goshuin" title="" shrines={shrines} ownedIds={ownedIds} onSelect={onSelect} height={paper.height} />}
  </ScrollPopup>;
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
          <View style={[S.tile, !acquired && S.tileUnacquired]}><SlicedArt name={acquired ? 'tileFrame' : 'tileFrameEmpty'} corner={9} />
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
const PAGED_HEAD_HEIGHT = 30;
const PAGED_PAGER_HEIGHT = 52;

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
  // Rounded down: a tile row that fills the width exactly can wrap its last tile on a rounding error.
  const tileWidth = grid.width > 0 ? Math.floor((grid.width - PAGED_GAP * (PAGED_COLUMNS - 1)) / PAGED_COLUMNS) - 1 : 0;
  const rowHeight = tileWidth / .82 + PAGED_NAME_HEIGHT + PAGED_GAP;
  // Inside a popup the card is only as tall as `height`, and the count line and pager take their share of it.
  const gridHeight = bare && height > 0 ? height - PAGED_HEAD_HEIGHT - PAGED_PAGER_HEIGHT : grid.height;
  const rows = tileWidth > 0 && gridHeight > 0 ? Math.max(1, Math.floor((gridHeight + PAGED_GAP) / rowHeight)) : 1;
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
            <View style={[S.tile, !acquired && S.tileUnacquired, { height: tileWidth / .82 }]}><SlicedArt name={acquired ? 'tileFrame' : 'tileFrameEmpty'} corner={9} />
              {source ? <Image source={source} contentFit="contain" style={[S.image, !acquired && S.imageUnacquired]} /> : null}
            </View>
            <Text numberOfLines={1} style={[S.pagedName, !acquired && S.nameUnacquired]}>{acquired ? shrine.name : '未取得'}</Text>
          </Pressable>;
        })}
      </View>
    </View>
    <View style={S.pagedPager}>
      <Pressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel="前のページ" accessibilityState={{ disabled: current === 0 }} disabled={current === 0} onPress={() => setPage(current - 1)} style={[S.pagedArrow, current === 0 && { opacity: .35 }]}><Icon name="chevron-back" size={18} /></Pressable>
      <Text style={S.pagedCounter}>{current + 1} / {pageCount}</Text>
      <Pressable plate="round" artwork={false} accessibilityRole="button" accessibilityLabel="次のページ" accessibilityState={{ disabled: current >= pageCount - 1 }} disabled={current >= pageCount - 1} onPress={() => setPage(current + 1)} style={[S.pagedArrow, current >= pageCount - 1 && { opacity: .35 }]}><Icon name="chevron-forward" size={18} /></Pressable>
    </View>
  </View>;
}

const S = StyleSheet.create({
  coverStage: { minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  cover: { width: '68%', maxWidth: 288, aspectRatio: 2 / 3, overflow: 'visible', backgroundColor: 'transparent' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  cardBare: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, borderRadius: 0 },
  card: { padding: 14, overflow: 'hidden' },
  count: { color: C.muted, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '3.5%', rowGap: 12 },
  cell: { width: '31%' },
  tile: { width: '100%', aspectRatio: .82, padding: 8, overflow: 'hidden' },
  tileUnacquired: {},
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
