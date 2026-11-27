import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from './AppImage';
import { eventPeriodLabel, type PilgrimageEvent } from '../data/events';
import { EVENT_GOSHUIN_IMAGES, EVENT_KEY_VISUAL, EVENT_KEYCHAIN_IMAGES } from '../data/eventImages';
import { BRUSH, Button, C, Icon } from '../components';
import { WashiPressable as Pressable } from './Washi';
import { ScrollPopup, type ScrollPaper } from './ScrollPopup';
import { FitToHeight } from './PagedBody';
import { EventMobbiesBody } from './MobbyIntroPopups';

/** The spots whose pictures stand for the whole set on the last page: some from each era. */
const SAMPLE_GOSHUIN = ['showa-car', 'showa-tv', 'heisei-keitai'];
const SAMPLE_MINIATURES = ['showa-record', 'heisei-md', 'heisei-digicam'];

/** The third page: what the walk gives. A few goshuin and miniatures, shrunk as a whole on a short screen. */
function EventRewardsBody({ paper, event, onOpenEvent }: { paper: ScrollPaper; event: PilgrimageEvent; onOpenEvent: () => void }) {
  const width = Math.floor((paper.width - 16) / 3);
  const spot = (id: string) => event.spots?.find(entry => entry.id === id);
  return <View style={S.body}>
    <FitToHeight>
      <View style={S.rewards}>
        <Text style={S.lead}>チームがお社に着くたびに、そのお社の御朱印とミニチュアが手に入ります。</Text>
        <Text style={S.heading}>御朱印</Text>
        <View style={S.row}>
          {SAMPLE_GOSHUIN.map(id => <Image key={id} source={EVENT_GOSHUIN_IMAGES[id]!} contentFit="contain" accessibilityLabel={`${spot(id)?.name ?? ''}の御朱印`} style={{ width, height: width * 1.5 }} />)}
        </View>
        <Text style={S.heading}>ミニチュア</Text>
        <View style={S.row}>
          {SAMPLE_MINIATURES.map(id => <View key={id} style={{ width, alignItems: 'center' }}>
            <Image source={EVENT_KEYCHAIN_IMAGES[id]!} contentFit="contain" accessibilityLabel={`${spot(id)?.miniature ?? ''}のミニチュア`} style={{ width, height: width }} />
            <Text numberOfLines={1} style={S.caption}>{spot(id)?.miniature}</Text>
          </View>)}
        </View>
        <Text style={S.tagline}>ぜんぶで{event.spots?.length ?? 0}社ぶん。歩いて集めよう。</Text>
      </View>
    </FitToHeight>
    <Button title="イベントを見る" onPress={onOpenEvent} />
  </View>;
}

/**
 * Tells the player an event is running. It opens once when the app reaches the home screen:
 * the event's picture, its name and one line about it, then a way into the event or a way out.
 */
export function EventAnnouncePopup({ visible, event, statusLabel, hideNextTime, onHideNextTimeChange, onOpenEvent, onClose, showMobbies = false, onOpenEventFromMobbies }: { /** Shows the four event Mobbies on the same paper, so going on from the announcement never closes and reopens a popup. */ showMobbies?: boolean; onOpenEventFromMobbies?: () => void; visible: boolean; event: PilgrimageEvent; /** Where the player stands in it: not joined, recruiting, walking, cleared. */ statusLabel: string; /** The box at the lower right: do not open this popup by itself at launch any more. */ hideNextTime: boolean; onHideNextTimeChange: (hide: boolean) => void; onOpenEvent: () => void; onClose: () => void }) {
  // The rewards page follows the Mobbies on the same paper; the next time the popup opens it starts from the front.
  const [showRewards, setShowRewards] = useState(false);
  useEffect(() => { if (!visible || !showMobbies) setShowRewards(false); }, [visible, showMobbies]);
  const rewardsPage = showMobbies && showRewards;
  return <ScrollPopup event visible={visible} title={rewardsPage ? '旅のごほうび' : showMobbies ? 'イベント限定のモビー' : 'イベント開催中'} subtitle={eventPeriodLabel(event)} onClose={onClose}>
    {paper => {
      if (rewardsPage) return <EventRewardsBody paper={paper} event={event} onOpenEvent={onOpenEventFromMobbies ?? onClose} />;
      if (showMobbies) return <EventMobbiesBody paper={paper} eventName={event.name} buttonTitle="次へ" onOpenEvent={() => setShowRewards(true)} />;
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
        <Button title="次へ" onPress={onOpenEvent} />
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
  rewards: { gap: 6 },
  lead: { color: C.ink, fontFamily: BRUSH, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  heading: { color: C.red, fontFamily: BRUSH, fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  caption: { color: C.ink, fontSize: 10, lineHeight: 14, textAlign: 'center', maxWidth: '100%' },
});
