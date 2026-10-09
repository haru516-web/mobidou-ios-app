import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { EVENT_TICKET_IMAGE } from '../data/eventImages';
import type { PilgrimageEvent } from '../data/events';
import { BRUSH, C } from '../components';
import { Sheet } from './SocialSheets';

/** Event gacha entry; the draw itself is decided later, so this shows what the reward will be. */
export function EventGachaSheet({ visible, onClose, event }: { visible: boolean; onClose: () => void; event: PilgrimageEvent }) {
  return <Sheet visible={visible} title="イベントガチャ" onClose={onClose}>
    <View key="body" style={S.gacha}>
      <Image source={EVENT_TICKET_IMAGE} contentFit="contain" accessibilityLabel="イベント限定の木札" style={S.ticket} />
      <Text style={S.headline}>{event.name}</Text>
      <Text style={S.body}>イベントをクリアすると、限定の木札がもらえます。</Text>
      <Text style={S.body}>木札で、イベント限定のガチャを引けるようになります。</Text>
      <Text style={S.body}>（イベントガチャは準備中です）</Text>
    </View>
  </Sheet>;
}

const S = StyleSheet.create({
  headline: { fontFamily: BRUSH, fontSize: 20, color: C.ink },
  body: { fontSize: 13, lineHeight: 22, color: '#655B4D', textAlign: 'center' },
  gacha: { alignItems: 'center', gap: 6, paddingTop: 20 },
  ticket: { width: 120, height: 180, marginBottom: 6 },
});
