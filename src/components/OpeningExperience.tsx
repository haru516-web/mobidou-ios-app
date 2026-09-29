import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BRUSH, C, SERIF } from '../components';

const OPENING_WORDMARK = require('../../assets/mobidou-wordmark-brush.webp');
const OPENING_EMBLEM = require('../../assets/mobidou-opening-emblem.webp');
const OPENING_TIMELINE = [
  { id: '0500-pre-dawn', time: '05:00', label: '明け方', image: require('../../assets/backgrounds/opening-cycle/01-0500-pre-dawn.webp') },
  { id: '0600-sunrise', time: '06:00', label: '朝焼け', image: require('../../assets/backgrounds/opening-cycle/02-0600-sunrise.webp') },
  { id: '0700-morning', time: '07:00', label: '朝', image: require('../../assets/backgrounds/opening-cycle/03-0700-morning.webp') },
  { id: '0830-morning', time: '08:30', label: '朝', image: require('../../assets/backgrounds/opening-cycle/04-0830-morning.webp') },
  { id: '1000-late-morning', time: '10:00', label: '午前', image: require('../../assets/backgrounds/opening-cycle/05-1000-late-morning.webp') },
  { id: '1130-before-noon', time: '11:30', label: '昼前', image: require('../../assets/backgrounds/opening-cycle/06-1130-before-noon.webp') },
  { id: '1300-noon', time: '13:00', label: '正午', image: require('../../assets/backgrounds/opening-cycle/07-1300-noon.webp') },
  { id: '1430-afternoon', time: '14:30', label: '午後', image: require('../../assets/backgrounds/opening-cycle/08-1430-afternoon.webp') },
  { id: '1600-late-afternoon', time: '16:00', label: '昼下がり', image: require('../../assets/backgrounds/opening-cycle/09-1600-late-afternoon.webp') },
  { id: '1730-golden-hour', time: '17:30', label: '黄金時間', image: require('../../assets/backgrounds/opening-cycle/10-1730-golden-hour.webp') },
  { id: '1830-sunset', time: '18:30', label: '夕陽', image: require('../../assets/backgrounds/opening-cycle/11-1830-sunset.webp') },
  { id: '1930-blue-hour', time: '19:30', label: '宵', image: require('../../assets/backgrounds/opening-cycle/12-1930-blue-hour.webp') },
  { id: '2100-night', time: '21:00', label: '夜', image: require('../../assets/backgrounds/opening-cycle/13-2100-night.webp') },
  { id: '2300-late-night', time: '23:00', label: '月夜', image: require('../../assets/backgrounds/opening-cycle/14-2300-late-night.webp') },
  { id: '0200-midnight', time: '02:00', label: '深夜', image: require('../../assets/backgrounds/opening-cycle/15-0200-midnight.webp') },
  { id: '0430-before-dawn', time: '04:30', label: '夜明け前', image: require('../../assets/backgrounds/opening-cycle/16-0430-before-dawn.webp') },
] as const;

