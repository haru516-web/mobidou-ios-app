import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';

import type { PetCharacter } from '../petCatalog';
import { reactionLine, type ReactionKind } from '../data/reactions';
import { PULL_ASSETS, type CoreMobbyId, type MobbyPullAsset, type PullFrame } from '../data/mobbyPullAssets';
import { PULL_REACTION_FRAMES } from '../data/pullReactionFrames';
import { MOBIBOU_ACTION_FRAMES } from '../data/mobibouActionFrames';
import { PRAYER_ATLASES, PRAYER_ACTION_ORDER, PRAYER_FRAME_COUNT } from '../data/prayerAtlasesV2';
import { WashiPressable as Pressable } from './Washi';
import { MobbyPullMesh, type MobbyPullMeshHandle } from './MobbyPullMesh';

const MOBIBOU_REI_FRAME_LAYOUTS = [
  [16.06, -72.47, 178.54, 347.34],
  [16.39, -72.47, 176.56, 347.34],
  [16.39, -72.47, 176.56, 347.34],
  [16.72, -72.47, 177.22, 347.34],
  [15.07, -72.47, 177.22, 347.34],
  [16.06, -72.47, 176.56, 347.34],
  [17.05, -72.47, 176.56, 347.34],
  [16.06, -72.47, 178.54, 347.34],
] as const;
const MOBIBOU_HAKUSHU_FRAME_LAYOUTS = [
  [15.65, -72.23, 179.36, 346.42],
  [16.65, -72.23, 177.37, 346.42],
  [16.65, -72.23, 177.37, 346.42],
  [16.32, -72.23, 178.03, 346.42],
  [16.32, -72.23, 178.03, 346.42],
  [16.65, -72.23, 177.37, 346.42],
  [16.65, -72.23, 177.37, 346.42],
  [15.65, -72.23, 179.36, 346.42],
] as const;
const MOBIBOU_PRAYER_FRAME_LAYOUTS = [
  ...MOBIBOU_REI_FRAME_LAYOUTS,
  ...MOBIBOU_REI_FRAME_LAYOUTS,
  ...MOBIBOU_HAKUSHU_FRAME_LAYOUTS,
  ...MOBIBOU_HAKUSHU_FRAME_LAYOUTS,
  ...MOBIBOU_REI_FRAME_LAYOUTS,
] as const;

const C = {
  paper: '#F8F4EB',
  ink: '#322F29',
  red: '#A54E42',
  muted: '#8A8174',
  line: '#E3DACE',
  pale: '#EFE8DD',
  gold: '#AF9368',
  bubble: '#FFFCF5',
};

const CORE_IDS = new Set<string>(Object.keys(PULL_ASSETS));

function useReducedMotionLocal() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  return reduced;
}

function useWebPointerCapture() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const handler = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const pullTarget = target.closest('#mobidou-companion-pull-target') as (HTMLElement & { setPointerCapture?: (pointerId: number) => void }) | null;
      pullTarget?.setPointerCapture?.(event.pointerId);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, []);
}

function capturePointer(event: any) {
  if (Platform.OS !== 'web') return;
  const nativeEvent = event?.nativeEvent ?? event;
  const pointerId = nativeEvent?.pointerId;
  const target = event?.currentTarget as (HTMLElement & { setPointerCapture?: (pointerId: number) => void }) | null;
  if (typeof pointerId === 'number') target?.setPointerCapture?.(pointerId);
}

function preventPointerMove(event: any) {
  if (Platform.OS === 'web') event?.preventDefault?.();
}

function pullFaceFrameStyle(frame: PullFrame, asset: MobbyPullAsset, size: number) {
  const scale = size / asset.sourceSize;
  return {
    position: 'absolute' as const,
    left: frame.x * scale,
    top: frame.y * scale,
    width: frame.width * scale,
    height: frame.height * scale,
  };
}

