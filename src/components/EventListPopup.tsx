import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import type { PilgrimageEvent } from '../data/events';
import { EVENT_KEY_VISUAL } from '../data/eventImages';
import { BRUSH, Button, C } from '../components';
import { PopButton } from './PopButton';
import { ScrollPopup } from './ScrollPopup';

/**
 * What the collection's event button opens first: the events that are running and the ones that are over.
 * From the running event the player goes on to the event collection.
 */
export function EventListPopup({ visible, onClose, event, statusLabel, onViewCollection }: { visible: boolean; onClose: () => void; event: PilgrimageEvent; /** Where the player stands in it: not joined, recruiting, walking, cleared. */ statusLabel: string; onViewCollection: () => void }) {
  const [list, setList] = useState<'now' | 'past'>('now');
  useEffect(() => { if (visible) setList('now'); }, [visible]);
  return <ScrollPopup visible={visible} title="イベント" onClose={onClose}>
    {paper => {
      // The picture takes what is left between the tabs and the button, below it only the name and where the player stands.
      const imageHeight = Math.max(120, paper.height - 46 - 52 - 62 - 36);
      const imageWidth = Math.min(paper.width, imageHeight * 1024 / 1152);
      return <View style={S.body}>
      <View style={S.tabs}>
        <PopButton id="eventNormal" label="開催中" icon="flag" plaqueOnly selected={list === 'now'} faded={list !== 'now'} onPress={() => setList('now')} />
        <PopButton id="eventNormal" label="過去" icon="time" plaqueOnly selected={list === 'past'} faded={list !== 'past'} onPress={() => setList('past')} />
      </View>
      {list === 'now'
        ? <>
          <View style={S.card}>
            <Image source={EVENT_KEY_VISUAL} contentFit="contain" accessibilityLabel={`${event.name}のイメージ`} style={{ width: imageWidth, height: imageHeight }} />
            <Text style={S.status}>{statusLabel}</Text>
            <Text style={S.name}>{event.name}</Text>
          </View>
          <Button title="コレクションを見る" onPress={onViewCollection} />
        </>
        : <View style={S.empty}><Text style={S.emptyText}>過去に開催されたイベントはありません。</Text></View>}
      </View>;
    }}
  </ScrollPopup>;
}

const S = StyleSheet.create({
  body: { flex: 1, gap: 12, justifyContent: 'space-between', paddingTop: 4 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  status: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  name: { color: C.ink, fontFamily: BRUSH, fontSize: 21, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#655B4D', fontSize: 13, textAlign: 'center' },
});
