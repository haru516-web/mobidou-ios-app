import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { EVENT_BOOK_COVER, EVENT_GOSHUIN_IMAGES, EVENT_KEYCHAIN_IMAGES, EVENT_TICKET_IMAGE } from '../data/eventImages';
import type { EventSpot, PilgrimageEvent } from '../data/events';
import { BRUSH, Button, C } from '../components';
import { eventProgress, teamSteps } from '../services/eventTeam';
import { useEventTeam } from '../services/eventTeamStore';
import { PaperCard, WashiPressable as Pressable } from './Washi';
import { Sheet } from './SocialSheets';

/** How many of the event's spots the team has reached (what the player owns of the event goshuin and miniatures). */
export function useEventReached(event: PilgrimageEvent): number {
  const team = useEventTeam(event.id);
  return team && team.status !== 'recruiting' ? eventProgress(event, teamSteps(team)).reached : 0;
}

const COLUMNS = 5, GAP = 6;

/** Five-column grid of the event's spots; `render` draws one cell at the given width. */
function SpotGrid({ spots, render }: { spots: EventSpot[]; render: (spot: EventSpot, index: number, width: number) => React.ReactNode }) {
  const [width, setWidth] = useState(300);
  const cell = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  return <View onLayout={e => setWidth(Math.round(e.nativeEvent.layout.width))} style={S.grid}>
    {spots.map((spot, index) => <View key={spot.id} style={{ width: cell }}>{render(spot, index, cell)}</View>)}
  </View>;
}

function GoshuinCell({ spot, owned, width, onPress }: { spot: EventSpot; owned: boolean; width: number; onPress: () => void }) {
  return <Pressable artwork={false} disabled={!owned} accessibilityRole="button" accessibilityLabel={owned ? `${spot.name}の御朱印` : '未取得のイベント御朱印'} onPress={onPress} style={[S.cell, { height: width * 1.5 }]}>
    {owned
      ? <Image source={EVENT_GOSHUIN_IMAGES[spot.id]} contentFit="cover" style={StyleSheet.absoluteFillObject} />
      : <View style={S.locked}><Text style={S.lockedMark}>？</Text></View>}
  </Pressable>;
}

function KeychainCell({ spot, owned, width }: { spot: EventSpot; owned: boolean; width: number }) {
  return <View accessible accessibilityLabel={owned ? `${spot.miniature}のミニチュア` : '未取得のミニチュア'} style={[S.cell, S.keychainCell, { height: width * 1.5 }]}>
    <Image source={EVENT_KEYCHAIN_IMAGES[spot.id]} contentFit="contain" style={[StyleSheet.absoluteFillObject, owned ? null : S.silhouette]} />
  </View>;
}

function GoshuinDetail({ spot, onBack }: { spot: EventSpot; onBack: () => void }) {
  return <View style={S.detail}>
    <Image source={EVENT_GOSHUIN_IMAGES[spot.id]} contentFit="contain" accessibilityLabel={`${spot.name}の御朱印`} style={S.detailImage} />
    <Text style={S.detailName}>{spot.chapter} · {spot.name}</Text>
    <Button title="一覧にもどる" secondary onPress={onBack} />
  </View>;
}

/** The event's goshuin book: the cover and one goshuin per spot reached; the rest wait as blank pages. */
export function EventBookSheet({ visible, onClose, event }: { visible: boolean; onClose: () => void; event: PilgrimageEvent }) {
  const reached = useEventReached(event);
  const [selected, setSelected] = useState<EventSpot | null>(null);
  const spots = event.spots ?? [];
  const close = () => { setSelected(null); onClose(); };
  return <Sheet visible={visible} title="イベント御朱印帳" onClose={close}>
    {selected
      ? <GoshuinDetail key="detail" spot={selected} onBack={() => setSelected(null)} />
      : <View key="cover" style={S.coverRow}>
        <Image source={EVENT_BOOK_COVER} contentFit="contain" accessibilityLabel={`${event.name}の御朱印帳`} style={S.cover} />
        <View style={S.coverCopy}><Text style={S.headline}>{event.name}</Text><Text style={S.body}>チームが社に着くたび、御朱印が1枚ずつ増えます。</Text><Text style={S.count}>{reached} / {spots.length}</Text></View>
      </View>}
    {!selected && <View key="grid"><SpotGrid spots={spots} render={(spot, index, width) => <GoshuinCell spot={spot} owned={index < reached} width={width} onPress={() => setSelected(spot)} />} /></View>}
  </Sheet>;
}

