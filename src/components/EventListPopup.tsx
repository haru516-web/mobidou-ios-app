import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PilgrimageEvent } from '../data/events';
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
    {() => <View style={S.body}>
      <View style={S.tabs}>
        <PopButton id="eventNormal" label="開催中" icon="flag" plaqueOnly selected={list === 'now'} faded={list !== 'now'} onPress={() => setList('now')} />
        <PopButton id="eventNormal" label="過去" icon="time" plaqueOnly selected={list === 'past'} faded={list !== 'past'} onPress={() => setList('past')} />
      </View>
      {list === 'now'
        ? <>
          <View style={S.card}>
            <Text style={S.status}>{statusLabel}</Text>
            <Text style={S.name}>{event.name}</Text>
            <Text style={S.tagline}>{event.tagline}</Text>
            <Text style={S.meta}>{event.minMembers ?? 2}〜{event.maxMembers ?? 4}人のチーム · ゴール {(event.goalSteps ?? 0).toLocaleString()}歩</Text>
          </View>
          <Button title="コレクションを見る" onPress={onViewCollection} />
        </>
        : <View style={S.empty}><Text style={S.emptyText}>過去に開催されたイベントはありません。</Text></View>}
    </View>}
  </ScrollPopup>;
}

const S = StyleSheet.create({
  body: { flex: 1, gap: 12, justifyContent: 'space-between', paddingTop: 4 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  status: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  name: { color: C.ink, fontFamily: BRUSH, fontSize: 21, textAlign: 'center' },
  tagline: { color: '#655B4D', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  meta: { color: '#857560', fontSize: 11, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#655B4D', fontSize: 13, textAlign: 'center' },
});
