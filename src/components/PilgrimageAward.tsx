import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { PetCharacter } from '../petCatalog';
import type { Shrine } from '../data/shrines';
import type { Pilgrimage } from '../data/pilgrimages';
import { PRAYER_ACTION_ORDER, PRAYER_ATLASES } from '../data/prayerAtlasesV2';
import rawMetrics from '../data/pilgrimageSpriteMetrics.json';
import { Button, C, SERIF, Stamp, useReducedMotion } from '../components';
import { WashiArt } from './Washi';
import { KEYCHAIN_DROP_RATE, type SpecialCollection } from '../services/specialRewards';

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
const REVEAL_PARTICLES = [
  { glyph: '✦', angle: -92, distance: 122, size: 18, color: '#D7B77F', delay: .12 },
  { glyph: '✧', angle: -56, distance: 108, size: 16, color: '#C98E72', delay: .18 },
  { glyph: '❀', angle: -28, distance: 126, size: 17, color: '#D8A6A0', delay: .23 },
  { glyph: '·', angle: 4, distance: 118, size: 25, color: '#E1C78F', delay: .2 },
  { glyph: '✦', angle: 38, distance: 132, size: 16, color: '#C98E72', delay: .28 },
  { glyph: '✧', angle: 74, distance: 112, size: 18, color: '#D7B77F', delay: .16 },
  { glyph: '❀', angle: 108, distance: 128, size: 17, color: '#D8A6A0', delay: .25 },
  { glyph: '·', angle: 143, distance: 116, size: 25, color: '#E1C78F', delay: .3 },
  { glyph: '✦', angle: 176, distance: 126, size: 17, color: '#D7B77F', delay: .21 },
  { glyph: '✧', angle: 214, distance: 112, size: 16, color: '#C98E72', delay: .27 },
  { glyph: '❀', angle: 250, distance: 124, size: 17, color: '#D8A6A0', delay: .15 },
  { glyph: '✦', angle: 286, distance: 108, size: 16, color: '#E1C78F', delay: .24 },
] as const;

function Sprite({ source, metric, frame, size, onLoad }: { source: ImageSourcePropType; metric: Metric; frame: number; size: number; onLoad: () => void }) {
  const scale = size / metric.cropHeight;
  return <View style={{ width: metric.cropWidth * scale, height: size, overflow: 'hidden' }}>
    <Image source={source} onLoad={onLoad} contentFit="fill" transition={0} style={{ position: 'absolute', left: -(metric.cellWidth * frame + metric.left) * scale, top: -metric.top * scale, width: metric.width * scale, height: metric.height * scale }} />
  </View>;
}

