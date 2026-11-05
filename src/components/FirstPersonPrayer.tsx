import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Rect } from 'react-native-svg';
import { playSfx } from '../services/audio';
import { Asset } from 'expo-asset';
import { ARM, CLAP } from '../data/prayerBodyFrames';
import { armPose, clapFrame, ease } from '../data/prayerFirstPersonMotion';
import { Prayer3DWorld } from './Prayer3DWorld';
import { prayerWalkRate } from '../data/prayerNavigation';

const ASSETS = [...ARM, ...CLAP];
function FrameBlend({ frames, frame, style }: { frames: number[]; frame: number; style: import('react-native').StyleProp<import('react-native').ViewStyle> }) {
  const at = Math.max(0, Math.min(frames.length - 1, frame));
  const low = Math.floor(at), high = Math.min(frames.length - 1, low + 1), fraction = at - low;
  return <View style={style}>
    <Image source={frames[low]} resizeMode="stretch" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 1 - fraction }]} />
    {high !== low && <Image source={frames[high]} resizeMode="stretch" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: fraction }]} />}
    {high + 1 < frames.length && <Image source={frames[high + 1]} style={{ width: 1, height: 1, opacity: .001 }} />}
    {low > 0 && <Image source={frames[low - 1]} style={{ width: 1, height: 1, opacity: .001 }} />}
  </View>;
}
type Beat = { label: string; kind: 'walk' | 'bow' | 'clap' | 'wish' | 'turn'; ms: number; scene: number; zoom: number };
const BEATS: Beat[] = [
  { label: '鳥居へ歩く', kind: 'walk', ms: 3480, scene: 0, zoom: 1.08 },
  { label: '鳥居の前で一礼', kind: 'bow', ms: 1800, scene: 0, zoom: 1.18 },
  { label: 'お社へ歩く', kind: 'walk', ms: 8200, scene: 0, zoom: 1.18 },
  { label: '一礼目', kind: 'bow', ms: 2100, scene: 1, zoom: 1.08 },
  { label: '二礼目', kind: 'bow', ms: 2100, scene: 1, zoom: 1.08 },
  { label: '一拍手目', kind: 'clap', ms: 1100, scene: 1, zoom: 1.08 },
  { label: '二拍手目 · 心で願いを話す', kind: 'wish', ms: 1000, scene: 1, zoom: 1.08 },
  { label: '感謝をこめて一礼', kind: 'bow', ms: 2100, scene: 1, zoom: 1.08 },
  { label: '参道へ振り返る', kind: 'turn', ms: 2800, scene: 1, zoom: 1.08 },
  { label: '鳥居へ歩いて戻る', kind: 'walk', ms: 5800, scene: 3, zoom: 1.08 },
  { label: 'お社を振り返る', kind: 'turn', ms: 2800, scene: 3, zoom: 1.32 },
  { label: 'お社へ最後の一礼', kind: 'bow', ms: 2000, scene: 0, zoom: 1.08 },
  { label: '帰り道へ向き直る', kind: 'turn', ms: 2800, scene: 0, zoom: 1.08 },
  { label: '参道を歩いて帰る', kind: 'walk', ms: 3480, scene: 3, zoom: 1.32 },
];