function OpeningScene({ scene, width, frameIndex, progress }: { scene: (typeof OPENING_TIMELINE)[number]; width: number; frameIndex: number; progress: Animated.Value }) {
  const lastFrameIndex = OPENING_TIMELINE.length - 1;
  const inputRange = frameIndex === 0
    ? [0, 1]
    : frameIndex === lastFrameIndex
      ? [lastFrameIndex - 1, lastFrameIndex]
      : [frameIndex - 1, frameIndex, frameIndex + 1];
  const outputRange = frameIndex === 0
    ? [1, 0]
    : frameIndex === lastFrameIndex
      ? [0, 1]
      : [0, 1, 0];
  return <Animated.View style={[S.openingScene, { width, opacity: progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' }) }]}>
    <Image source={scene.image} contentFit="cover" style={S.openingSceneImage} />
  </Animated.View>;
}

export function OpeningExperience({ onEnter, error }: { onEnter: () => void; error?: string | null }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const frameProgress = useRef(new Animated.Value(0)).current;
  const enteringRef = useRef(false);
  const autoRunningRef = useRef(false);
  const gestureCommittedRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAnimationRef = useRef<{ stop: () => void } | null>(null);

  const complete = useCallback(() => {
    if (enteringRef.current) return;
    enteringRef.current = true;
    settleTimerRef.current = setTimeout(onEnter, 420);
  }, [onEnter]);

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    autoAnimationRef.current?.stop();
  }, []);

  useEffect(() => {
    const listenerId = frameProgress.addListener(({ value }) => {
      if (!autoRunningRef.current) return;
      const visualIndex = Math.max(0, Math.min(OPENING_TIMELINE.length - 1, Math.round(value)));
      if (visualIndex !== indexRef.current) {
        indexRef.current = visualIndex;
        setIndex(visualIndex);
      }
    });
    return () => frameProgress.removeListener(listenerId);
  }, [frameProgress]);

  const startAutoJourney = useCallback(() => {
    if (width <= 0 || autoRunningRef.current || enteringRef.current) return;
    autoRunningRef.current = true;
    gestureCommittedRef.current = true;
    frameProgress.stopAnimation();
    const startIndex = indexRef.current;
    const finalIndex = OPENING_TIMELINE.length - 1;
    setIndex(startIndex);
    const animation = Animated.timing(frameProgress, {
      toValue: finalIndex,
      duration: 4000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    autoAnimationRef.current = animation;
    animation.start(({ finished }) => {
      autoAnimationRef.current = null;
      if (!finished) return;
      indexRef.current = finalIndex;
      setIndex(finalIndex);
      complete();
    });
  }, [complete, frameProgress, width]);

  const finishGesture = useCallback((gesture: { dx: number; dy: number }) => {
    if (width <= 0 || autoRunningRef.current) return;
    if (gestureCommittedRef.current) {
      gestureCommittedRef.current = false;
      return;
    }
    // A tap starts the journey as well as a swipe.
    startAutoJourney();
  }, [startAutoJourney, width]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !enteringRef.current && !autoRunningRef.current,
    onStartShouldSetPanResponderCapture: () => !enteringRef.current && !autoRunningRef.current,
    onMoveShouldSetPanResponder: (_, gesture) => !enteringRef.current && !autoRunningRef.current && Math.hypot(gesture.dx, gesture.dy) > 4,
    onMoveShouldSetPanResponderCapture: (_, gesture) => !enteringRef.current && !autoRunningRef.current && Math.hypot(gesture.dx, gesture.dy) > 4,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      gestureCommittedRef.current = false;
      frameProgress.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => {
      if (width <= 0 || autoRunningRef.current) return;
      if (gestureCommittedRef.current) return;
      const threshold = Math.max(48, width * .18);
      if (Math.hypot(gesture.dx, gesture.dy) >= threshold) {
        gestureCommittedRef.current = true;
        startAutoJourney();
      }
    },
    onPanResponderRelease: (_, gesture) => finishGesture(gesture),
    onPanResponderTerminate: (_, gesture) => finishGesture(gesture),
  }), [finishGesture, frameProgress, startAutoJourney, width]);

  return <SafeAreaView
    accessibilityLabel="オープニング。画面をタップ、または上下左右にスライドして開始"
    accessibilityHint="どの方向にスライドしても、16枚の背景が時間の流れに沿って切り替わり、その後アプリを開始します"
    style={[S.opening, Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as any) : null]}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    {...pan.panHandlers}
  >
    <View pointerEvents="none" style={[S.openingTrack, { width: Math.max(1, width) }]}>
      {OPENING_TIMELINE.map((scene, sceneIndex) => <OpeningScene key={scene.id} scene={scene} width={width} frameIndex={sceneIndex} progress={frameProgress} />)}
    </View>
    <View pointerEvents="none" style={S.openingContent}>
      <View style={S.openingMiddleSpace}>
        <Image source={OPENING_WORDMARK} contentFit="contain" style={S.openingCenterWordmark} />
        <Image source={OPENING_EMBLEM} contentFit="contain" style={S.openingEmblem} />
      </View>
      <View style={S.openingCopy}>
        <Text style={S.openingTagline}>歩くたび、小さな旅。</Text>
        <Text style={S.openingSubline}>モビーと歩いて、もびの世界へ。</Text>
        <Text style={S.openingStage}>{OPENING_TIMELINE[index].time}  {OPENING_TIMELINE[index].label}</Text>
     </View>
     {!!error && <Text style={[S.errorText, S.openingError]}>{error}</Text>}
      <Text style={S.openingSwipeHint}>画面をタップ、またはスライドしてね</Text>
    </View>
  </SafeAreaView>;
}

const S = StyleSheet.create({
  opening: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: '#F8EEDC', overflow: 'hidden' },
  openingTrack: { ...StyleSheet.absoluteFillObject },
  openingScene: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  openingSceneImage: { ...StyleSheet.absoluteFillObject },
  openingContent: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 22 },
  openingMiddleSpace: { flex: 1, minHeight: 290, width: '100%', alignItems: 'center', justifyContent: 'center' },
  openingCenterWordmark: { width: 190, height: 58, marginBottom: 8 },
  openingEmblem: { width: 220, height: 220, opacity: .96 },
  openingCopy: { alignItems: 'center', paddingHorizontal: 12, marginBottom: 13 },
  openingTagline: { fontFamily: BRUSH, fontSize: 25, letterSpacing: 3, color: C.ink, textShadowColor: '#FFF9EFE6', textShadowRadius: 8 },
  openingSubline: { fontSize: 12, letterSpacing: 1.5, color: '#5E4636', marginTop: 9, textShadowColor: '#FFF9EFE6', textShadowRadius: 6 },
  openingStage: { fontFamily: SERIF, fontSize: 12, letterSpacing: 2.5, color: '#765E4B', marginTop: 13 },
  openingError: { marginBottom: 10, textAlign: 'center' },
  openingSwipeHint: { fontFamily: BRUSH, fontSize: 16, color: '#FFF9EF', letterSpacing: 1.2, marginTop: 4, marginBottom: 4, textShadowColor: '#3A2D27AA', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  errorText: { color: '#813D31', flexShrink: 1, fontSize: 12, lineHeight: 19 },
});