export function PilgrimageAward({ shrine, pet, walkSource, demo, haptics, route, stopIndex, special, onRedeemKeychainDrop, onDeclineKeychainDrop, onClose }: { shrine: Shrine; pet: PetCharacter; walkSource?: ImageSourcePropType; demo: boolean; haptics: boolean; route?: Pilgrimage; stopIndex: number; special: SpecialCollection; onRedeemKeychainDrop: (shrineId: string) => void; onDeclineKeychainDrop: (shrineId: string) => void; onClose: () => void }) {
  // This is the core acquisition ceremony, so keep the authored sequence
  // visible even when the browser has prefers-reduced-motion enabled. Users
  // who want to leave early can use the explicit skip control below.
  const reduced = false;
  const [frame, setFrame] = useState(0);
  const [width, setWidth] = useState(380);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [revealDone, setRevealDone] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;
  const revealHapticSent = useRef(false);
  const phase = useMemo(() => locate(frame), [frame]);
  const prayer = PRAYER_ATLASES[pet.id];
  const complete = !!route && stopIndex === route.ids.length - 1;
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
    setRevealDone(false);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: revealReducedMotion ? 0 : 1700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    if (revealReducedMotion) setRevealDone(true);
    animation.start(({ finished }) => { if (finished) setRevealDone(true); });
    return () => animation.stop();
  }, [phase.key, reveal, revealReducedMotion]);
  useEffect(() => {
    if (phase.key !== 'reveal') return;
    const timer = setTimeout(() => {
      if (haptics && !revealHapticSent.current) {
        revealHapticSent.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, revealReducedMotion ? 0 : 520);
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
  const specialResult = special.rolls[shrine.id];
  const keychainDecision = special.keychainDecisions[shrine.id] ?? (specialResult?.keychain ? 'natural' : 'pending');
  const keychainTicketAvailable = special.passes.keychainDrop > 0;
  const keychainPending = !!specialResult && !specialResult.keychain && keychainDecision === 'pending';
  const keychainDecisionRequired = keychainPending && keychainTicketAvailable;
  useEffect(() => {
    if (!keychainPending) setDecisionBusy(false);
  }, [keychainPending]);
  const redeemKeychain = () => {
    if (!revealDone || !keychainDecisionRequired || decisionBusy) return;
    setDecisionBusy(true);
    onRedeemKeychainDrop(shrine.id);
  };
  const declineKeychain = () => {
    if (!revealDone || !keychainPending || decisionBusy) return;
    setDecisionBusy(true);
    onDeclineKeychainDrop(shrine.id);
  };
  const rewardCardOpacity = reveal.interpolate({ inputRange: [0, .12, .35, 1], outputRange: [0, .25, 1, 1], extrapolate: 'clamp' });
  const rewardCardLift = reveal.interpolate({ inputRange: [0, .24, .55, 1], outputRange: [42, 18, 0, 0], extrapolate: 'clamp' });
  const rewardCardScale = reveal.interpolate({ inputRange: [0, .24, .46, .62, 1], outputRange: [.88, .95, 1.035, 1, 1], extrapolate: 'clamp' });
  const rewardCardRotate = reveal.interpolate({ inputRange: [0, .24, .55, 1], outputRange: ['-3deg', '-1deg', '0deg', '0deg'], extrapolate: 'clamp' });
  const stampOpacity = reveal.interpolate({ inputRange: [0, .22, .38, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const stampScale = reveal.interpolate({ inputRange: [0, .28, .42, .52, 1], outputRange: [.72, .72, 1.1, .98, 1], extrapolate: 'clamp' });
  const inkRingOpacity = reveal.interpolate({ inputRange: [0, .28, .42, .62, 1], outputRange: [0, 0, .85, .24, 0], extrapolate: 'clamp' });
  const inkRingScale = reveal.interpolate({ inputRange: [0, .28, .48, 1], outputRange: [.45, .68, 1.04, 1.32], extrapolate: 'clamp' });
  const haloOpacity = reveal.interpolate({ inputRange: [0, .16, .42, .8, 1], outputRange: [0, .55, .4, .14, .06], extrapolate: 'clamp' });
  const haloScale = reveal.interpolate({ inputRange: [0, .24, .62, 1], outputRange: [.7, 1.02, 1.12, 1.22], extrapolate: 'clamp' });
  const sealOpacity = reveal.interpolate({ inputRange: [0, .52, .7, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const sealScale = reveal.interpolate({ inputRange: [0, .5, .66, .78, 1], outputRange: [.7, .7, 1.14, .98, 1], extrapolate: 'clamp' });
  const copyOpacity = reveal.interpolate({ inputRange: [0, .48, .66, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const copyLift = reveal.interpolate({ inputRange: [0, .48, .68, 1], outputRange: [10, 10, 0, 0], extrapolate: 'clamp' });
  const guaranteeOpacity = reveal.interpolate({ inputRange: [0, .56, .72, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const guaranteeLift = reveal.interpolate({ inputRange: [0, .56, .74, 1], outputRange: [8, 8, 0, 0], extrapolate: 'clamp' });
  const specialOpacity = reveal.interpolate({ inputRange: [0, .68, .86, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  const specialLift = reveal.interpolate({ inputRange: [0, .68, .88, 1], outputRange: [12, 12, 0, 0], extrapolate: 'clamp' });
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
      <View style={S.rewardScene}>
        <Animated.View pointerEvents="none" style={[S.rewardHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
        {!revealReducedMotion && REVEAL_PARTICLES.map((particle, index) => {
          const end = Math.min(1, particle.delay + .36);
          const travel = reveal.interpolate({ inputRange: [0, particle.delay, end, 1], outputRange: [0, 0, particle.distance, particle.distance], extrapolate: 'clamp' });
          const opacity = reveal.interpolate({ inputRange: [0, particle.delay, Math.min(1, particle.delay + .08), end, 1], outputRange: [0, 0, 1, 0, 0], extrapolate: 'clamp' });
          const xParticle = travel.interpolate({ inputRange: [0, particle.distance], outputRange: [0, Math.cos(particle.angle * Math.PI / 180) * particle.distance], extrapolate: 'clamp' });
          const yParticle = travel.interpolate({ inputRange: [0, particle.distance], outputRange: [0, Math.sin(particle.angle * Math.PI / 180) * particle.distance], extrapolate: 'clamp' });
          return <Animated.Text key={`${particle.glyph}-${index}`} pointerEvents="none" style={[S.particle, { color: particle.color, fontSize: particle.size, opacity, transform: [{ translateX: xParticle }, { translateY: yParticle }, { rotate: `${particle.angle + 24}deg` }] }]}>{particle.glyph}</Animated.Text>;
        })}
        <Animated.View style={[S.reward, { opacity: rewardCardOpacity, transform: [{ translateY: rewardCardLift }, { scale: rewardCardScale }, { rotate: rewardCardRotate }] }]}>
          <WashiArt />
          <View style={S.stampFrame}>
            <Animated.View style={{ opacity: stampOpacity, transform: [{ scale: stampScale }] }}><Stamp shrine={shrine} style={{ width: 145 }} /></Animated.View>
            <Animated.View pointerEvents="none" style={[S.inkRing, { opacity: inkRingOpacity, transform: [{ scale: inkRingScale }] }]} />
          </View>
          <Animated.View style={[S.seal, { opacity: sealOpacity, transform: [{ rotate: '-10deg' }, { scale: sealScale }] }]}><Text style={S.sealText}>{complete ? '結願' : '結縁'}</Text></Animated.View>
        </Animated.View>
      </View>
      <Animated.View style={[S.copyGroup, { opacity: copyOpacity, transform: [{ translateY: copyLift }] }]}><Text style={S.name}>{shrine.name}</Text><Text style={S.theme}>{route?.chapters[stopIndex] ?? shrine.theme}</Text></Animated.View>
      <Animated.View style={[S.guaranteeBadge, { opacity: guaranteeOpacity, transform: [{ translateY: guaranteeLift }] }]}><Text style={S.guaranteeText}>御朱印は100%授与</Text></Animated.View>
      <Animated.View style={[S.specialCard, { opacity: specialOpacity, transform: [{ translateY: specialLift }] }]}><WashiArt />
        <Text style={S.specialEyebrow}>特別なご縁 · 自然ドロップ {Math.round(KEYCHAIN_DROP_RATE * 100)}%</Text>
        <Text style={S.specialTitle}>今回のドロップ</Text>
        {specialResult ? <View style={S.specialRows}>
          <View style={S.specialRow}><Text style={S.specialLabel}>ミニチュアキーホルダー</Text><Text style={[S.specialStatus, specialResult.keychain && S.specialWon]}>{specialResult.keychain ? `自然に獲得 ×${special.keychains[shrine.id] ?? 0}` : keychainDecision === 'ticket' ? `券で獲得 ×${special.keychains[shrine.id] ?? 0}` : keychainDecision === 'declined' ? '今回は見送り' : 'ドロップなし'}</Text></View>
          <View style={S.specialRow}><Text style={S.specialLabel}>キラキラ御朱印</Text><Text style={[S.specialStatus, specialResult.sparkle && S.specialWon]}>{specialResult.sparkle ? `獲得 ×${special.sparkles[shrine.id] ?? 0}` : 'ドロップなし'}</Text></View>
        </View> : <Text style={S.specialWaiting}>ドロップ結果を確認しています…</Text>}
        <Text style={S.specialInstruction}>{keychainPending ? (keychainTicketAvailable ? '結果を確認しました。パスを使うか、今回は見送るかを選べます。' : '結果を確認しました。キーホルダードロップ券はありません。') : '御朱印とドロップ結果を記録しました。'}</Text>
        <Text style={S.passOwned}>所持パス：表紙 {special.passes.coverChange}枚 · キーホルダー {special.passes.keychainDrop}枚</Text>
        {specialResult && revealDone && keychainPending && <View style={S.exchangeActions}>
          {keychainTicketAvailable && <Button title="券を使って確実に受け取る" secondary disabled={decisionBusy} onPress={redeemKeychain} style={S.specialButton} />}
          <Button title="今回は使わない" secondary disabled={decisionBusy} onPress={declineKeychain} style={S.specialButton} />
        </View>}
        {specialResult && revealDone && !specialResult.keychain && !keychainPending && keychainDecision !== 'ticket' && <Text style={S.noPass}>{keychainDecision === 'declined' ? '今回はパスを使わず、次の旅へ進みます。' : 'キーホルダードロップ券がないため、今回は受け取れません。'}</Text>}
      </Animated.View>
      {complete && <View style={S.completion}><WashiArt /><Text style={S.completionTitle}>{route!.gift}</Text><Text style={S.completionText}>「{route!.title}」</Text><Text style={S.completionText}>旅の証を、御朱印帳に綴りました。</Text></View>}
      <Button title={keychainDecisionRequired ? 'パスの使い道を選んでください' : revealDone ? '御朱印帳にしまう' : 'ご縁を結んでいます…'} disabled={!revealDone || keychainDecisionRequired || decisionBusy} onPress={onClose} style={{ width: '100%', maxWidth: 350 }} />
    </>}
  </ScrollView>;
}
const S = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#302D25' }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 40, gap: 15 },
  eyebrow: { color: '#D5BD98', fontSize: 11, letterSpacing: 2 }, title: { color: '#FFF8E9', fontFamily: SERIF, fontSize: 23, textAlign: 'center', minHeight: 32 }, stage: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 14, backgroundColor: '#D9CAB2' },
  phaseTrack: { flexDirection: 'row', gap: 9, padding: 7 }, phaseDot: { height: 4, width: 18, borderRadius: 2 }, skip: { backgroundColor: '#FFF5E8', maxWidth: 350, minHeight: 44 }, rewardScene: { width: '100%', maxWidth: 350, minHeight: 292, alignItems: 'center', justifyContent: 'center', position: 'relative' }, rewardHalo: { position: 'absolute', width: 254, height: 254, borderRadius: 127, borderWidth: 1.5, borderColor: '#D8B98A', backgroundColor: '#D8B98A18' }, particle: { position: 'absolute', left: '50%', top: '50%', width: 30, height: 30, marginLeft: -15, marginTop: -15, textAlign: 'center', fontWeight: '700' }, reward: { width: 204, alignItems: 'center', padding: 13, borderRadius: 10, backgroundColor: '#FFF8E9', overflow: 'hidden', zIndex: 2, shadowColor: '#17130F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: .22, shadowRadius: 16, elevation: 8 }, stampFrame: { width: 180, height: 232, alignItems: 'center', justifyContent: 'center' }, inkRing: { position: 'absolute', alignSelf: 'center', top: 31, width: 170, height: 170, borderRadius: 85, borderWidth: 2, borderColor: C.red }, seal: { position: 'absolute', right: 4, bottom: 9, borderWidth: 3, borderColor: C.red, padding: 6, transform: [{ rotate: '-10deg' }], backgroundColor: '#FFF6E8DD' }, sealText: { color: C.red, fontFamily: SERIF, fontSize: 19 }, copyGroup: { alignItems: 'center', gap: 2 }, name: { color: '#FFF5E2', fontFamily: SERIF, fontSize: 21, textAlign: 'center' }, theme: { color: '#E6D8C5', fontSize: 12, lineHeight: 22, textAlign: 'center' }, guaranteeBadge: { borderWidth: 1, borderColor: '#C69B72', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 5, backgroundColor: '#5C493B', marginTop: 2 }, guaranteeText: { color: '#F6D9A3', fontFamily: SERIF, fontSize: 11, letterSpacing: 1 }, completion: { padding: 18, borderRadius: 12, backgroundColor: '#FAF1DF', alignItems: 'center', overflow: 'hidden', width: '100%', maxWidth: 350, gap: 8 }, completionTitle: { fontFamily: SERIF, fontSize: 20, color: C.red }, completionText: { fontSize: 12, color: C.ink },
  specialCard: { width: '100%', maxWidth: 350, borderRadius: 14, backgroundColor: '#FFF7E7', padding: 15, overflow: 'hidden' }, specialEyebrow: { color: '#9a6851', fontSize: 9, letterSpacing: 1.2 }, specialTitle: { color: C.ink, fontFamily: SERIF, fontSize: 17, marginTop: 3, marginBottom: 9 }, specialRows: { gap: 7 }, specialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, specialLabel: { color: '#6b5d4b', fontSize: 10, flex: 1 }, specialStatus: { color: '#918576', fontSize: 10 }, specialWon: { color: '#a24c3e', fontFamily: SERIF }, specialWaiting: { color: '#806f5b', fontSize: 10, lineHeight: 17, textAlign: 'center', paddingVertical: 5 }, specialInstruction: { color: '#806f5b', fontSize: 9, lineHeight: 15, marginTop: 7, textAlign: 'center' }, passOwned: { color: '#776957', fontSize: 8, lineHeight: 15, marginTop: 11, textAlign: 'center' }, exchangeActions: { gap: 7, marginTop: 10 }, specialButton: { minHeight: 42 }, noPass: { color: '#806f5b', fontSize: 9, lineHeight: 16, marginTop: 10, textAlign: 'center' }, purchaseActions: { gap: 6, marginTop: 8 }, purchaseButton: { minHeight: 40 }, fakePurchase: { color: '#998a76', fontSize: 8, textAlign: 'center', marginTop: 7 },
});
