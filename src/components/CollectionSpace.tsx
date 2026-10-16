import React, { Suspense, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { Asset } from 'expo-asset';
import { BackSide, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';
import { SerialModal as Modal } from './SerialModal';
import { Canvas, useFrame, useLoader } from './r3f';
import { Icon } from '../components';
import { STAMP_IMAGES, type Shrine } from '../data/shrines';
import { COLLECTION_KEYCHAINS } from '../data/collectionKeychains';
import { EVENT_KEYCHAIN_IMAGES } from '../data/eventImages';
import { SPACE_BACKDROP_TILES } from './collectionSpaceBackdrop';
import type { SpecialCollection } from '../services/specialRewards';

type SpaceItem = { key: string; source: any; kind: 'stamp' | 'keychain' };
type Look = { yaw: number; pitch: number; zoom: number; dragging: boolean };

const PITCH_LIMIT = 0.6;
const ITEM_DIAMETER = 2.3;
/** Nearest the things come at full zoom: they crowd together and overlap. */
const RADIUS_CLOSE = 3.2;
const BACKDROP_RADIUS = 40;
/** The backdrop covers this much of the sky, up and down, and is split into tiles around the full circle. */
const BACKDROP_BAND = (150 * Math.PI) / 180;

/** Directions spread evenly around the viewer (Fibonacci lattice), within a band so nothing sits straight overhead. */
function spreadDirections(count: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 0.87 * (1 - (i / (count - 1)) * 2);
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * golden;
    return [Math.cos(angle) * r, y, Math.sin(angle) * r];
  });
}

/** Distance at which the things all fit around the viewer without touching. Zoomed out they sit this far; zoomed in they close up to RADIUS_CLOSE. */
function relaxedRadius(count: number) {
  return Math.max(6.5, ITEM_DIAMETER * Math.sqrt(count) * 0.62);
}

type Shared = { radius: number; orbit: number };

function Floating({ item, direction, texture, index, shared }: { item: SpaceItem; direction: [number, number, number]; texture: any; index: number; shared: React.MutableRefObject<Shared> }) {
  const ref = useRef<any>(null);
  const image = texture.image as { width?: number; height?: number } | undefined;
  const ratio = image?.width && image?.height ? image.width / image.height : item.kind === 'stamp' ? 0.67 : 0.6;
  const height = item.kind === 'stamp' ? 1.9 : ITEM_DIAMETER;
  useFrame(({ camera, clock }) => {
    const node = ref.current;
    if (!node) return;
    const t = clock.elapsedTime + index * 1.7;
    const { radius, orbit } = shared.current;
    // The whole ring slowly circles the viewer.
    const cos = Math.cos(orbit);
    const sin = Math.sin(orbit);
    const x = direction[0] * cos - direction[2] * sin;
    const z = direction[0] * sin + direction[2] * cos;
    node.position.set(x * radius, direction[1] * radius + Math.sin(t * 0.8) * 0.12, z * radius);
    node.quaternion.copy(camera.quaternion);
    node.rotateZ(Math.sin(t * 0.6) * 0.06);
  });
  return <group ref={ref}>
    <mesh>
      <planeGeometry args={[height * ratio, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  </group>;
}

function Dust() {
  const points = useMemo(() => Array.from({ length: 70 }, (_, i) => [Math.sin(i * 12.9898) * 9, Math.cos(i * 78.233) * 5, Math.sin(i * 37.719) * 9] as [number, number, number]), []);
  return <>{points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.03, 6, 6]} /><meshBasicMaterial color="#F6E3B4" transparent opacity={0.55} /></mesh>)}</>;
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

