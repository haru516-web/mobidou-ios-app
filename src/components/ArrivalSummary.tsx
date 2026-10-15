import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from './AppImage';
import { BRUSH, Button, SERIF } from '../components';
import { FitToHeight } from './PagedBody';
import { STAMP_IMAGES } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import type { KeychainOutcome } from '../services/specialRewards';

export type ArrivalSummaryItem = { shrineId: string; name: string; outcome: KeychainOutcome };

/**
 * What the skipped ceremonies gave, and nothing else. Like a single ceremony it shows the goshuin first and the
 * miniatures on a page of their own (only the ones received; no page when none were). It is not a ceremony: no motion.
 */
export function ArrivalSummary({ items, routeName, onClose }: { items: readonly ArrivalSummaryItem[]; routeName?: string; onClose: () => void }) {
  const [page, setPage] = useState<'goshuin' | 'miniature'>('goshuin');
  const miniatures = items.filter(item => (item.outcome === 'won' || item.outcome === 'ticket') && !!COLLECTION_KEYCHAINS[item.shrineId as keyof typeof COLLECTION_KEYCHAINS]);
  const shown = page === 'goshuin' ? items : miniatures;
  const columns = shown.length <= 4 ? 2 : 3;
  const picture = columns === 2 ? 118 : 92;
  const more = page === 'goshuin' && miniatures.length > 0;
  return <SafeAreaView style={S.page}>
    <FitToHeight key={page} style={S.fit}><View style={S.content}>
      {!!routeName && <Text style={S.eyebrow}>{routeName}</Text>}
      <Text accessibilityRole="header" style={S.title}>{page === 'goshuin' ? `${items.length}か所を、参拝しました` : 'ミニチュアを授かりました'}</Text>
      <Text style={S.lead}>{page === 'goshuin' ? `御朱印${items.length}枚を授かりました。` : `ミニチュア${miniatures.length}つ`}</Text>
      <View style={S.grid}>
        {shown.map(item => <View key={item.shrineId} accessible accessibilityLabel={`${item.name}の${page === 'goshuin' ? '御朱印' : 'ミニチュア'}`} style={[S.cell, { width: `${100 / columns}%` }]}>
          <Image source={page === 'goshuin' ? STAMP_IMAGES[item.shrineId as keyof typeof STAMP_IMAGES] : COLLECTION_KEYCHAINS[item.shrineId as keyof typeof COLLECTION_KEYCHAINS]} contentFit="contain" style={{ width: picture, height: picture }} />
          <Text numberOfLines={1} style={S.name}>{item.name}</Text>
        </View>)}
      </View>
    </View></FitToHeight>
    <View style={S.closeBar}><Button title={more ? '次へ' : 'ホームへ'} onPress={more ? () => setPage('miniature') : onClose} style={{ width: '100%', maxWidth: 350 }} /></View>
  </SafeAreaView>;
}

const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25' },
  fit: { flex: 1 },
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 24, gap: 12 },
  eyebrow: { color: '#D5BD98', fontSize: 11, letterSpacing: 2 },
  title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 23, textAlign: 'center' },
  lead: { color: '#E6D8C5', fontFamily: SERIF, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  grid: { width: '100%', maxWidth: 380, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 },
  cell: { alignItems: 'center', paddingVertical: 6, gap: 3 },
  name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 12, textAlign: 'center', maxWidth: '100%' },
  closeBar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, minHeight: 76 },
});