function selectPullExpression(
  asset: MobbyPullAsset,
  dx: number,
  dy: number,
  width: number,
  sectorRef: { current: number },
  strongRef: { current: boolean },
) {
  const magnitude = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const fullTurn = Math.PI * 2;
  const sectorSize = fullTurn / asset.eyePairs.length;
  const normalized = (angle + fullTurn + sectorSize / 2) % fullTurn;
  const candidateSector = Math.floor(normalized / sectorSize) % asset.eyePairs.length;
  const currentCenter = sectorRef.current * sectorSize;
  const distanceFromCurrent = Math.abs(Math.atan2(Math.sin(angle - currentCenter), Math.cos(angle - currentCenter)));
  if (magnitude >= 12 && distanceFromCurrent > sectorSize / 2 + Math.PI / 18) {
    sectorRef.current = candidateSector;
  }

  const strongOn = Math.max(70, width * 0.16);
  const strongOff = Math.max(52, width * 0.12);
  if (!strongRef.current && magnitude >= strongOn) strongRef.current = true;
  if (strongRef.current && magnitude <= strongOff) strongRef.current = false;

  const eyePair = asset.eyePairs[sectorRef.current] ?? asset.eyePairs[0];
  const mouthPair = asset.mouthPairs[sectorRef.current] ?? asset.mouthPairs[0];
  return {
    eyeIndex: eyePair[strongRef.current ? 1 : 0],
    mouthIndex: mouthPair[strongRef.current ? 1 : 0],
  };
}

function isCoreMobbyId(value: string): value is CoreMobbyId {
  return CORE_IDS.has(value);
}

