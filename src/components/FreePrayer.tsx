import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'react-native';
import { playSfx } from '../services/audio';
import { ARM, CLAP } from '../data/prayerBodyFrames';
import { armPose, clapFrame, ease } from '../data/prayerFirstPersonMotion';
import { floorLift, KANNON_SPAWN, moveVector, nearShrineFront, walk } from '../data/kannonWalk';
import { FrameBlend } from './FirstPersonPrayer';
import { Prayer3DWorld, type FreePose } from './Prayer3DWorld';

const ASSETS = [...ARM, ...CLAP];
const WALK_SPEED = 2.2;       // metres per second at full stick
const BOW_MS = 1900;
const CLAP_MS = 1100;
const CLAP_HOLD_AT = 470;     // the moment the hands meet; holding past it keeps them together
const STICK_REACH = 42;

type Action = { kind: 'bow' | 'clap'; at: number } | null;

/**
 * Free-roam prayer in the 願い観音もび寺 world: walk anywhere that is open, look around, and bow or clap in any
 * order, any number of times, once you reach the front of the hall. Nothing here is scripted.
 */
export function FreePrayer({ onClose, haptics }: { onClose: () => void; haptics: boolean }) {
  const pose = useRef<FreePose>({ x: KANNON_SPAWN.x, z: KANNON_SPAWN.z, yaw: KANNON_SPAWN.yaw, pitch: -0.035, lift: 0, bow: 0, bob: 0 });
  const stick = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const action = useRef<Action>(null);
  const [ui, setUi] = useState({ walkMs: 0, moving: false, clapMs: -1, near: false, busy: false });
  const [ready, setReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hint, setHint] = useState(true);
  const [size, setSize] = useState({ width: 390, height: 844 });
  const awake = useRef(true);
  const clapHeld = useRef(false);
  const onWorldReady = useCallback(() => setReady(true), []);
  const onWorldError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    let alive = true;
    void Asset.loadAsync(ASSETS).then(() => { if (alive) setAssetsReady(true); }).catch(() => { if (alive) setAssetsReady(true); });
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', state => { awake.current = state === 'active'; if (state !== 'active') { stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); } });
    const timer = setTimeout(() => setHint(false), 9000);
    return () => { alive = false; motion.remove(); app.remove(); clearTimeout(timer); };
  }, []);

  const go = ready && assetsReady;

  // The game loop: walking, looking, bobbing and the bow / clap in progress.
  useEffect(() => {
    if (!go) return undefined;
    let previous = Date.now(), walkMs = 0, stepped = 0, shown = 0;
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const p = pose.current;
      const current = action.current;
      let busy = false, clapMs = -1;
      if (current) {
        const t = now - current.at;
        const length = current.kind === 'bow' ? BOW_MS : CLAP_MS;
        if (t >= length) action.current = null;
        else {
          busy = true;
          if (current.kind === 'bow') { const k = t / BOW_MS; p.bow = reduced ? .25 * Math.sin(Math.PI * k) : Math.min(ease(k / .36), ease((1 - k) / .4)); }
          else {
            // Held down: the hands stay pressed together (the prayer pose) until the finger lifts.
            if (clapHeld.current && t >= CLAP_HOLD_AT) { current.at = now - CLAP_HOLD_AT - 40; }
            clapMs = now - current.at; p.bow = 0;
          }
        }
      }
      if (!busy) p.bow = 0;
      const s = stick.current;
      const strength = busy || !awake.current ? 0 : Math.min(1, Math.hypot(s.x, s.y));
      let moved = 0;
      if (strength > 0.06) {
        const { dx, dz } = moveVector(p.yaw, -s.y, s.x, WALK_SPEED * dt);
        const next = walk(p.x, p.z, dx, dz);
        moved = Math.hypot(next.x - p.x, next.z - p.z);
        p.x = next.x; p.z = next.z;
      }
      const moving = moved > 0.0004;
      if (moving) { walkMs += dt * 1000 * Math.min(1, moved / (WALK_SPEED * dt)); stepped += moved; }
      const lift = floorLift(p.x, p.z);
      p.lift += (lift - p.lift) * Math.min(1, dt * 9);
      p.bob = moving && !reduced ? Math.sin(walkMs / 1160 * Math.PI * 2) * 0.035 * 0.5 : p.bob * Math.max(0, 1 - dt * 10);
      if (stepped >= 0.62) { stepped = 0; playSfx('sfx_award_footsteps'); }
      const near = nearShrineFront(p.x, p.z);
      shown += 1;
      if (shown % 2 === 0 || busy) {
        setUi(prev => (prev.moving === moving && prev.near === near && prev.busy === busy && prev.clapMs === clapMs && !(moving || clapMs >= 0)) ? prev : { walkMs, moving, clapMs, near, busy });
      }
    }, 16);
    return () => clearInterval(timer);
  }, [go, reduced]);

  const look = useRef({ x: 0, y: 0 });
  const lookPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, g) => { look.current = { x: g.x0, y: g.y0 }; setHint(false); },
    onPanResponderMove: (_, g) => {
      const dx = g.moveX - look.current.x, dy = g.moveY - look.current.y;
      look.current = { x: g.moveX, y: g.moveY };
      const p = pose.current;
      p.yaw -= dx * 0.0075;
      p.pitch = Math.max(-1.25, Math.min(1.25, p.pitch - dy * 0.005));
    },
  })).current;

  const stickPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => setHint(false),
    onPanResponderMove: (_, g) => {
      const d = Math.max(1, Math.hypot(g.dx, g.dy) / STICK_REACH);
      const x = g.dx / d, y = g.dy / d;
      stick.current = { x: x / STICK_REACH, y: y / STICK_REACH };
      setKnob({ x, y });
    },
    onPanResponderRelease: () => { stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); },
    onPanResponderTerminate: () => { stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); },
  })).current;

  const start = (kind: 'bow' | 'clap') => {
    if (action.current || !go) return;
    action.current = { kind, at: Date.now() };
    stick.current = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 });
    if (kind === 'bow') playSfx('sfx_bow');
    else {
      setTimeout(() => playSfx('sfx_clap'), 460);
      if (haptics) setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 460);
    }
  };

  const bodyWidth = Math.min(size.width * 1.18, size.height * .8);
  const walkingNow = ui.moving && ui.clapMs < 0;
  return <View style={S.root} onLayout={e => setSize(e.nativeEvent.layout)}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Prayer3DWorld variant="kannon" free={pose} index={0} progress={0} elapsed={0} walking={false} reducedMotion={reduced} onReady={onWorldReady} onError={onWorldError} />
      {walkingNow && [0, 1].map(side => {
        const arm = armPose(ui.walkMs, side);
        if (!arm.visible) return null;
        return <FrameBlend key={side} frames={ARM} frame={arm.frame} style={{ position: 'absolute', width: bodyWidth * .6, height: bodyWidth * .6, left: side === 0 ? -20 : undefined, right: side === 1 ? -20 : undefined, bottom: -25 - (1 - arm.forward) * bodyWidth * .22, opacity: Math.min(1, arm.forward * 5), transform: [{ scaleX: side === 0 ? 1 : -1 }, { rotate: `${(1 - arm.forward) * -8}deg` }] }} />;
      })}
      {ui.clapMs >= 0 && <FrameBlend frames={CLAP} frame={clapFrame(ui.clapMs, CLAP_MS, false)} style={{ position: 'absolute', width: bodyWidth, height: bodyWidth, left: (size.width - bodyWidth) / 2, bottom: -25 }} />}
    </View>
    <View style={StyleSheet.absoluteFill} {...lookPan.panHandlers} accessible accessibilityLabel="視点。なぞって見回す" />
    <SafeAreaView pointerEvents="box-none" style={S.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="参拝をおわる" onPress={onClose} hitSlop={10} style={S.close}>
        <Svg width={22} height={22} viewBox="0 0 22 22"><Path d="M5 5 L17 17 M17 5 L5 17" stroke="#FFF6DF" strokeWidth={2.4} strokeLinecap="round" /></Svg>
      </Pressable>
      {hint && go && <View pointerEvents="none" style={S.hint}><Text style={S.hintText}>左の丸で歩く ・ 画面をなぞって見回す</Text></View>}
      <View accessible accessibilityRole="adjustable" accessibilityLabel="移動。丸を動かして歩く" style={S.move} {...stickPan.panHandlers}>
        <View pointerEvents="none" style={[S.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
      </View>
      {(ui.near || ui.busy) && <View pointerEvents="box-none" style={S.rituals}>
        {!ui.busy && <Pressable accessibilityRole="button" accessibilityLabel="礼" onPress={() => start('bow')} style={S.ritual}>
          <Svg width={34} height={34} viewBox="0 0 38 38"><Circle cx={27} cy={11} r={4} fill="none" stroke="#FFF6DF" strokeWidth={2} /><Path d="M9 31 L14 21 L18 14 L23 17 L29 22 M14 21 L21 25 L23 32" fill="none" stroke="#FFF6DF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          <Text style={S.ritualText}>礼</Text>
        </Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="拍手。押している間、手を合わせたまま" onPressIn={() => { clapHeld.current = true; start('clap'); }} onPressOut={() => { clapHeld.current = false; }} onPress={() => start('clap')} style={[S.ritual, ui.busy && ui.clapMs < 0 && { opacity: .35 }]}>
          <Image source={CLAP[2]} resizeMode="contain" style={{ width: 40, height: 40 }} />
          <Text style={S.ritualText}>拍手</Text>
        </Pressable>
      </View>}
      {!go && !failed && <View pointerEvents="none" style={S.loading}><Text style={S.loadingText}>参道へ…</Text></View>}
      {failed && <View style={S.loading}><Text style={S.loadingText}>参拝の世界をひらけませんでした</Text></View>}
    </SafeAreaView>
  </View>;
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#18142A', overflow: 'hidden' },
  overlay: { flex: 1 },
  close: { position: 'absolute', top: 14, left: 16, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#E8D5A880', backgroundColor: '#2A1F3ACC', alignItems: 'center', justifyContent: 'center' },
  move: { position: 'absolute', left: 24, bottom: 36, width: 116, height: 116, borderRadius: 58, borderWidth: 1, borderColor: '#E8D5A880', backgroundColor: '#2A1F3A66', alignItems: 'center', justifyContent: 'center' },
  knob: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8D5A8BB', borderWidth: 1, borderColor: '#FFF6DF' },
  rituals: { position: 'absolute', right: 22, bottom: 44, flexDirection: 'row', gap: 14 },
  ritual: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#E8D5A8', backgroundColor: '#3A1F2CE6', alignItems: 'center', justifyContent: 'center', gap: 1 },
  ritualText: { color: '#FFF6DF', fontSize: 13, letterSpacing: 2 },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 168, alignItems: 'center' },
  hintText: { color: '#FFF6DF', fontSize: 12, letterSpacing: 2, backgroundColor: '#2A1F3AB0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18142A' },
  loadingText: { color: '#E7D5A9', fontSize: 15, letterSpacing: 4 },
});
