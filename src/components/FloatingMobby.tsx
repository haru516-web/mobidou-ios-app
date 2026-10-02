import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable as RNPressable, StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { Image } from './AppImage';
import type { PetId } from '../petCatalog';
import { PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import rawWalkMetrics from '../data/pilgrimageSpriteMetrics.json';
import { Icon } from '../components';
import type { PopButtonId } from '../data/popButtonImages';
import { PopButton } from './PopButton';
import { layoutMenuSlots } from './mobbyMenuLayout';
import { UI_ART } from '../data/uiArt';

// v6: positions are remembered per screen (spotKey); the old single spot is dropped.
const STORAGE_KEY = 'mobidou.floating-mobby-position.v6';
const MOBBY_SIZE = 88;
const EDGE_GUTTER = 8;
const TOP_CLEARANCE = 64;
const MENU_RADIUS = 134;
const MENU_ITEM_WIDTH = 82;
const MENU_ITEM_HEIGHT = 92;
const MENU_DISC_CENTER_Y = 32;
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

/** Where Mobby rests on a screen until the person parks it somewhere else. */
export type MobbySpot = { side: 'left' | 'right'; from: 'top' | 'bottom'; offset: number };

export type MobbyMenuItem = {
  id: PopButtonId;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  badge?: number;
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
export function FloatingMobby({ image, name, petId, items, badge = 0, open, onOpenChange, bottomInset, spotKey, spot, resetPositionOnMount = false, dragLocked = false }: { image: ImageSourcePropType; name: string; petId: PetId; items: readonly MobbyMenuItem[]; badge?: number; open: boolean; onOpenChange: (open: boolean) => void; bottomInset: number; spotKey: string; spot: MobbySpot; resetPositionOnMount?: boolean; /** Keep the Mobby where it is (taps still work), e.g. while a tutorial asks for a tap. */ dragLocked?: boolean }) {
  const dragLockedRef = useRef(dragLocked);
  dragLockedRef.current = dragLocked;
  const [layout, setLayout] = useState<LayoutSize>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const [menuMounted, setMenuMounted] = useState(open);
  const savedRatiosRef = useRef<Record<string, Point>>({});
  const appliedKeyRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const positionRef = useRef(position);
  const dragStartRef = useRef(position);
  const pointerStartRef = useRef(position);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const menuProgress = useRef(new Animated.Value(open ? 1 : 0)).current;
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
    if (open) setMenuMounted(true);
    const animation = open
      ? Animated.spring(menuProgress, { toValue: 1, damping: 14, stiffness: 170, mass: .8, useNativeDriver: Platform.OS !== 'web' })
      : Animated.timing(menuProgress, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start(({ finished }) => { if (finished && !open) setMenuMounted(false); });
    return () => animation.stop();
  }, [open, menuProgress]);

  useEffect(() => {
    if (resetPositionOnMount) {
      savedRatiosRef.current = {};
      setHydrated(true);
      return undefined;
    }
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!active || !raw) return;
      try {
        const stored = JSON.parse(raw) as { spots?: Record<string, { xRatio?: unknown; yRatio?: unknown }> };
        for (const [key, value] of Object.entries(stored.spots ?? {})) {
          if (typeof value?.xRatio === 'number' && typeof value?.yRatio === 'number') savedRatiosRef.current[key] = { x: clamp(value.xRatio, 0, 1), y: clamp(value.yRatio, 0, 1) };
        }
      } catch {
        // Ignore malformed saved state and use the default position.
      }
    }).catch(() => undefined).finally(() => {
      if (active) setHydrated(true);
    });
    return () => { active = false; };
  }, [resetPositionOnMount]);

  const restingPoint = useCallback((): Point => {
    const saved = resetPositionOnMount ? undefined : savedRatiosRef.current[spotKey];
    if (saved) return { x: saved.x * layout.width, y: saved.y * layout.height };
    return {
      x: spot.side === 'right' ? layout.width - MOBBY_SIZE - EDGE_GUTTER : EDGE_GUTTER,
      y: spot.from === 'top' ? spot.offset : layout.height - bottomInset - MOBBY_SIZE - spot.offset,
    };
  }, [layout.width, layout.height, bottomInset, resetPositionOnMount, spot.from, spot.offset, spot.side, spotKey]);

  // Go to this screen's resting spot (or where the person last parked Mobby
  // on it), and follow the spot while the layout settles.
  useEffect(() => {
    if (!hydrated || !layout.width || !layout.height) return;
    if (draggingRef.current) return;
    const keyChanged = appliedKeyRef.current !== spotKey;
    const parked = !!savedRatiosRef.current[spotKey] && !resetPositionOnMount;
    if (!keyChanged && parked) {
      const next = clampPosition(positionRef.current, layout, bottomInset);
      positionRef.current = next;
      setPosition(next);
      return;
    }
    appliedKeyRef.current = spotKey;
    initializedRef.current = true;
    const next = clampPosition(restingPoint(), layout, bottomInset);
    positionRef.current = next;
    setPosition(next);
  }, [hydrated, layout, resetPositionOnMount, bottomInset, spotKey, restingPoint]);

  const persist = useCallback((point: Point) => {
    if (!layout.width || !layout.height) return;
    savedRatiosRef.current[spotKey] = { x: point.x / layout.width, y: point.y / layout.height };
    if (resetPositionOnMount) return;
    const spots: Record<string, { xRatio: number; yRatio: number }> = {};
    for (const [key, ratio] of Object.entries(savedRatiosRef.current)) spots[key] = { xRatio: ratio.x, yRatio: ratio.y };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, spots })).catch(() => undefined);
  }, [layout, spotKey, resetPositionOnMount]);

  const updatePosition = useCallback((dx: number, dy: number) => {
    if (dragLockedRef.current) return;
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
    if (movedRef.current || dragLockedRef.current) return;
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

  // The menu fans out around Mobby toward the middle of the screen, so it
  // opens into free space wherever Mobby has been dragged, and the buttons are
  // kept from overlapping each other, Mobby or the tab bar. Each button pops
  // out from Mobby with a small stagger, then floats in place.
  const centerX = position.x + MOBBY_SIZE / 2;
  const centerY = position.y + MOBBY_SIZE / 2;
  const menuSlots = layoutMenuSlots({ mobby: { x: position.x, y: position.y, size: MOBBY_SIZE }, screen: layout, bottomInset, count: items.length, itemWidth: MENU_ITEM_WIDTH, itemHeight: MENU_ITEM_HEIGHT, radius: MENU_RADIUS, topClearance: TOP_CLEARANCE - 4 });
  const petVisual = walking
    ? walkSource
      ? <WalkFrame source={walkSource} petId={petId} frame={walkFrame} />
      : <Animated.View style={[styles.walkFallback, { transform: [{ translateY: [-1, 1, 0, -1][walkFrame] }, { rotate: ['-2deg', '2deg', '0deg', '-1deg'][walkFrame] }, { scaleX: [1, .96, 1.02, 1][walkFrame] }] }]}><Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} /></Animated.View>
    : <Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} />;

  return <View pointerEvents="box-none" onLayout={handleLayout} style={styles.overlay}>
    {open && <RNPressable accessibilityRole="button" accessibilityLabel={`${name}のメニューを閉じる`} onPress={() => onOpenChange(false)} style={[StyleSheet.absoluteFill, styles.scrim]} />}
    {initializedRef.current ? <View
      {...webHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${name}。タップでメニューを${open ? '閉じる' : 'ひらく'}${badge > 0 ? `。新着${badge}件` : ''}`}
      accessibilityHint="ドラッグで画面内の好きな場所へ動かせます"
      accessibilityState={{ expanded: open }}
      onAccessibilityTap={toggle}
      style={[styles.anchor, { left: position.x, top: position.y }, Platform.OS === 'web' && styles.webDrag]}
    >
      <Image pointerEvents="none" accessible={false} source={UI_ART.shadowBlot.source} contentFit="fill" style={styles.shadow} />
      {petVisual}
      {badge > 0 && !open && <View pointerEvents="none" style={styles.badge}><Image accessible={false} source={UI_ART.badgeCount.source} contentFit="fill" style={StyleSheet.absoluteFill} /><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
    </View> : null}
    {initializedRef.current && menuMounted ? items.map((item, index) => {
      const slot = menuSlots[index];
      const start = Math.min(.5, index * .1);
      const itemProgress = menuProgress.interpolate({ inputRange: [start, Math.min(1, start + .5)], outputRange: [0, 1], extrapolate: 'clamp' });
      return <Animated.View
        key={item.id}
        pointerEvents={open ? 'box-none' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        style={[styles.menuItem, { left: slot.left, top: slot.top, opacity: itemProgress, transform: [
          { translateX: itemProgress.interpolate({ inputRange: [0, 1], outputRange: [centerX - slot.left - MENU_ITEM_WIDTH / 2, 0] }) },
          { translateY: itemProgress.interpolate({ inputRange: [0, 1], outputRange: [centerY - slot.top - MENU_DISC_CENTER_Y, 0] }) },
          { scale: itemProgress.interpolate({ inputRange: [0, 1], outputRange: [.3, 1] }) },
        ] }]}
      >
        <PopButton id={item.id} label={item.label} icon={item.icon} badge={item.badge} phase={index / Math.max(1, items.length)} onPress={() => { onOpenChange(false); item.onPress(); }} />
      </Animated.View>;
    }) : null}
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 55 },
  scrim: { backgroundColor: '#2A1D1459' },
  anchor: { position: 'absolute', width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  image: { width: 82, height: 82 },
  shadow: { position: 'absolute', bottom: 2, width: 66, height: 17 },
  badge: { position: 'absolute', top: 3, right: 5, minWidth: 24, height: 24, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF9EF', fontSize: 11, fontWeight: '800' },
  webDrag: { cursor: 'grab', touchAction: 'none', userSelect: 'none' } as any,
  walkFallback: { width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  menuItem: { position: 'absolute', width: MENU_ITEM_WIDTH, zIndex: 60 },
});