export function PullableCompanion({
  pet,
  haptics,
  onBond,
  reactionTrigger,
}: {
  pet: PetCharacter;
  haptics: boolean;
  onBond: () => void;
  reactionTrigger?: number;
}) {
  useWebPointerCapture();

  const mobbyId = isCoreMobbyId(pet.id) ? pet.id : null;
  const pullAsset = mobbyId ? PULL_ASSETS[mobbyId] : null;
  const reactionFrames = mobbyId ? PULL_REACTION_FRAMES[mobbyId] : undefined;
  const isMobibouPrayer = pet.id === 'mobibou';
  const prayerAtlas = PRAYER_ATLASES[pet.id];
  const prayerSequence = isMobibouPrayer ? MOBIBOU_ACTION_FRAMES : prayerAtlas;
  const [prayerLoaded, setPrayerLoaded] = useState<Record<string, boolean>>({});
  const prayerReady = isMobibouPrayer || Boolean(prayerLoaded[`${pet.id}/rei`] && prayerLoaded[`${pet.id}/hakushu`]);
  const reduced = useReducedMotionLocal();
  const useNativeDriver = Platform.OS !== 'web';

  const [line, setLine] = useState('今日も、きみの歩幅でいこう。');
  const [kind, setKind] = useState<ReactionKind | null>(null);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'released' | 'reacting'>('idle');
  const [reactionFrame, setReactionFrame] = useState<number | null>(null);
  const [specialReaction, setSpecialReaction] = useState(false);
  const [eyeIndex, setEyeIndex] = useState(-1);
  const [mouthIndex, setMouthIndex] = useState(-1);
  const [prayerFrame, setPrayerFrame] = useState<number | null>(null);

  const float = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const pullTranslateX = useRef(new Animated.Value(0)).current;
  const pullTranslateY = useRef(new Animated.Value(0)).current;
  const pullRotation = useRef(new Animated.Value(0)).current;
  const reactionMotion = useRef(new Animated.Value(0)).current;
  const specialMotion = useRef(new Animated.Value(0)).current;
  const countRef = useRef(0);
  const pullCountRef = useRef(0);
  const lastActionRef = useRef(0);
  const lastReactionFrameRef = useRef(-1);
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reactionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const reactionTriggerRef = useRef(reactionTrigger ?? 0);
  const draggingRef = useRef(false);
  const pointerReleaseRef = useRef<(() => void) | null>(null);
  const smoothedPullRef = useRef({ dx: 0, dy: 0 });
  const pullVelocityRef = useRef({ x: 0, y: 0 });
  const lastMoveAtRef = useRef(0);
  const mediumThresholdRef = useRef(false);
  const strongHapticRef = useRef(false);
  const sectorRef = useRef(0);
  const strongRef = useRef(false);
  const meshRef = useRef<MobbyPullMeshHandle>(null);
  const prayerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearReactionTimers = useCallback(() => {
    reactionTimersRef.current.forEach(clearTimeout);
    reactionTimersRef.current = [];
    reactionAnimationRef.current?.stop();
    reactionAnimationRef.current = null;
  }, []);

  const clearLineTimer = useCallback(() => {
    if (lineTimerRef.current) clearTimeout(lineTimerRef.current);
    lineTimerRef.current = null;
  }, []);

  const clearPrayerTimer = useCallback(() => {
    if (prayerTimerRef.current) clearInterval(prayerTimerRef.current);
    prayerTimerRef.current = null;
  }, []);

  const resetExpression = useCallback(() => {
    sectorRef.current = 0;
    strongRef.current = false;
    setEyeIndex(-1);
    setMouthIndex(-1);
    setPrayerFrame(null);
  }, []);

  const resetPose = useCallback((onComplete?: () => void) => {
    if (reduced) {
      scaleX.setValue(1);
      scaleY.setValue(1);
      pullTranslateX.setValue(0);
      pullTranslateY.setValue(0);
      pullRotation.setValue(0);
      onComplete?.();
      return;
    }
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1, useNativeDriver, speed: 18, bounciness: 13 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver, speed: 18, bounciness: 13 }),
      Animated.spring(pullTranslateX, { toValue: 0, velocity: pullVelocityRef.current.x, useNativeDriver, speed: 16, bounciness: 15 }),
      Animated.spring(pullTranslateY, { toValue: 0, velocity: pullVelocityRef.current.y, useNativeDriver, speed: 16, bounciness: 15 }),
      Animated.spring(pullRotation, { toValue: 0, velocity: pullVelocityRef.current.x / 18, useNativeDriver, speed: 16, bounciness: 15 }),
    ]).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  }, [pullRotation, pullTranslateX, pullTranslateY, reduced, scaleX, scaleY, useNativeDriver]);

  useEffect(() => {
    clearReactionTimers();
    clearLineTimer();
    setLine(pet.name + 'だよ。いっしょに歩こう！');
    setKind(null);
    setStatus('idle');
    setReactionFrame(null);
    setSpecialReaction(false);
    setEyeIndex(-1);
    setMouthIndex(-1);
    countRef.current = 0;
    setPrayerFrame(null);
    pullCountRef.current = 0;
    lastReactionFrameRef.current = -1;
    reactionMotion.setValue(0);
    specialMotion.setValue(0);
    resetPose();
    clearPrayerTimer();
  }, [clearLineTimer, clearPrayerTimer, clearReactionTimers, mobbyId, pet.name, reactionMotion, resetPose, specialMotion]);

  useEffect(() => {
    if (reduced) return undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(float, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [float, reduced, useNativeDriver]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const handler = () => pointerReleaseRef.current?.();
    window.addEventListener('pointerup', handler, true);
    return () => window.removeEventListener('pointerup', handler, true);
  }, []);

  useEffect(() => () => {
    clearReactionTimers();
    clearLineTimer();
    clearPrayerTimer();
    bounce.stopAnimation();
    float.stopAnimation();
  }, [bounce, clearLineTimer, clearPrayerTimer, clearReactionTimers, float]);

  const haptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (haptics) void Haptics.impactAsync(style).catch(() => {});
  }, [haptics]);

  const setReactionLine = useCallback((nextKind: ReactionKind, options?: { special?: boolean; keepStatus?: boolean }) => {
    setLine(reactionLine(pet.id, nextKind, countRef.current++));
    setKind(nextKind);
    setSpecialReaction(nextKind === 'pull' && Boolean(options?.special));
    clearLineTimer();
    lineTimerRef.current = setTimeout(() => {
      setKind(null);
      setSpecialReaction(false);
    }, nextKind === 'pull' ? 3000 : 2000);
    if (!options?.keepStatus) {
      bounce.stopAnimation();
      bounce.setValue(0);
      if (!reduced) {
        Animated.sequence([
          Animated.timing(bounce, { toValue: 1, duration: 180, useNativeDriver }),
          Animated.spring(bounce, { toValue: 0, friction: 3, useNativeDriver }),
        ]).start();
      }
    }
  }, [bounce, clearLineTimer, pet.id, reduced, useNativeDriver]);

  const triggerButtonReaction = useCallback((nextKind: ReactionKind, options?: { skipBond?: boolean }) => {
    const now = Date.now();
    if (now - lastActionRef.current < 700) return;
    lastActionRef.current = now;
    setReactionLine(nextKind);
    if (!options?.skipBond) onBond();
    haptic(Haptics.ImpactFeedbackStyle.Light);
  }, [haptic, onBond, setReactionLine]);

  useEffect(() => {
    if (!reactionTrigger || reactionTrigger <= reactionTriggerRef.current) return;
    reactionTriggerRef.current = reactionTrigger;
    triggerButtonReaction('pet', { skipBond: true });
  }, [reactionTrigger, triggerButtonReaction]);

  const startPrayer = useCallback(() => {
    if (!prayerSequence || prayerFrame !== null) return;
    if (!prayerReady) {
      setStatus('idle');
      resetPose();
      setLine('お参りの準備中です。少し待ってからタップしてね。');
      return;
    }
    const now = Date.now();
    if (now - lastActionRef.current < 700) return;
    lastActionRef.current = now;
    clearReactionTimers();
    clearLineTimer();
    clearPrayerTimer();
    setKind(null);
    setSpecialReaction(false);
    setReactionFrame(null);
    reactionMotion.setValue(0);
    specialMotion.setValue(0);
    resetPose();
    setStatus('reacting');
    setPrayerFrame(0);
    setLine(`${pet.name}のお参り。`);
    onBond();
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    let index = 0;
    prayerTimerRef.current = setInterval(() => {
      index += 1;
      if (index >= PRAYER_FRAME_COUNT) {
        clearPrayerTimer();
        setPrayerFrame(null);
        setStatus('idle');
        setLine('きれいにお参りできたな。');
        return;
      }
      setPrayerFrame(index);
      if (index === 19 || index === 27) haptic(Haptics.ImpactFeedbackStyle.Light);
    }, 90);
  }, [clearLineTimer, clearPrayerTimer, clearReactionTimers, haptic, onBond, pet.name, prayerFrame, prayerReady, prayerSequence, reactionMotion, resetPose, specialMotion]);

  const finishReaction = useCallback(() => {
    setReactionFrame(null);
    setSpecialReaction(false);
    setStatus('idle');
    reactionMotion.setValue(0);
    specialMotion.setValue(0);
    resetExpression();
    reactionAnimationRef.current = null;
  }, [reactionMotion, resetExpression, specialMotion]);

  const startReactionAnimation = useCallback((special: boolean, frame: number) => {
    if (!reactionFrames) return;
    clearReactionTimers();
    reactionMotion.setValue(0);
    specialMotion.setValue(0);
    setStatus('reacting');
    if (special) {
      setReactionFrame(null);
      reactionTimersRef.current.push(setTimeout(() => setReactionFrame(frame), 300));
      const specialSequence = Animated.sequence([
        Animated.timing(specialMotion, { toValue: 0.16, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver }),
        Animated.timing(specialMotion, { toValue: 0.48, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver }),
        Animated.timing(specialMotion, { toValue: 0.62, duration: 170, easing: Easing.out(Easing.back(1.8)), useNativeDriver }),
        Animated.timing(specialMotion, { toValue: 0.82, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.delay(650),
        Animated.timing(specialMotion, { toValue: 1, duration: 460, easing: Easing.inOut(Easing.cubic), useNativeDriver }),
      ]);
      const frameSequence = Animated.sequence([
        Animated.delay(300),
        Animated.timing(reactionMotion, { toValue: 1, duration: 2550, easing: Easing.linear, useNativeDriver }),
      ]);
      reactionAnimationRef.current = Animated.parallel([specialSequence, frameSequence]);
    } else {
      setReactionFrame(frame);
      reactionAnimationRef.current = Animated.timing(reactionMotion, {
        toValue: 1,
        duration: [760, 900, 920, 1500][frame] ?? 1100,
        easing: Easing.linear,
        useNativeDriver,
      });
    }
    reactionAnimationRef.current.start(({ finished }) => {
      if (finished) finishReaction();
    });
  }, [clearReactionTimers, finishReaction, reactionFrames, reactionMotion, specialMotion, useNativeDriver]);

  const release = useCallback((dx: number, dy: number) => {
    if (Math.hypot(dx, dy) < 4) {
      if (prayerSequence) {
        startPrayer();
        return;
      }
      triggerButtonReaction('pet');
      resetPose(() => setStatus('idle'));
      return;
    }

    const nextPullCount = pullCountRef.current + 1;
    pullCountRef.current = nextPullCount;
    const special = nextPullCount % 10 === 0;
    setReactionLine('pull', { special, keepStatus: true });
    onBond();
    haptic(special ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
    meshRef.current?.release();
    setStatus(reactionFrames ? 'reacting' : 'released');

    const frame = reactionFrames
      ? special
        ? reactionFrames.length - 1
        : (() => {
          const previous = lastReactionFrameRef.current;
          const next = previous < 0
            ? Math.floor(Math.random() * reactionFrames.length)
            : (previous + 1 + Math.floor(Math.random() * Math.max(1, reactionFrames.length - 1))) % reactionFrames.length;
          lastReactionFrameRef.current = next;
          return next;
        })()
      : -1;

    resetPose();
    if (reactionFrames && frame >= 0) {
      startReactionAnimation(special, frame);
    } else {
      clearReactionTimers();
      reactionTimersRef.current.push(setTimeout(() => {
        setStatus('idle');
        resetExpression();
      }, 550));
    }
  }, [clearReactionTimers, haptic, onBond, prayerSequence, reactionFrames, resetExpression, resetPose, setReactionLine, startPrayer, startReactionAnimation, triggerButtonReaction]);

  const finishPointerPull = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerReleaseRef.current = null;
    const { dx, dy } = smoothedPullRef.current;
    release(dx, dy);
  }, [release]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => prayerFrame === null,
    onMoveShouldSetPanResponder: () => prayerFrame === null,
    onStartShouldSetPanResponderCapture: () => prayerFrame === null && Platform.OS !== 'web',
    onMoveShouldSetPanResponderCapture: () => prayerFrame === null && Platform.OS !== 'web',
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      clearReactionTimers();
      setReactionFrame(null);
      setSpecialReaction(false);
      reactionMotion.setValue(0);
      specialMotion.setValue(0);
      draggingRef.current = true;
      pointerReleaseRef.current = finishPointerPull;
      mediumThresholdRef.current = false;
      strongHapticRef.current = false;
      smoothedPullRef.current = { dx: 0, dy: 0 };
      pullVelocityRef.current = { x: 0, y: 0 };
      lastMoveAtRef.current = Date.now();
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      pullTranslateX.stopAnimation();
      pullTranslateY.stopAnimation();
      pullRotation.stopAnimation();
      if (pullAsset) {
        meshRef.current?.begin(event.nativeEvent.locationX, event.nativeEvent.locationY);
      }
    },
    onPanResponderMove: (_event, gesture) => {
      const dx = gesture.dx;
      const dy = gesture.dy;
      const previous = smoothedPullRef.current;
      const now = Date.now();
      const deltaMs = Math.max(8, now - lastMoveAtRef.current);
      pullVelocityRef.current = {
        x: (dx - previous.dx) * 1000 / deltaMs,
        y: (dy - previous.dy) * 1000 / deltaMs,
      };
      smoothedPullRef.current = { dx, dy };
      lastMoveAtRef.current = now;

      const directionTilt = Math.max(-0.12, Math.min(0.12, dx / Math.max(1, 210) * 0.42));
      scaleX.setValue(1 + Math.min(0.2, Math.abs(dx) / 210 * 0.28));
      scaleY.setValue(1 - Math.min(0.08, Math.abs(dx) / 210 * 0.1));
      pullTranslateX.setValue(dx * 0.22);
      pullTranslateY.setValue(dy * 0.13);
      pullRotation.setValue(directionTilt);
      meshRef.current?.update(dx, dy);

      const magnitude = Math.hypot(dx, dy);
      if (magnitude >= 4) {
        setStatus('pulling');
        if (haptics) {
          if (!mediumThresholdRef.current) {
            mediumThresholdRef.current = true;
            haptic(Haptics.ImpactFeedbackStyle.Medium);
          }
          if (magnitude >= Math.max(70, 210 * 0.16) && !strongHapticRef.current) {
            strongHapticRef.current = true;
            haptic(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }
        if (pullAsset) {
          const expression = selectPullExpression(pullAsset, dx, dy, 210, sectorRef, strongRef);
          setEyeIndex(expression.eyeIndex);
          setMouthIndex(expression.mouthIndex);
        }
      }
    },
    onPanResponderRelease: finishPointerPull,
    onPanResponderTerminate: () => {
      if (Platform.OS === 'web') return;
      draggingRef.current = false;
      pointerReleaseRef.current = null;
      meshRef.current?.release();
      resetPose(() => setStatus('idle'));
      resetExpression();
    },
  }), [clearReactionTimers, finishPointerPull, haptic, haptics, meshRef, prayerFrame, pullAsset, pullRotation, pullTranslateX, pullTranslateY, reactionMotion, resetExpression, resetPose, scaleX, scaleY, specialMotion]);

  const triggerAccessibleReaction = useCallback(() => {
    release(Math.max(12, 210 * 0.08), 0);
  }, [release]);

  const isPullReaction = Boolean(reactionFrames && reactionFrame !== null);
  const isPrayer = prayerFrame !== null;
  const meshVisible = Platform.OS === 'web' && Boolean(pullAsset) && (status === 'pulling' || status === 'released');
  const showFixedAccessoryParts = status === 'pulling'
    || status === 'released'
    || (status === 'reacting' && specialReaction && reactionFrame === null && !isPrayer);
  const displayBody = status === 'idle' || !pullAsset ? pet.image : pullAsset.body;
  const defaultEye = pullAsset?.defaultEye ?? pullAsset?.eyes[0];
  const activeEye = pullAsset && (eyeIndex >= 0 ? pullAsset.eyes[eyeIndex] ?? defaultEye : defaultEye);
  const activeMouth = pullAsset && mouthIndex >= 0 ? pullAsset.mouths[mouthIndex] : null;
  const eyeFrame = pullAsset && (eyeIndex >= 0 ? pullAsset.eyeFrame : pullAsset.defaultEyeFrame ?? pullAsset.eyeFrame);
  const pullRotationDeg = pullRotation.interpolate({ inputRange: [-0.12, 0, 0.12], outputRange: ['-7deg', '0deg', '7deg'] });
  const bounceLift = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -13] });
  const totalTranslateY = Animated.add(float, bounceLift);
  const totalScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const reactionTranslateX = reactionMotion.interpolate({ inputRange: [0, 0.16, 0.32, 0.48, 0.68, 1], outputRange: [0, -4, 4, -3, 1, 0] });
  const reactionTranslateY = reactionMotion.interpolate({ inputRange: [0, 0.14, 0.32, 0.72, 1], outputRange: [4, -4, 0, 2, 0] });
  const reactionScaleX = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.95, 1.035, 1, 1] });
  const reactionScaleY = reactionMotion.interpolate({ inputRange: [0, 0.12, 0.28, 1], outputRange: [0.91, 1.045, 1, 1] });
  const reactionRotate = reactionMotion.interpolate({ inputRange: [0, 0.18, 0.36, 0.58, 1], outputRange: ['0deg', '-1.5deg', '1.5deg', '-0.7deg', '0deg'] });
  const specialScale = specialMotion.interpolate({ inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1], outputRange: [1, 0.9, 1.72, 1.65, 1.58, 1.58, 1] });
  const specialTranslateX = specialMotion.interpolate({ inputRange: [0, 0.42, 0.48, 0.54, 0.62, 0.7, 0.82, 1], outputRange: [0, 0, -10, 10, -7, 5, 0, 0] });
  const specialTranslateY = specialMotion.interpolate({ inputRange: [0, 0.16, 0.48, 0.62, 0.82, 0.9, 1], outputRange: [0, 6, -38, -30, -30, -30, 0] });

  return (
    <View style={styles.companion}>
      <View style={styles.bubble}>
        <Text accessibilityLiveRegion="polite" style={styles.bubbleText}>{line}</Text>
        <View style={styles.bubbleTail} />
      </View>
      <View style={styles.stage}>
        <Animated.View style={[styles.characterMotion, { transform: [{ translateX: specialTranslateX }, { translateY: specialTranslateY }, { scale: specialScale }] }]}>
          <Animated.View
            {...panResponder.panHandlers}
            nativeID="mobidou-companion-pull-target"
            onPointerDown={capturePointer}
            onPointerMove={preventPointerMove}
            accessibilityRole="button"
            accessibilityLabel={prayerSequence ? `${pet.name}。タップで二礼二拍手一礼` : pet.name + 'のほっぺを引っ張る'}
            accessibilityHint={prayerSequence ? 'タップでお参りのアクションを再生します。ドラッグするとほっぺが伸びます' : 'タップすると引っ張った時のリアクション、ドラッグするとほっぺの伸びを表示します'}
            onAccessibilityTap={prayerSequence ? startPrayer : triggerAccessibleReaction}
            style={[styles.characterSlot, {
              opacity: meshVisible || isPullReaction || isPrayer ? 0 : 1,
              transform: [{ translateX: pullTranslateX }, { translateY: totalTranslateY }, { rotate: pullRotationDeg }, { scaleX }, { scaleY }, { scale: totalScale }],
            }]}
          >
            {!meshVisible ? <Image pointerEvents="none" source={displayBody} style={styles.pet} contentFit="contain" transition={0} /> : null}
          </Animated.View>
          {pullAsset ? <MobbyPullMesh ref={meshRef} source={pullAsset.body} size={210} visible={meshVisible} /> : null}
          {prayerSequence ? <Animated.View pointerEvents="none" style={[styles.prayerLayer, { opacity: isPrayer ? 1 : 0, overflow: 'hidden', transform: [{ translateY: float }] }]}>
            {isMobibouPrayer ? MOBIBOU_ACTION_FRAMES.map((source, index) => {
              const [left, top, width, height] = MOBIBOU_PRAYER_FRAME_LAYOUTS[index];
              return (
                <Image
                  key={`prayer-${pet.id}-${index}`}
                  source={source}
                  contentFit="fill"
                  transition={0}
                  style={[styles.prayerFrame, { left, top, width, height, opacity: prayerFrame === index ? 1 : 0 }]}
                />
              );
            }) : prayerAtlas ? (['rei', 'hakushu'] as const).map(action => (
              <Image
                key={`${pet.id}/${action}`}
                source={prayerAtlas[action]}
                onLoad={() => setPrayerLoaded(previous => ({ ...previous, [`${pet.id}/${action}`]: true }))}
                contentFit="fill"
                transition={0}
                style={{ position: 'absolute', top: 0, left: -210 * ((prayerFrame ?? 0) % 8), width: 1680, height: 210,
                  opacity: PRAYER_ACTION_ORDER[Math.floor((prayerFrame ?? 0) / 8)] === action ? 1 : 0 }}
              />
            )) : null}
          </Animated.View> : null}
          {pullAsset?.fixedAccessoryParts ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.fixedParts, { opacity: showFixedAccessoryParts ? 1 : 0 }]}>
              <Image source={pullAsset.fixedAccessoryParts.lens} contentFit="contain" style={styles.overlayImage} />
              <Image source={pullAsset.fixedAccessoryParts.cross} contentFit="contain" style={styles.overlayImage} />
              <Image source={pullAsset.fixedAccessoryParts.buttonLeft} contentFit="contain" style={styles.overlayImage} />
              <Image source={pullAsset.fixedAccessoryParts.buttonRight} contentFit="contain" style={styles.overlayImage} />
            </View>
          ) : null}
          {!isPullReaction && pullAsset && activeEye && eyeFrame ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.faceLayer, { opacity: status === 'idle' || isPrayer ? 0 : 1 }]}>
              <Image source={activeEye} contentFit={eyeIndex >= 0 ? pullAsset.eyeResizeMode ?? 'contain' : 'contain'} style={pullFaceFrameStyle(eyeFrame, pullAsset, 210)} />
              {activeMouth ? <Image source={activeMouth} contentFit="contain" style={pullFaceFrameStyle(pullAsset.mouthFrame, pullAsset, 210)} /> : null}
            </View>
          ) : null}
          {reactionFrames ? (
            <Animated.View pointerEvents="none" style={[styles.reactionLayer, {
              opacity: isPullReaction ? 1 : 0,
              transform: [{ translateX: reactionTranslateX }, { translateY: reactionTranslateY }, { rotate: reactionRotate }, { scaleX: reactionScaleX }, { scaleY: reactionScaleY }],
            }]}>
              {reactionFrames.map((frame, index) => (
                <Image key={index} source={frame} contentFit="contain" transition={0} style={[styles.overlayImage, { opacity: reactionFrame === index ? 1 : 0 }]} />
              ))}
            </Animated.View>
          ) : null}
          {kind === 'pull' ? (
            <Animated.View pointerEvents="none" style={[styles.pullSpark, { opacity: reactionMotion.interpolate({ inputRange: [0, 0.08, 0.72, 1], outputRange: [0.1, 1, 0.55, 0], extrapolate: 'clamp' }), transform: [{ scale: reactionMotion.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1.1, 1.6], extrapolate: 'clamp' }) }] }]}>
              <Text style={styles.pullSparkText}>{specialReaction ? '✦' : '✧'}</Text>
            </Animated.View>
          ) : null}
        </Animated.View>
        {status !== 'idle' && !isPrayer ? <View pointerEvents="none" style={styles.pullStatus}><Text style={styles.pullStatusText}>{status === 'pulling' ? 'のびてる……' : specialReaction ? '10回目のスペシャル反応！' : 'びよーん！'}</Text></View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  companion: { alignItems: 'center', paddingTop: 12, marginHorizontal: -24, overflow: 'hidden', paddingBottom: 18 },
  bubble: { borderWidth: 1, borderColor: C.line, backgroundColor: C.bubble, borderRadius: 17, paddingHorizontal: 18, paddingVertical: 11, zIndex: 2, maxWidth: '88%' },
  bubbleText: { fontFamily: 'Shippori', fontSize: 13, color: '#5D554A', textAlign: 'center' },
  bubbleTail: { position: 'absolute', width: 10, height: 10, backgroundColor: C.bubble, borderBottomWidth: 1, borderRightWidth: 1, borderColor: C.line, transform: [{ rotate: '45deg' }], bottom: -6, alignSelf: 'center' },
  stage: { width: 270, height: 218, justifyContent: 'center', alignItems: 'center', marginTop: 7 },
  characterMotion: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center' },
  characterSlot: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center' },
  pet: { width: 210, height: 210 },
  fixedParts: { ...StyleSheet.absoluteFillObject },
  faceLayer: { ...StyleSheet.absoluteFillObject },
  reactionLayer: { ...StyleSheet.absoluteFillObject },
  prayerLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  // Mobibou's standalone PNG frames use a fixed measured placement; other
  // characters retain the existing atlas path below.
  prayerFrame: { position: 'absolute' },
  overlayImage: { ...StyleSheet.absoluteFillObject, width: 210, height: 210 },
  pullSpark: { position: 'absolute', top: -24, right: -15, alignItems: 'center', justifyContent: 'center' },
  pullSparkText: { color: C.gold, fontSize: 42, fontWeight: '700' },
  pullStatus: { position: 'absolute', bottom: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#FFF9EFDD', borderWidth: 1, borderColor: C.line },
  pullStatusText: { color: C.red, fontSize: 11, fontFamily: 'Shippori' },
});
