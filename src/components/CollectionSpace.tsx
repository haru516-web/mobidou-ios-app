import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackSide, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { SerialModal as Modal } from './SerialModal';
import { Canvas, useFrame, useLoader } from './r3f';
import { BRUSH, C, Icon } from '../components';
import { Image } from './AppImage';
import { playSfx } from '../services/audio';
import type { Shrine } from '../data/shrines';
import { SPACE3D_BACKDROP, SPACE3D_KEYCHAINS, SPACE3D_MOBBIES, SPACE3D_STAMPS } from '../data/space3dImages';
import type { SpecialCollection } from '../services/specialRewards';

type SpaceItem = { key: string; source: any; kind: 'stamp' | 'keychain' | 'mobby'; name: string };
type Look = {
  yaw: number; pitch: number; zoom: number; dragging: boolean;
  /** Turning speed (rad/s) left over after a flick, which dies down on its own. */
  vyaw: number; vpitch: number;
  /** Where the view is turning to after a thing was picked; any drag cancels it. */
  target: { yaw: number; pitch: number } | null;
};
type Placed = { x: number; y: number; z: number; w: number; h: number };
type Shared = {
  radius: number;
  /** Seconds since the things were let go, for the opening flourish. */
  intro: number;
  selected: string | null;
  camera: any;
  placed: Record<string, Placed>;
};

const GUIDE_HIDDEN_KEY = 'mobidou.collectionWorldGuideHidden';
const GUIDE_STEPS: readonly { title: string; body: string }[] = [
  { title: 'ドラッグで見渡す', body: '指でなぞると、まわりをぐるりと見回せます。はなすと、すこしだけ流れて止まります。' },
  { title: 'つまんで寄る・引く', body: '2本の指で広げると大きく、つまむと小さく見えます。' },
  { title: 'タップで手に取る', body: 'ふれたものが目の前に来て、名前が出ます。もう一度ふれるか、何もないところをふれると戻ります。' },
];

// The hanging scroll the app's other popups use (see ScrollPopup); the picture keeps transparent margins, so only its middle is shown.
const SCROLL_ART = require('../../assets/ui-washi/goshuin/index-popup.webp');
const UNDERLINE_BRUSH = require('../../assets/ui-washi/common/underline-brush.webp');
const SCROLL_LEFT = 0.165;
const SCROLL_WIDTH = 0.669;
const SCROLL_ASPECT = (0.669 * 1024) / (0.973 * 1400);

const PITCH_LIMIT = 0.6;
const ITEM_DIAMETER = 3.4;
/** Zooming only changes the lens, never the distances, so the spacing between things looks the same at every zoom. */
const FOV_BASE = 70;
const ZOOM_OUT = 0.6;
const ZOOM_IN = 3;
/** Magnification (1 = the opening view) for a zoom value from 0 (widest) to 1 (closest). */
const magnification = (zoom: number) => ZOOM_OUT * Math.pow(ZOOM_IN / ZOOM_OUT, zoom);
const fovFor = (mag: number) => (2 * Math.atan(Math.tan((FOV_BASE * Math.PI) / 360) / mag) * 180) / Math.PI;
/** Where the ring sits when the view opens: a little closer than the layout distance, so the things nearly touch. */
const RADIUS_START = 10.2;
/** Where a picked thing floats to, right in front of the viewer; far enough for it to fit the screen whole. */
const RADIUS_PICKED = 4.6;
const BACKDROP_RADIUS = 40;
/** The backdrop covers this much of the sky, up and down, and is split into tiles around the full circle. */
const BACKDROP_BAND = (150 * Math.PI) / 180;
const START_ZOOM = Math.log(1 / ZOOM_OUT) / Math.log(ZOOM_IN / ZOOM_OUT);

const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Directions for the things: seats in rows around the viewer, taken from straight ahead outward so the first screenful
 * is full with no gaps, but handed out in a scattered order (and nudged a little off the grid) so nothing looks sorted. The scatter
 * is seeded by what the player owns, so it is the same every time the view opens.
 */
