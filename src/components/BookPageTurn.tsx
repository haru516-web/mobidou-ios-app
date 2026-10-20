import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { playPageTurn } from '../services/audio';
import { captureView } from '../services/captureView';
import { Animated, Easing, PanResponder, Platform, StyleSheet, View, type PanResponderGestureState, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components';
import { NativeBookPageTurn, isNativePageCurlAvailable, type NativeBookPage } from './NativeBookPageTurn';

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
  /** Turning back from the first page calls this (to close the book) instead of wrapping to the last page. */
  onLeaveBook?: () => void;
  onOpenDetail?: (index: number) => void;
  nativePages?: NativeBookPage[];
  /** Pictures of the spreads from BookSpreadSnapshots (null: none yet). Leave undefined to use the app's own page turn only. */
  snapshots?: string[] | null;
  /** Reports the real size of the open book, so the pictures are taken at that size. */
  onViewportSize?: (size: { width: number; height: number }) => void;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_BOOK_HEIGHT = 340;
const STRIP_COUNT = 20;
const STRIP_STAGGER = 0.018;
const TURN_THRESHOLD = 0.34;
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
  const backOpacity = progress.interpolate({ inputRange: [0, 0.35, 0.56, 0.92, 1], outputRange: [0, 0.45, 1, 0.7, 0], extrapolate: 'clamp' });
  const highlightTravel = progress.interpolate({ inputRange: [0, 1], outputRange: [direction === 1 ? stripWidth * 0.72 : -stripWidth * 0.72, direction === 1 ? -stripWidth * 0.42 : stripWidth * 0.42], extrapolate: 'clamp' });
  const faceTransform = [{ perspective: PERSPECTIVE }, { translateX: fan }, { rotateY: angle }, { scale: depth }];
  const backTransform = [{ perspective: PERSPECTIVE }, { translateX: fan }, { rotateY: backAngle }, { scale: depth }];
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[S.stripClip, { left: stripLeft - 0.5, width: stripWidth + 1 }]}>
    <Animated.View style={[S.stripFace, { width: viewportWidth, left: -stripLeft + 0.5, transformOrigin: originPercent, transform: faceTransform }]}>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={S.stripContent}>{renderFront()}</View>
      <Animated.View pointerEvents="none" style={[S.stripShade, { opacity: shadeOpacity }]} />
      <Animated.View pointerEvents="none" style={[S.stripHighlight, direction === 1 ? S.stripHighlightRight : S.stripHighlightLeft, { opacity: highlightOpacity, transform: [{ translateX: highlightTravel }] }]} />
    </Animated.View>
    <Animated.View pointerEvents="none" style={[S.stripFace, S.paperBack, { width: viewportWidth, left: -stripLeft + 0.5, opacity: backOpacity, transformOrigin: originPercent, transform: backTransform }]}>
      <View style={S.paperFiber} />
      <View style={S.paperInnerShade} />
    </Animated.View>
  </View>;
}

const SimulatedBookPageTurn = forwardRef<BookPageTurnHandle, BookPageTurnProps>(function SimulatedBookPageTurn({ selectedIndex, itemCount, contentKey, renderSpread, onCommit, onBusyChange, onLeaveBook, style }, ref) {
  const closeGestureRef = useRef(false);
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
    if (commit) playPageTurn();
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: reducedMotion ? 180 : Math.max(160, Math.round(520 * remaining)),
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
    if (onLeaveBook && (direction === -1 ? currentIndexRef.current === 0 : currentIndexRef.current === itemCount - 1)) { onLeaveBook(); return; }
    animatingRef.current = true;
    activeDirectionRef.current = direction;
    setActiveDirection(direction);
    progressValueRef.current = 0;
    progress.setValue(0);
    onBusyChange?.(true);
    animateTo(1, true);
  }, [animateTo, itemCount, onLeaveBook, onBusyChange, progress, viewportWidth]);

  useImperativeHandle(ref, () => ({ turn }), [turn]);

  const finishGesture = useCallback((gesture: PanResponderGestureState) => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    const direction = activeDirectionRef.current;
    if (!direction) {
      const close = closeGestureRef.current;
      closeGestureRef.current = false;
      clearTurn();
      if (close) onLeaveBook?.();
      onBusyChange?.(false);
      return;
    }
    animatingRef.current = true;
    const shouldCommit = progressValueRef.current >= TURN_THRESHOLD || (Math.abs(gesture.vx) >= VELOCITY_THRESHOLD && Math.sign(gesture.vx) === -direction);
    animateTo(shouldCommit ? 1 : 0, shouldCommit);
  }, [animateTo, clearTurn, onLeaveBook, onBusyChange]);

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
      if (onLeaveBook && (direction === -1 ? currentIndexRef.current === 0 : currentIndexRef.current === itemCount - 1)) { closeGestureRef.current = Math.abs(gesture.dx) > viewportWidth * 0.2 || Math.abs(gesture.vx) > VELOCITY_THRESHOLD; return; }
      closeGestureRef.current = false;
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
  }), [finishGesture, itemCount, onLeaveBook, onBusyChange, progress, viewportWidth]);

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
        <Animated.View pointerEvents="none" style={[S.underPageShadow, { left: activeDirection === 1 ? pageWidth : 0, width: pageWidth, opacity: progress.interpolate({ inputRange: [0, 0.25, 0.65, 1], outputRange: [0, 0.22, 0.3, 0], extrapolate: 'clamp' }) }]} />
        <Animated.View pointerEvents="none" style={[S.staticOpposite, { left: activeDirection === 1 ? 0 : pageWidth, width: pageWidth, opacity: progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }]}>
          <View style={{ width: viewportWidth, left: activeDirection === 1 ? 0 : -pageWidth }}>{currentSpread()}</View>
        </Animated.View>
        {Array.from({ length: STRIP_COUNT }, (_, index) => <TurnStrip key={index} index={index} direction={activeDirection} progress={progress} pageStart={turningSideStart} stripWidth={stripWidth} viewportWidth={viewportWidth} renderFront={currentSpread} />)}
      </>}
    </View>}
  </View>;
});