/** All time is accumulated only while active; a wish ends on release, never on a deadline. */
export function FirstPersonPrayer({ onComplete, haptics }: { onComplete: () => void; haptics: boolean; name: string }) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [look, setLook] = useState({ yaw: 0, pitch: 0 });
  const lookOrigin = useRef(look);
  const [fov, setFov] = useState(82);
  const pinch = useRef({ distance: 0, fov: 82 });
  const currentFov = useRef(fov); currentFov.current = fov;
  const lookCurrent = useRef(look); lookCurrent.current = look;
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [looking, setLooking] = useState(false);
  const controls = useRef({ walk: false, ready: false, returning: false });
  const moveStrength = useRef(0);
  const focusView = (yaw: number) => {
    const view = { yaw, pitch: 0 };
    lookOrigin.current = view; lookCurrent.current = view; setLook(view);
  };
  const [size, setSize] = useState({ width: 390, height: 844 });
  const [assetsReady, setAssetsReady] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const ready = assetsReady && worldReady;
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const active = useRef(false);
  const onWorldReady = useCallback(() => setWorldReady(true), []);
  const onWorldError = useCallback(() => setFailed(true), []);
  const time = useRef(0);
  const lastSound = useRef(-1);
  const gesture = useRef(-1);
  const releaseAt = useRef<number | null>(null);
  const [, setLettingGo] = useState(false);
  const finishRef = useRef(onComplete); finishRef.current = onComplete;
  const beat = BEATS[index];
  controls.current = { walk: beat?.kind === 'walk', ready, returning: index >= 9 };
  const navigation = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { lookOrigin.current = lookCurrent.current; setLooking(true); },
    onPanResponderMove: (_, g) => {
      setLook({ yaw: lookOrigin.current.yaw - g.dx * .012, pitch: Math.max(-1.25, Math.min(1.25, lookOrigin.current.pitch - g.dy * .008)) });
    },
    onPanResponderRelease: (_, g) => {
      if (Math.hypot(g.dx, g.dy) < 8) { focusView(0); setFov(82); }
      else lookOrigin.current = lookCurrent.current;
      setLooking(false);
    },
    onPanResponderTerminate: () => setLooking(false),
  })).current;
  const zoomGesture = useRef(PanResponder.create({
    onStartShouldSetPanResponder: e => e.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponder: e => e.nativeEvent.touches.length === 2,
    onMoveShouldSetPanResponderCapture: e => e.nativeEvent.touches.length === 2,
    onPanResponderGrant: e => {
      const [a, b] = e.nativeEvent.touches;
      if (a && b) pinch.current = { distance: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY), fov: currentFov.current };
      if (controls.current.walk) { active.current = false; setRunning(false); setStick({ x: 0, y: 0 }); }
    },
    onPanResponderMove: e => {
      const [a, b] = e.nativeEvent.touches;
      if (!a || !b || pinch.current.distance < 1) return;
      const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
      setFov(Math.max(38, Math.min(100, pinch.current.fov * pinch.current.distance / Math.max(1, distance))));
    },
    onPanResponderRelease: () => { pinch.current.distance = 0; },
    onPanResponderTerminate: () => { pinch.current.distance = 0; },
  })).current;
  const movement = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const distance = Math.max(1, Math.hypot(g.dx, g.dy) / 32);
      setStick({ x: g.dx / distance, y: g.dy / distance });
      if (!controls.current.walk || !controls.current.ready) return;
      moveStrength.current = Math.pow(Math.max(0, Math.min(1, (-g.dy - 6) / 26)), .75);
      active.current = moveStrength.current > 0; setRunning(active.current);
    },
    onPanResponderRelease: () => { setStick({ x: 0, y: 0 }); if (controls.current.walk) { active.current = false; setRunning(false); } },
    onPanResponderTerminate: () => { setStick({ x: 0, y: 0 }); if (controls.current.walk) { active.current = false; setRunning(false); } },
  })).current;
  const stop = () => { active.current = false; setRunning(false); };
  const advance = () => {
    stop(); moveStrength.current = 0; setStick({ x: 0, y: 0 });
    releaseAt.current = null; setLettingGo(false); time.current = 0; setElapsed(0); lastSound.current = -1;
    if (BEATS[index + 1]?.kind === 'turn') focusView(0);
    setIndex(i => i + 1);
  };
  useEffect(() => {
    let alive = true;
    void Asset.loadAsync(ASSETS).then(() => { if (alive) setAssetsReady(true); }).catch(() => { if (alive) setFailed(true); });
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { alive = false; motion.remove(); app.remove(); active.current = false; };
  }, []);
  useEffect(() => { if (!beat) finishRef.current(); }, [beat]);
  // Turning around is part of the ritual: it plays on its own, slowly, instead of snapping.
  useEffect(() => { if (beat?.kind === 'turn' && ready && !active.current) { active.current = true; setRunning(true); } }, [beat, ready]);
  useEffect(() => {
    if (!running || !beat) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      if (!active.current) return;
      if (!ready) { previous = Date.now(); return; }
      const now = Date.now();
      const dt = Math.min(80, now - previous); previous = now;
      let rate = 1;
      if (beat.kind === 'walk') {
        rate = prayerWalkRate(index, moveStrength.current, beat.ms);
      }
      time.current += dt * rate;
      setElapsed(time.current);
      const sound = beat.kind === 'walk' ? Math.floor(time.current / 580) : time.current >= 460 ? 0 : -1;
      if (sound !== lastSound.current) {
        lastSound.current = sound;
        if (sound >= 0) {
          if (beat.kind === 'walk') playSfx('sfx_award_footsteps');
          if (beat.kind === 'clap' || beat.kind === 'wish') playSfx('sfx_clap');
          if (beat.kind === 'bow') playSfx('sfx_bow');
          if (haptics && (beat.kind === 'clap' || beat.kind === 'wish')) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
      if (beat.kind !== 'wish' && time.current >= beat.ms) advance();
      if (beat.kind === 'wish' && releaseAt.current !== null && time.current - releaseAt.current >= 650) advance();
    }, 16);
    return () => clearInterval(timer);
  }, [running, beat, haptics, ready, index]);
  if (!beat) return <View style={S.root} />;
  const start = () => { if (!ready || active.current) return; active.current = true; setRunning(true); };
  const release = () => {
    if (beat.kind === 'wish') {
      if (releaseAt.current !== null) return;
      if (time.current >= 460) { releaseAt.current = Math.max(beat.ms, time.current); setLettingGo(true); active.current = true; setRunning(true); }
      else { stop(); time.current = 0; setElapsed(0); lastSound.current = -1; }
    } else if (beat.kind === 'walk') stop();
  };
  const p = Math.min(1, elapsed / beat.ms);
  const bodyWidth = Math.min(size.width * 1.18, size.height * .8);
  return <View style={S.root} {...zoomGesture.panHandlers} onLayout={e => setSize(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Prayer3DWorld index={index} progress={p} elapsed={elapsed} walking={beat.kind === 'walk' && running} look={look} fov={fov} reducedMotion={reduced} onReady={onWorldReady} onError={onWorldError} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}><Defs><LinearGradient id="prayerShade" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#102018" stopOpacity=".16" /><Stop offset=".22" stopColor="#102018" stopOpacity="0" /><Stop offset=".65" stopColor="#102018" stopOpacity="0" /><Stop offset="1" stopColor="#102018" stopOpacity=".3" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#prayerShade)" /></Svg>
      {beat.kind === 'walk' && running && [0, 1].map(side => {
        const arm = armPose(elapsed, side);
        if (!arm.visible) return null;
        return <FrameBlend key={side} frames={ARM} frame={arm.frame} style={{ position: 'absolute', width: bodyWidth * .6, height: bodyWidth * .6, left: side === 0 ? -20 : undefined, right: side === 1 ? -20 : undefined, bottom: -25 - (1 - arm.forward) * bodyWidth * .22, opacity: Math.min(1, arm.forward * 5), transform: [{ scaleX: side === 0 ? 1 : -1 }, { rotate: `${(1 - arm.forward) * -8}deg` }] }} />;
      })}
      {(beat.kind === 'clap' || beat.kind === 'wish') && <FrameBlend frames={CLAP} frame={releaseAt.current !== null && elapsed >= releaseAt.current ? (1 - ease((elapsed - releaseAt.current) / 650)) * 5 : clapFrame(elapsed, beat.ms, beat.kind === 'wish')} style={{ position: 'absolute', width: bodyWidth, height: bodyWidth, left: (size.width - bodyWidth) / 2, bottom: -25 }} />}
    </View>
    <SafeAreaView pointerEvents="box-none" style={S.overlay}>
      <View accessible accessibilityRole="button" accessibilityLabel="視点。押したままスワイプして見回す" style={[S.lookControl, looking && S.controlActive]} {...navigation.panHandlers}>
        <Svg width={30} height={30} viewBox="0 0 30 30"><Rect x={5} y={9} width={20} height={12} rx={6} fill="none" stroke="#FFF6DF" strokeWidth={2} /><Rect x={12} y={12} width={6} height={6} rx={3} fill="#FFF6DF" /></Svg>
      </View>
      <View accessible accessibilityRole="adjustable" accessibilityLabel="移動。丸を上に動かして歩く" style={[S.moveControl, (!ready || beat.kind !== 'walk') && { opacity: .3 }]} {...movement.panHandlers}>
        <View pointerEvents="none" style={[S.stick, { transform: [{ translateX: stick.x }, { translateY: stick.y }] }]} />
      </View>
      {beat.kind !== 'walk' && beat.kind !== 'turn' && <Pressable disabled={!ready || (running && beat.kind !== 'wish')} accessibilityRole="button" accessibilityLabel={beat.kind === 'wish' ? '二拍手目。1秒以上長押しで祈り、離して終える' : beat.label} onPressIn={() => { gesture.current = index; if (beat.kind === 'wish') start(); }} onPressOut={release} onPress={() => { if (gesture.current === index && beat.kind !== 'wish') start(); }} style={[S.ritual, !ready && { opacity: .3 }]}>
        {beat.kind === 'bow' ? <Svg width={38} height={38} viewBox="0 0 38 38"><Circle cx={27} cy={11} r={4} fill="none" stroke="#FFF6DF" strokeWidth={2} /><Path d="M9 31 L14 21 L18 14 L23 17 L29 22 M14 21 L21 25 L23 32" fill="none" stroke="#FFF6DF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg> : <Image source={CLAP[2]} resizeMode="contain" style={{ width: 56, height: 56 }} />}
        <View style={[S.progress, { width: `${p * 100}%` }]} />
      </Pressable>}
      {failed && <Pressable accessibilityRole="button" accessibilityLabel="御朱印へ進む" onPress={onComplete} style={S.ritual}><View style={{ width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#FFF6DF', transform: [{ rotate: '45deg' }] }} /></Pressable>}
    </SafeAreaView>
  </View>;
}
const S = StyleSheet.create({
  moveControl: { position: 'absolute', right: 24, bottom: 32, width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: '#E8D5A880', backgroundColor: '#223A3155', alignItems: 'center', justifyContent: 'center' },
  stick: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8D5A8BB', borderWidth: 1, borderColor: '#FFF6DF' },
  lookControl: { position: 'absolute', right: 52, bottom: 166, width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8D5A880', backgroundColor: '#223A3199', alignItems: 'center', justifyContent: 'center' },
  controlActive: { backgroundColor: '#58705BDD', borderColor: '#FFF6DF' },
  ritual: { position: 'absolute', left: 28, bottom: 48, width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: '#E8D5A8', backgroundColor: '#223A31DD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  root: { flex: 1, backgroundColor: '#18221C', overflow: 'hidden' }, overlay: { flex: 1, justifyContent: 'space-between' },
  top: { padding: 24, alignItems: 'center', gap: 9 }, kicker: { color: '#E7D5A9', fontSize: 11, letterSpacing: 3 }, title: { color: '#FFFAEB', fontSize: 22, letterSpacing: 2, textAlign: 'center' }, counter: { color: '#E4D8BE', fontSize: 11, letterSpacing: 3 },
  bottom: { paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center', gap: 15 }, hint: { color: '#FFF6DF', fontSize: 13, lineHeight: 23, textAlign: 'center' },
  action: { minWidth: 180, minHeight: 64, paddingHorizontal: 30, borderRadius: 32, borderWidth: 1, borderColor: '#E8D5A8', backgroundColor: '#223A31EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, actionText: { color: '#FFF6DF', fontSize: 19, letterSpacing: 3 }, progress: { position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: '#EFD69E' }, skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }, skipText: { color: '#E2D9C7', fontSize: 11 },
});
