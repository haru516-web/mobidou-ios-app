import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image as RNImage, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from './AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { PetCharacter } from '../petCatalog';
import type { Shrine } from '../data/shrines';
import type { Pilgrimage } from '../data/pilgrimages';
import { PRAYER_ACTION_ORDER, PRAYER_ATLASES } from '../data/prayerAtlasesV2';
import rawMetrics from '../data/pilgrimageSpriteMetrics.json';
import { BRUSH, Button, C, SERIF, useReducedMotion } from '../components';
import { WashiArt } from './Washi';
import { FitToHeight } from './PagedBody';
import { STAMP_IMAGES } from '../data/shrines';
import { AwardFx, BURST_AT } from './AwardFx';
import { InkReveal } from './InkReveal';
import type { SpecialCollection } from '../services/specialRewards';

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
const STAGE = require('../../assets/ui-round3/pilgrimage/ceremony-stage.webp');
const GATE = require('../../assets/ui-round3/pilgrimage/ceremony-gate.webp');

function Sprite({ source, metric, frame, size, onLoad }: { source: ImageSourcePropType; metric: Metric; frame: number; size: number; onLoad: () => void }) {
  const scale = size / metric.cropHeight;
  // Stable callback: the core Image restarts loading whenever onLoad changes.
  const loadRef = React.useRef(onLoad);
  loadRef.current = onLoad;
  const handleLoad = React.useCallback(() => loadRef.current(), []);
  return <View style={{ width: metric.cropWidth * scale, height: size, overflow: 'hidden' }}>
    <RNImage source={source} onLoad={handleLoad} resizeMode="stretch" style={{ position: 'absolute', left: -(metric.cellWidth * frame + metric.left) * scale, top: -metric.top * scale, width: metric.width * scale, height: metric.height * scale }} />
  </View>;
}