function World({ items, look }: { items: SpaceItem[]; look: React.MutableRefObject<Look> }) {
  const uris = items.map(item => (typeof item.source === 'object' && item.source?.uri ? item.source.uri as string : Asset.fromModule(item.source).uri));
  const textures = useLoader(TextureLoader, uris);
  textures.forEach(texture => { texture.colorSpace = SRGBColorSpace; });
  const directions = useMemo(() => spreadDirections(items.length), [items.length]);
  const shared = useRef<Shared>({ radius: relaxedRadius(items.length), orbit: 0 });
  const relaxed = relaxedRadius(items.length);
  const eased = useRef(look.current.zoom);
  useFrame(({ camera }, delta) => {
    const v = look.current;
    // Zooming brings the ring in to the viewer (the things crowd and overlap) or sends it out until nothing touches.
    eased.current += (v.zoom - eased.current) * Math.min(1, delta * 8);
    shared.current.radius = relaxed * 1.5 + (RADIUS_CLOSE - relaxed * 1.5) * eased.current;
    if (!v.dragging) shared.current.orbit += delta * 0.07;
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

/** Everything the player owns, floating around them in a small 3D world. Drag to look around, pinch to zoom. */
export function CollectionSpace({ visible, shrines, rewardIds, special, onClose }: { visible: boolean; shrines: readonly Shrine[]; rewardIds: readonly string[]; special: SpecialCollection; onClose: () => void }) {
  const items = useMemo<SpaceItem[]>(() => {
    const owned = new Set(rewardIds);
    const list: SpaceItem[] = [];
    shrines.forEach(shrine => {
      const stamp = STAMP_IMAGES[shrine.id];
      if (owned.has(shrine.id) && !!stamp) list.push({ key: `s-${shrine.id}`, source: stamp, kind: 'stamp' });
      const keychain = (COLLECTION_KEYCHAINS as Record<string, unknown>)[shrine.id] ?? EVENT_KEYCHAIN_IMAGES[shrine.id];
      if ((special.keychains[shrine.id] ?? 0) > 0 && !!keychain) list.push({ key: `k-${shrine.id}`, source: keychain, kind: 'keychain' });
    });
    return list;
  }, [shrines, rewardIds, special]);
  const look = useRef<Look>({ yaw: 0, pitch: 0, zoom: 0.35, dragging: false });
  const gesture = useRef({ x: 0, y: 0, pinch: 0, zoom: 0.35 });
  const touchSpan = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    return touches.length >= 2 ? Math.hypot(touches[1]!.pageX - touches[0]!.pageX, touches[1]!.pageY - touches[0]!.pageY) : 0;
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      look.current.dragging = true;
      gesture.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, pinch: touchSpan(event), zoom: look.current.zoom };
    },
    onPanResponderMove: event => {
      const span = touchSpan(event);
      if (span > 0) {
        if (gesture.current.pinch <= 0) gesture.current.pinch = span;
        look.current.zoom = Math.min(1, Math.max(0, gesture.current.zoom + (span / gesture.current.pinch - 1) * 0.8));
        return;
      }
      const { pageX, pageY } = event.nativeEvent;
      look.current.yaw += (pageX - gesture.current.x) * 0.006;
      look.current.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, look.current.pitch + (pageY - gesture.current.y) * 0.004));
      gesture.current.x = pageX;
      gesture.current.y = pageY;
    },
    onPanResponderRelease: () => { look.current.dragging = false; },
    onPanResponderTerminate: () => { look.current.dragging = false; },
  }), []);
  return <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait']}>
    <View style={S.root}>
      <View style={S.canvasWrap} {...responder.panHandlers}>
        {items.length > 0 && <Canvas camera={{ fov: 70, near: 0.1, far: 90, position: [0, 0, 0] }} dpr={[1, 1.6]} style={{ flex: 1, backgroundColor: '#1B1426' }}>
          <Suspense fallback={null}>
            <World items={items} look={look} />
          </Suspense>
        </Canvas>}
      </View>
      <View pointerEvents="none" style={S.titleBox}>
        <Text style={S.title}>所持品の一覧</Text>
        <Text style={S.hint}>{items.length ? `${items.length}点 ・ ドラッグで見渡す ・ 広げて寄る／つまんで離れる` : 'まだ集めたものがありません'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="一覧を閉じる" onPress={onClose} style={S.close}><Icon name="close" size={21} color="#FBF6EC" /></Pressable>
    </View>
  </Modal>;
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1B1426' },
  canvasWrap: { flex: 1 },
  titleBox: { position: 'absolute', left: 20, top: 56, right: 80 },
  title: { color: '#FBF6EC', fontSize: 20, fontFamily: 'Shippori', letterSpacing: 2 },
  hint: { color: '#FBF6ECB3', fontSize: 12, marginTop: 4 },
  close: { position: 'absolute', right: 16, top: 52, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF26' },
});
