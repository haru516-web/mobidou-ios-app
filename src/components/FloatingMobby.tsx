import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable as RNPressable, StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import type { PetId } from '../petCatalog';
import { PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import rawWalkMetrics from '../data/pilgrimageSpriteMetrics.json';
import { C, Icon } from '../components';
import { WashiPressable as Pressable } from './Washi';

// v5: the default spot moved off the old menu button.
const STORAGE_KEY = 'mobidou.floating-mobby-position.v5';
const DEFAULT_Y_RATIO = 0.4;
const MOBBY_SIZE = 88;
const EDGE_GUTTER = 8;
const TOP_CLEARANCE = 64;
const GUIDE_WIDTH = 260;
const WALK_DISPLAY_HEIGHT = MOBBY_SIZE - 6;

type WalkMetric = {
  columns: number;
  width: number;
  height: number;
  cellWidth: number;
  left: number;
  top: number;
  cropWidth: number;
  cropHeight: number;
};

const walkMetrics = rawWalkMetrics as Record<string, WalkMetric>;

type Point = { x: number; y: number };
type LayoutSize = { width: number; height: number };

export type MobbyGuideAction = {
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  primary?: boolean;
};

/** What Mobby says when tapped: one situational line plus shortcuts. */
export type MobbyGuide = {
  message: string;
  actions: readonly MobbyGuideAction[];
  /** Shows a small dot on Mobby when there is something worth doing now. */
  attention?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampPosition(point: Point, layout: LayoutSize, bottomInset: number): Point {
  return {
    x: clamp(point.x, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.width - MOBBY_SIZE - EDGE_GUTTER)),
    y: clamp(point.y, TOP_CLEARANCE, Math.max(TOP_CLEARANCE, layout.height - MOBBY_SIZE - bottomInset)),
  };
}

function pointerPoint(event: any): Point | null {
  const nativeEvent = event?.nativeEvent ?? event;
  const touch = nativeEvent?.touches?.[0] ?? nativeEvent?.changedTouches?.[0];
  const source = touch ?? nativeEvent;
  const x = typeof source?.clientX === 'number' ? source.clientX : source?.pageX;
  const y = typeof source?.clientY === 'number' ? source.clientY : source?.pageY;
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
}

function pointerId(event: any): number | null {
  const id = event?.nativeEvent?.pointerId ?? event?.pointerId;
  return typeof id === 'number' ? id : null;
}

export function speechEnding(petId: PetId) {
  if (petId === 'mobibou') return 'だぜ';
  if (petId === 'reamobby' || petId === 'uyumobby' || petId === 'lanimobby') return 'だにゃん';
  if (petId === 'mobirin') return 'ですぞ';
  if (petId === 'mobichi') return 'だよ〜';
  if (petId === 'yami') return 'だよ…';
  if (petId === 'mobiyura') return 'なのだ';
  return 'だよ';
}

function WalkFrame({ source, petId, frame }: { source: ImageSourcePropType; petId: PetId; frame: number }) {
  const metric = walkMetrics[`${petId}/walk`];
  if (!metric) return null;
  // The metrics describe the shared silhouette bounds for the whole sheet.
  // Fit that bound into the same 88px box as the idle pet so tall and small
  // characters keep a stable baseline while the four source frames change.
  // Snap the source cell to an integer display width. Keeping the image and
  // its one-cell viewport on the same pixel grid prevents the texture filter
  // from sampling the previous/next frame at a fractional boundary.
  const targetScale = WALK_DISPLAY_HEIGHT / metric.cropHeight;
  const frameWidth = Math.max(1, Math.round(metric.cellWidth * targetScale));
  const scale = frameWidth / metric.cellWidth;
  const displayHeight = metric.cropHeight * scale;
  const cropWidth = metric.cropWidth * scale;
  const frameLeft = (MOBBY_SIZE - cropWidth) / 2 - metric.left * scale;
  const top = (MOBBY_SIZE - displayHeight) / 2 - metric.top * scale;
  return <View pointerEvents="none" style={{ width: MOBBY_SIZE, height: MOBBY_SIZE, overflow: 'hidden' }}>
    <View pointerEvents="none" style={{ position: 'absolute', left: frameLeft, top: 0, width: frameWidth, height: MOBBY_SIZE, overflow: 'hidden' }}>
      <Image pointerEvents="none" source={source} contentFit="fill" style={{ position: 'absolute', left: -metric.cellWidth * frame * scale, top, width: metric.width * scale, height: metric.height * scale }} />
    </View>
  </View>;
}

/**
 * The companion that floats over every tab. It can be dragged anywhere, and a
 * tap opens a small guide: what to do next, with shortcuts. Navigation itself
 * lives in the tab bar and segmented controls, so Mobby is never required.
 */
export function FloatingMobby({ image, name, petId, guide, open, onOpenChange, bottomInset, resetPositionOnMount = false }: { image: ImageSourcePropType; name: string; petId: PetId; guide: MobbyGuide; open: boolean; onOpenChange: (open: boolean) => void; bottomInset: number; resetPositionOnMount?: boolean }) {
  const [layout, setLayout] = useState<LayoutSize>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [guideHeight, setGuideHeight] = useState(0);
  const savedRatioRef = useRef<Point | null>(null);
  const initializedRef = useRef(false);
  const positionRef = useRef(position);
  const dragStartRef = useRef(position);
  const pointerStartRef = useRef(position);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const guideProgress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const walkSource = PILGRIMAGE_WALK_ATLASES[petId];
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);

  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    if (!walking) {
      setWalkFrame(0);
      return undefined;
    }
    const timer = setInterval(() => setWalkFrame(value => (value + 1) % PILGRIMAGE_WALK_FRAME_COUNT), 135);
    return () => clearInterval(timer);
  }, [walking]);

  useEffect(() => {
    const animation = Animated.timing(guideProgress, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [open, guideProgress]);

  useEffect(() => {
    if (resetPositionOnMount) {
      savedRatioRef.current = null;
      setHydrated(true);
      return undefined;
    }
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!active || !raw) return;
      try {
        const stored = JSON.parse(raw) as { xRatio?: unknown; yRatio?: unknown };
        if (typeof stored.xRatio === 'number' && typeof stored.yRatio === 'number') {
          savedRatioRef.current = { x: clamp(stored.xRatio, 0, 1), y: clamp(stored.yRatio, 0, 1) };
        }
      } catch {
        // Ignore malformed saved state and use the default position.
      }
    }).catch(() => undefined).finally(() => {
      if (active) setHydrated(true);
    });
    return () => { active = false; };
  }, [resetPositionOnMount]);

  useEffect(() => {
    if (!hydrated || !layout.width || !layout.height) return;
    if (!initializedRef.current) {
      const saved = resetPositionOnMount ? null : savedRatioRef.current;
      // Default: the right edge at about 40% height. On ホーム that is beside
      // the companion's stage rather than over the cards or the tab bar.
      const initial = saved
        ? { x: saved.x * layout.width, y: saved.y * layout.height }
        : { x: layout.width - MOBBY_SIZE - EDGE_GUTTER, y: layout.height * DEFAULT_Y_RATIO };
      const next = clampPosition(initial, layout, bottomInset);
      initializedRef.current = true;
      positionRef.current = next;
      setPosition(next);
      return;
    }
    const next = clampPosition(positionRef.current, layout, bottomInset);
    positionRef.current = next;
    setPosition(next);
  }, [hydrated, layout, resetPositionOnMount, bottomInset]);

  const persist = useCallback((point: Point) => {
    if (!layout.width || !layout.height) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      xRatio: point.x / layout.width,
      yRatio: point.y / layout.height,
    })).catch(() => undefined);
  }, [layout]);

  const updatePosition = useCallback((dx: number, dy: number) => {
    const next = clampPosition({ x: dragStartRef.current.x + dx, y: dragStartRef.current.y + dy }, layout, bottomInset);
    positionRef.current = next;
    setPosition(next);
  }, [layout, bottomInset]);

  const finishDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    persist(positionRef.current);
  }, [persist]);

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    movedRef.current = false;
    dragStartRef.current = positionRef.current;
  }, []);

  const markMoved = useCallback(() => {
    if (movedRef.current) return;
    movedRef.current = true;
    setWalking(true);
    // Dragging and a guide pinned to the old spot don't mix.
    if (open) onOpenChange(false);
  }, [onOpenChange, open]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => Platform.OS !== 'web',
    onMoveShouldSetPanResponderCapture: () => Platform.OS !== 'web',
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: startDrag,
    onPanResponderMove: (_event, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) > 4) markMoved();
      updatePosition(gesture.dx, gesture.dy);
    },
    onPanResponderRelease: () => {
      const didMove = movedRef.current;
      finishDrag();
      setWalking(false);
      if (!didMove) toggle();
    },
    onPanResponderTerminate: () => { finishDrag(); setWalking(false); },
  }), [finishDrag, markMoved, startDrag, toggle, updatePosition]);

  const webHandlers = Platform.OS === 'web' ? ({
    onPointerDown: (event: any) => {
      const point = pointerPoint(event);
      const nativeEvent = event?.nativeEvent ?? event;
      if (!point || (nativeEvent?.button != null && nativeEvent.button !== 0)) return;
      startDrag();
      pointerStartRef.current = point;
      activePointerIdRef.current = pointerId(event);
      if (activePointerIdRef.current != null) event.currentTarget?.setPointerCapture?.(activePointerIdRef.current);
    },
    onPointerMove: (event: any) => {
      if (!draggingRef.current) return;
      const id = pointerId(event);
      if (activePointerIdRef.current != null && id != null && id !== activePointerIdRef.current) return;
      const point = pointerPoint(event);
      if (!point) return;
      event.preventDefault?.();
      if (Math.hypot(point.x - pointerStartRef.current.x, point.y - pointerStartRef.current.y) > 4) markMoved();
      updatePosition(point.x - pointerStartRef.current.x, point.y - pointerStartRef.current.y);
    },
    onPointerUp: (event: any) => {
      const id = activePointerIdRef.current;
      const didMove = movedRef.current;
      activePointerIdRef.current = null;
      finishDrag();
      setWalking(false);
      if (id != null) event.currentTarget?.releasePointerCapture?.(id);
      if (!didMove) toggle();
    },
    onPointerCancel: () => { movedRef.current = false; finishDrag(); setWalking(false); },
    onLostPointerCapture: () => { finishDrag(); setWalking(false); },
  } as any) : panResponder.panHandlers;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  // The guide opens above Mobby when there is room, otherwise below it, and
  // is kept inside the screen horizontally.
  const guideLeft = clamp(position.x + MOBBY_SIZE / 2 - GUIDE_WIDTH / 2, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.width - GUIDE_WIDTH - EDGE_GUTTER));
  const guideAbove = position.y - guideHeight - 10 >= EDGE_GUTTER;
  const guideTop = guideAbove ? position.y - guideHeight - 10 : position.y + MOBBY_SIZE + 6;
  const tailLeft = clamp(position.x + MOBBY_SIZE / 2 - guideLeft - 8, 16, GUIDE_WIDTH - 32);
  const animatedGuideStyle = {
    opacity: guideProgress,
    transform: [
      { translateY: guideProgress.interpolate({ inputRange: [0, 1], outputRange: [guideAbove ? 8 : -8, 0] }) },
      { scale: guideProgress.interpolate({ inputRange: [0, 1], outputRange: [.96, 1] }) },
    ],
  };
  const petVisual = walking
    ? walkSource
      ? <WalkFrame source={walkSource} petId={petId} frame={walkFrame} />
      : <Animated.View style={[styles.walkFallback, { transform: [{ translateY: [-1, 1, 0, -1][walkFrame] }, { rotate: ['-2deg', '2deg', '0deg', '-1deg'][walkFrame] }, { scaleX: [1, .96, 1.02, 1][walkFrame] }] }]}><Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} /></Animated.View>
    : <Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} />;

  return <View pointerEvents="box-none" onLayout={handleLayout} style={styles.overlay}>
    {open && <RNPressable accessibilityRole="button" accessibilityLabel={`${name}の案内を閉じる`} onPress={() => onOpenChange(false)} style={StyleSheet.absoluteFill} />}
    {initializedRef.current ? <View
      {...webHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${name}。タップで案内を${open ? '閉じる' : 'ひらく'}`}
      accessibilityHint="ドラッグで画面内の好きな場所へ動かせます"
      accessibilityState={{ expanded: open }}
      onAccessibilityTap={toggle}
      style={[styles.anchor, { left: position.x, top: position.y }, Platform.OS === 'web' && styles.webDrag]}
    >
      <View pointerEvents="none" style={styles.shadow} />
      {petVisual}
      {guide.attention && !open && <View pointerEvents="none" style={styles.attention} />}
    </View> : null}
    {initializedRef.current ? <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      aria-hidden={!open ? true : undefined}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      onLayout={event => { const height = event.nativeEvent.layout.height; setGuideHeight(previous => previous === height ? previous : height); }}
      style={[styles.guide, { left: guideLeft, top: guideTop }, animatedGuideStyle]}
    >
      <View style={[styles.guideTail, guideAbove ? styles.guideTailBelow : styles.guideTailAbove, { left: tailLeft }]} />
      <Text style={styles.guideMessage}>{guide.message}</Text>
      {guide.actions.map(action => <Pressable key={action.label} artwork={false} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => { onOpenChange(false); action.onPress(); }} style={[styles.guideAction, action.primary && styles.guideActionPrimary]}>
        <Icon name={action.icon} size={18} color={action.primary ? '#FFF9EF' : C.red} />
        <Text numberOfLines={1} style={[styles.guideActionText, action.primary && styles.guideActionTextPrimary]}>{action.label}</Text>
        <Icon name="chevron-forward" size={15} color={action.primary ? '#FFF9EFCC' : '#B09A86'} />
      </Pressable>)}
    </Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 55 },
  anchor: { position: 'absolute', width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  image: { width: 82, height: 82 },
  shadow: { position: 'absolute', bottom: 4, width: 49, height: 8, borderRadius: 20, backgroundColor: '#4A3B3025' },
  attention: { position: 'absolute', top: 8, right: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: C.red, borderWidth: 2, borderColor: '#FFF9EF' },
  webDrag: { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any,
  walkFallback: { width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  guide: { position: 'absolute', width: GUIDE_WIDTH, padding: 12, gap: 8, zIndex: 60, borderRadius: 18, borderWidth: 1, borderColor: '#D8C8B3', backgroundColor: '#FFF9EF', shadowColor: '#5B4433', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  guideTail: { position: 'absolute', width: 16, height: 16, backgroundColor: '#FFF9EF', borderColor: '#D8C8B3', transform: [{ rotate: '45deg' }] },
  guideTailBelow: { bottom: -8, borderRightWidth: 1, borderBottomWidth: 1 },
  guideTailAbove: { top: -8, borderLeftWidth: 1, borderTopWidth: 1 },
  guideMessage: { color: '#4E3A2D', fontFamily: 'ShipporiBold', fontSize: 15, lineHeight: 22, paddingHorizontal: 2, paddingBottom: 2 },
  guideAction: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E7DCCB' },
  guideActionPrimary: { backgroundColor: C.red, borderColor: C.red },
  guideActionText: { flex: 1, color: '#5E4A3C', fontFamily: 'ShipporiBold', fontSize: 14 },
  guideActionTextPrimary: { color: '#FFF9EF' },
});