export function PilgrimageAward({ shrine, pet, walkSource, demo, haptics, route, stopIndex, special, goshuinOwned = false, onArrive, onRedeemKeychainTicket, onClose }: { shrine: Shrine; pet: PetCharacter; walkSource?: ImageSourcePropType; demo: boolean; haptics: boolean; route?: Pilgrimage; stopIndex: number; special: SpecialCollection; goshuinOwned?: boolean; onArrive: (shrineId: string) => void; onRedeemKeychainTicket: (shrineId: string) => void; onClose: () => void }) {
  // This is the core acquisition ceremony, so keep the authored sequence
  // visible even when the browser has prefers-reduced-motion enabled. Users
  // who want to leave early can use the explicit skip control below.
  const reduced = false;
  // A goshuin the player already holds gets a short visit: skip the walk and go straight to the reveal.
  const [frame, setFrame] = useState(goshuinOwned ? TOTAL_FRAMES : 0);
  const [width, setWidth] = useState(380);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [revealDone, setRevealDone] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  const paint = useRef(new Animated.Value(0)).current;
  const revealHapticSent = useRef(false);
  const phase = useMemo(() => locate(frame), [frame]);
  const prayer = PRAYER_ATLASES[pet.id];
  // The clear reward belongs to the first finish only; a later lap is just a visit.
  const complete = !!route && stopIndex === route.ids.length - 1 && !goshuinOwned;
  // Keep the authored ceremony playback unchanged. Reduce Motion is scoped
  // to the post-prayer reveal layer below so it never changes a prayer frame.
  const revealReducedMotion = useReducedMotion();
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
    reveal.setValue(0);
    paint.setValue(0);
    const painting = Animated.timing(paint, { toValue: 1, duration: 1800, delay: BURST_AT - 50, easing: Easing.inOut(Easing.quad), useNativeDriver: false });
    painting.start();
    setRevealDone(false);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: revealReducedMotion ? 0 : 3800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (revealReducedMotion) setRevealDone(true);
    animation.start(({ finished }) => { if (finished) setRevealDone(true); });
    return () => { animation.stop(); painting.stop(); };
  }, [phase.key, reveal, paint, revealReducedMotion]);
  useEffect(() => {
    if (phase.key !== 'reveal') return;
    const timer = setTimeout(() => {
      if (haptics && !revealHapticSent.current) {
        revealHapticSent.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, revealReducedMotion ? 0 : BURST_AT);
    return () => clearTimeout(timer);
  }, [haptics, phase.key, revealReducedMotion]);
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
  // The keychain is rolled once when this ceremony opens (never again for the same visit).
  useEffect(() => { onArrive(shrine.id); }, [onArrive, shrine.id]);
  const arrival = special.arrival?.shrineId === shrine.id ? special.arrival : null;
  const ticketCount = special.passes.keychainDrop;
  const canUseTicket = revealDone && arrival?.outcome === 'missed' && ticketCount > 0;
  const keychainStatus = arrival?.outcome === 'owned' ? 'もう持ってるよ' : arrival?.outcome === 'won' ? '獲得しました' : arrival?.outcome === 'ticket' ? '券で獲得しました' : 'ドロップなし';
  const keychainInstruction = arrival?.outcome === 'owned' ? 'このミニチュアは、もう持っています。' : arrival?.outcome === 'won' ? 'ミニチュアキーホルダーを授かりました。' : arrival?.outcome === 'ticket' ? '交換券を使って授かりました。' : ticketCount > 0 ? '外れました。この場で交換券を使って受け取れます。' : '今回はご縁がありませんでした。次の参拝でまた挑戦できます。';
  const useTicket = () => { if (canUseTicket) onRedeemKeychainTicket(shrine.id); };
  const rewardCardOpacity = reveal.interpolate({ inputRange: [0, .03, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
  const sealOpacity = paint.interpolate({ inputRange: [0, .94, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const copyOpacity = reveal.interpolate({ inputRange: [0, .66, .78, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const copyLift = reveal.interpolate({ inputRange: [0, .66, .8, 1], outputRange: [10, 10, 0, 0], extrapolate: 'clamp' });
  const guaranteeOpacity = reveal.interpolate({ inputRange: [0, .7, .82, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const guaranteeLift = reveal.interpolate({ inputRange: [0, .7, .84, 1], outputRange: [8, 8, 0, 0], extrapolate: 'clamp' });
  const specialOpacity = reveal.interpolate({ inputRange: [0, .78, .92, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const specialLift = reveal.interpolate({ inputRange: [0, .78, .94, 1], outputRange: [12, 12, 0, 0], extrapolate: 'clamp' });
  const sprites = [
    { id: 'walk', source: walkSource, frame: phase.local % 4, visible: walking },
    { id: 'rei', source: prayer?.rei, frame: prayerFrame % 8, visible: !walking && action === 'rei' },
    { id: 'hakushu', source: prayer?.hakushu, frame: prayerFrame % 8, visible: !walking && action === 'hakushu' },
  ];
  return <SafeAreaView style={S.page}><FitToHeight key={showAward ? 'award' : 'walk'} style={S.fit}><View style={S.content}>
    <Text style={S.eyebrow}>{demo ? '体験の巡礼' : route?.name ?? '今日の巡礼'}</Text>
    <Text accessibilityRole="header" style={S.title}>{showAward ? complete ? '巡礼、結願。' : goshuinOwned ? '再びのご参拝です' : '新しい御朱印を授かりました' : allReady ? phase.label : '参道の支度をしています'}</Text>
    <View style={[S.stage, { height: width * 2 / 3 }, showAward && S.stageHidden]} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityLabel={pet.name + 'が' + phase.label}>
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
      <View style={S.rewardScene}>
        <AwardFx />
        <Animated.View style={[S.reward, { opacity: rewardCardOpacity, }]}>
          <View style={S.stampFrame}>
            <InkReveal source={STAMP_IMAGES[shrine.id]} progress={paint} />
          </View>
          <Animated.View style={[S.seal, { opacity: sealOpacity, transform: [{ rotate: '-10deg' }] }]}><Text style={S.sealText}>{complete ? '結願' : '結縁'}</Text></Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[S.copyGroup, { opacity: copyOpacity, transform: [{ translateY: copyLift }] }]}><Text style={S.name}>{shrine.name}</Text><Text style={S.theme}>{route?.chapters[stopIndex] ?? shrine.theme}</Text></Animated.View>
      <Animated.View style={[S.guaranteeBadge, { opacity: guaranteeOpacity, transform: [{ translateY: guaranteeLift }] }]}><Text style={S.guaranteeText}>{goshuinOwned ? 'この御朱印は、もう持っています' : '御朱印は100%授与'}</Text></Animated.View>
      <Animated.View style={[S.specialCard, { opacity: specialOpacity, transform: [{ translateY: specialLift }] }]}>
        <WashiArt />
        <Text style={S.specialEyebrow}>{arrival ? `特別なご縁 · ドロップ率 ${Math.round(arrival.rate * 100)}%` : '特別なご縁'}</Text>
        <Text style={S.specialTitle}>今回のドロップ</Text>
        {arrival ? <View style={S.specialRows}>
          <View style={S.specialRow}><Text style={S.specialLabel}>ミニチュアキーホルダー</Text><Text style={[S.specialStatus, (arrival.outcome === 'won' || arrival.outcome === 'ticket') && S.specialWon]}>{keychainStatus}</Text></View>
        </View> : <Text style={S.specialWaiting}>ドロップ結果を確認しています…</Text>}
        {arrival && <Text style={S.specialInstruction}>{keychainInstruction}</Text>}
        <Text style={S.passOwned}>交換券 {ticketCount}枚</Text>
        {canUseTicket && <View style={S.exchangeActions}><Button title="券を使って受け取る" secondary onPress={useTicket} style={S.specialButton} /></View>}
      </Animated.View>
      {complete && <View style={S.completion}><WashiArt /><Text style={S.completionTitle}>{route!.gift}</Text><Text style={S.completionText}>「{route!.title}」</Text><Text style={S.completionText}>旅の証を、御朱印帳に綴りました。</Text>{!demo && <Text style={S.completionText}>ガチャを1回、無料で引けます。</Text>}</View>}
    </>}
  </View></FitToHeight>
  {/* Outside the scaled area, so it keeps its size and stays tappable however tall the content is. */}
  {/* Always present, so the room left for the scaled content does not change when the button appears. */}
  <View style={S.closeBar}>{showAward && <Button title={revealDone ? '御朱印帳にしまう' : 'ご縁を結んでいます…'} disabled={!revealDone || !arrival} onPress={onClose} style={{ width: '100%', maxWidth: 350 }} />}</View>
  </SafeAreaView>;
}
const S = StyleSheet.create({
  stageHidden: { display: 'none' },
  fit: { flex: 1 }, closeBar: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, minHeight: 76 },
  page: { flex: 1, backgroundColor: '#302D25' }, content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 24, gap: 15 },
  eyebrow: { color: '#D5BD98', fontSize: 11, letterSpacing: 2 }, title: { color: '#FFF8E9', fontFamily: BRUSH, fontSize: 23, textAlign: 'center', minHeight: 32 }, stage: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 14, backgroundColor: '#D9CAB2' },
  phaseTrack: { flexDirection: 'row', gap: 9, padding: 7 }, phaseDot: { height: 4, width: 18, borderRadius: 2 }, skip: { backgroundColor: '#FFF5E8', maxWidth: 350, minHeight: 44 }, rewardScene: { width: '100%', maxWidth: 350, minHeight: 420, alignItems: 'center', justifyContent: 'center', position: 'relative' }, particle: { position: 'absolute', left: '50%', top: '50%', width: 30, height: 30, marginLeft: -15, marginTop: -15, textAlign: 'center', fontWeight: '700' }, reward: { width: 264, alignItems: 'center', zIndex: 2 }, rewardRays: { position: 'absolute', pointerEvents: 'none', width: 340, height: 340 }, shineClip: { position: 'absolute', width: 212, aspectRatio: 2 / 3, overflow: 'hidden', borderRadius: 5 }, shine: { position: 'absolute', top: -60, bottom: -60, left: '50%', width: 46, marginLeft: -23, backgroundColor: '#FFF4D2AA' }, stampFrame: { width: 264, height: 340, alignItems: 'center', justifyContent: 'center' }, inkRing: { position: 'absolute', alignSelf: 'center', top: 44, width: 250, height: 250, borderRadius: 125, borderWidth: 2, borderColor: C.red }, seal: { position: 'absolute', right: 4, bottom: 9, borderWidth: 3, borderColor: C.red, padding: 6, transform: [{ rotate: '-10deg' }], backgroundColor: '#FFF6E8DD' }, sealText: { color: C.red, fontFamily: BRUSH, fontSize: 19 }, copyGroup: { alignItems: 'center', gap: 2 }, name: { color: '#FFF5E2', fontFamily: BRUSH, fontSize: 21, textAlign: 'center' }, theme: { color: '#E6D8C5', fontSize: 12, lineHeight: 22, textAlign: 'center' }, guaranteeBadge: { borderWidth: 1, borderColor: '#C69B72', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 5, backgroundColor: '#5C493B', marginTop: 2 }, guaranteeText: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 11, letterSpacing: 1 }, completion: { paddingVertical: 26, paddingHorizontal: 24, alignItems: 'center', overflow: 'hidden', width: '100%', maxWidth: 350, gap: 8 }, completionTitle: { fontFamily: BRUSH, fontSize: 24, letterSpacing: 2, color: C.red }, completionText: { fontFamily: SERIF, fontSize: 13, lineHeight: 21, letterSpacing: .6, color: C.ink, textAlign: 'center' },
  specialCard: { width: '100%', maxWidth: 350, paddingVertical: 24, paddingHorizontal: 26, overflow: 'hidden' }, specialEyebrow: { color: '#9a6851', fontFamily: SERIF, fontSize: 11, letterSpacing: 1.4, textAlign: 'center' }, specialTitle: { color: C.ink, fontFamily: BRUSH, fontSize: 22, letterSpacing: 2, marginTop: 4, marginBottom: 12, textAlign: 'center' }, specialRows: { gap: 7 }, specialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, specialLabel: { color: '#5f503e', fontFamily: SERIF, fontSize: 13, flex: 1 }, specialStatus: { color: '#8a7e6e', fontFamily: SERIF, fontSize: 13 }, specialWon: { color: '#a24c3e', fontFamily: SERIF }, specialWaiting: { color: '#806f5b', fontFamily: SERIF, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingVertical: 5 }, specialInstruction: { color: '#6f5f4b', fontFamily: SERIF, fontSize: 12, lineHeight: 19, marginTop: 7, textAlign: 'center' }, passOwned: { color: '#776957', fontFamily: SERIF, fontSize: 11, lineHeight: 15, marginTop: 11, textAlign: 'center' }, exchangeActions: { gap: 7, marginTop: 10 }, specialButton: { minHeight: 42 }, noPass: { color: '#806f5b', fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: 'center' }, purchaseActions: { gap: 6, marginTop: 8 }, purchaseButton: { minHeight: 40 }, fakePurchase: { color: '#998a76', fontSize: 11, textAlign: 'center', marginTop: 7 },
});