type CollectionPage = 'room' | 'goshuin' | 'miniatures';
export const EVENT_COLLECTION_PAGES: { id: CollectionPage; label: string; icon: 'home' | 'book' | 'cube' }[] = [
  { id: 'room', label: '展示室', icon: 'home' },
  { id: 'goshuin', label: '御朱印', icon: 'book' },
  { id: 'miniatures', label: 'ミニチュア', icon: 'cube' },
];

/** The event version of the collection pages; same three pages as the ordinary collection, holding the event's things. */
export function EventCollection({ event, page }: { event: PilgrimageEvent; page: CollectionPage }) {
  const reached = useEventReached(event);
  const spots = event.spots ?? [];
  const [selected, setSelected] = useState<EventSpot | null>(null);
  if (page === 'room') return <View style={S.collection}><PaperCard>
    <Text style={S.label}>展示室</Text>
    <SpotGrid spots={spots} render={(spot, index, width) => <KeychainCell spot={spot} owned={index < reached} width={width} />} />
    <Text style={S.small}>{reached} / {spots.length} 個のミニチュアが並んでいます</Text>
  </PaperCard></View>;
  if (page === 'goshuin') return <View style={S.collection}><PaperCard>
    {selected
      ? <GoshuinDetail spot={selected} onBack={() => setSelected(null)} />
      : <><Text style={S.label}>イベント御朱印</Text><SpotGrid spots={spots} render={(spot, index, width) => <GoshuinCell spot={spot} owned={index < reached} width={width} onPress={() => setSelected(spot)} />} /></>}
  </PaperCard></View>;
  return <View style={S.collection}><PaperCard>
    <Text style={S.label}>集めた時代の宝物</Text>
    {spots.map((spot, index) => <View key={spot.id} style={S.row}>
      <Text style={[S.rowName, index >= reached && S.rowLocked]}>{index < reached ? spot.miniature : '？'}</Text>
      <Text style={S.rowMeta}>{index < reached ? `${spot.chapter} · ${spot.name}` : `${spot.at.toLocaleString()}歩で出会える`}</Text>
    </View>)}
  </PaperCard></View>;
}

/** Event gacha entry; the draw itself is decided later, so this shows what the reward will be. */
export function EventGachaSheet({ visible, onClose, event }: { visible: boolean; onClose: () => void; event: PilgrimageEvent }) {
  return <Sheet visible={visible} title="イベントガチャ" onClose={onClose}>
    <View key="body" style={S.gacha}>
      <Image source={EVENT_TICKET_IMAGE} contentFit="contain" accessibilityLabel="イベント限定の木札" style={S.ticket} />
      <Text style={S.headline}>{event.name}</Text>
      <Text style={[S.body, { textAlign: 'center' }]}>イベントをクリアすると、限定の木札がもらえます。{'\n'}木札で、イベント限定のガチャを引けるようになります。{'\n'}（イベントガチャは準備中です）</Text>
    </View>
  </Sheet>;
}

const S = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { width: '100%', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#D9C8A7', backgroundColor: '#F5EBD7' },
  keychainCell: { borderWidth: 0, backgroundColor: 'transparent' },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EADFC6' },
  lockedMark: { fontFamily: BRUSH, fontSize: 22, color: '#A89576' },
  silhouette: { tintColor: '#3B342B', opacity: .22 },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cover: { width: 110, height: 165 },
  coverCopy: { flex: 1, gap: 6 },
  headline: { fontFamily: BRUSH, fontSize: 20, color: C.ink },
  body: { fontSize: 13, lineHeight: 22, color: '#655B4D' },
  count: { fontFamily: 'ShipporiBold', fontSize: 18, color: C.red },
  detail: { alignItems: 'center', gap: 10 },
  detailImage: { width: 240, height: 360 },
  detailName: { fontFamily: BRUSH, fontSize: 16, color: C.ink },
  collection: { width: '100%' },
  label: { fontFamily: BRUSH, fontSize: 15, color: C.ink, marginBottom: 8 },
  small: { fontSize: 12, color: '#857560', marginTop: 8, textAlign: 'center' },
  row: { minHeight: 34, justifyContent: 'center' },
  rowName: { fontFamily: BRUSH, fontSize: 14, color: C.ink },
  rowLocked: { color: '#A89576' },
  rowMeta: { fontSize: 11, color: '#857560' },
  gacha: { alignItems: 'center', gap: 12, paddingTop: 20 },
  ticket: { width: 120, height: 180 },
});
