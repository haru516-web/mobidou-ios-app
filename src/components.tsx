import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Path, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { PetCharacter } from './petCatalog';
import { PullableCompanion } from './components/PullableCompanion';
import { STAMP_IMAGES, type Shrine } from './data/shrines';
import { reactionLine, type ReactionKind } from './data/reactions';
import * as Haptics from 'expo-haptics';
import { WashiArt, WashiPressable as Pressable } from './components/Washi';
export const C = { paper: '#F8F4EB', ink: '#322F29', red: '#A54E42', muted: '#8A8174', line: '#E3DACE', pale: '#EFE8DD', gold: '#AF9368' };
export const SERIF = 'Shippori';
export function Icon({ name, size = 21, color = C.ink }: { name: React.ComponentProps<typeof Ionicons>['name']; size?: number; color?: string }) { return <Ionicons name={name} size={size} color={color} />; }
export function Torii({ size = 30, color = C.red }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40"><Path d="M3 7 Q20 12 37 7 M6 13 H34 M8 21 H32 M12 13 L10 36 M28 13 L30 36 M20 14 V20" stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none" /></Svg>;
}
export function Landscape() {
  return <Svg pointerEvents="none" width="100%" height="240" viewBox="0 0 420 240" style={{ position: 'absolute', bottom: 0 }}>
    <Path d="M-40 224 Q10 146 64 195 Q125 68 205 195 Q240 124 297 181 Q350 73 463 217 L460 250 H-40Z" fill="#E6E3D8" opacity=".6" />
    <Path d="M-40 254 Q40 149 124 225 Q185 179 225 221 Q331 125 448 239 L460 260 H-40Z" fill="#D7DCCC" opacity=".65" />
    <Path d="M192 243 Q244 214 238 198 Q232 181 257 168" stroke="#F8F4EB" strokeWidth="9" fill="none" />
    <G stroke="#87907A" strokeWidth="2" opacity=".6"><Path d="M47 226 V194 M47 214 L36 204 M47 209 L58 197 M353 235 V189 M353 214 L341 203 M353 209 L366 197" /></G>
  </Svg>;
}
export function Clouds() { return <Svg pointerEvents="none" width="100%" height="150" viewBox="0 0 420 150" style={{ position: 'absolute', top: 45 }}><Path d="M-28 70 H35 Q66 70 66 51 Q66 35 48 35 Q31 35 31 49 H10 Q-4 49 -4 65 M341 115 H451 M359 99 H428 Q444 99 444 84 Q444 65 425 65 Q410 65 410 81 H386 Q371 81 371 99" stroke="#D9CBBB" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".35" /></Svg>; }
export function Button({ title, onPress, secondary, disabled, icon, style, textStyle }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name']; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [S.button, secondary && S.secondary, { opacity: disabled ? .45 : pressed ? .75 : 1 }, style]}>{icon && <Icon name={icon} color={secondary ? C.red : '#FFF9EF'} size={18} />}<Text style={[S.buttonText, secondary && { color: C.red }, textStyle]}>{title}</Text></Pressable>;
}
export function Section({ title, subtitle, action, onPress, actionArtwork = true }: { title: string; subtitle?: string; action?: string; onPress?: () => void; actionArtwork?: boolean }) { return <View style={S.section}><View><Text style={S.sectionTitle}>{title}</Text>{subtitle && <Text style={S.eyebrow}>{subtitle}</Text>}</View>{action && <Pressable artwork={actionArtwork} accessibilityRole="button" onPress={onPress} style={S.link}><Text style={S.linkText}>{action}</Text><Icon name="chevron-forward" size={14} color={C.red} /></Pressable>}</View>; }
export function Meter({ value, color = C.red }: { value: number; color?: string }) { return <View style={S.track}><View style={[S.fill, { width: `${Math.max(0, Math.min(100, value * 100))}%`, backgroundColor: color }]} /></View>; }
export function Stamp({ shrine, locked, style, imageFit = 'cover' }: { shrine: Shrine; locked?: boolean; style?: StyleProp<ViewStyle>; imageFit?: 'cover' | 'contain' }) {
  return <View style={[S.stamp, style]}><Image accessibilityLabel={`${shrine.name}の御朱印${locked ? '・未取得' : ''}`} source={STAMP_IMAGES[shrine.id]} style={{ width: '100%', height: '100%', opacity: locked ? .2 : 1 }} contentFit={imageFit} />{locked && <View style={S.lock}><Icon name="lock-closed-outline" color={C.muted} size={20} /><Text style={S.lockText}>まだ見ぬご縁</Text></View>}</View>;
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReduced); const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced); return () => s.remove(); }, []);
  return reduced;
}

