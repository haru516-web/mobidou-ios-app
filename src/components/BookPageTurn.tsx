import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type PanResponderGestureState, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components';

export type BookPageTurnDirection = 1 | -1;

export type BookPageTurnHandle = {
  turn: (direction: BookPageTurnDirection) => void;
};

type BookPageTurnProps = {
  selectedIndex: number;
  itemCount: number;
  contentKey?: string;
  renderSpread: (index: number) => ReactNode;
  onCommit: (index: number) => void;
  onBusyChange?: (busy: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

const STRIP_COUNT = 12;
const STRIP_STAGGER = 0.035;
const TURN_THRESHOLD = 0.22;
const VELOCITY_THRESHOLD = 0.45;
const PERSPECTIVE = 920;

function wrapIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function stripHold(index: number, direction: BookPageTurnDirection) {
  const outerFirst = direction === 1 ? STRIP_COUNT - 1 - index : index;
  return Math.max(0.001, outerFirst * STRIP_STAGGER);
}

function TurnStrip({ index, direction, progress, pageStart, stripWidth, viewportWidth, renderFront }: {
  index: number;
  direction: BookPageTurnDirection;
  progress: Animated.Value;
  pageStart: number;
  stripWidth: number;
  viewportWidth: number;
  renderFront: () => ReactNode;
}) {
  const stripLeft = pageStart + index * stripWidth;
  const origin = direction === 1 ? stripLeft : stripLeft + stripWidth;
  const originPercent = `${Math.max(0, Math.min(100, origin / viewportWidth * 100))}% 50%`;
  const hold = stripHold(index, direction);
  const angle = progress.interpolate({
    inputRange: [0, hold, 1],
    outputRange: ['0deg', '0deg', direction === 1 ? '-178deg' : '178deg'],
    extrapolate: 'clamp',
  });
  const backAngle = progress.interpolate({
    inputRange: [0, hold, 1],
    outputRange: [direction === 1 ? '180deg' : '-180deg', direction === 1 ? '180deg' : '-180deg', '0deg'],
    extrapolate: 'clamp',
  });
  // A tiny fan and lift keep neighboring strips from reading as one rigid
  // sheet while perspective gives the fold a little depth on web and native.
  const fan = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, direction * ((index - (STRIP_COUNT - 1) / 2) * 0.45), direction * ((index - (STRIP_COUNT - 1) / 2) * 0.22)],
    extrapolate: 'clamp',
  });
  const depth = progress.interpolate({ inputRange: [0, 0.52, 1], outputRange: [1, 1.018, 1], extrapolate: 'clamp' });
  const shadeOpacity = progress.interpolate({ inputRange: [0, 0.18, 0.55, 0.88, 1], outputRange: [0, 0.08, 0.34, 0.22, 0.04], extrapolate: 'clamp' });
  const highlightOpacity = progress.interpolate({ inputRange: [0, 0.14, 0.52, 0.9, 1], outputRange: [0, 0.28, 0.72, 0.36, 0.08], extrapolate: 'clamp' });
  const backOpacity = progress.interpolate({ inputRange: [0, 0.42, 0.72, 0.96, 1], outputRange: [0, 0.72, 0.96, 0.18, 0], extrapolate: 'clamp' });
  const highlightTravel = progress.interpolate({ inputRange: [0, 1], outputRange: [direction === 1 ? stripWidth * 0.72 : -stripWidth * 0.72, direction === 1 ? -stripWidth * 0.42 : stripWidth * 0.42], extrapolate: 'clamp' });
  const faceTransform = [{ perspective: PERSPECTIVE }, { translateX: fan }, { rotateY: angle }, { scale: depth }];
  const backTransform = [{ perspective: PERSPECTIVE }, { translateX: fan }, { rotateY: backAngle }, { scale: depth }];
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[S.stripClip, { left: stripLeft - 0.5, width: stripWidth + 1 }]}>
    <Animated.View style={[S.stripFace, { width: viewportWidth, left: -stripLeft + 0.5, transformOrigin: originPercent, transform: faceTransform }]}>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={S.stripContent}>{renderFront()}</View>
      <Animated.View pointerEvents="none" style={[S.stripShade, { opacity: shadeOpacity }]} />
      <Animated.View pointerEvents="none" style={[S.stripHighlight, direction === 1 ? S.stripHighlightRight : S.stripHighlightLeft, { opacity: highlightOpacity, transform: [{ translateX: highlightTravel }] }]} />
    </Animated.View>
    {/* The reverse face is intentionally blank: readable goshuin copy never
        appears mirrored while a strip is rotating through its backside. */}
    <Animated.View pointerEvents="none" style={[S.stripFace, S.paperBack, { width: viewportWidth, left: -stripLeft + 0.5, opacity: backOpacity, transformOrigin: originPercent, transform: backTransform }]} />
  </View>;
}