/**
 * The iOS page-curl view draws its own plain paper and a different layout from the spread the app draws everywhere else
 * (the illustrated paper, the stamp on the left, the text on the right). So the curl turns pictures of the app's own spreads.
 */
const USE_NATIVE_PAGE_CURL = true;
const useSnapshotCurl = () => USE_NATIVE_PAGE_CURL && Platform.OS === 'ios' && isNativePageCurlAvailable;

const SNAPSHOT_FIRST_DELAY = 900;
/** Waits before each try of one spread: a try that comes out empty (the pictures inside were not loaded yet) is repeated, one spread at a time. */
const SNAPSHOT_RETRY_DELAYS = [0, 600, 1200, 2000, 3000];

/** Pictures are valid for one route and one set of acquired goshuin: change either and they are retaken. */
export function bookSnapshotKey(contentKey: string | undefined, pages: NativeBookPage[] | undefined, itemCount: number) {
  return `${contentKey ?? ''}|${itemCount}|${(pages ?? []).map(page => `${page.name}:${page.acquired}`).join(',')}`;
}

type SnapshotSize = { width: number; height: number };

type BookSpreadSnapshotsProps = {
  itemCount: number;
  contentKey?: string;
  nativePages?: NativeBookPage[];
  renderSpread: (index: number) => ReactNode;
  /** The spread the book opens on: it and its neighbours are photographed first. */
  currentIndex: number;
  /** The size the open book really has (reported by the page turn). Until it is known, the host measures its own width. */
  size: SnapshotSize | null;
  onSnapshots: (key: string, uris: string[]) => void;
};

/**
 * Photographs every spread of the book once, nearest the open page first, and reports the pictures ('' for one not taken yet).
 * It lives under the book cover, so the open page and its neighbours are ready before the cover is opened; a try that fails is
 * repeated for that spread only and never stops the others. Nothing here is visible: it is drawn at 2% opacity under the cover.
 */
