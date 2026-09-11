import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { PetCharacter } from '../petCatalog';
import type { Shrine } from '../data/shrines';
import type { Pilgrimage } from '../data/pilgrimages';
import { PRAYER_ACTION_ORDER, PRAYER_ATLASES } from '../data/prayerAtlasesV2';
import rawMetrics from '../data/pilgrimageSpriteMetrics.json';
import { Button, C, SERIF, Stamp } from '../components';
import { WashiArt } from './Washi';

const PHASES = [
  { key: 'approach', frames: 18, label: '鳥居へ、とことこ' },
  { key: 'bowIn', frames: 8, label: '鳥居の前で一礼' },
  { key: 'enter', frames: 22, label: '神域へ入ります' },
  { key: 'pray', frames: 40, label: '二礼二拍手一礼' },
  { key: 'return', frames: 18, label: '鳥居へ戻ります' },
  { key: 'bowOut', frames: 8, label: '感謝をこめて一礼' },
  { key: 'leave', frames: 20, label: 'またね、とことこ' },
] as const;
const TOTAL_FRAMES = PHASES.reduce((sum, phase) => sum + phase.frames, 0);
function locate(frame: number) {
  let offset = 0;
  for (const phase of PHASES) {
    if (frame < offset + phase.frames) return { ...phase, local: frame - offset, progress: (frame - offset) / (phase.frames - 1) };
    offset += phase.frames;
  }
  return { key: 'reveal' as const, frames: 1, label: '御朱印を授かりました', local: 0, progress: 1 };
}
type Metric = { columns: number; width: number; height: number; cellWidth: number; left: number; top: number; cropWidth: number; cropHeight: number };
const metrics = rawMetrics as Record<string, Metric>;
const STAGE = require('../../assets/pilgrimage-v2/ceremony-stage.png');
const GATE = require('../../assets/pilgrimage-v2/ceremony-gate.png');

function Sprite({ source, metric, frame, size, onLoad }: { source: ImageSourcePropType; metric: Metric; frame: number; size: number; onLoad: () => void }) {
  const scale = size / metric.cropHeight;
  return <View style={{ width: metric.cropWidth * scale, height: size, overflow: 'hidden' }}>
    <Image source={source} onLoad={onLoad} contentFit="fill" transition={0} style={{ position: 'absolute', left: -(metric.cellWidth * frame + metric.left) * scale, top: -metric.top * scale, width: metric.width * scale, height: metric.height * scale }} />
  </View>;
}