export const BookPageTurn = forwardRef<BookPageTurnHandle, BookPageTurnProps>(function BookPageTurn({ selectedIndex, itemCount, contentKey, renderSpread, onCommit, onBusyChange, style }, ref) {
  const reducedMotion = useReducedMotion();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [activeDirection, setActiveDirection] = useState<BookPageTurnDirection | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const activeDirectionRef = useRef<BookPageTurnDirection | null>(null);
  const currentIndexRef = useRef(selectedIndex);
  const progressValueRef = useRef(0);
  const gestureRef = useRef(false);
  const animatingRef = useRef(false);
  const animationRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    currentIndexRef.current = selectedIndex;
    if (!animatingRef.current && !gestureRef.current) return;
    // Route changes or an external index selection invalidate the old page
    // pair. Never let an old completion callback commit into the new route.
    animationRef.current?.stop();
    animationRef.current = null;
    gestureRef.current = false;
    animatingRef.current = false;
    activeDirectionRef.current = null;
    setActiveDirection(null);
    progressValueRef.current = 0;
    progress.setValue(0);
    onBusyChange?.(false);
  }, [contentKey, itemCount, onBusyChange, progress, selectedIndex]);

  useEffect(() => () => {
    animationRef.current?.stop();
    animationRef.current = null;
    onBusyChange?.(false);
  }, []);

  const clearTurn = useCallback(() => {
    animationRef.current = null;
    gestureRef.current = false;
    animatingRef.current = false;
    activeDirectionRef.current = null;
    setActiveDirection(null);
    progressValueRef.current = 0;
    progress.setValue(0);
  }, [progress]);

  const animateTo = useCallback((target: 0 | 1, commit: boolean) => {
    const direction = activeDirectionRef.current;
    if (!direction || viewportWidth <= 0 || itemCount < 2) {
      clearTurn();
      onBusyChange?.(false);
      return;
    }
    animationRef.current?.stop();
    const remaining = Math.max(0.08, Math.abs(target - progressValueRef.current));
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: reducedMotion ? 180 : Math.max(140, Math.round(430 * remaining)),
      easing: reducedMotion ? Easing.out(Easing.quad) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animationRef.current = animation;
    animation.start(({ finished }) => {
      if (animationRef.current !== animation) return;
      animationRef.current = null;
      if (!finished) return;
      if (commit) {
        const committedIndex = wrapIndex(currentIndexRef.current + direction, itemCount);
        // Commit the model index only after the visual animation reaches its
        // destination. The caller owns the selected-index state.
        onCommit(committedIndex);
      }
      clearTurn();
      onBusyChange?.(false);
    });
  }, [clearTurn, itemCount, onBusyChange, onCommit, progress, reducedMotion, viewportWidth]);

  const turn = useCallback((direction: BookPageTurnDirection) => {
    if (animatingRef.current || gestureRef.current || viewportWidth <= 0 || itemCount < 2) return;
    animatingRef.current = true;
    activeDirectionRef.current = direction;
    setActiveDirection(direction);
    progressValueRef.current = 0;
    progress.setValue(0);
    onBusyChange?.(true);
    animateTo(1, true);
  }, [animateTo, itemCount, onBusyChange, progress, viewportWidth]);

  useImperativeHandle(ref, () => ({ turn }), [turn]);

  const finishGesture = useCallback((gesture: PanResponderGestureState) => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    const direction = activeDirectionRef.current;
    if (!direction) {
      clearTurn();
      onBusyChange?.(false);
      return;
    }
    animatingRef.current = true;
    const shouldCommit = progressValueRef.current >= TURN_THRESHOLD || Math.abs(gesture.vx) >= VELOCITY_THRESHOLD;
    animateTo(shouldCommit ? 1 : 0, shouldCommit);
  }, [animateTo, clearTurn, onBusyChange]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => !animatingRef.current && !gestureRef.current && itemCount > 1 && Math.abs(gesture.dx) > Math.abs(gesture.dy) + 7 && Math.abs(gesture.dx) > 6,
    onPanResponderGrant: () => {
      if (animatingRef.current || itemCount < 2 || viewportWidth <= 0) return;
      gestureRef.current = true;
      activeDirectionRef.current = null;
      setActiveDirection(null);
      progress.stopAnimation(value => { progressValueRef.current = Number(value) || 0; });
      onBusyChange?.(true);
    },
    onPanResponderMove: (_, gesture) => {
      if (!gestureRef.current || animatingRef.current || viewportWidth <= 0) return;
      const direction: BookPageTurnDirection = gesture.dx < 0 ? 1 : -1;
      if (activeDirectionRef.current !== direction) {
        activeDirectionRef.current = direction;
        setActiveDirection(direction);
      }
      const value = Math.min(1, Math.max(0, Math.abs(gesture.dx) / viewportWidth));
      progressValueRef.current = value;
      progress.setValue(value);
    },
    onPanResponderRelease: (_, gesture) => finishGesture(gesture),
    onPanResponderTerminate: (_, gesture) => finishGesture(gesture),
    onPanResponderTerminationRequest: () => false,
  }), [finishGesture, itemCount, onBusyChange, progress, viewportWidth]);

  const targetIndex = activeDirection === null ? 0 : wrapIndex(selectedIndex + activeDirection, itemCount);
  const pageWidth = Math.max(1, viewportWidth / 2);
  const stripWidth = pageWidth / STRIP_COUNT;
  const turningSideStart = activeDirection === 1 ? pageWidth : 0;
  const webGestureStyle = Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as any) : null;
  const currentSpread = () => renderSpread(selectedIndex);
  return <View {...panResponder.panHandlers} onLayout={event => setViewportWidth(Math.max(0, event.nativeEvent.layout.width))} style={[S.viewport, style, webGestureStyle]}>
    {currentSpread()}
    {activeDirection !== null && viewportWidth > 0 && itemCount > 1 && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={S.overlay}>
      {reducedMotion ? <Animated.View style={[S.reducedTarget, { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [activeDirection * 24, 0], extrapolate: 'clamp' }) }] }]}>{renderSpread(targetIndex)}</Animated.View> : <>
        <View pointerEvents="none" style={S.targetUnderlay}>{renderSpread(targetIndex)}</View>
        <Animated.View pointerEvents="none" style={[S.staticOpposite, { left: activeDirection === 1 ? 0 : pageWidth, width: pageWidth, opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }]}>
          <View style={{ width: viewportWidth, left: activeDirection === 1 ? 0 : -pageWidth }}>{currentSpread()}</View>
        </Animated.View>
        {Array.from({ length: STRIP_COUNT }, (_, index) => <TurnStrip key={index} index={index} direction={activeDirection} progress={progress} pageStart={turningSideStart} stripWidth={stripWidth} viewportWidth={viewportWidth} renderFront={currentSpread} />)}
      </>}
    </View>}
  </View>;
});

const S = StyleSheet.create({
  viewport: { position: 'relative', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 4 },
  targetUnderlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  reducedTarget: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  staticOpposite: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  stripClip: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  stripFace: { position: 'absolute', top: 0, bottom: 0, backfaceVisibility: 'hidden' },
  stripContent: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  paperBack: { backgroundColor: '#F1E6D3', borderColor: '#D2B894', borderLeftWidth: 1, borderRightWidth: 1 },
  stripShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#3C281F' },
  stripHighlight: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#FFF7E5' },
  stripHighlightRight: { right: -1 },
  stripHighlightLeft: { left: -1 },
});