function useCompanionPointerCapture() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const pullTarget = target.closest('#mobidou-companion-pull-target') as (HTMLElement & { setPointerCapture?: (pointerId: number) => void }) | null;
      pullTarget?.setPointerCapture?.(event.pointerId);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);
}

function captureCompanionPointer(event: any) {
  if (Platform.OS !== 'web') return;
  const nativeEvent = event?.nativeEvent ?? event;
  const pointerId = nativeEvent?.pointerId;
  const target = event?.currentTarget as (HTMLElement & { setPointerCapture?: (pointerId: number) => void }) | null;
  if (typeof pointerId === 'number') target?.setPointerCapture?.(pointerId);
}

function preventCompanionPointerMove(event: any) {
  if (Platform.OS === 'web') event?.preventDefault?.();
}

type CompanionReactionOptions = { bypassCooldown?: boolean; skipBounce?: boolean; skipHaptic?: boolean; special?: boolean };

function LegacyCompanion({ pet, haptics, bond, onBond }: { pet: PetCharacter; haptics: boolean; bond: number; onBond: () => void }) {
  const [line, setLine] = useState('今日も、きみの歩幅でいこう。');
  const [kind, setKind] = useState<ReactionKind | null>(null);
  const [pullStatus, setPullStatus] = useState<'idle' | 'pulling' | 'released'>('idle');
  const [pullSpecial, setPullSpecial] = useState(false);
  const bounce = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pullX = useRef(new Animated.Value(0)).current;
  const pullY = useRef(new Animated.Value(0)).current;
  const pullScaleX = useRef(new Animated.Value(1)).current;
  const pullScaleY = useRef(new Animated.Value(1)).current;
  const pullRotation = useRef(new Animated.Value(0)).current;
  const pullBurst = useRef(new Animated.Value(0)).current;
  const count = useRef(0);
  const pullCount = useRef(0);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const pointerReleaseRef = useRef<(() => void) | null>(null);
  const smoothedPullRef = useRef({ dx: 0, dy: 0 });
  const pullVelocityRef = useRef({ x: 0, y: 0 });
  const lastMoveAtRef = useRef(0);
  const mediumThresholdRef = useRef(false);
  const reduced = useReducedMotion();
  const useNativeDriver = Platform.OS !== 'web';
  useCompanionPointerCapture();

  useEffect(() => {
    setLine(`${pet.name}だよ。いっしょに歩こう！`);
    setKind(null);
    setPullStatus('idle');
    setPullSpecial(false);
    count.current = 0;
    pullCount.current = 0;
    pullX.setValue(0);
    pullY.setValue(0);
    pullScaleX.setValue(1);
    pullScaleY.setValue(1);
    pullRotation.setValue(0);
    pullBurst.setValue(0);
  }, [pet.id, pet.name, pullBurst, pullRotation, pullScaleX, pullScaleY, pullX, pullY]);

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([Animated.timing(float, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: useNativeDriver }), Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: useNativeDriver })]));
    animation.start();
    return () => animation.stop();
  }, [float, reduced, useNativeDriver]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const handlePointerUp = () => pointerReleaseRef.current?.();
    window.addEventListener('pointerup', handlePointerUp, true);
    return () => window.removeEventListener('pointerup', handlePointerUp, true);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    bounce.stopAnimation();
    pullBurst.stopAnimation();
  }, [bounce, pullBurst]);

  const emitReaction = useCallback((next: ReactionKind, options: CompanionReactionOptions = {}) => {
    const now = Date.now();
    if (!options.bypassCooldown && now - last.current < 700) return false;
    last.current = now;
    setLine(reactionLine(pet.id, next, count.current++));
    setKind(next);
    setPullSpecial(next === 'pull' ? Boolean(options.special) : false);
    onBond();
    if (haptics && !options.skipHaptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setKind(null); setPullSpecial(false); }, next === 'pull' ? 2300 : 2000);
    if (options.skipBounce) return true;
    bounce.stopAnimation();
    bounce.setValue(0);
    if (!reduced) Animated.sequence([Animated.timing(bounce, { toValue: 1, duration: 180, useNativeDriver }), Animated.spring(bounce, { toValue: 0, friction: 3, useNativeDriver })]).start();
    return true;
  }, [bounce, haptics, onBond, pet.id, reduced, useNativeDriver]);

  const restorePullPose = useCallback((onComplete?: () => void) => {
    const finish = () => onComplete?.();
    if (reduced) {
      pullX.setValue(0);
      pullY.setValue(0);
      pullScaleX.setValue(1);
      pullScaleY.setValue(1);
      pullRotation.setValue(0);
      finish();
      return;
    }
    Animated.parallel([
      Animated.spring(pullX, { toValue: 0, velocity: pullVelocityRef.current.x, useNativeDriver, speed: 16, bounciness: 15 }),
      Animated.spring(pullY, { toValue: 0, velocity: pullVelocityRef.current.y, useNativeDriver, speed: 16, bounciness: 15 }),
      Animated.spring(pullScaleX, { toValue: 1, useNativeDriver, speed: 18, bounciness: 13 }),
      Animated.spring(pullScaleY, { toValue: 1, useNativeDriver, speed: 18, bounciness: 13 }),
      Animated.spring(pullRotation, { toValue: 0, velocity: pullVelocityRef.current.x / 18, useNativeDriver, speed: 16, bounciness: 15 }),
    ]).start(({ finished }) => { if (finished) finish(); });
  }, [pullRotation, pullScaleX, pullScaleY, pullX, pullY, reduced, useNativeDriver]);

  const finishPull = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerReleaseRef.current = null;
    const { dx, dy } = smoothedPullRef.current;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      emitReaction('pet');
      restorePullPose(() => setPullStatus('idle'));
      return;
    }
    const nextPullCount = pullCount.current + 1;
    pullCount.current = nextPullCount;
    const special = nextPullCount % 10 === 0;
    setPullStatus('released');
    emitReaction('pull', { bypassCooldown: true, skipBounce: true, skipHaptic: true, special });
    if (haptics) void Haptics.impactAsync(special ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    pullBurst.stopAnimation();
    pullBurst.setValue(0);
    if (!reduced) Animated.timing(pullBurst, { toValue: 1, duration: special ? 1050 : 760, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
    restorePullPose(() => setPullStatus('idle'));
  }, [emitReaction, haptics, pullBurst, reduced, restorePullPose, useNativeDriver]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => Math.hypot(gesture.dx, gesture.dy) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      draggingRef.current = true;
      pointerReleaseRef.current = finishPull;
      setPullStatus('pulling');
      mediumThresholdRef.current = false;
      smoothedPullRef.current = { dx: 0, dy: 0 };
      pullVelocityRef.current = { x: 0, y: 0 };
      lastMoveAtRef.current = Date.now();
      pullX.stopAnimation();
      pullY.stopAnimation();
      pullScaleX.stopAnimation();
      pullScaleY.stopAnimation();
      pullRotation.stopAnimation();
    },
    onPanResponderMove: (_event, gesture) => {
      const maxPull = 96;
      const rawDx = gesture.dx;
      const rawDy = gesture.dy;
      const dx = Math.max(-maxPull, Math.min(maxPull, rawDx));
      const dy = Math.max(-maxPull, Math.min(maxPull, rawDy));
      const previous = smoothedPullRef.current;
      const now = Date.now();
      const deltaMs = Math.max(8, now - lastMoveAtRef.current);
      pullVelocityRef.current = { x: (dx - previous.dx) * 1000 / deltaMs, y: (dy - previous.dy) * 1000 / deltaMs };
      smoothedPullRef.current = { dx, dy };
      lastMoveAtRef.current = now;
      pullX.setValue(dx * 0.22);
      pullY.setValue(dy * 0.13);
      const horizontalStretch = Math.min(0.2, Math.abs(dx) / maxPull * 0.2);
      pullScaleX.setValue(1 + horizontalStretch);
      pullScaleY.setValue(1 - Math.min(0.08, horizontalStretch * 0.4));
      pullRotation.setValue(Math.max(-6, Math.min(6, dx / maxPull * 6)));
      if (haptics && Math.hypot(dx, dy) >= 12 && !mediumThresholdRef.current) {
        mediumThresholdRef.current = true;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    onPanResponderRelease: finishPull,
    onPanResponderTerminate: () => {
      if (Platform.OS === 'web') {
        // React Native Web can report a responder termination instead of the
        // final release when a captured pointer crosses the image boundary.
        // Finishing here keeps a completed drag from staying in the pulling
        // state; the ref guard prevents a later pointerup from double firing.
        finishPull();
        return;
      }
      draggingRef.current = false;
      pointerReleaseRef.current = null;
      restorePullPose(() => setPullStatus('idle'));
    },
  }), [finishPull, haptics, pullRotation, pullScaleX, pullScaleY, pullX, pullY, restorePullPose]);

  const react = (next: ReactionKind) => { emitReaction(next); };
  const bounceLift = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const bounceTilt = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, kind === 'snack' ? -7 : 7] });
  const totalTranslateY = Animated.add(float, Animated.add(pullY, bounceLift));
  const totalRotation = Animated.add(pullRotation, bounceTilt).interpolate({ inputRange: [-14, -7, 0, 7, 14], outputRange: ['-14deg', '-7deg', '0deg', '7deg', '14deg'] });
  const pullBurstOpacity = pullBurst.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 0.95, 0.65, 0], extrapolate: 'clamp' });
  const pullBurstScale = pullBurst.interpolate({ inputRange: [0, 0.32, 1], outputRange: [0.45, 1.15, 1.7], extrapolate: 'clamp' });

  return <View style={S.companion}><Landscape /><View style={S.bubble}><Text accessibilityLiveRegion="polite" style={S.bubbleText}>{line}</Text><View style={S.bubbleTail} /></View>
    <View style={S.petStage}><View style={S.petShadow} /><Animated.View {...panResponder.panHandlers} nativeID="mobidou-companion-pull-target" onPointerDown={captureCompanionPointer} onPointerMove={preventCompanionPointerMove} accessibilityRole="button" accessibilityLabel={`${pet.name}をなでる。ほっぺを引っ張る`} accessibilityHint="タップでなでる。キャラをドラッグするとほっぺがのびます" onAccessibilityTap={() => react('pet')} style={{ transform: [{ translateX: pullX }, { translateY: totalTranslateY }, { rotate: totalRotation }, { scaleX: pullScaleX }, { scaleY: pullScaleY }, { scale: bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }}><Image pointerEvents="none" source={pet.image} style={S.pet} contentFit="contain" /></Animated.View>{kind && <View pointerEvents="none" style={kind === 'pull' ? S.pullReactionMark : S.reactionMark}><Text style={kind === 'pull' ? S.pullReactionText : { fontSize: 27 }}>{kind === 'pet' ? '♡' : kind === 'snack' ? '🍡' : kind === 'talk' ? '✧' : 'びよーん！'}</Text></View>}{kind === 'pull' && <Animated.View pointerEvents="none" style={[S.pullBurst, { opacity: pullBurstOpacity, transform: [{ scale: pullBurstScale }] }]}><Text style={S.pullBurstText}>{pullSpecial ? '✦' : '✧'}</Text></Animated.View>}{pullStatus !== 'idle' && <View pointerEvents="none" style={S.pullStatus}><Text style={S.pullStatusText}>{pullStatus === 'pulling' ? 'ほっぺをびよーん…' : 'びよーん！'}</Text></View>}</View>
    <View style={S.bond}><Icon name="heart" size={12} color={C.red} /><Text style={S.bondText}>{bond < 5 ? 'はじめまして' : bond < 20 ? 'ちょっとなかよし' : bond < 50 ? 'いつものふたり' : '大切な相棒'}</Text><Text style={[S.bondText, { color: C.muted }]}> · {pet.name}</Text></View>
    <View style={S.reactions}>{([['pet', 'hand-left-outline', 'なでる'], ['snack', 'cafe-outline', 'おやつ'], ['talk', 'chatbubble-outline', '話す']] as const).map(([key, icon, title]) => <Pressable accessibilityRole="button" key={key} onPress={() => react(key)} style={({ pressed }) => [S.reactionButton, pressed && { backgroundColor: C.pale }]}><Icon name={icon} size={16} color={C.red} /><Text style={S.reactionText}>{title}</Text></Pressable>)}</View>
    <View style={S.pullHint}><Icon name="hand-left-outline" size={13} color={C.muted} /><Text style={S.pullHintText}>キャラのほっぺをドラッグしてみて</Text></View>
  </View>;
}
export function Companion({ pet, haptics, onBond, reactionTrigger, onStageLayout }: { pet: PetCharacter; haptics: boolean; onBond: () => void; reactionTrigger?: number; onStageLayout?: (layout: { y: number; height: number }) => void }) {
  return <PullableCompanion pet={pet} haptics={haptics} onBond={onBond} reactionTrigger={reactionTrigger} onStageLayout={onStageLayout} />;
}
export function Award({ shrine, pet, haptics, demo, onClose }: { shrine: Shrine; pet: PetCharacter; haptics: boolean; demo: boolean; onClose: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false); const reduced = useReducedMotion();
  useEffect(() => {
    progress.setValue(0); setDone(false);
    const animation = Animated.timing(progress, { toValue: 1, duration: reduced ? 0 : 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) setDone(true); });
    const timer = setTimeout(() => { if (haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, reduced ? 0 : 800);
    return () => { animation.stop(); clearTimeout(timer); };
  }, [shrine.id, haptics, reduced, progress]);
  return <ScrollView style={{ flex: 1, backgroundColor: '#353127' }} contentContainerStyle={S.award}>
    <LinearGradient colors={['#413629', '#24251FEF']} style={StyleSheet.absoluteFill} />
    <Text style={S.awardEyebrow}>{demo ? '体験の御朱印' : '今日の一歩が、ご縁になりました'}</Text>
    <Text accessibilityRole="header" style={S.awardTitle}>新しい御朱印を授かりました</Text>
    <View style={{ width: '100%', alignItems: 'center' }}>
      {Array.from({ length: 12 }, (_, i) => <Animated.Text key={i} style={{ position: 'absolute', top: '45%', left: '50%', color: i % 2 ? '#D8B98A' : '#E6C4B8', fontSize: 20, opacity: progress.interpolate({ inputRange: [0, .3, .8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(i * Math.PI / 6) * 155] }) }, { translateY: progress.interpolate({ inputRange: [0, .5, 1], outputRange: [0, Math.sin(i * Math.PI / 6) * 140, Math.sin(i * Math.PI / 6) * 170 + 65] }) }, { rotate: `${i * 32}deg` }] }}>✧</Animated.Text>)}
      <Animated.View style={{ width: 210, opacity: progress.interpolate({ inputRange: [0, .2, 1], outputRange: [0, 1, 1] }), transform: [{ scale: progress.interpolate({ inputRange: [0, .58, .72, 1], outputRange: [1.3, 1.1, .95, 1] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) }] }}><Stamp shrine={shrine} /><View style={S.awardSeal}><Text style={S.awardSealText}>結縁</Text></View></Animated.View>
    </View>
    <Text style={S.awardName}>{shrine.name}</Text><Text style={S.awardTheme}>{shrine.theme}</Text>
    <View style={S.awardCompanion}><Image source={pet.image} style={{ width: 60, height: 65 }} contentFit="contain" /><Text style={{ color: '#FAF3E7', fontSize: 13 }}>やったね！ またひとつ、宝物だ。</Text></View>
    <Button title={done ? '御朱印帳にしまう' : 'ご縁を結んでいます…'} onPress={onClose} disabled={!done} style={{ width: '90%', maxWidth: 330 }} />
  </ScrollView>;
}
const S = StyleSheet.create({
  button: { minHeight: 50, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: C.red, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: 'transparent', borderColor: '#CBA79A', borderWidth: 1 }, buttonText: { color: '#FFF9EF', fontWeight: '600', fontSize: 14, letterSpacing: 1 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17, marginTop: 26 }, sectionTitle: { fontFamily: SERIF, fontSize: 23, color: C.ink, letterSpacing: 1 }, eyebrow: { color: C.muted, fontSize: 10, letterSpacing: 1.5, marginTop: 5 }, link: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 3 }, linkText: { color: C.red, fontSize: 11 },
  track: { height: 6, backgroundColor: '#E3DDD2', borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 }, stamp: { width: '100%', aspectRatio: 2 / 3, backgroundColor: '#F5EFDF', borderRadius: 5, overflow: 'hidden' }, lock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 7 }, lockText: { fontSize: 10, color: '#6B655B', letterSpacing: 1 },
  companion: { alignItems: 'center', paddingTop: 12, marginHorizontal: -24, overflow: 'hidden', paddingBottom: 18 }, bubble: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFCF5', borderRadius: 17, paddingHorizontal: 18, paddingVertical: 11, zIndex: 2, maxWidth: '88%' }, bubbleText: { fontFamily: SERIF, fontSize: 13, color: '#5D554A', textAlign: 'center' }, bubbleTail: { position: 'absolute', width: 10, height: 10, backgroundColor: '#FFFCF5', borderBottomWidth: 1, borderRightWidth: 1, borderColor: C.line, transform: [{ rotate: '45deg' }], bottom: -6, alignSelf: 'center' },
  petStage: { width: 270, height: 218, justifyContent: 'center', alignItems: 'center', marginTop: 7 }, pet: { width: 210, height: 214 }, petShadow: { position: 'absolute', width: 108, height: 14, bottom: 5, borderRadius: 100, backgroundColor: '#66705819' }, reactionMark: { position: 'absolute', top: 20, right: 12 }, pullReactionMark: { position: 'absolute', top: 18, right: 2, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FFF6E7E8', borderWidth: 1, borderColor: '#D8B98A' }, pullReactionText: { color: C.red, fontFamily: SERIF, fontSize: 12 }, pullBurst: { position: 'absolute', top: 8, alignItems: 'center', justifyContent: 'center' }, pullBurstText: { color: C.gold, fontSize: 42, fontWeight: '700' }, pullStatus: { position: 'absolute', bottom: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#FFF9EFDD', borderWidth: 1, borderColor: '#E3DACE' }, pullStatusText: { color: C.red, fontSize: 11, fontFamily: SERIF }, bond: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }, bondText: { fontSize: 10, color: '#705F52' }, reactions: { flexDirection: 'row', gap: 10, marginTop: 15 }, reactionButton: { paddingHorizontal: 17, minHeight: 39, flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#FBF8F0DE', borderRadius: 30, borderWidth: 1, borderColor: '#E0D9C9' }, reactionText: { color: '#675B4B', fontSize: 11 }, pullHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }, pullHintText: { color: C.muted, fontSize: 10 },
  award: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 }, awardEyebrow: { color: '#D2BA98', fontSize: 11, letterSpacing: 2 }, awardTitle: { fontFamily: SERIF, fontSize: 21, color: '#FFF8EA', marginBottom: 10, textAlign: 'center' }, awardName: { fontFamily: SERIF, fontSize: 25, color: '#FFF5E3' }, awardTheme: { color: '#D6C9B8', fontSize: 12 }, awardSeal: { borderWidth: 3, borderColor: '#B85E48', position: 'absolute', right: -14, bottom: -6, padding: 8, transform: [{ rotate: '-12deg' }], backgroundColor: '#FAF2DFE8', borderRadius: 7 }, awardSealText: { color: C.red, fontFamily: SERIF, fontSize: 22 }, awardCompanion: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
