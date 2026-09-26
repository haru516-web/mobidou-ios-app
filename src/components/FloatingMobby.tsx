import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import type { PetId } from '../petCatalog';
import { PILGRIMAGE_WALK_FRAME_COUNT, PILGRIMAGE_WALK_ATLASES } from '../data/pilgrimageWalkAtlases';
import rawWalkMetrics from '../data/pilgrimageSpriteMetrics.json';
import { C, Icon } from '../components';
import type { NavigationMenuAction } from './HomeNavigation';
import { WashiPressable as Pressable } from './Washi';

const STORAGE_KEY = 'mobidou.floating-mobby-position.v4';
const MOBBY_SIZE = 88;
const EDGE_GUTTER = 8;
const BOTTOM_NAV_CLEARANCE = 2;
const MENU_BUTTON_WIDTH = 76;
const MENU_BUTTON_RIGHT_INSET = 12;
const MENU_BUTTON_HEIGHT = 75;
const MENU_BUTTON_BOTTOM_INSET = 8;
const BUBBLE_WIDTH = 196;
const BUBBLE_HEIGHT = 54;
const MENU_PANEL_WIDTH = 218;
const MENU_ACTION_HEIGHT = 40;
const MENU_PANEL_GAP = 7;
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampPosition(point: Point, layout: LayoutSize): Point {
  return {
    x: clamp(point.x, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.width - MOBBY_SIZE - EDGE_GUTTER)),
    y: clamp(point.y, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.height - MOBBY_SIZE - BOTTOM_NAV_CLEARANCE)),
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

function speechEnding(petId: PetId) {
  if (petId === 'mobibou') return 'だぜ';
  if (petId === 'reamobby' || petId === 'uyumobby' || petId === 'lanimobby') return 'だにゃん';
  if (petId === 'mobirin') return 'ですぞ';
  if (petId === 'mobichi') return 'だよ〜';
  if (petId === 'yami') return 'だよ…';
  if (petId === 'mobiyura') return 'なのだ';
  return 'だよ';
}

