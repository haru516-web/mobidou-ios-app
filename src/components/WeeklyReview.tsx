import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SerialModal as Modal } from './SerialModal';
import { Image } from './AppImage';
import { BRUSH, Button, C } from '../components';
import type { WeekSummary } from '../services/weekly';

const fmt = (value: number) => value.toLocaleString('ja-JP');
const monthDay = (day: string) => { const [, month, date] = day.split('-').map(Number); return `${month}/${date}`; };
const lead = (days: number) => days >= 5 ? 'よく歩いた一週間' : days >= 2 ? 'ほどよい歩みの一週間' : '一歩ずつで大丈夫';

/** Once-a-week look back at the week that just ended. Fits one screen, no scrolling. */
export function WeeklyReview({ visible, summary, petName, petImage, places, onClose }: { visible: boolean; summary: WeekSummary; petName: string; petImage: React.ComponentProps<typeof Image>['source']; places: string[]; onClose: () => void }) {
  const shown = places.slice(0, 3);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.backdrop}>
      <View accessibilityViewIsModal style={S.card}>
        <Text style={S.eyebrow}>先週のふりかえり　{monthDay(summary.start)}〜{monthDay(summary.end)}</Text>
        <Image accessible={false} source={petImage} contentFit="contain" style={S.pet} />
        <Text style={S.title}>{lead(summary.walkedDays)}</Text>
        <View style={S.stats}>
          <View style={S.stat}><Text style={S.value}>{fmt(summary.totalSteps)}</Text><Text style={S.label}>歩</Text></View>
          <View style={S.stat}><Text style={S.value}>{summary.walkedDays}</Text><Text style={S.label}>日 歩いた</Text></View>
          {summary.bestDay && <View style={S.stat}><Text style={S.value}>{fmt(summary.bestDay.steps)}</Text><Text style={S.label}>{monthDay(summary.bestDay.day)} いちばん</Text></View>}
        </View>
        <Text style={S.places}>{shown.length ? `訪れた社　${shown.join('・')}${places.length > shown.length ? ` ほか${places.length - shown.length}か所` : ''}` : `${petName}と、のんびり歩いた週でした。`}</Text>
        <Button title="今週もいっしょに歩く" onPress={onClose} />
      </View>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#2A1D14B8', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 18, backgroundColor: '#FFF9EF', borderWidth: 1, borderColor: '#C7A98A', paddingVertical: 20, paddingHorizontal: 18, alignItems: 'center', gap: 10 },
  eyebrow: { color: C.muted, fontSize: 12, letterSpacing: .5 },
  pet: { width: 96, height: 96 },
  title: { color: C.red, fontFamily: BRUSH, fontSize: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  value: { color: C.ink, fontSize: 22 },
  label: { color: C.muted, fontSize: 11 },
  places: { color: '#4E4034', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 4 },
});