function spreadDirections(keys: readonly string[]): [number, number, number][] {
  const count = keys.length;
  let seed = 2166136261;
  for (const ch of keys.join('|')) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Packed edge to edge, with no room between them (neighbours may even brush against each other).
  const step = (ITEM_DIAMETER * 0.7) / RADIUS_START;
  const rowStep = (ITEM_DIAMETER * 0.9) / RADIUS_START;
  const slots: { yaw: number; pitch: number; d: number }[] = [];
  for (let maxRow = 2; slots.length < count && maxRow < 40; maxRow++) {
    slots.length = 0;
    for (let k = -maxRow; k <= maxRow; k++) {
      const pitch = k * rowStep;
      if (Math.abs(pitch) > 1.4) continue;
      const perRow = Math.max(1, Math.floor((Math.PI * 2 * Math.cos(pitch)) / step));
      const offset = Math.abs(k) % 2 ? 0.5 : 0;
      for (let j = 0; j < perRow; j++) {
        const yaw = wrapAngle(((j + offset) * Math.PI * 2) / perRow);
        slots.push({ yaw, pitch, d: Math.hypot(yaw, pitch * 1.4) });
      }
    }
  }
  slots.sort((a, b) => a.d - b.d);
  // The nearest seats are all taken, and shuffled among the things.
  const pool = slots.slice(0, count);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return Array.from({ length: count }, (_, i) => {
    const seat = pool[i] ?? { yaw: i * 2.4, pitch: 0 };
    const yaw = seat.yaw + (random() - 0.5) * step * 0.15;
    const pitch = seat.pitch + (random() - 0.5) * rowStep * 0.15;
    return [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)] as [number, number, number];
  });
}
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function Floating({ item, direction, texture, index, shared }: { item: SpaceItem; direction: [number, number, number]; texture: any; index: number; shared: React.MutableRefObject<Shared> }) {
  const group = useRef<any>(null);
  const material = useRef<any>(null);
  const mesh = useRef<any>(null);
  const pop = useRef(0);
  const fade = useRef(0);
  const image = texture.image as { width?: number; height?: number } | undefined;
  const ratio = image?.width && image?.height ? image.width / image.height : item.kind === 'stamp' ? 0.67 : item.kind === 'mobby' ? 1 : 0.6;
  const height = item.kind === 'stamp' ? ITEM_DIAMETER * 0.85 : item.kind === 'mobby' ? ITEM_DIAMETER * 0.8 : ITEM_DIAMETER;
  useFrame(({ camera, clock }, delta) => {
    const node = group.current;
    if (!node) return;
    const s = shared.current;
    const picked = s.selected === item.key;
    pop.current += ((picked ? 1 : 0) - pop.current) * Math.min(1, delta * 7);
    // Things arrive from far out, one after another, then settle into the ring.
    const arrive = clamp01((s.intro - Math.min(0.9, index * 0.015)) / 1.2);
    const eased = 1 - Math.pow(1 - arrive, 3);
    const wantFade = eased * (s.selected && !picked ? 0.35 : 1);
    fade.current += (wantFade - fade.current) * Math.min(1, delta * 8);
    const base = s.radius * (1 + (1 - eased) * 1.6);
    const radius = base + (Math.min(base, RADIUS_PICKED) - base) * pop.current;
    const t = clock.elapsedTime + index * 1.7;
    const x = direction[0] * radius;
    const y = direction[1] * radius + Math.sin(t * 0.8) * 0.12;
    const z = direction[2] * radius;
    node.position.set(x, y, z);
    node.quaternion.copy(camera.quaternion);
    node.rotateZ(Math.sin(t * 0.6) * 0.06 * (1 - pop.current));
    const scale = 1 + pop.current * 0.18;
    node.scale.set(scale, scale, 1);
    if (material.current) material.current.opacity = fade.current;
    if (mesh.current) mesh.current.renderOrder = pop.current > 0.02 ? 10 : 0;
    s.placed[item.key] = { x, y, z, w: height * ratio * scale, h: height * scale };
  });
  return <group ref={group}>
    <mesh ref={mesh}>
      <planeGeometry args={[height * ratio, height]} />
      <meshBasicMaterial ref={material} map={texture} transparent opacity={0} toneMapped={false} depthWrite={false} />
    </mesh>
  </group>;
}