function screenSpeech(petId: PetId, screenLabel: string) {
  const label = screenLabel === 'おでかけ' ? 'お出かけ' : screenLabel;
  return `${label}画面${speechEnding(petId)}`;
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

export function FloatingMobby({ image, name, petId, screenLabel, menuActions = [], menuOpen = false, resetToMenuOnMount = false, onPress, onMenuToggle }: { image: ImageSourcePropType; name: string; petId: PetId; screenLabel: string; menuActions?: readonly NavigationMenuAction[]; menuOpen?: boolean; resetToMenuOnMount?: boolean; onPress?: () => void; onMenuToggle?: () => void }) {
  const [layout, setLayout] = useState<LayoutSize>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkFrame, setWalkFrame] = useState(0);
  const savedRatioRef = useRef<Point | null>(null);
  const initializedRef = useRef(false);
  const positionRef = useRef(position);
  const dragStartRef = useRef(position);
  const pointerStartRef = useRef(position);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const menuProgress = useRef(new Animated.Value(menuOpen ? 1 : 0)).current;
  const walkSource = PILGRIMAGE_WALK_ATLASES[petId];

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
    const animation = Animated.timing(menuProgress, {
      toValue: menuOpen ? 1 : 0,
      duration: 210,
      easing: menuOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [menuOpen, menuProgress]);

  useEffect(() => {
    if (resetToMenuOnMount) {
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
  }, [resetToMenuOnMount]);

  useEffect(() => {
    if (!hydrated || !layout.width || !layout.height) return;
    if (!initializedRef.current) {
      const saved = resetToMenuOnMount ? null : savedRatioRef.current;
      const initial = saved
        ? { x: saved.x * layout.width, y: saved.y * layout.height }
        : {
          x: layout.width - MENU_BUTTON_RIGHT_INSET - (MENU_BUTTON_WIDTH + MOBBY_SIZE) / 2,
          y: layout.height - MENU_BUTTON_BOTTOM_INSET - (MENU_BUTTON_HEIGHT + MOBBY_SIZE) / 2,
        };
      const next = clampPosition(initial, layout);
      initializedRef.current = true;
      positionRef.current = next;
      setPosition(next);
      return;
    }
    const next = clampPosition(positionRef.current, layout);
    positionRef.current = next;
    setPosition(next);
  }, [hydrated, layout, resetToMenuOnMount]);

  const persist = useCallback((point: Point) => {
    if (!layout.width || !layout.height) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      xRatio: point.x / layout.width,
      yRatio: point.y / layout.height,
    })).catch(() => undefined);
  }, [layout]);

  const updatePosition = useCallback((dx: number, dy: number) => {
    const next = clampPosition({ x: dragStartRef.current.x + dx, y: dragStartRef.current.y + dy }, layout);
    positionRef.current = next;
    setPosition(next);
  }, [layout]);

  const finishDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    persist(positionRef.current);
  }, [persist]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => Platform.OS !== 'web',
    onMoveShouldSetPanResponderCapture: () => Platform.OS !== 'web',
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      draggingRef.current = true;
      movedRef.current = false;
      setWalking(true);
      dragStartRef.current = positionRef.current;
    },
    onPanResponderMove: (_event, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) > 4) movedRef.current = true;
      updatePosition(gesture.dx, gesture.dy);
    },
    onPanResponderRelease: () => {
      const didMove = movedRef.current;
      finishDrag();
      setWalking(false);
      if (!didMove) onPress?.();
    },
    onPanResponderTerminate: () => { finishDrag(); setWalking(false); },
  }), [finishDrag, updatePosition]);

  const webHandlers = Platform.OS === 'web' ? ({
    onPointerDown: (event: any) => {
      const point = pointerPoint(event);
      const nativeEvent = event?.nativeEvent ?? event;
      if (!point || (nativeEvent?.button != null && nativeEvent.button !== 0)) return;
      draggingRef.current = true;
      movedRef.current = false;
      setWalking(true);
      dragStartRef.current = positionRef.current;
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
      if (Math.hypot(point.x - pointerStartRef.current.x, point.y - pointerStartRef.current.y) > 4) movedRef.current = true;
      updatePosition(point.x - pointerStartRef.current.x, point.y - pointerStartRef.current.y);
    },
    onPointerUp: (event: any) => {
      const id = activePointerIdRef.current;
      const didMove = movedRef.current;
      activePointerIdRef.current = null;
      finishDrag();
      setWalking(false);
      if (id != null) event.currentTarget?.releasePointerCapture?.(id);
      if (!didMove) onPress?.();
    },
    onPointerCancel: () => { movedRef.current = false; finishDrag(); setWalking(false); },
    onLostPointerCapture: () => { finishDrag(); setWalking(false); },
  } as any) : panResponder.panHandlers;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const bubbleLeft = clamp(position.x + MOBBY_SIZE / 2 - BUBBLE_WIDTH / 2, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.width - BUBBLE_WIDTH - EDGE_GUTTER));
  const bubbleAbove = position.y > BUBBLE_HEIGHT + 26;
  const bubbleTop = bubbleAbove ? position.y - BUBBLE_HEIGHT - 10 : position.y + MOBBY_SIZE + 10;
  const menuPanelHeight = menuActions.length * (MENU_ACTION_HEIGHT + MENU_PANEL_GAP) + 14;
  const menuPanelLeft = position.x + MOBBY_SIZE + 8 + MENU_PANEL_WIDTH <= layout.width
    ? position.x + MOBBY_SIZE + 8
    : clamp(position.x - MENU_PANEL_WIDTH - 8, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.width - MENU_PANEL_WIDTH - EDGE_GUTTER));
  const menuPanelTop = clamp(position.y - Math.max(0, menuPanelHeight - MOBBY_SIZE) / 2, EDGE_GUTTER, Math.max(EDGE_GUTTER, layout.height - menuPanelHeight - BOTTOM_NAV_CLEARANCE));
  const animatedMenuStyle = {
    opacity: menuProgress,
    transform: [
      { translateX: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: menuProgress.interpolate({ inputRange: [0, 1], outputRange: [.95, 1] }) },
    ],
  };
  const petVisual = walking
    ? walkSource
      ? <WalkFrame source={walkSource} petId={petId} frame={walkFrame} />
      : <Animated.View style={[styles.walkFallback, { transform: [{ translateY: [-1, 1, 0, -1][walkFrame] }, { rotate: ['-2deg', '2deg', '0deg', '-1deg'][walkFrame] }, { scaleX: [1, .96, 1.02, 1][walkFrame] }] }]}><Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} /></Animated.View>
    : <Image pointerEvents="none" source={image} contentFit="contain" style={styles.image} />;

  return <View pointerEvents="box-none" onLayout={handleLayout} style={styles.overlay}>
    {initializedRef.current ? <View
      {...webHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${name}。タップでメニューを開く。ドラッグして画面内を移動できます`}
      accessibilityHint="タップで下部メニューを展開します。ドラッグで位置を動かせます"
      onAccessibilityTap={onPress}
      style={[styles.anchor, { left: position.x, top: position.y }, Platform.OS === 'web' && styles.webDrag]}
    >
      <View pointerEvents="none" style={styles.shadow} />
      {petVisual}
    </View> : null}
    {initializedRef.current ? <View pointerEvents="none" style={[styles.bubble, { left: bubbleLeft, top: bubbleTop }]}>
      <View style={styles.bubbleBody}><Text numberOfLines={2} style={styles.bubbleText}>{screenSpeech(petId, screenLabel)}</Text></View>
      <View style={[styles.bubbleTail, bubbleAbove ? styles.bubbleTailBelow : styles.bubbleTailAbove]} />
    </View> : null}
    {initializedRef.current && menuActions.length > 0 ? <Animated.View pointerEvents={menuOpen ? 'auto' : 'none'} accessibilityElementsHidden={!menuOpen} aria-hidden={!menuOpen ? true : undefined} importantForAccessibility={menuOpen ? 'auto' : 'no-hide-descendants'} style={[styles.menuPanel, { left: menuPanelLeft, top: menuPanelTop }, animatedMenuStyle]}>
      {menuActions.map(action => <Pressable key={action.label} artwork={false} accessibilityRole="button" accessibilityLabel={action.label} accessibilityHint={action.hint} onPress={() => { onMenuToggle?.(); action.onPress(); }} style={styles.menuAction}>
        <Icon name={action.icon} size={17} color={C.red} /><Text numberOfLines={1} style={styles.menuActionText}>{action.label}</Text>
      </Pressable>)}
    </Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 55 },
  anchor: { position: 'absolute', width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  image: { width: 82, height: 82 },
  shadow: { position: 'absolute', bottom: 4, width: 49, height: 8, borderRadius: 20, backgroundColor: '#4A3B3025' },
  webDrag: { cursor: 'move', touchAction: 'none', userSelect: 'none' } as any,
  bubble: { position: 'absolute', width: BUBBLE_WIDTH, height: BUBBLE_HEIGHT, zIndex: 50, alignItems: 'center' },
  bubbleBody: { width: '100%', height: BUBBLE_HEIGHT, paddingHorizontal: 13, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#D8C8B3', backgroundColor: '#FFF9EFFF', shadowColor: '#5B4433', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  bubbleText: { color: '#5C4335', fontFamily: 'ShipporiBold', fontSize: 14, lineHeight: 19, textAlign: 'center' },
  bubbleTail: { position: 'absolute', left: BUBBLE_WIDTH / 2 - 7, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  bubbleTailBelow: { bottom: -7, borderTopWidth: 8, borderTopColor: '#FFF9EF' },
  bubbleTailAbove: { top: -7, borderBottomWidth: 8, borderBottomColor: '#FFF9EF' },
  walkFallback: { width: MOBBY_SIZE, height: MOBBY_SIZE, alignItems: 'center', justifyContent: 'center' },
  menuPanel: { position: 'absolute', width: MENU_PANEL_WIDTH, padding: 7, gap: MENU_PANEL_GAP, zIndex: 60, borderRadius: 18, borderWidth: 1, borderColor: '#D8C8B3', backgroundColor: '#FFF9EFEF', shadowColor: '#5B4433', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuAction: { minHeight: MENU_ACTION_HEIGHT, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E7DCCB' },
  menuActionText: { flex: 1, color: '#675344', fontFamily: 'ShipporiBold', fontSize: 12 },
});
