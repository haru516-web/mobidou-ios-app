import React, { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { Canvas, useLoader } from '@react-three/fiber/native';
import { RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three';

const WOOD_SURFACE = require('../../assets/collection/collection-wood-washi-surface.png');
const ROOM_BACKDROP = require('../../assets/collection/collection-room-backdrop-v2.png');

function RoomGeometry() {
  const texture = useLoader(TextureLoader, Asset.fromModule(WOOD_SURFACE).uri);
  const backdropTexture = useLoader(TextureLoader, Asset.fromModule(ROOM_BACKDROP).uri);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.4, 1.25);
  texture.colorSpace = SRGBColorSpace;
  backdropTexture.colorSpace = SRGBColorSpace;

  const wood = <meshStandardMaterial map={texture} color="#b97842" roughness={0.78} />;
  const darkWood = <meshStandardMaterial map={texture} color="#68432f" roughness={0.84} />;
  const brass = <meshStandardMaterial color="#b98b4c" metalness={0.72} roughness={0.3} />;

  return (
    <group name="collectionWorld">
      <ambientLight intensity={1.9} />
      <directionalLight position={[3, 5, 7]} intensity={2.2} />
      <mesh position={[0, 0.05, -1.28]}>
        <planeGeometry args={[9.2, 6.13]} />
        <meshBasicMaterial map={backdropTexture} toneMapped={false} />
      </mesh>
      <mesh position={[-4.38, 0.15, -0.42]}>
        <boxGeometry args={[0.22, 5.3, 1.5]} />
        {wood}
      </mesh>
      <mesh position={[4.38, 0.15, -0.42]}>
        <boxGeometry args={[0.22, 5.3, 1.5]} />
        {wood}
      </mesh>
      <mesh position={[0, 2.62, -0.4]}>
        <boxGeometry args={[8.8, 0.22, 1.48]} />
        {darkWood}
      </mesh>
      <mesh position={[0, -2.48, -0.42]}>
        <boxGeometry args={[8.8, 0.22, 1.48]} />
        {darkWood}
      </mesh>
      <mesh position={[0, -1.28, 0.05]}>
        <boxGeometry args={[8.8, 0.38, 1.08]} />
        {wood}
      </mesh>
      <mesh position={[0, -1.48, 0.23]}>
        <boxGeometry args={[8.55, 0.16, 0.18]} />
        {darkWood}
      </mesh>
      <mesh position={[0, -2.05, 0.08]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[8.8, 1.25, 1.2]} />
        {wood}
      </mesh>
      {[-3.85, 3.85].map((x) => <React.Fragment key={x}>
        <mesh position={[x, -1.7, 0.02]}>
          <boxGeometry args={[0.22, 1.75, 0.82]} />
          {darkWood}
        </mesh>
        <mesh position={[x, -1.38, 0.34]} rotation={[0, 0, x < 0 ? -0.28 : 0.28]}>
          <boxGeometry args={[0.12, 0.7, 0.12]} />
          {brass}
        </mesh>
      </React.Fragment>)}
      {[-2.7, 0, 2.7].map((x) => <mesh key={x} position={[x, 1.82, -0.05]}>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 16]} />
        {brass}
      </mesh>)}
      <mesh position={[0, 1.98, 0.04]}>
        <boxGeometry args={[7.9, 0.08, 0.1]} />
        {darkWood}
      </mesh>
    </group>
  );
}

export function CollectionRoom() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas camera={{ position: [0, 0, 7.4], fov: 40 }}>
        <Suspense fallback={null}><RoomGeometry /></Suspense>
      </Canvas>
    </View>
  );
}