function Dust() {
  const group = useRef<any>(null);
  const points = useMemo(() => Array.from({ length: 70 }, (_, i) => [Math.sin(i * 12.9898) * 9, Math.cos(i * 78.233) * 5, Math.sin(i * 37.719) * 9] as [number, number, number]), []);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * 0.03; });
  return <group ref={group}>{points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.03, 6, 6]} /><meshBasicMaterial color="#F6E3B4" transparent opacity={0.55} /></mesh>)}</group>;
}

/**
 * The 360 degree backdrop: tiles (generated art) side by side on the inside of a sphere, left to right in order,
 * the first one straight ahead when the view opens. Absent until the art is added.
 */
function Backdrop() {
  const uris = SPACE3D_BACKDROP.map(tile => Asset.fromModule(tile).uri);
  const textures = useLoader(TextureLoader, uris);
  const count = textures.length;
  const span = (Math.PI * 2) / count;
  return <>{textures.map((texture, k) => {
    texture.colorSpace = SRGBColorSpace;
    // Seen from inside the picture runs the other way round, so each tile is mirrored back.
    texture.wrapS = RepeatWrapping;
    texture.repeat.x = -1;
    texture.offset.x = 1;
    return <mesh key={k} renderOrder={-1}>
      <sphereGeometry args={[BACKDROP_RADIUS, 32, 24, (Math.PI * 3) / 2 + span / 2 - k * span, span, Math.PI / 2 - BACKDROP_BAND / 2, BACKDROP_BAND]} />
      <meshBasicMaterial map={texture} side={BackSide} toneMapped={false} depthWrite={false} />
    </mesh>;
  })}</>;
}

function World({ items, directions, look, shared }: { items: SpaceItem[]; directions: [number, number, number][]; look: React.MutableRefObject<Look>; shared: React.MutableRefObject<Shared> }) {
  const uris = items.map(item => Asset.fromModule(item.source).uri);
  const textures = useLoader(TextureLoader, uris);
  textures.forEach(texture => { texture.colorSpace = SRGBColorSpace; });
  const eased = useRef(look.current.zoom);
  useFrame(({ camera }, delta) => {
    const v = look.current;
    const s = shared.current;
    s.camera = camera;
    s.intro += delta;
    // Zooming narrows or widens the lens; a picked thing is shown at the opening view so it always fits the screen whole.
    eased.current += ((s.selected ? START_ZOOM : v.zoom) - eased.current) * Math.min(1, delta * 8);
    s.radius = RADIUS_START;
    const fov = fovFor(magnification(eased.current));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (v.dragging) { /* the finger drives the view */ } else if (v.target) {
      const k = Math.min(1, delta * 5);
      v.yaw += wrapAngle(v.target.yaw - v.yaw) * k;
      v.pitch += (v.target.pitch - v.pitch) * k;
    } else {
      // A flick keeps the view turning for a moment, easing to a stop.
      v.yaw += v.vyaw * delta;
      v.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, v.pitch + v.vpitch * delta));
      const decay = Math.exp(-delta * 3.2);
      v.vyaw *= decay;
      v.vpitch *= decay;
    }
    camera.position.set(0, 0, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(v.pitch, v.yaw, 0);
  });
  return <>
    <Dust />
    {SPACE3D_BACKDROP.length > 0 && <Backdrop />}
    {items.map((item, index) => <Floating key={item.key} item={item} index={index} direction={directions[index]!} texture={textures[index]!} shared={shared} />)}
  </>;
}

