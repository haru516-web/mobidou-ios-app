import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import type { PilgrimageEvent } from '../data/events';
import { EVENT_KEY_VISUAL } from '../data/eventImages';
import { BRUSH, Button, C, Icon } from '../components';
import { WashiPressable as Pressable } from './Washi';
import { ScrollPopup } from './ScrollPopup';

/**
 * Tells the player an event is running. It opens once when the app reaches the home screen:
 * the event's picture, its name and one line about it, then a way into the event or a way out.
 */
export function EventAnnouncePopup({ visible, event, statusLabel, hideNextTime, onHideNextTimeChange, onOpenEvent, onClose }: { visible: boolean; event: PilgrimageEvent; /** Where the player stands in it: not joined, recruiting, walking, cleared. */ statusLabel: string; /** The box at the lower right: do not open this popup by itself at launch any more. */ hideNextTime: boolean; onHideNextTimeChange: (hide: boolean) => void; onOpenEvent: () => void; onClose: () => void }) {
  return <ScrollPopup event visible={visible} title="イベント開催中" onClose={onClose}>
    {paper => {
      // The picture takes what is left under the heading, above the name, the line and the button.
      const imageHeight = Math.max(110, paper.height - 46 - 175);
      const imageWidth = Math.min(paper.width, imageHeight * 1024 / 1152);
      return <View style={S.body}>
        <View style={S.card}>
          <Image source={EVENT_KEY_VISUAL} contentFit="contain" accessibilityLabel={`${event.name}のイメージ`} style={{ width: imageWidth, height: imageHeight }} />
          <Text style={S.status}>{statusLabel}</Text>
          <Text style={S.name}>{event.name}</Text>
          <Text style={S.tagline}>{event.tagline}</Text>
        </View>
        <Button title="イベントを見る" onPress={onOpenEvent} />
        <Pressable artwork={false} accessibilityRole="checkbox" accessibilityState={{ checked: hideNextTime }} accessibilityLabel="今後は、アプリを開いたときに表示しない" onPress={() => onHideNextTimeChange(!hideNextTime)} style={S.hideRow}>
          <Icon name={hideNextTime ? 'checkbox' : 'square-outline'} size={20} color={C.red} />
          <Text style={S.hideText}>今後は表示しない</Text>
        </Pressable>
      </View>;
    }}
  </ScrollPopup>;
}

const S = StyleSheet.create({
  body: { flex: 1, gap: 10, justifyContent: 'space-between', paddingTop: 4 },
  card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  status: { color: C.red, fontFamily: BRUSH, fontSize: 13 },
  name: { color: C.ink, fontFamily: BRUSH, fontSize: 22, textAlign: 'center' },
  tagline: { color: '#655B4D', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  hideRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 4 },
  hideText: { color: '#655B4D', fontSize: 12 },
});
