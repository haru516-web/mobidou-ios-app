import React, { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Canvas, useLoader } from '@react-three/fiber';
import { ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';

const WOOD_PILLAR = require('../../assets/collection/collection-wood-pillar-bold-v1.png');
const WOOD_BEAM = require('../../assets/collection/collection-wood-beam-bold-v1.png');
const WOOD_BASE = require('../../assets/collection/collection-wood-base-bold-v1.png');
const CABINET_BACKDROP = require('../../assets/collection/collection-cabinet-washi-backdrop-v1.png');
const WALL_HOOK = require('../../assets/collection/collection-wall-hook-v2.png');
const GOSHUIN_STAND = require('../../assets/collection/collection-goshuin-stand-v1.png');

type CollectionZoom = 'overview' | 'standard' | 'close';
type CollectionRoomProps = {
  itemCount: number;
  zoom: CollectionZoom;
  viewportWidth: number;
  roomHeight: number;
  contentWidth: number;
};

const WORLD_WIDTH = 10;
const OVERVIEW_COLUMNS = 8;

function WallHook({ x, y, scale, texture }: { x: number; y: number; scale: number; texture: any }) {
  const width = 1.12 * scale;
  const height = width * (1145 / 1374);
  return <mesh position={[x, y, 0.34]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
  </mesh>;
}

function GoshuinStand({ x, y, width, texture }: { x: number; y: number; width: number; texture: any }) {
  const height = width * (1263 / 1246);
  return <mesh position={[x, y, 0.3]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
  </mesh>;
}

function CabinetCell({ x, y, width, height, compact, close, pillarTexture, beamTexture, baseTexture, backTexture, hookTexture, standTexture }: { x: number; y: number; width: number; height: number; compact: boolean; close: boolean; pillarTexture: any; beamTexture: any; baseTexture: any; backTexture: any; hookTexture: any; standTexture: any }) {
  const frame = Math.max(compact ? 0.028 : 0.045, width * 0.035);
  const panelWidth = width * 0.88;
  const panelHeight = height * 0.78;
  const panelY = y + height * 0.015;
  const railY = y + height * 0.39;
  const shelfY = y - height * (close ? 0.26 : 0.13);
  const baseY = y - height * 0.365;
  const hookX = x + (compact ? width * 0.02 : close ? 0 : width * 0.02);
  const hookScale = Math.max(0.5, Math.min(1.35, width / 2.6));
  const hookYOffset = compact ? frame * 0.68 + 0.02 : -height * 0.055;
  const standWidth = compact ? Math.max(0.52, Math.min(1.12, width * 0.72)) : close ? 3.55 : Math.min(3, width * 0.9);
  const standHeight = standWidth * (1263 / 1246);
  const standY = shelfY + frame * 0.72 + standHeight / 2;
  const pillarWood = () => <meshStandardMaterial map={pillarTexture} color="#fff0d7" roughness={0.72} metalness={0.03} />;
  const beamWood = () => <meshStandardMaterial map={beamTexture} color="#fff4df" roughness={0.76} metalness={0.04} />;
  const baseWood = () => <meshStandardMaterial map={baseTexture} color="#fff1dd" roughness={0.84} metalness={0.02} />;
  return <group>
    <mesh position={[x, panelY, -0.78]}>
      <boxGeometry args={[panelWidth, panelHeight, 0.12]} />
      <meshStandardMaterial map={backTexture} color="#fff5df" roughness={0.92} />
    </mesh>
    <mesh position={[x - panelWidth / 2, panelY, -0.1]}><boxGeometry args={[frame, panelHeight + frame, 0.22]} />{pillarWood()}</mesh>
    <mesh position={[x + panelWidth / 2, panelY, -0.1]}><boxGeometry args={[frame, panelHeight + frame, 0.22]} />{pillarWood()}</mesh>
    <mesh position={[x, y + height * 0.405, -0.08]}><boxGeometry args={[width * 0.96, frame * 1.2, 0.25]} />{beamWood()}</mesh>
    <mesh position={[x, railY, 0.12]}><boxGeometry args={[width * 0.72, frame * 1.05, 0.3]} />{beamWood()}</mesh>
    <WallHook x={hookX} y={railY + hookYOffset} scale={hookScale} texture={hookTexture} />
    <GoshuinStand x={x} y={standY} width={standWidth} texture={standTexture} />
    <mesh position={[x, shelfY, 0.16]}><boxGeometry args={[width * 0.78, frame * 1.35, 0.34]} />{beamWood()}</mesh>
    <mesh position={[x, shelfY - frame * 1.15, 0.32]}><boxGeometry args={[width * 0.68, frame * 0.8, 0.2]} />{baseWood()}</mesh>
    <mesh position={[x, baseY, 0.04]}><boxGeometry args={[width * 0.82, frame * 1.25, 0.28]} />{baseWood()}</mesh>
  </group>;
}

function CabinetWorld({ itemCount, zoom, worldWidth, worldHeight, pillarTexture, beamTexture, baseTexture, backTexture, hookTexture, standTexture }: { itemCount: number; zoom: CollectionZoom; worldWidth: number; worldHeight: number; pillarTexture: any; beamTexture: any; baseTexture: any; backTexture: any; hookTexture: any; standTexture: any }) {
  const compact = zoom === 'overview';
  const rows = compact ? Math.ceil(itemCount / OVERVIEW_COLUMNS) : 1;
  const contentWidth = worldWidth;
  const cellWidth = contentWidth / (compact ? OVERVIEW_COLUMNS : Math.max(3, itemCount));
  const cellHeight = worldHeight / rows;
  const cells = Array.from({ length: itemCount }, (_, index) => {
    const column = compact ? index % OVERVIEW_COLUMNS : index;
    const row = compact ? Math.floor(index / OVERVIEW_COLUMNS) : 0;
    return { index, x: column * cellWidth + cellWidth / 2, y: compact ? worldHeight / 2 - row * cellHeight - cellHeight / 2 : 0 };
  });
  const beamWood = () => <meshStandardMaterial map={beamTexture} color="#fff4df" roughness={0.8} metalness={0.03} />;
  const baseWood = () => <meshStandardMaterial map={baseTexture} color="#fff1dd" roughness={0.86} metalness={0.02} />;
  return <group>
    <mesh position={[contentWidth / 2, worldHeight * 0.445, 0.22]}><boxGeometry args={[contentWidth, Math.max(0.18, worldHeight * 0.027), 0.42]} />{baseWood()}</mesh>
    <mesh position={[contentWidth / 2, -worldHeight * 0.445, 0.22]}><boxGeometry args={[contentWidth, Math.max(0.22, worldHeight * 0.032), 0.46]} />{baseWood()}</mesh>
    <mesh position={[contentWidth / 2, -worldHeight * 0.405, 0.34]}><boxGeometry args={[contentWidth, Math.max(0.18, worldHeight * 0.022), 0.6]} />{beamWood()}</mesh>
    {cells.map(({ index, x, y }) => <CabinetCell key={index} x={x} y={y} width={cellWidth} height={cellHeight} compact={compact} close={zoom === 'close'} pillarTexture={pillarTexture} beamTexture={beamTexture} baseTexture={baseTexture} backTexture={backTexture} hookTexture={hookTexture} standTexture={standTexture} />)}
  </group>;
}

function RoomGeometry({ itemCount, zoom, viewportWidth, roomHeight, contentWidth }: CollectionRoomProps) {
  const pillarTexture = useLoader(TextureLoader, Asset.fromModule(WOOD_PILLAR).uri);
  const beamTexture = useLoader(TextureLoader, Asset.fromModule(WOOD_BEAM).uri);
  const baseTexture = useLoader(TextureLoader, Asset.fromModule(WOOD_BASE).uri);
  const backTexture = useLoader(TextureLoader, Asset.fromModule(CABINET_BACKDROP).uri);
  const hookTexture = useLoader(TextureLoader, Asset.fromModule(WALL_HOOK).uri);
  const standTexture = useLoader(TextureLoader, Asset.fromModule(GOSHUIN_STAND).uri);
  const worldWidth = WORLD_WIDTH * contentWidth / Math.max(1, viewportWidth);
  const worldHeight = WORLD_WIDTH * roomHeight / Math.max(1, viewportWidth);

  pillarTexture.wrapS = ClampToEdgeWrapping;
  pillarTexture.wrapT = RepeatWrapping;
  pillarTexture.repeat.set(0.48, 1);
  pillarTexture.offset.set(0.26, 0);
  pillarTexture.colorSpace = SRGBColorSpace;
  beamTexture.wrapS = RepeatWrapping;
  beamTexture.wrapT = ClampToEdgeWrapping;
  beamTexture.repeat.set(1.15, 0.5);
  beamTexture.colorSpace = SRGBColorSpace;
  baseTexture.wrapS = RepeatWrapping;
  baseTexture.wrapT = ClampToEdgeWrapping;
  baseTexture.repeat.set(1.15, 0.5);
  baseTexture.colorSpace = SRGBColorSpace;
  backTexture.wrapS = ClampToEdgeWrapping;
  backTexture.wrapT = ClampToEdgeWrapping;
  backTexture.repeat.set(1, 1);
  backTexture.colorSpace = SRGBColorSpace;
  hookTexture.wrapS = ClampToEdgeWrapping;
  hookTexture.wrapT = ClampToEdgeWrapping;
  hookTexture.colorSpace = SRGBColorSpace;
  standTexture.wrapS = ClampToEdgeWrapping;
  standTexture.wrapT = ClampToEdgeWrapping;
  standTexture.colorSpace = SRGBColorSpace;
  return <>
    <ambientLight intensity={1.65} />
    <directionalLight position={[2, 6, 7]} intensity={2.1} />
    <directionalLight position={[-4, 1, 3]} intensity={0.7} color="#f6d8a5" />
    <CabinetWorld itemCount={itemCount} zoom={zoom} worldWidth={worldWidth} worldHeight={worldHeight} pillarTexture={pillarTexture} beamTexture={beamTexture} baseTexture={baseTexture} backTexture={backTexture} hookTexture={hookTexture} standTexture={standTexture} />
  </>;
}

export function CollectionRoom({ itemCount, zoom, viewportWidth, roomHeight, contentWidth }: CollectionRoomProps) {
  const worldWidth = WORLD_WIDTH * contentWidth / Math.max(1, viewportWidth);
  const worldHeight = WORLD_WIDTH * roomHeight / Math.max(1, viewportWidth);
  return <View pointerEvents="none" style={[S.roomLayer, { width: contentWidth, height: roomHeight }]}>
    <Canvas gl={{ alpha: true }} style={{ position: 'absolute', left: 0, top: 0, width: contentWidth, height: roomHeight, backgroundColor: 'transparent' }} orthographic camera={{ left: -worldWidth / 2, right: worldWidth / 2, top: worldHeight / 2, bottom: -worldHeight / 2, position: [worldWidth / 2, 0, 10], rotation: [0, 0, 0], near: 0.1, far: 100 }} dpr={[1, 1.6]}>
      <Suspense fallback={null}>
        <RoomGeometry itemCount={itemCount} zoom={zoom} viewportWidth={viewportWidth} roomHeight={roomHeight} contentWidth={contentWidth} />
      </Suspense>
    </Canvas>
  </View>;
}

const S = StyleSheet.create({ roomLayer: { position: 'absolute', left: 0, top: 0 } });