/** Everything the player owns, floating around them in a small 3D world. Drag to look around, flick to keep turning, pinch to zoom, tap a thing to pick it up. */
export function CollectionSpace({ visible, shrines, rewardIds, special, mobbies = [], onClose }: { visible: boolean; shrines: readonly Shrine[]; rewardIds: readonly string[]; special: SpecialCollection; mobbies?: readonly { id: string; name: string; image: any }[]; onClose: () => void }) {
  const items = useMemo<SpaceItem[]>(() => {
    const owned = new Set(rewardIds);
    // A picture the 3D view does not have is left out: its WebP original would crash the view on a device.
    const list: SpaceItem[] = mobbies.filter(pet => !!SPACE3D_MOBBIES[pet.id]).map(pet => ({ key: `m-${pet.id}`, source: SPACE3D_MOBBIES[pet.id], kind: 'mobby' as const, name: pet.name }));
    shrines.forEach(shrine => {
      const stamp = SPACE3D_STAMPS[shrine.id];
      if (owned.has(shrine.id) && !!stamp) list.push({ key: `s-${shrine.id}`, source: stamp, kind: 'stamp', name: shrine.name });
      const keychain = SPACE3D_KEYCHAINS[shrine.id];
      if ((special.keychains[shrine.id] ?? 0) > 0 && !!keychain) list.push({ key: `k-${shrine.id}`, source: keychain, kind: 'keychain', name: shrine.name });
    });
    // Development only, for the store pictures: show the characters alone.
    if (__DEV__ && process.env.EXPO_PUBLIC_SHOT_MOBBIES_ONLY === '1') return list.filter(item => item.kind === 'mobby');
    return list;
  }, [shrines, rewardIds, special, mobbies]);
  const directions = useMemo(() => spreadDirections(items.map(item => item.key)), [items]);
  const [selected, setSelected] = useState<SpaceItem | null>(null);
  const look = useRef<Look>({ yaw: 0, pitch: 0, zoom: START_ZOOM, dragging: false, vyaw: 0, vpitch: 0, target: null });
  const shared = useRef<Shared>({ radius: RADIUS_START, intro: 0, selected: null, camera: null, placed: {} });
  const gesture = useRef({ x: 0, y: 0, startX: 0, startY: 0, time: 0, moved: 0, pinch: 0, zoom: START_ZOOM });
  const size = useRef({ width: 1, height: 1 });
  // A short how-to opens first, unless the player asked not to see it again.
  const [guideOpen, setGuideOpen] = useState(false);
  const screen = useWindowDimensions();
  const scroll = useMemo(() => {
    const width = Math.min(screen.width - 24, (screen.height - 96) * SCROLL_ASPECT, 380);
    const artWidth = width / SCROLL_WIDTH;
    return { width, height: width / SCROLL_ASPECT, artWidth, artHeight: (artWidth * 1400) / 1024 };
  }, [screen.width, screen.height]);
  useEffect(() => { if (guideOpen) playSfx('sfx_scroll_open'); }, [guideOpen]);
  useEffect(() => {
    if (!visible) { setGuideOpen(false); return; }
    let alive = true;
    AsyncStorage.getItem(GUIDE_HIDDEN_KEY).then(value => { if (alive) setGuideOpen(value !== '1'); }, () => { if (alive) setGuideOpen(true); });
    return () => { alive = false; };
  }, [visible]);
  const hideGuideForever = () => {
    setGuideOpen(false);
    AsyncStorage.setItem(GUIDE_HIDDEN_KEY, '1').catch(() => undefined);
  };
  // Every time the view opens it starts afresh: facing front, nothing picked, the things flying in.
  useEffect(() => {
    if (!visible) return;
    look.current = { yaw: 0, pitch: 0, zoom: START_ZOOM, dragging: false, vyaw: 0, vpitch: 0, target: null };
    shared.current = { radius: RADIUS_START, intro: 0, selected: null, camera: null, placed: {} };
    setSelected(null);
  }, [visible, items.length]);

  const select = (item: SpaceItem | null) => {
    shared.current.selected = item?.key ?? null;
    setSelected(item);
    if (!item) { look.current.target = null; return; }
    const index = items.findIndex(entry => entry.key === item.key);
    const [dx, dy, dz] = directions[index]!;
    // Turn to face it: the camera looks along -z at yaw 0.
    look.current.target = { yaw: Math.atan2(-dx, -dz), pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, Math.asin(dy))) };
    look.current.vyaw = 0;
    look.current.vpitch = 0;
    void Haptics.selectionAsync().catch(() => undefined);
  };

  /** Which thing is under this touch: the nearest one whose picture covers the point. */
  const pick = (pageX: number, pageY: number) => {
    const camera = shared.current.camera;
    if (!camera) return null;
    const { width, height } = size.current;
    const tx = (pageX / width) * 2 - 1;
    const ty = -((pageY / height) * 2 - 1);
    const v = look.current;
    const forward = new Vector3(-Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), -Math.cos(v.yaw) * Math.cos(v.pitch));
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    const aspect = width / height;
    let best: SpaceItem | null = null;
    let bestDepth = Infinity;
    items.forEach(item => {
      const p = shared.current.placed[item.key];
      if (!p) return;
      const point = new Vector3(p.x, p.y, p.z);
      const depth = point.dot(forward);
      if (depth < 0.3) return;
      const projected = point.clone().project(camera);
      const halfH = p.h / 2 / (depth * tanHalf);
      const halfW = p.w / 2 / (depth * tanHalf * aspect);
      if (Math.abs(projected.x - tx) <= halfW && Math.abs(projected.y - ty) <= halfH && depth < bestDepth) { best = item; bestDepth = depth; }
    });
    return best as SpaceItem | null;
  };

  const touchSpan = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    return touches.length >= 2 ? Math.hypot(touches[1]!.pageX - touches[0]!.pageX, touches[1]!.pageY - touches[0]!.pageY) : 0;
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      look.current.dragging = true;
      look.current.vyaw = 0;
      look.current.vpitch = 0;
      const { pageX, pageY } = event.nativeEvent;
      gesture.current = { x: pageX, y: pageY, startX: pageX, startY: pageY, time: Date.now(), moved: 0, pinch: touchSpan(event), zoom: look.current.zoom };
    },
    onPanResponderMove: event => {
      const span = touchSpan(event);
      if (span > 0) {
        gesture.current.moved = 99;
        if (gesture.current.pinch <= 0) gesture.current.pinch = span;
        look.current.zoom = Math.min(1, Math.max(0, gesture.current.zoom + (span / gesture.current.pinch - 1) * 0.8));
        return;
      }
      const { pageX, pageY } = event.nativeEvent;
      const g = gesture.current;
      g.moved = Math.max(g.moved, Math.hypot(pageX - g.startX, pageY - g.startY));
      if (g.moved > 8) look.current.target = null;
      const now = Date.now();
      const dt = Math.max(0.008, (now - g.time) / 1000);
      const dyaw = (pageX - g.x) * 0.006;
      const dpitch = (pageY - g.y) * 0.004;
      look.current.yaw += dyaw;
      look.current.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.current.pitch + dpitch));
      // Smoothed finger speed, so letting go carries on turning.
      look.current.vyaw = look.current.vyaw * 0.6 + (dyaw / dt) * 0.4;
      look.current.vpitch = look.current.vpitch * 0.6 + (dpitch / dt) * 0.4;
      g.x = pageX;
      g.y = pageY;
      g.time = now;
    },
    onPanResponderRelease: event => {
      look.current.dragging = false;
      const g = gesture.current;
      if (g.moved < 8 && Date.now() - g.time < 400) {
        look.current.vyaw = 0;
        look.current.vpitch = 0;
        const hit = pick(g.startX, g.startY);
        select(hit && hit.key !== shared.current.selected ? hit : null);
      } else if (Date.now() - g.time > 90) {
        // Held still before letting go: no flick.
        look.current.vyaw = 0;
        look.current.vpitch = 0;
      }
      void event;
    },
    onPanResponderTerminate: () => { look.current.dragging = false; },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, directions]);
  const onLayout = (event: LayoutChangeEvent) => { size.current = { width: Math.max(1, event.nativeEvent.layout.width), height: Math.max(1, event.nativeEvent.layout.height) }; };
  return <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait']}>
    <View style={S.root}>
      <View style={S.canvasWrap} onLayout={onLayout} {...responder.panHandlers}>
        <Canvas camera={{ fov: FOV_BASE, near: 0.1, far: 90, position: [0, 0, 0] }} dpr={[1, 1.6]} style={{ flex: 1, backgroundColor: '#1B1426', touchAction: 'none' } as object}>
          <Suspense fallback={null}>
            <World items={items} directions={directions} look={look} shared={shared} />
          </Suspense>
        </Canvas>
      </View>
      <View pointerEvents="none" style={S.titleBox}>
        <Text style={S.title}>コレクションワールド</Text>
      </View>
      {!!selected && <View pointerEvents="none" style={S.nameBox}>
        <Text style={S.nameKind}>{selected.kind === 'stamp' ? '御朱印' : selected.kind === 'mobby' ? 'モビー' : 'キーホルダー'}</Text>
        <Text style={S.name}>{selected.name}</Text>
      </View>}
      {guideOpen && <View style={S.guideLayer}>
        <View accessibilityViewIsModal accessibilityLabel="コレクションワールドの歩き方" style={{ width: scroll.width, height: scroll.height, overflow: 'hidden' }}>
          <Image accessible={false} source={SCROLL_ART} contentFit="fill" pointerEvents="none" style={{ position: 'absolute', left: -SCROLL_LEFT * scroll.artWidth, top: 0, width: scroll.artWidth, height: scroll.artHeight }} />
          <View style={[S.guideContent, { left: scroll.width * .12, right: scroll.width * .12, top: scroll.height * .165, height: scroll.height * .745 }]}>
            <Text accessibilityRole="header" style={S.guideTitle}>コレクションワールド</Text>
            <Text style={S.guideSubtitle}>歩き方</Text>
            <View style={S.guideSteps}>
              {GUIDE_STEPS.map((step, index) => <View key={step.title} style={S.guideRow}>
                <Text style={S.guideNumber}>{index + 1}</Text>
                <View style={S.guideText}>
                  <Text style={S.guideStep}>{step.title}</Text>
                  <Text style={S.guideBody}>{step.body}</Text>
                </View>
              </View>)}
            </View>
            <Pressable accessibilityRole="button" onPress={() => { playSfx('sfx_close'); setGuideOpen(false); }} style={S.guideStart}>
              <Text style={S.guideStartText}>はじめる</Text>
              <Image accessible={false} source={UNDERLINE_BRUSH} contentFit="fill" style={S.guideLine} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={hideGuideForever} style={S.guideHide}><Text style={S.guideHideText}>今後表示しない</Text></Pressable>
          </View>
        </View>
      </View>}
      <Pressable accessibilityRole="button" accessibilityLabel="一覧を閉じる" onPress={onClose} style={S.close}><Icon name="close" size={21} color="#FBF6EC" /></Pressable>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1B1426' },
  // On the web a pinch would otherwise zoom the whole page (every screen), not just this view.
  canvasWrap: { flex: 1, touchAction: 'none', userSelect: 'none' } as object,
  titleBox: { position: 'absolute', left: 20, top: 56, right: 80 },
  title: { color: '#FBF6EC', fontSize: 20, fontFamily: 'Shippori', letterSpacing: 2 },
  guideLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#241B14B3' },
  guideContent: { position: 'absolute', alignItems: 'stretch' },
  guideTitle: { fontFamily: BRUSH, fontSize: 22, color: C.ink, textAlign: 'center', letterSpacing: 3 },
  guideSubtitle: { fontFamily: BRUSH, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 2, marginBottom: 10 },
  guideSteps: { flex: 1, justifyContent: 'center' },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  guideNumber: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden', textAlign: 'center', lineHeight: 26, color: C.paper, backgroundColor: C.red, fontFamily: BRUSH, fontSize: 14, marginRight: 10, marginTop: 1 },
  guideText: { flex: 1 },
  guideStep: { fontFamily: BRUSH, fontSize: 16, color: C.ink, letterSpacing: 1 },
  guideBody: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 2 },
  guideStart: { alignSelf: 'center', alignItems: 'center', minHeight: 44, minWidth: 120, justifyContent: 'center' },
  guideStartText: { fontFamily: BRUSH, fontSize: 18, color: C.red, letterSpacing: 4 },
  guideLine: { width: 96, height: 8, marginTop: -1 },
  guideHide: { alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
  guideHideText: { color: C.muted, fontSize: 12, textDecorationLine: 'underline' },
  nameBox: { position: 'absolute', left: 24, right: 24, bottom: 48, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: '#1B1426CC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#F6E3B455' },
  nameKind: { color: '#F6E3B4', fontSize: 11, letterSpacing: 3 },
  name: { color: '#FBF6EC', fontSize: 20, fontFamily: 'Shippori', letterSpacing: 2, marginTop: 2 },
  close: { position: 'absolute', right: 16, top: 52, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF26' },
});