export function BookSpreadSnapshots({ itemCount, contentKey, nativePages, renderSpread, currentIndex, size, onSnapshots }: BookSpreadSnapshotsProps) {
  const [measured, setMeasured] = useState<SnapshotSize>({ width: 0, height: 0 });
  const shots = useRef<(View | null)[]>([]);
  const currentRef = useRef(currentIndex);
  currentRef.current = currentIndex;
  const renderSpreadRef = useRef(renderSpread);
  renderSpreadRef.current = renderSpread;
  const onSnapshotsRef = useRef(onSnapshots);
  onSnapshotsRef.current = onSnapshots;
  const enabled = useSnapshotCurl();
  const width = size?.width ?? measured.width;
  const height = size?.height ?? (measured.height || DEFAULT_BOOK_HEIGHT);
  const key = bookSnapshotKey(contentKey, nativePages, itemCount);
  const signature = `${key}|${Math.round(width)}x${Math.round(height)}`;

  useEffect(() => {
    if (!enabled || width <= 0 || height <= 0 || itemCount < 2) return undefined;
    let cancelled = false;
    const taken: string[] = new Array(itemCount).fill('');
    const gaveUp = new Set<number>();
    const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
    (async () => {
      await wait(SNAPSHOT_FIRST_DELAY);
      while (!cancelled) {
        const current = currentRef.current;
        let next = -1;
        let best = Infinity;
        for (let index = 0; index < itemCount; index += 1) {
          if (taken[index] || gaveUp.has(index)) continue;
          // Nearest the open page first, and the page ahead before the one behind.
          const distance = Math.abs(index - current) + (index < current ? 0.5 : 0);
          if (distance < best) { best = distance; next = index; }
        }
        if (next < 0) break;
        let uri = '';
        let lastError: unknown = null;
        for (const delay of SNAPSHOT_RETRY_DELAYS) {
          if (delay > 0) await wait(delay);
          if (cancelled) return;
          try {
            const target = shots.current[next];
            if (!target) throw new Error('spread view missing');
            uri = await captureView(target);
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (cancelled) return;
        if (uri) {
          taken[next] = uri;
          onSnapshotsRef.current(key, taken.slice());
        } else {
          gaveUp.add(next);
          console.warn(`[page curl] spread ${next} could not be photographed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [signature, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled || itemCount < 2) return null;
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
    onLayout={event => { const { width: w, height: h } = event.nativeEvent.layout; setMeasured(previous => Math.abs(previous.width - w) < 1 && Math.abs(previous.height - h) < 1 ? previous : { width: w, height: h }); }}
    style={[S.snapshotHost, size ? { height: size.height } : null]}>
    {width > 0 && <View style={[S.offscreen, { left: 0, width }]}>
      {Array.from({ length: itemCount }, (_, index) => <View key={index} ref={node => { shots.current[index] = node; }} collapsable={false} style={{ position: 'absolute', left: 0, top: 0, width, height }}>{renderSpreadRef.current(index)}</View>)}
    </View>}
  </View>;
}

/**
 * The iOS page curl turning the app's own book with the pictures taken by BookSpreadSnapshots. The curl takes over as soon as the
 * open page and its two neighbours have pictures (usually already when the cover is opened); the rest follow while it is in use.
 * Until then, or when the pictures cannot be taken, the app's own page turn is shown.
 */
const SnapshotCurlBookPageTurn = forwardRef<BookPageTurnHandle, BookPageTurnProps>(function SnapshotCurlBookPageTurn(props, ref) {
  const { itemCount, snapshots, onViewportSize, style } = props;
  const [uris, setUris] = useState<string[] | null>(null);
  const turning = useRef(false);
  const unsent = useRef(false);
  const latest = useRef(snapshots);
  latest.current = snapshots;
  const currentRef = useRef(props.selectedIndex);
  currentRef.current = props.selectedIndex;

  // Hand the pictures to the curl once the open page and both neighbours exist; never while a page is turning.
  const publish = useCallback(() => {
    const taken = latest.current;
    if (!taken || taken.length !== itemCount) return;
    const current = Math.max(0, Math.min(currentRef.current, itemCount - 1));
    const needed = [current, current + 1, current - 1].filter(index => index >= 0 && index < itemCount);
    if (!needed.every(index => !!taken[index])) return;
    if (turning.current) { unsent.current = true; return; }
    unsent.current = false;
    setUris(taken.slice());
  }, [itemCount]);
  useEffect(() => { publish(); }, [publish, snapshots, props.selectedIndex]);

  const handleBusyChange = useCallback((busy: boolean) => {
    turning.current = busy;
    if (!busy && unsent.current) publish();
    props.onBusyChange?.(busy);
  }, [publish, props.onBusyChange]);

  return <View style={style} onLayout={event => { const { width, height } = event.nativeEvent.layout; onViewportSize?.({ width, height }); }}>
    {uris && uris.length === itemCount
      ? <NativeBookPageTurn forwardedRef={ref} spreadUris={uris} selectedIndex={props.selectedIndex} onCommit={index => { if (props.onLeaveBook && itemCount > 1 && ((props.selectedIndex === 0 && index === itemCount - 1) || (props.selectedIndex === itemCount - 1 && index === 0))) props.onLeaveBook(); else props.onCommit(index); }} onBusyChange={handleBusyChange} onOpenDetail={props.onOpenDetail} style={S.fill} />
      : <SimulatedBookPageTurn {...props} ref={ref} style={S.fill} />}
  </View>;
});

export const BookPageTurn = forwardRef<BookPageTurnHandle, BookPageTurnProps>(function BookPageTurn(props, ref) {
  if (useSnapshotCurl() && props.snapshots !== undefined) return <SnapshotCurlBookPageTurn {...props} ref={ref} />;
  return <SimulatedBookPageTurn {...props} ref={ref} />;
});

const S = StyleSheet.create({
  fill: { alignSelf: 'stretch', minHeight: 340 },
  offscreen: { position: 'absolute', top: 0 },
  // As wide as the open book (its frame is 12pt wider than the page column on each side); sits under the cover.
  snapshotHost: { position: 'absolute', left: -12, right: -12, top: 0, height: DEFAULT_BOOK_HEIGHT, opacity: 0.02 },
  viewport: { position: 'relative', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 4 },
  targetUnderlay: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  reducedTarget: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  staticOpposite: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  stripClip: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  stripFace: { position: 'absolute', top: 0, bottom: 0, backfaceVisibility: 'hidden' },
  stripContent: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  paperBack: { backgroundColor: '#F1E6D3', borderColor: '#D2B894', borderLeftWidth: 1, borderRightWidth: 1 },
  paperFiber: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF9EB', opacity: .22 },
  paperInnerShade: { position: 'absolute', left: '47%', top: 0, bottom: 0, width: '6%', backgroundColor: '#B9A27D', opacity: .12 },
  underPageShadow: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#3C281F' },
  stripShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#3C281F' },
  stripHighlight: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#FFF7E5' },
  stripHighlightRight: { right: -1 },
  stripHighlightLeft: { left: -1 },
});
