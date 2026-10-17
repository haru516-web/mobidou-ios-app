import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Asset } from 'expo-asset';
import { BackSide, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { SerialModal as Modal } from './SerialModal';
import { Canvas, useFrame, useLoader } from './r3f';
import { Icon } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { EVENT_KEYCHAIN_IMAGES } from '../data/eventImages';
import { SPACE_BACKDROP_TILES } from './collectionSpaceBackdrop';
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
/** The distance the layout spaces the things for, so that they sit side by side without overlapping. */
const RADIUS_LAYOUT = 13;
/** Where a picked thing floats to, right in front of the viewer; far enough for it to fit the screen whole. */
const RADIUS_PICKED = 4.6;
const BACKDROP_RADIUS = 40;
/** The backdrop covers this much of the sky, up and down, and is split into tiles around the full circle. */
const BACKDROP_BAND = (150 * Math.PI) / 180;
const START_ZOOM = Math.log(1 / ZOOM_OUT) / Math.log(ZOOM_IN / ZOOM_OUT);

const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Directions for the things: rows around the viewer, filled outward from straight ahead, so the first screenful
 * the viewer sees on opening is already full of things and the rest wait to the sides and behind.
 */
function spreadDirections(count: number): [number, number, number][] {
  const step = (ITEM_DIAMETER * 0.62 * 1.2) / RADIUS_LAYOUT;
  const rowStep = (ITEM_DIAMETER * 1.15) / RADIUS_LAYOUT;
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
  return Array.from({ length: count }, (_, i) => {
    const { yaw, pitch } = slots[i] ?? { yaw: i * 2.4, pitch: 0 };
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
  const uris = SPACE_BACKDROP_TILES.map(tile => (typeof tile === 'object' && tile?.uri ? tile.uri as string : Asset.fromModule(tile).uri));
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
  const uris = items.map(item => (typeof item.source === 'object' && item.source?.uri ? item.source.uri as string : Asset.fromModule(item.source).uri));
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
    {SPACE_BACKDROP_TILES.length > 0 && <Backdrop />}
    {items.map((item, index) => <Floating key={item.key} item={item} index={index} direction={directions[index]!} texture={textures[index]!} shared={shared} />)}
  </>;
}

/** Everything the player owns, floating around them in a small 3D world. Drag to look around, flick to keep turning, pinch to zoom, tap a thing to pick it up. */
export function CollectionSpace({ visible, shrines, rewardIds, special, mobbies = [], onClose }: { visible: boolean; shrines: readonly Shrine[]; rewardIds: readonly string[]; special: SpecialCollection; mobbies?: readonly { id: string; name: string; image: any }[]; onClose: () => void }) {
  const items = useMemo<SpaceItem[]>(() => {
    const owned = new Set(rewardIds);
    const list: SpaceItem[] = mobbies.map(pet => ({ key: `m-${pet.id}`, source: pet.image, kind: 'mobby' as const, name: pet.name }));
    shrines.forEach(shrine => {
      const stamp = STAMP_IMAGES[shrine.id];
      if (owned.has(shrine.id) && !!stamp) list.push({ key: `s-${shrine.id}`, source: stamp, kind: 'stamp', name: shrine.name });
      const keychain = (COLLECTION_KEYCHAINS as Record<string, unknown>)[shrine.id] ?? EVENT_KEYCHAIN_IMAGES[shrine.id];
      if ((special.keychains[shrine.id] ?? 0) > 0 && !!keychain) list.push({ key: `k-${shrine.id}`, source: keychain, kind: 'keychain', name: shrine.name });
    });
    return list;
  }, [shrines, rewardIds, special, mobbies]);
  const directions = useMemo(() => spreadDirections(items.length), [items.length]);
  const [selected, setSelected] = useState<SpaceItem | null>(null);
  const look = useRef<Look>({ yaw: 0, pitch: 0, zoom: START_ZOOM, dragging: false, vyaw: 0, vpitch: 0, target: null });
  const shared = useRef<Shared>({ radius: RADIUS_START, intro: 0, selected: null, camera: null, placed: {} });
  const gesture = useRef({ x: 0, y: 0, startX: 0, startY: 0, time: 0, moved: 0, pinch: 0, zoom: START_ZOOM });
  const size = useRef({ width: 1, height: 1 });
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
        <Text style={S.title}>所持品の一覧</Text>
        <Text style={S.hint}>{items.length ? `${items.length}点 ・ ドラッグで見渡す ・ つまんで広げて寄る ・ タップで手に取る` : 'まだ集めたものがありません'}</Text>
      </View>
      {!!selected && <View pointerEvents="none" style={S.nameBox}>
        <Text style={S.nameKind}>{selected.kind === 'stamp' ? '御朱印' : selected.kind === 'mobby' ? 'モビー' : 'キーホルダー'}</Text>
        <Text style={S.name}>{selected.name}</Text>
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
  hint: { color: '#FBF6ECB3', fontSize: 12, marginTop: 4 },
  nameBox: { position: 'absolute', left: 24, right: 24, bottom: 48, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: '#1B1426CC', borderWidth: StyleSheet.hairlineWidth, borderColor: '#F6E3B455' },
  nameKind: { color: '#F6E3B4', fontSize: 11, letterSpacing: 3 },
  name: { color: '#FBF6EC', fontSize: 20, fontFamily: 'Shippori', letterSpacing: 2, marginTop: 2 },
  close: { position: 'absolute', right: 16, top: 52, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF26' },
});