export function PilgrimageAward({ shrine, pet, walkSource, demo, haptics, route, stopIndex, onClose }: { shrine: Shrine; pet: PetCharacter; walkSource?: ImageSourcePropType; demo: boolean; haptics: boolean; route?: Pilgrimage; stopIndex: number; onClose: () => void }) {
  // This is the core acquisition ceremony, so keep the authored sequence
  // visible even when the browser has prefers-reduced-motion enabled. Users
  // who want to leave early can use the explicit skip control below.
  const reduced = false;
  const [frame, setFrame] = useState(0);
  const [width, setWidth] = useState(380);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const reveal = useRef(new Animated.Value(0)).current;
  const phase = useMemo(() => locate(frame), [frame]);
  const prayer = PRAYER_ATLASES[pet.id];
  const complete = !!route && stopIndex === route.ids.length - 1;
  // Walk sheets are generated incrementally for the roster.  The ceremony
  // must still play for a character whose sheet is not available yet, using
  // the character's neutral art for the walking beats while the prayer sheet
  // keeps the authored two-rei-two-claps-one-bow motion.
  const allReady = ['stage', 'gate', 'rei', 'hakushu', ...(walkSource ? ['walk'] : [])].every(id => loaded[id]);
  const markLoaded = (id: string) => setLoaded(previous => previous[id] ? previous : { ...previous, [id]: true });
  useEffect(() => {
    if (reduced) { setFrame(TOTAL_FRAMES); return; }
    if (!allReady) return;
    const timer = setInterval(() => setFrame(value => {
      if (value >= TOTAL_FRAMES) { clearInterval(timer); return value; }
      return value + 1;
    }), 95);
    return () => clearInterval(timer);
  }, [reduced, allReady]);
  useEffect(() => {
    if (phase.key !== 'reveal') return;
    const animation = Animated.timing(reveal, { toValue: 1, duration: reduced ? 0 : 750, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true });
    animation.start();
    if (haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return () => animation.stop();
  }, [haptics, phase.key, reduced, reveal]);
  const t = phase.progress;
  // Coordinates share the 600 x 400 illustration space on every phone.
  const x = phase.key === 'approach' ? -80 + 175 * t : phase.key === 'bowIn' ? 95
    : phase.key === 'enter' ? 95 + 345 * t : phase.key === 'pray' ? 440
      : phase.key === 'return' ? 440 - 160 * t : phase.key === 'bowOut' ? 280 : 280 - 370 * t;
  const y = phase.key === 'enter' ? 340 - 35 * t : phase.key === 'pray' ? 305 : phase.key === 'return' ? 305 + 35 * t : 340;
  const k = width / 600;
  const walking = ['approach', 'enter', 'return', 'leave'].includes(phase.key);
  const prayerFrame = phase.key === 'pray' ? phase.local : phase.local % 8;
  const action = phase.key === 'pray' ? PRAYER_ACTION_ORDER[Math.floor(prayerFrame / 8)] : 'rei';
  const facingLeft = phase.key === 'return' || phase.key === 'leave';
  const showAward = phase.key === 'reveal';
  const sprites = [
    { id: 'walk', source: walkSource, frame: phase.local % 4, visible: walking },
    { id: 'rei', source: prayer?.rei, frame: prayerFrame % 8, visible: !walking && action === 'rei' },
    { id: 'hakushu', source: prayer?.hakushu, frame: prayerFrame % 8, visible: !walking && action === 'hakushu' },
  ];
  return <ScrollView style={S.page} contentContainerStyle={S.content}>
    <Text style={S.eyebrow}>{demo ? '体験の巡礼' : route?.name ?? '今日の巡礼'}</Text>
    <Text accessibilityRole="header" style={S.title}>{showAward ? complete ? '巡礼、結願。' : '新しい御朱印を授かりました' : allReady ? phase.label : '参道の支度をしています'}</Text>
    <View style={[S.stage, { height: width * 2 / 3 }]} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={pet.name + 'が' + phase.label}>
      <Image source={STAGE} contentFit="fill" style={StyleSheet.absoluteFillObject} onLoad={() => markLoaded('stage')} />
      <View style={{ position: 'absolute', left: 0, top: 0, width: 600, height: 400, transformOrigin: 'top left', transform: [{ scale: k }] }}>
        <Image source={GATE} onLoad={() => markLoaded('gate')} contentFit="contain" style={{ position: 'absolute', left: 126, bottom: 42, width: 154, height: 194, zIndex: 3 }} />
        {!showAward && <View style={{ position: 'absolute', left: x - 70, top: y - 140, width: 140, height: 140, zIndex: 2, transform: [{ scaleX: facingLeft ? -1 : 1 }] }}>
          {sprites.map(sprite => {
            const metric = metrics[pet.id + '/' + sprite.id];
            if (sprite.source && metric) return <View key={sprite.id} style={{ position: 'absolute', bottom: 0, alignSelf: 'center', opacity: sprite.visible ? 1 : 0 }}><Sprite source={sprite.source} metric={metric} frame={sprite.frame} size={140} onLoad={() => markLoaded(sprite.id)} /></View>;
            if (sprite.id === 'walk') return <Image key={sprite.id} source={pet.image} contentFit="contain" onLoad={() => markLoaded('walk')} style={{ position: 'absolute', bottom: 0, alignSelf: 'center', width: 140, height: 140, opacity: sprite.visible ? 1 : 0 }} />;
            return null;
          })}
        </View>}
      </View>
    </View>
    {!showAward && <><View style={S.phaseTrack}>{PHASES.map(p => <View key={p.key} style={[S.phaseDot, { backgroundColor: phase.key === p.key ? '#D4B387' : '#685C49' }]} />)}</View><Button title="演出を省略して御朱印をみる" secondary onPress={() => setFrame(TOTAL_FRAMES)} style={S.skip} /></>}
    {showAward && <>
      <Animated.View style={[S.reward, { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [.88, 1] }) }] }]}><WashiArt /><Stamp shrine={shrine} style={{ width: 145 }} /><View style={S.seal}><Text style={S.sealText}>{complete ? '結願' : '結縁'}</Text></View></Animated.View>
      <Text style={S.name}>{shrine.name}</Text><Text style={S.theme}>{route?.chapters[stopIndex] ?? shrine.theme}</Text>
      {complete && <View style={S.completion}><WashiArt /><Text style={S.completionTitle}>{route!.gift}</Text><Text style={S.completionText}>「{route!.title}」</Text><Text style={S.completionText}>旅の証を、御朱印帳に綴りました。</Text></View>}
      <Button title="御朱印帳にしまう" onPress={onClose} style={{ width: '100%', maxWidth: 350 }} />
    </>}
  </ScrollView>;
}
const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25' }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 40, gap: 15 },
  eyebrow: { color: '#D5BD98', fontSize: 11, letterSpacing: 2 }, title: { color: '#FFF8E9', fontFamily: SERIF, fontSize: 23, textAlign: 'center', minHeight: 32 }, stage: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 14, backgroundColor: '#D9CAB2' },
  phaseTrack: { flexDirection: 'row', gap: 9, padding: 7 }, phaseDot: { height: 4, width: 18, borderRadius: 2 }, skip: { backgroundColor: '#FFF5E8', maxWidth: 350, minHeight: 44 }, reward: { alignItems: 'center', padding: 13, borderRadius: 10, backgroundColor: '#FFF8E9', overflow: 'hidden' }, seal: { position: 'absolute', right: 4, bottom: 9, borderWidth: 3, borderColor: C.red, padding: 6, transform: [{ rotate: '-10deg' }], backgroundColor: '#FFF6E8DD' }, sealText: { color: C.red, fontFamily: SERIF, fontSize: 19 },
  name: { color: '#FFF5E2', fontFamily: SERIF, fontSize: 21, textAlign: 'center' }, theme: { color: '#E6D8C5', fontSize: 12, lineHeight: 22, textAlign: 'center' }, completion: { padding: 18, borderRadius: 12, backgroundColor: '#FAF1DF', alignItems: 'center', overflow: 'hidden', width: '100%', maxWidth: 350, gap: 8 }, completionTitle: { fontFamily: SERIF, fontSize: 20, color: C.red }, completionText: { fontSize: 12, color: C.ink },
});
