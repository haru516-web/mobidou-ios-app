import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import type { Pilgrimage } from '../data/pilgrimages';
import { getGoshuinBookCover } from '../data/goshuinBookCovers';
import { WashiArt, WashiPressable as Pressable } from './Washi';

export type ShrineGridKind = 'goshuin' | 'miniature';

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

const S = StyleSheet.create({
  coverStage: { minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  cover: { width: '68%', maxWidth: 288, aspectRatio: 2 / 3, overflow: 'visible', backgroundColor: 'transparent' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  card: { borderRadius: 20, backgroundColor: '#FFF9EF', padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  count: { color: C.muted, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '3.5%', rowGap: 12 },
  cell: { width: '31%' },
  tile: { width: '100%', aspectRatio: .82, borderRadius: 10, borderWidth: 1, borderColor: '#DED0BD', backgroundColor: '#FFFDF7', padding: 5, overflow: 'hidden' },
  tileUnacquired: { backgroundColor: '#EEE7DC', borderStyle: 'dashed' },
  image: { width: '100%', height: '100%' },
  imageUnacquired: { opacity: .22 },
  name: { color: C.ink, fontFamily: 'Shippori', fontSize: 12, marginTop: 5, textAlign: 'center' },
  nameUnacquired: { color: '#9A8F80' },
});
