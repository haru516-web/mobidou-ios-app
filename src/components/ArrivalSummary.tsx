import React from 'react';
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
 * What the skipped ceremonies gave, and nothing else: each goshuin, and the miniature where one was received.
 * It is not a ceremony: one page, one button.
 */
export function ArrivalSummary({ items, routeName, onClose }: { items: readonly ArrivalSummaryItem[]; routeName?: string; onClose: () => void }) {
  const received = items.filter(item => item.outcome === 'won' || item.outcome === 'ticket').length;
  const columns = items.length <= 4 ? 2 : 3;
  const picture = columns === 2 ? 108 : 84;
  return <SafeAreaView style={S.page}>
    <FitToHeight style={S.fit}><View style={S.content}>
      {!!routeName && <Text style={S.eyebrow}>{routeName}</Text>}
      <Text accessibilityRole="header" style={S.title}>{items.length}か所を、参拝しました</Text>
      <Text style={S.lead}>御朱印{items.length}枚{received > 0 ? `と、ミニチュア${received}つ` : ''}を授かりました。</Text>
      <View style={S.grid}>
        {items.map(item => {
          const keychain = COLLECTION_KEYCHAINS[item.shrineId as keyof typeof COLLECTION_KEYCHAINS];
          const gotMiniature = item.outcome === 'won' || item.outcome === 'ticket';
          return <View key={item.shrineId} accessible accessibilityLabel={`${item.name}の御朱印${gotMiniature ? 'と、ミニチュア' : ''}`} style={[S.cell, { width: `${100 / columns}%` }]}>
            <View>
              <Image source={STAMP_IMAGES[item.shrineId as keyof typeof STAMP_IMAGES]} contentFit="contain" style={{ width: picture, height: picture }} />
              {gotMiniature && !!keychain && <Image source={keychain} contentFit="contain" accessible={false} style={[S.miniature, { width: picture * .52, height: picture * .52 }]} />}
            </View>
            <Text numberOfLines={1} style={S.name}>{item.name}</Text>
            {gotMiniature && <Text style={S.miniatureText}>ミニチュア</Text>}
          </View>;
        })}
      </View>
    </View></FitToHeight>
    <View style={S.closeBar}><Button title="ホームへ" onPress={onClose} style={{ width: '100%', maxWidth: 350 }} /></View>
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
  miniature: { position: 'absolute', right: -6, bottom: -4 },
  name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 12, textAlign: 'center', maxWidth: '100%' },
  miniatureText: { color: '#F6D9A3', fontSize: 10, letterSpacing: 1 },
  closeBar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, minHeight: 76 },
});
